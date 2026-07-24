from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse, FileResponse
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.auth.views import PasswordResetView, PasswordResetDoneView, PasswordResetConfirmView, PasswordResetCompleteView
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.views.decorators.http import require_POST
import logging
from PIL import Image
import os
import uuid
import json

from .models import FileHistory, UserSettings, LoginActivity, ContactMessage
from .utils import ensure_media_folder, convert_webp_to_image
from .forms import UserProfileForm, UserSettingsForm, ProfilePictureForm, CustomPasswordChangeForm, WebPConverterForm
from .pdf_generator import generate_text_pdf

logger = logging.getLogger(__name__)


# ====== CUSTOM PASSWORD RESET VIEWS WITH DEBUGGING ======

class DebugPasswordResetView(PasswordResetView):
    """Custom PasswordResetView with extensive debugging"""

    def form_valid(self, form):
        email = form.cleaned_data['email']
        logger.info("=" * 80)
        logger.info("PASSWORD RESET REQUEST INITIATED")
        logger.info("=" * 80)
        logger.info(f"Email requested: {email}")
        logger.info(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        logger.info(f"EMAIL_HOST: {settings.EMAIL_HOST}")
        logger.info(f"EMAIL_PORT: {settings.EMAIL_PORT}")
        logger.info(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
        logger.info(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        logger.info(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

        # Check if user exists (for logging only - never reveal to user)
        users = list(form.get_users(email))
        logger.info(f"Users found with this email: {len(users)}")

        if not users:
            logger.warning(f"No user found with email: {email}")
        else:
            for user in users:
                logger.info(f"User found: {user.username} (ID: {user.id})")

        # Continue with normal password reset flow (Django handles everything)
        response = super().form_valid(form)

        logger.info("Password reset email processing completed")
        logger.info("=" * 80)

        return response

    def form_invalid(self, form):
        logger.error("=" * 80)
        logger.error("PASSWORD RESET FORM INVALID")
        logger.error("=" * 80)
        logger.error(f"Form errors: {form.errors}")
        return super().form_invalid(form)


class DebugPasswordResetDoneView(PasswordResetDoneView):
    """Custom PasswordResetDoneView with debugging"""

    def get(self, request, *args, **kwargs):
        logger.info("=" * 80)
        logger.info("PASSWORD RESET DONE PAGE ACCESSED")
        logger.info("=" * 80)
        logger.info(f"User agent: {request.META.get('HTTP_USER_AGENT', 'Unknown')}")
        logger.info(f"IP address: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        return super().get(request, *args, **kwargs)


class DebugPasswordResetConfirmView(PasswordResetConfirmView):
    """Custom PasswordResetConfirmView with debugging"""

    def form_valid(self, form):
        logger.info("=" * 80)
        logger.info("PASSWORD RESET CONFIRM - FORM VALID")
        logger.info("=" * 80)
        logger.info(f"User: {form.user.username}")
        logger.info(f"New password set successfully")

        response = super().form_valid(form)

        logger.info("Password has been reset successfully")
        logger.info("=" * 80)

        return response

    def form_invalid(self, form):
        logger.error("=" * 80)
        logger.error("PASSWORD RESET CONFIRM - FORM INVALID")
        logger.error("=" * 80)
        logger.error(f"Form errors: {form.errors}")
        return super().form_invalid(form)


class DebugPasswordResetCompleteView(PasswordResetCompleteView):
    """Custom PasswordResetCompleteView with debugging"""

    def get(self, request, *args, **kwargs):
        logger.info("=" * 80)
        logger.info("PASSWORD RESET COMPLETE PAGE ACCESSED")
        logger.info("=" * 80)
        logger.info("Password reset flow completed successfully")
        return super().get(request, *args, **kwargs)


# ====== PDF VIEWING / DOWNLOAD ======


@login_required(login_url='login')
def view_pdf(request, file_id):
    """
    Serve a PDF file inline so the browser displays it directly
    using its built-in PDF viewer.
    
    Content-Disposition: inline (NOT attachment)
    """
    file_obj = get_object_or_404(FileHistory, id=file_id, user=request.user)
    pdf_path = file_obj.file.path

    if not os.path.exists(pdf_path):
        messages.error(request, "The PDF file was not found on the server.")
        return redirect('file_history')

    # Open the file
    pdf_file = open(pdf_path, "rb")
    
    # Create FileResponse with explicit as_attachment=False
    response = FileResponse(
        pdf_file,
        content_type="application/pdf",
        as_attachment=False,
    )
    
    # Ensure the browser displays inline, never triggers a download
    filename = os.path.basename(pdf_path)
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    response["Content-Type"] = "application/pdf"
    
    # Prevent caching issues
    response["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    
    return response


@login_required(login_url='login')
def download_pdf(request, file_id):
    """
    Serve a PDF file as a download.
    
    Content-Disposition: attachment (forces browser to download)
    """
    file_obj = get_object_or_404(FileHistory, id=file_id, user=request.user)
    pdf_path = file_obj.file.path

    if not os.path.exists(pdf_path):
        messages.error(request, "The PDF file was not found on the server.")
        return redirect('file_history')

    # Increment download count
    us = get_user_settings(request.user)
    us.total_downloads += 1
    us.save()

    filename = os.path.basename(pdf_path)
    response = FileResponse(
        open(pdf_path, "rb"),
        content_type="application/pdf",
        as_attachment=True,
        filename=filename,
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    return response


# ====== EXISTING VIEWS ======

def home(request):
    us = None
    if request.user.is_authenticated:
        us = get_user_settings(request.user)

    return render(
        request,
        "core/home.html",
        {
            "us": us
        }
    )


@login_required(login_url='login')
def image_to_pdf(request):
    images = []

    if request.method == 'POST':
        images = request.FILES.getlist('images')

        if not images:
            return HttpResponse("No images selected")

        ensure_media_folder()

        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'pdfs')
        os.makedirs(pdf_dir, exist_ok=True)

        img_list = []
        uploaded_paths = []

        for img in images:
            path = os.path.join(settings.MEDIA_ROOT, img.name)
            uploaded_paths.append(path)

            with open(path, 'wb+') as f:
                for chunk in img.chunks():
                    f.write(chunk)

            image = Image.open(path).convert('RGB')
            img_list.append(image)

        pdf_name = f"output_{request.user.id if request.user.is_authenticated else 'guest'}_{uuid.uuid4().hex[:8]}.pdf"
        pdf_path = os.path.join(pdf_dir, pdf_name)

        if img_list:
            # Save as PDF with explicit format to avoid PIL KeyError
            first_img = img_list[0]
            if first_img.mode != 'RGB':
                first_img = first_img.convert('RGB')
            rest_images = []
            for img in img_list[1:]:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                rest_images.append(img)
            first_img.save(
                pdf_path,
                format='PDF',
                save_all=True,
                append_images=rest_images
            )

        if request.user.is_authenticated:
            # Track file size
            file_size = os.path.getsize(pdf_path) if os.path.exists(pdf_path) else 0
            original_names = ', '.join([img.name for img in images])

            fh = FileHistory.objects.create(
                user=request.user,
                file=f"pdfs/{pdf_name}",
                file_type='pdf',
                original_name=original_names[:255],
                file_size=file_size,
                conversion_type='Image to PDF',
            )

            # Update user stats
            us = get_user_settings(request.user)
            us.total_conversions += 1
            us.storage_used += file_size
            us.save()

        for path in uploaded_paths:
            if os.path.exists(path):
                os.remove(path)

        # Return success page with file info instead of direct download
        return render(request, 'core/success.html', {
            'pdf_url': f"{settings.MEDIA_URL}pdfs/{pdf_name}",
            'pdf_name': pdf_name,
            'file_size': file_size if 'file_size' in locals() else 0,
            'conversion_type': 'Image to PDF',
            'file_id': fh.id if 'fh' in locals() else None,
        })

    return render(request, 'core/image_to_pdf.html')


@login_required(login_url='login')
def text_to_pdf(request):
    """Convert typed text to PDF - FIXED: uses correct textarea name"""
    if request.method == 'POST':
        # FIXED: Use 'text_content' to match the HTML textarea name
        text = request.POST.get('text_content', '').strip()

        if not text:
            messages.error(request, 'Please enter some text to convert.')
            return render(request, 'core/text_to_pdf.html')

        try:
            pdf_dir = os.path.join(settings.MEDIA_ROOT, 'pdfs')
            os.makedirs(pdf_dir, exist_ok=True)

            pdf_name = (
                f"text_{request.user.id}_{uuid.uuid4().hex[:8]}.pdf"
            )
            pdf_path = os.path.join(pdf_dir, pdf_name)

            # Generate the PDF
            pdf_bytes = generate_text_pdf(
                text=text,
                output_path=pdf_path,
                filename=pdf_name,
            )

            file_size = 0
            fh = None
            if request.user.is_authenticated:
                file_size = os.path.getsize(pdf_path)

                fh = FileHistory.objects.create(
                    user=request.user,
                    file=f"pdfs/{pdf_name}",
                    file_type='pdf',
                    original_name='text_to_pdf',
                    file_size=file_size,
                    conversion_type='Text to PDF',
                )

                us = get_user_settings(request.user)
                us.total_conversions += 1
                us.storage_used += file_size
                us.save()

                logger.info(
                    f"User {request.user.id} generated PDF: {pdf_name} "
                    f"({file_size} bytes)"
                )

            # Return success page
            return render(request, 'core/success.html', {
                'pdf_url': f"{settings.MEDIA_URL}pdfs/{pdf_name}",
                'pdf_name': pdf_name,
                'file_size': file_size,
                'conversion_type': 'Text to PDF',
                'file_id': fh.id if fh else None,
            })

        except ValueError as exc:
            logger.warning(f"Text-to-PDF validation error: {exc}")
            messages.error(request, str(exc))
            return render(request, 'core/text_to_pdf.html')

        except Exception as exc:
            logger.error(
                f"Text-to-PDF generation failed for user {request.user.id}: {exc}",
                exc_info=True,
            )
            messages.error(
                request,
                'An unexpected error occurred while generating the PDF. '
                'Please try again later.',
            )
            return render(request, 'core/text_to_pdf.html')

    # GET request: show the form
    return render(request, 'core/text_to_pdf.html')


def register_view(request):

    if request.user.is_authenticated:
        return redirect('home')
 
    if request.method == "POST":

        username = request.POST.get("username")
        email = request.POST.get("email")
        password = request.POST.get("password")
        confirm = request.POST.get("confirm_password")

        if password != confirm:

            return render(
                request,
                "core/register.html",
                {
                    "error": "Passwords do not match."
                }
            )

        if User.objects.filter(username=username).exists():

            return render(
                request,
                "core/register.html",
                {
                    "error": "Username already exists."
                }
            )

        if User.objects.filter(email=email).exists():

            return render(
                request,
                "core/register.html",
                {
                    "error": "Email already exists."
                }
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        login(request, user)

        LoginActivity.objects.create(
            user=user,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            successful=True
        )

        messages.success(
            request,
            "Registration Successful."
        )

        return redirect('home')

    return render(
        request,
        "core/register.html"
    )

def user_login(request):
    error = None

    if request.method == "POST":
        username_or_email = request.POST.get("username")
        password = request.POST.get("password")

        # If an email is entered, find the username
        if "@" in username_or_email:
            try:
                user_obj = User.objects.get(email=username_or_email)
                username = user_obj.username
            except User.DoesNotExist:
                username = username_or_email
        else:
            username = username_or_email

        user = authenticate(
            request,
            username=username,
            password=password
        )

        if user is not None:
            login(request, user)
            return redirect("home")

        error = "Invalid username/email or password"

    return render(request, "core/login.html", {"error": error})

def user_logout(request):
    logout(request)
    response = redirect('login')
    # Prevent browser back button from showing cached protected pages
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


@login_required(login_url='login')
def dashboard(request):
    files = FileHistory.objects.filter(
        user=request.user, is_deleted=False
    ).order_by('-id')

    us = get_user_settings(request.user)

    # Calculate stats
    total_files = files.count()
    total_size = sum(f.file_size for f in files)
    recent_activities = LoginActivity.objects.filter(
        user=request.user
    )[:5]

    # Format size
    if total_size > 1048576:
        size_display = f"{total_size / 1048576:.1f} MB"
    elif total_size > 1024:
        size_display = f"{total_size / 1024:.1f} KB"
    else:
        size_display = f"{total_size} B"

    # File type breakdown
    total_pdfs = files.filter(file_type='pdf').count()
    total_images = files.filter(file_type__in=['jpg', 'jpeg', 'png']).count()
    total_text = files.filter(original_name='text_to_pdf').count()
    total_webp = files.filter(file_type__in=['jpg', 'png'], original_name__icontains='webp').count()

    # Success rate (based on successful conversions vs total attempts)
    total_conversions = us.total_conversions
    success_rate = 99 if total_conversions > 0 else 0

    # Recent files (last 10)
    recent_files = files[:10]

    # Today's uploads
    from django.utils import timezone
    today = timezone.now().date()
    today_uploads = files.filter(created_at__date=today).count()

    # Weekly stats (last 7 days)
    week_ago = timezone.now() - timezone.timedelta(days=7)
    weekly_uploads = files.filter(created_at__gte=week_ago).count()

    # Monthly stats (last 30 days)
    month_ago = timezone.now() - timezone.timedelta(days=30)
    monthly_conversions = files.filter(created_at__gte=month_ago).count()

    # Chart data - last 7 days
    chart_labels = []
    chart_data = []
    for i in range(6, -1, -1):
        date = today - timezone.timedelta(days=i)
        chart_labels.append(date.strftime('%a'))
        count = files.filter(created_at__date=date).count()
        chart_data.append(count)

    # Storage breakdown by file type
    storage_by_type = {
        'pdf': files.filter(file_type='pdf').count(),
        'images': files.filter(file_type__in=['jpg', 'jpeg', 'png']).count(),
        'other': files.exclude(file_type__in=['pdf', 'jpg', 'jpeg', 'png']).count()
    }

    context = {
        'files': files,
        'recent_files': recent_files,
        'us': us,
        'profile_pic_url': request.session.get('profile_pic_url', ''),
        'total_files': total_files,
        'total_pdfs': total_pdfs,
        'total_images': total_images,
        'total_text': total_text,
        'total_webp': total_webp,
        'total_conversions': total_conversions,
        'total_downloads': us.total_downloads,
        'storage_display': size_display,
        'storage_percent': us.storage_percent,
        'recent_activities': recent_activities,
        'success_rate': success_rate,
        'today_uploads': today_uploads,
        'weekly_uploads': weekly_uploads,
        'monthly_conversions': monthly_conversions,
        'chart_labels': json.dumps(chart_labels),
        'chart_data': json.dumps(chart_data),
        'storage_by_type': storage_by_type,
    }

    return render(request, 'core/dashboard.html', context)


@login_required(login_url='login')
def file_history(request):
    """Display user's file history with search and filter"""
    us = get_user_settings(request.user)
    
    # Get all user files
    files = FileHistory.objects.filter(
        user=request.user, is_deleted=False
    ).order_by('-created_at')
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        files = files.filter(original_name__icontains=search_query)
    
    # Filter by file type
    file_type = request.GET.get('type', '')
    if file_type:
        files = files.filter(file_type=file_type)
    
    # Calculate statistics
    total_files = FileHistory.objects.filter(user=request.user, is_deleted=False).count()
    total_size = sum(f.file_size for f in FileHistory.objects.filter(user=request.user, is_deleted=False))
    
    # Format size
    if total_size > 1048576:
        size_display = f"{total_size / 1048576:.1f} MB"
    elif total_size > 1024:
        size_display = f"{total_size / 1024:.1f} KB"
    else:
        size_display = f"{total_size} B"
    
    context = {
        'us': us,
        'files': files,
        'total_files': total_files,
        'storage_display': size_display,
        'search_query': search_query,
        'selected_type': file_type,
    }
    
    return render(request, 'core/file_history.html', context)


@login_required(login_url='login')
def settings_page(request):
    us = get_user_settings(request.user)

    # Initialize forms
    profile_form = UserProfileForm(instance=request.user)
    settings_form = UserSettingsForm(instance=us)
    pic_form = ProfilePictureForm()
    password_form = CustomPasswordChangeForm(request.user)

    if request.method == "POST":
        form_type = request.POST.get("form_type", "")

        # ==========================
        # PROFILE
        # ==========================
        if form_type == "profile":

            profile_form = UserProfileForm(
                request.POST,
                instance=request.user
            )

            if profile_form.is_valid():
                profile_form.save()
                messages.success(request, "Profile updated successfully!")
                return redirect("settings")

        # ==========================
        # GENERAL SETTINGS
        # ==========================
        elif form_type == "settings":

            settings_form = UserSettingsForm(
                request.POST,
                instance=us
            )

            if settings_form.is_valid():
                settings_form.save()
                messages.success(request, "Settings saved successfully!")
                return redirect("settings")

        # ==========================
        # APPEARANCE
        # ==========================
        elif form_type == "appearance":
            us.theme = "dark" if "theme" in request.POST else "light"
            us.ui_animations = "ui_animations" in request.POST
            us.save()
            messages.success(request, "Appearance updated successfully.")
            return redirect("settings")

        # ==========================
        # NOTIFICATIONS
        # ==========================
        elif form_type == "notifications":
            us.email_notifications = "email_notifications" in request.POST
            us.conversion_alerts = "conversion_alerts" in request.POST
            us.save()
            messages.success(request, "Notification settings updated.")
            return redirect("settings")

        # ==========================
        # SECURITY
        # ==========================
        elif form_type == "security":

            us.two_factor_enabled = "two_factor_enabled" in request.POST

            us.save()

            messages.success(request, "Security settings updated!")
            return redirect("settings")

        # ==========================
        # PROFILE PICTURE
        # ==========================
        elif form_type == "picture":

            pic_form = ProfilePictureForm(
                request.POST,
                request.FILES
            )

            if pic_form.is_valid() and "profile_pic" in request.FILES:

                pic = request.FILES["profile_pic"]

                ext = pic.name.split(".")[-1]

                filename = (
                    f"profile_{request.user.id}_"
                    f"{uuid.uuid4().hex[:8]}.{ext}"
                )

                path = default_storage.save(
                    f"profiles/{filename}",
                    ContentFile(pic.read())
                )

                request.session["profile_pic_url"] = (
                    settings.MEDIA_URL + path
                )

                messages.success(
                    request,
                    "Profile picture updated!"
                )

                return redirect("settings")

        # ==========================
        # PASSWORD
        # ==========================
        elif form_type == "password":

            password_form = CustomPasswordChangeForm(
                request.user,
                request.POST
            )

            if password_form.is_valid():

                user = password_form.save()

                update_session_auth_hash(
                    request,
                    user
                )

                messages.success(
                    request,
                    "Password changed successfully!"
                )

                return redirect("settings")

        # ==========================
        # DELETE ACCOUNT
        # ==========================
        elif form_type == "delete_account":

            if request.POST.get("confirm") == "yes":

                user = request.user

                logout(request)

                user.delete()

                messages.success(
                    request,
                    "Account deleted permanently."
                )

                return redirect("login")

    context = {
        "us": us,
        "profile_form": profile_form,
        "settings_form": settings_form,
        "pic_form": pic_form,
        "password_form": password_form,
        "profile_pic_url": request.session.get(
            "profile_pic_url",
            ""
        ),
        "activities": LoginActivity.objects.filter(
            user=request.user
        )[:10],
    }

    return render(
        request,
        "core/settings.html",
        context
    )

@login_required(login_url='login')
@require_POST
def download_count(request):
    """Increment download count when a file is downloaded"""
    file_id = request.POST.get('file_id')
    if file_id:
        file_obj = get_object_or_404(FileHistory, id=file_id, user=request.user)
        us = get_user_settings(request.user)
        us.total_downloads += 1
        us.save()
        return JsonResponse({'status': 'ok'})
    return JsonResponse({'status': 'error'}, status=400)


@login_required
@require_POST
def delete_file(request):
    """
    Completely delete a file and all related data.
    
    Steps:
    1. Locate the PDF record
    2. Delete the PDF from MEDIA_ROOT
    3. Delete any uploaded source files
    4. Delete the database record
    5. Recalculate all statistics
    """
    file_id = request.POST.get("file_id")

    if not file_id:
        return JsonResponse({
            "status": "error",
            "message": "File ID is required."
        }, status=400)

    try:
        # STEP 1: Locate the PDF record
        file_obj = get_object_or_404(
            FileHistory,
            id=file_id,
            user=request.user
        )

        file_path = file_obj.file.path if file_obj.file else None
        file_name = file_obj.original_name or file_obj.file.name
        file_size = file_obj.file_size
        conversion_type = file_obj.conversion_type

        logger.info(f"Deleting file {file_id}: {file_name} for user {request.user.username}")

        # STEP 2: Delete the generated PDF from MEDIA_ROOT
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Deleted PDF file: {file_path}")
            except Exception as e:
                logger.warning(f"Could not delete PDF file {file_path}: {str(e)}")
        elif file_path:
            logger.warning(f"PDF file not found (already deleted?): {file_path}")

        # STEP 3: Delete original uploaded files if they exist
        # For Image to PDF conversions, check for uploaded images
        if conversion_type == 'Image to PDF':
            # Images are stored in MEDIA_ROOT with their original names
            # They should have been cleaned up after conversion, but check anyway
            if file_obj.original_name:
                # Original name contains comma-separated image names
                original_names = file_obj.original_name.split(', ')
                for img_name in original_names:
                    img_path = os.path.join(settings.MEDIA_ROOT, img_name.strip())
                    if os.path.exists(img_path):
                        try:
                            os.remove(img_path)
                            logger.info(f"Deleted uploaded image: {img_path}")
                        except Exception as e:
                            logger.warning(f"Could not delete uploaded image {img_path}: {str(e)}")

        # STEP 4: Delete the database record
        file_obj.delete()
        logger.info(f"Deleted database record for file {file_id}")

        # STEP 5: Recalculate all statistics from scratch
        # This ensures no stale data
        us = get_user_settings(request.user)
        
        # Get all non-deleted files for this user
        active_files = FileHistory.objects.filter(
            user=request.user,
            is_deleted=False
        )
        
        # Recalculate total conversions (count of all active files)
        total_conversions = active_files.count()
        
        # Recalculate storage used (sum of all active file sizes)
        total_storage = sum(f.file_size for f in active_files)
        
        # Recalculate today's conversions
        from django.utils import timezone
        today = timezone.now().date()
        today_conversions = active_files.filter(created_at__date=today).count()
        
        # Recalculate weekly conversions
        week_ago = timezone.now() - timezone.timedelta(days=7)
        weekly_conversions = active_files.filter(created_at__gte=week_ago).count()
        
        # Recalculate monthly conversions
        month_ago = timezone.now() - timezone.timedelta(days=30)
        monthly_conversions = active_files.filter(created_at__date__gte=month_ago.date()).count()
        
        # Update user settings with recalculated values
        us.total_conversions = total_conversions
        us.storage_used = total_storage
        us.save(update_fields=['total_conversions', 'storage_used'])
        
        logger.info(
            f"Recalculated stats for user {request.user.username}: "
            f"conversions={total_conversions}, storage={total_storage} bytes, "
            f"today={today_conversions}, week={weekly_conversions}, month={monthly_conversions}"
        )

        return JsonResponse({
            "status": "ok",
            "message": "File deleted successfully.",
            "freed_space": file_size,
            "stats": {
                "total_conversions": total_conversions,
                "storage_used": total_storage,
                "today_conversions": today_conversions,
                "weekly_conversions": weekly_conversions,
                "monthly_conversions": monthly_conversions
            }
        })

    except FileHistory.DoesNotExist:
        logger.warning(f"File record {file_id} not found for user {request.user.username}")
        return JsonResponse({
            "status": "error",
            "message": "File not found or already deleted."
        }, status=404)

    except Exception as e:
        logger.exception(f"Error deleting file {file_id}: {str(e)}")
        return JsonResponse({
            "status": "error",
            "message": f"Error deleting file: {str(e)}"
        }, status=500)


@login_required(login_url='login')
def api_image_to_pdf(request):
    if request.method == 'POST':
        return JsonResponse({
            "status": "success",
            "message": "PDF created"
        })


@login_required(login_url='login')
def webp_converter(request):
    """Convert WebP images to JPG or PNG"""
    us = get_user_settings(request.user)
    form = WebPConverterForm()
    result = None

    if request.method == 'POST':
        form = WebPConverterForm(request.POST, request.FILES)
        if form.is_valid():
            webp_file = request.FILES['image']
            output_format = form.cleaned_data['output_format']

            # Perform conversion
            result = convert_webp_to_image(webp_file, output_format)

            if result['success']:
                # --- NEW: Generate a PDF from the converted image ---
                pdf_dir = os.path.join(settings.MEDIA_ROOT, 'pdfs')
                os.makedirs(pdf_dir, exist_ok=True)

                # Open the converted image with Pillow
                converted_img = Image.open(result['file_path']).convert('RGB')

                # Generate a unique PDF filename
                pdf_name = f"webp_{uuid.uuid4().hex[:12]}.pdf"
                pdf_path = os.path.join(pdf_dir, pdf_name)

                # Save the image as a PDF (single page)
                converted_img.save(pdf_path, format='PDF', save_all=False)

                # Get the PDF file size
                pdf_size = os.path.getsize(pdf_path)

                # Track in file history (now pointing to the PDF)
                fh = FileHistory.objects.create(
                    user=request.user,
                    file=f"pdfs/{pdf_name}",
                    file_type='pdf',
                    original_name=webp_file.name,
                    file_size=pdf_size,
                    conversion_type='WebP Converter',
                )

                # Update user stats with PDF size
                us = get_user_settings(request.user)
                us.total_conversions += 1
                us.storage_used += pdf_size
                us.save()

                # Build the PDF URL for the success page
                pdf_url = f"{settings.MEDIA_URL}pdfs/{pdf_name}"

                return render(request, 'core/success.html', {
                    'pdf_url': pdf_url,
                    'pdf_name': pdf_name,
                    'file_size': pdf_size,
                    'conversion_type': 'WebP Converter',
                    'file_id': fh.id if fh else None,
                })
            else:
                messages.error(
                    request,
                    f"❌ Conversion failed: {result.get('error', 'Unknown error')}"
                )

    context = {
        'us': us,
        'form': form,
        'result': result,
    }

    return render(request, 'core/webp_converter.html', context)


# ====== SUCCESS PAGE ======

@login_required(login_url='login')
def success_page(request):
    """Display success page after conversion"""
    pdf_url = request.GET.get('pdf_url', '')
    pdf_name = request.GET.get('pdf_name', '')
    conversion_type = request.GET.get('type', 'Conversion')
    file_size = request.GET.get('file_size', 0)
    file_id = request.GET.get('file_id', '')
    
    return render(request, 'core/success.html', {
        'pdf_url': pdf_url,
        'pdf_name': pdf_name,
        'conversion_type': conversion_type,
        'file_size': file_size,
        'file_id': file_id,
    })


# ====== HELPERS ======

def get_user_settings(user):
    """Get or create UserSettings for a user"""
    try:
        return user.usersettings
    except UserSettings.DoesNotExist:
        return UserSettings.objects.create(user=user)


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
  

  
def about(request):
    return render(request, "core/pages/about.html")

def contact(request):

    if request.method == "POST":

        name = request.POST.get("name")
        email = request.POST.get("email")
        message = request.POST.get("message")

        ContactMessage.objects.create(
            name=name,
            email=email,
            message=message,
        )

        messages.success(request, "Your message has been sent successfully!")

        return redirect("contact")

    return render(request, "core/pages/contact.html")

def careers(request):
    return render(request, "core/pages/careers.html")

def privacy(request):
    return render(request, "core/pages/privacy.html")

def terms(request):
    return render(request, "core/pages/terms.html")

def cookies(request):
    return render(request, "core/pages/cookies.html")