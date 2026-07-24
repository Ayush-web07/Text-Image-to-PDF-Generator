"""
Django management command to clean up orphan files and database records.

This command:
1. Finds database records where the file doesn't exist (orphan records)
2. Finds files in MEDIA_ROOT that don't have database records (orphan files)
3. Cleans up both to maintain consistency

Usage:
    python manage.py cleanup_orphan_files
"""
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from core.models import FileHistory


class Command(BaseCommand):
    help = 'Clean up orphan files and database records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--delete-orphan-files',
            action='store_true',
            help='Delete files that have no database record',
        )
        parser.add_argument(
            '--delete-orphan-records',
            action='store_true',
            help='Delete database records where file is missing',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        delete_orphan_files = options['delete_orphan_files']
        delete_orphan_records = options['delete_orphan_records']

        # If no specific option is given, do both
        if not delete_orphan_files and not delete_orphan_records:
            delete_orphan_files = True
            delete_orphan_records = True

        self.stdout.write(
            self.style.SUCCESS('=' * 80)
        )
        self.stdout.write(
            self.style.SUCCESS('ORPHAN FILE CLEANUP')
        )
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No files will be deleted')
            )
        self.stdout.write(
            self.style.SUCCESS('=' * 80)
        )

        # Get all FileHistory records
        all_records = FileHistory.objects.all()
        
        orphan_records = []
        orphan_files = []

        # Check for orphan database records (file missing)
        self.stdout.write('\n📊 Checking database records...')
        for record in all_records:
            if record.file:
                file_path = record.file.path
                if not os.path.exists(file_path):
                    orphan_records.append({
                        'record': record,
                        'path': file_path,
                        'user': record.user.username,
                        'name': record.original_name or record.file.name,
                    })

        # Check for orphan files (no database record)
        self.stdout.write('📁 Checking filesystem...')
        media_root = settings.MEDIA_ROOT
        for root, dirs, files in os.walk(media_root):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, media_root)
                
                # Check if this file has a database record
                has_record = FileHistory.objects.filter(file=rel_path).exists()
                if not has_record:
                    orphan_files.append({
                        'path': file_path,
                        'rel_path': rel_path,
                    })

        # Report findings
        self.stdout.write(f'\n📈 Results:')
        self.stdout.write(f'  Orphan database records: {len(orphan_records)}')
        self.stdout.write(f'  Orphan files: {len(orphan_files)}')

        # Delete orphan database records
        if delete_orphan_records and orphan_records:
            self.stdout.write(
                self.style.WARNING(f'\n🗑️  Deleting {len(orphan_records)} orphan database records...')
            )
            for item in orphan_records:
                if dry_run:
                    self.stdout.write(
                        f'  [DRY RUN] Would delete record: {item["name"]} (user: {item["user"]})'
                    )
                else:
                    record = item['record']
                    name = item['name']
                    user = item['user']
                    record.delete()
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Deleted record: {name} (user: {user})')
                    )

        # Delete orphan files
        if delete_orphan_files and orphan_files:
            self.stdout.write(
                self.style.WARNING(f'\n🗑️  Deleting {len(orphan_files)} orphan files...')
            )
            for item in orphan_files:
                if dry_run:
                    self.stdout.write(
                        f'  [DRY RUN] Would delete file: {item["rel_path"]}'
                    )
                else:
                    try:
                        os.remove(item['path'])
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ Deleted file: {item["rel_path"]}')
                        )
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'  ✗ Error deleting {item["rel_path"]}: {str(e)}')
                        )

        # Summary
        self.stdout.write(
            self.style.SUCCESS('\n' + '=' * 80)
        )
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS('DRY RUN COMPLETE - No changes made')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('CLEANUP COMPLETE')
            )
        self.stdout.write(
            self.style.SUCCESS('=' * 80)
        )