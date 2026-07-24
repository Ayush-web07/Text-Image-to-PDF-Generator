from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordChangeForm
from .models import UserSettings
from django.contrib.auth.forms import PasswordResetForm
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

class UserProfileForm(forms.ModelForm):
    """Update username and email"""
    class Meta:
        model = User
        fields = ['username', 'email']
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Username'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form-input',
                'placeholder': 'Email address'
            }),
        }


class UserSettingsForm(forms.ModelForm):
    """Full settings form for UserSettings model"""
    class Meta:
        model = UserSettings
        exclude = ['user', 'storage_used', 'storage_limit',
                    'login_activity_log', 'total_conversions',
                    'total_downloads', 'created_at', 'updated_at']
        widgets = {
            'bio': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'Tell us about yourself...'
            }),
            'theme': forms.Select(attrs={'class': 'form-select'}),
            'primary_color': forms.TextInput(attrs={
                'type': 'color',
                'class': 'color-picker'
            }),
            'font_size': forms.Select(attrs={'class': 'form-select'}),
            'ui_animations': forms.CheckboxInput(attrs={
                'class': 'toggle-switch'
            }),
            'default_output_format': forms.Select(attrs={
                'class': 'form-select'
            }),
            'compression_level': forms.Select(attrs={
                'class': 'form-select'
            }),
            'auto_page_size': forms.Select(attrs={
                'class': 'form-select'
            }),
            'auto_rotate': forms.CheckboxInput(attrs={
                'class': 'toggle-switch'
            }),
            'file_history_enabled': forms.CheckboxInput(attrs={
                'class': 'toggle-switch'
            }),
            'auto_delete_after': forms.Select(attrs={
                'class': 'form-select'
            }),
            'email_notifications': forms.CheckboxInput(attrs={
                'class': 'toggle-switch'
            }),
            'conversion_alerts': forms.CheckboxInput(attrs={
                'class': 'toggle-switch'
            }),
            'toast_notifications': forms.CheckboxInput(attrs={
                'class': 'toggle-switch'
            }),
            'session_timeout': forms.NumberInput(attrs={
                'class': 'form-input',
                'min': 5,
                'max': 1440
            }),
            'two_factor_enabled': forms.CheckboxInput(attrs={
                'class': 'toggle-switch'
            }),
        }

    def clean_primary_color(self):
        color = self.cleaned_data.get('primary_color')
        if color and not color.startswith('#'):
            raise forms.ValidationError("Color must be a hex value (e.g. #3b82f6)")
        return color


class ProfilePictureForm(forms.Form):
    """Simple form for profile picture upload"""
    profile_pic = forms.ImageField(
        label='Profile Picture',
        widget=forms.FileInput(attrs={
            'class': 'file-input',
            'accept': 'image/*'
        })
    )


class CustomPasswordChangeForm(PasswordChangeForm):
    """Password change form with custom styling"""
    old_password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': 'Current password'
        })
    )
    new_password1 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': 'New password'
        })
    )
    new_password2 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': 'Confirm new password'
        })
    )


class WebPConverterForm(forms.Form):
    """Form for WebP to JPG/PNG conversion"""
    image = forms.ImageField(
        label='WebP Image',
        widget=forms.FileInput(attrs={
            'class': 'form-input file-input',
            'accept': '.webp,image/webp',
            'id': 'webp-upload'
        })
    )
    output_format = forms.ChoiceField(
        choices=[('jpg', 'JPG'), ('png', 'PNG')],
        initial='jpg',
        widget=forms.RadioSelect(attrs={
            'class': 'format-radio',
        })
    )

    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image:
            # Validate file extension
            ext = image.name.lower().split('.')[-1]
            if ext != 'webp':
                raise forms.ValidationError("Only WebP files (.webp) are accepted.")
            # Validate file size (max 10MB)
            if image.size > 10 * 1024 * 1024:
                raise forms.ValidationError("File size must be under 10MB.")
            # Validate content type
            if image.content_type not in ['image/webp', 'application/octet-stream']:
                raise forms.ValidationError("Invalid file type. Please upload a WebP image.")
        return image

class HTMLPasswordResetForm(PasswordResetForm):

    def send_mail(
        self,
        subject_template_name,
        email_template_name,
        context,
        from_email,
        to_email,
        html_email_template_name=None,
    ):

        subject = render_to_string(
            subject_template_name,
            context
        ).strip()

        html_content = render_to_string(
            html_email_template_name,
            context
        )

        text_content = strip_tags(html_content)

        email = EmailMultiAlternatives(
            subject,
            text_content,
            from_email,
            [to_email],
        )

        email.attach_alternative(html_content, "text/html")
        email.send()