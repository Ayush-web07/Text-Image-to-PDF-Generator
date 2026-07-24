from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views
from core import views
from core.forms import HTMLPasswordResetForm


urlpatterns = [

    # Authentication
    path('', views.user_login, name='login'),
    path('login/', views.user_login, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.user_logout, name='logout'),

    # Password Reset (using custom debug views)
    path(
        "password-reset/",
        views.DebugPasswordResetView.as_view(
            form_class=HTMLPasswordResetForm,
            template_name="registration/password_reset_form.html",
            email_template_name="registration/password_reset_email.html",
            html_email_template_name="registration/password_reset_email.html",
            subject_template_name="registration/password_reset_subject.txt",
            success_url="/password-reset/done/",
        ),
        name="password_reset",
    ),

    path(
        "password-reset/done/",
        auth_views.PasswordResetDoneView.as_view(
            template_name="registration/password_reset_done.html",
        ),
        name="password_reset_done",
    ),

    path(
        "reset/<uidb64>/<token>/",
        auth_views.PasswordResetConfirmView.as_view(
            template_name="registration/password_reset_confirm.html",
            success_url="/reset/done/",
        ),
        name="password_reset_confirm",
    ),

    path(
        "reset/done/",
        auth_views.PasswordResetCompleteView.as_view(
            template_name="registration/password_reset_complete.html",
        ),
        name="password_reset_complete",
    ),

    # Home
    path('home/', views.home, name='home'),
    path('dashboard/', views.dashboard, name='dashboard'),

    # PDF
    path('image-to-pdf/', views.image_to_pdf, name='image_to_pdf'),
    path('text-to-pdf/', views.text_to_pdf, name='text_to_pdf'),

    # WebP Converter
    path('webp-converter/', views.webp_converter, name='webp_converter'),

    # Success
    path('success/', views.success_page, name='success_page'),

    # PDF Viewing / Download (separate endpoints)
    path('view-pdf/<int:file_id>/', views.view_pdf, name='view_pdf'),
    path('download-pdf/<int:file_id>/', views.download_pdf, name='download_pdf'),

    # History
    path('history/', views.file_history, name='file_history'),

    # Settings
    path('settings/', views.settings_page, name='settings'),

    # API
    path('api/image-to-pdf/', views.api_image_to_pdf, name='api_image_to_pdf'),

    path('download-count/', views.download_count, name='download_count'),
    path('delete-file/', views.delete_file, name='delete_file'),

    path("about/", views.about, name="about"),
    path("contact/", views.contact, name="contact"),
    path("careers/", views.careers, name="careers"),

    path("privacy-policy/", views.privacy, name="privacy"),
    path("terms-of-service/", views.terms, name="terms"),
    path("cookie-policy/", views.cookies, name="cookies"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

