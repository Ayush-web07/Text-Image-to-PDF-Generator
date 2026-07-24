from django.contrib import admin
from .models import FileHistory, UserSettings, LoginActivity
from .models import ContactMessage

@admin.register(FileHistory)
class FileHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'file', 'file_type', 'created_at', 'is_deleted']
    list_filter = ['file_type', 'is_deleted', 'created_at']
    search_fields = ['user__username', 'original_name']

@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'theme', 'font_size', 'total_conversions', 
                    'storage_percent', 'updated_at']
    list_filter = ['theme', 'font_size', 'email_notifications']
    search_fields = ['user__username']

@admin.register(LoginActivity)
class LoginActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'ip_address', 'timestamp', 'successful']
    list_filter = ['successful', 'timestamp']
    search_fields = ['user__username', 'ip_address']

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "email",
        "created_at",
        "is_read",
    )

    search_fields = (
        "name",
        "email",
    )

    list_filter = (
        "is_read",
        "created_at",
    )