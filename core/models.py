from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class FileHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to='pdfs/')
    file_type = models.CharField(max_length=10, default='pdf', blank=True)
    original_name = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.IntegerField(default=0, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)
    conversion_type = models.CharField(max_length=50, blank=True, null=True, default='')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.file.name}"

    def delete(self, *args, **kwargs):
        if self.file:
            try:
                self.file.delete(save=False)
            except Exception:
                pass

        return super().delete(*args, **kwargs)


class UserSettings(models.Model):
    """Stores user preferences and application settings."""

    user = models.OneToOneField(
    User,
    on_delete=models.CASCADE,
    related_name="usersettings"
)

    # =====================================================
    # PROFILE
    # =====================================================

    bio = models.TextField(
        max_length=500,
        blank=True,
        default=""
    )

    # =====================================================
    # APPEARANCE
    # =====================================================

    THEME_CHOICES = [
        ("light", "Light"),
        ("dark", "Dark"),
    ]

    FONT_SIZE_CHOICES = [
        ("small", "Small"),
        ("medium", "Medium"),
        ("large", "Large"),
    ]

    theme = models.CharField(
        max_length=10,
        choices=THEME_CHOICES,
        default="dark"
    )

    primary_color = models.CharField(
        max_length=7,
        default="#3b82f6"
    )

    font_size = models.CharField(
        max_length=10,
        choices=FONT_SIZE_CHOICES,
        default="medium"
    )

    ui_animations = models.BooleanField(default=True)

    # =====================================================
    # PDF CONVERSION
    # =====================================================

    OUTPUT_FORMAT_CHOICES = [
        ("pdf", "PDF"),
        ("png", "PNG"),
        ("jpg", "JPG"),
    ]

    COMPRESSION_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    PAGE_SIZE_CHOICES = [
        ("a4", "A4"),
        ("letter", "Letter"),
        ("fit", "Fit to Image"),
    ]

    default_output_format = models.CharField(
        max_length=5,
        choices=OUTPUT_FORMAT_CHOICES,
        default="pdf"
    )

    compression_level = models.CharField(
        max_length=10,
        choices=COMPRESSION_CHOICES,
        default="high"
    )

    auto_page_size = models.CharField(
        max_length=10,
        choices=PAGE_SIZE_CHOICES,
        default="a4"
    )

    auto_rotate = models.BooleanField(default=True)

    # =====================================================
    # STORAGE
    # =====================================================

    DELETE_AFTER_CHOICES = [
        ("never", "Never"),
        ("1hour", "1 Hour"),
        ("24hours", "24 Hours"),
        ("7days", "7 Days"),
    ]

    file_history_enabled = models.BooleanField(default=True)

    auto_delete_after = models.CharField(
        max_length=10,
        choices=DELETE_AFTER_CHOICES,
        default="never"
    )

    storage_used = models.PositiveBigIntegerField(default=0)

    storage_limit = models.PositiveBigIntegerField(
        default=104857600
    )

    # =====================================================
    # NOTIFICATIONS
    # =====================================================

    email_notifications = models.BooleanField(default=True)

    conversion_alerts = models.BooleanField(default=True)

    toast_notifications = models.BooleanField(default=True)

    # =====================================================
    # SECURITY
    # =====================================================

    session_timeout = models.PositiveIntegerField(default=30)

    two_factor_enabled = models.BooleanField(default=False)

    login_activity_log = models.TextField(
        blank=True,
        default=""
    )

    # =====================================================
    # STATISTICS
    # =====================================================

    total_conversions = models.PositiveIntegerField(default=0)

    total_downloads = models.PositiveIntegerField(default=0)

    # =====================================================
    # TIMESTAMPS
    # =====================================================

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Settings"
        verbose_name_plural = "User Settings"

    def __str__(self):
        return f"{self.user.username}'s Settings"

    @property
    def storage_percent(self):
        if self.storage_limit == 0:
            return 0
        return round((self.storage_used / self.storage_limit) * 100, 1)

    @property
    def remaining_storage(self):
        return max(self.storage_limit - self.storage_used, 0)


class LoginActivity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_activities')
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    successful = models.BooleanField(default=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = "Login activities"

    def __str__(self):
        return f"{self.user.username} - {self.timestamp}"

class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    message = models.TextField()

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name