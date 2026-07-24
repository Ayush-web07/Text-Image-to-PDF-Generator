import os
import uuid
import logging
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib import colors
logger = logging.getLogger(__name__)
from django.db.models import F
from .models import UserSettings


def ensure_media_folder():
    os.makedirs(settings.MEDIA_ROOT, exist_ok=True)


def delete_file(path):
    """
    Safely delete a file from filesystem.
    Returns True if deleted, False if already deleted or error.
    """
    if not path:
        return False
    
    try:
        # Handle both absolute and relative paths
        if os.path.isabs(path):
            full_path = path
        else:
            full_path = os.path.join(settings.MEDIA_ROOT, path)
        
        if os.path.exists(full_path):
            os.remove(full_path)
            logger.info(f"Deleted file: {full_path}")
            return True
        else:
            logger.warning(f"File already deleted or not found: {full_path}")
            return False
    except Exception as e:
        logger.error(f"Error deleting file {path}: {str(e)}", exc_info=True)
        return False


# def delete_file_history_file(file_obj):
#     """
#     Delete the physical PDF file, update user's storage usage,
#     then permanently remove the database record.
#     """

#     try:
#         freed_space = 0

#         # Delete physical PDF
#         if file_obj.file:
#             try:
#                 file_path = file_obj.file.path

#                 if os.path.exists(file_path):
#                     freed_space = os.path.getsize(file_path)
#                     os.remove(file_path)

#             except Exception as e:
#                 print(f"Error deleting file: {e}")

#         # Update storage used
#         UserSettings.objects.filter(user=file_obj.user).update(
#             storage_used=F("storage_used") - freed_space
#         )

#         # Never allow negative storage
#         settings = UserSettings.objects.filter(user=file_obj.user).first()
#         if settings and settings.storage_used < 0:
#             settings.storage_used = 0
#             settings.save(update_fields=["storage_used"])

#         # Delete database record WITHOUT calling FileHistory.delete()
#         super(type(file_obj), file_obj).delete()

#         return {
#             "success": True,
#             "message": "File deleted successfully.",
#             "freed_space": freed_space
#         }

#     except Exception as e:
#         return {
#             "success": False,
#             "message": str(e),
#             "freed_space": 0
#         }


def convert_webp_to_image(webp_file, output_format='jpg'):
    """Convert a WebP image to JPG or PNG."""
    try:
        img = Image.open(webp_file)

        if output_format == 'jpg':
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                if img.mode == 'RGBA':
                    background.paste(img, mask=img.split()[3])
                else:
                    background.paste(img)
                img = background
            else:
                img = img.convert('RGB')
            ext = 'jpg'
            save_format = 'JPEG'
        else:
            if img.mode not in ('RGBA', 'RGB'):
                img = img.convert('RGBA')
            ext = 'png'
            save_format = 'PNG'

        unique_name = f"webp_{uuid.uuid4().hex[:12]}.{ext}"
        converted_dir = os.path.join(settings.MEDIA_ROOT, 'converted')
        os.makedirs(converted_dir, exist_ok=True)
        full_path = os.path.join(converted_dir, unique_name)

        img.save(full_path, format=save_format, quality=92)
        file_size = os.path.getsize(full_path)

        return {
            'success': True,
            'file_path': full_path,
            'url': settings.MEDIA_URL + f"converted/{unique_name}",
            'filename': unique_name,
            'size': file_size,
            'format': ext.upper(),
        }
    except Exception as e:
        logger.error(f"WebP conversion error: {str(e)}", exc_info=True)
        return {'success': False, 'error': str(e)}