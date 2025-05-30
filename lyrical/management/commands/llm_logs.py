"""
Django management command to manage LLM conversation logs.

Usage: 
  python manage.py llm_logs --list
  python manage.py llm_logs --info style 85
  python manage.py llm_logs --cleanup 30
"""

from django.core.management.base import BaseCommand
from ...services.llm_conversation_logger import LLMConversationLogger


class Command(BaseCommand):
    help = 'Manage LLM conversation logs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--list',
            action='store_true',
            help='List all conversation log files',
        )
        
        parser.add_argument(
            '--info',
            nargs=2,
            metavar=('message_type', 'song_id'),
            help='Get information about a specific conversation log',
        )
        
        parser.add_argument(
            '--cleanup',
            type=int,
            metavar='days',
            help='Remove log files older than specified days',
        )
        
        parser.add_argument(
            '--view',
            nargs=2,
            metavar=('message_type', 'song_id'),
            help='View the content of a specific conversation log',
        )

    def handle(self, *args, **options):
        """Handle the management command."""
        
        if options['list']:
            self.list_logs()
        elif options['info']:
            message_type, song_id = options['info']
            self.show_log_info(message_type, int(song_id))
        elif options['cleanup']:
            days = options['cleanup']
            self.cleanup_logs(days)
        elif options['view']:
            message_type, song_id = options['view']
            self.view_log(message_type, int(song_id))
        else:
            self.stdout.write(
                self.style.ERROR('Please specify an action: --list, --info, --cleanup, or --view')
            )
            self.stdout.write('Use --help for more information.')

    def list_logs(self):
        """List all conversation log files."""
        self.stdout.write(
            self.style.SUCCESS('LLM Conversation Logs')
        )
        self.stdout.write('=' * 50)
        
        logs = LLMConversationLogger.get_all_conversation_logs()
        
        if not logs:
            self.stdout.write(self.style.WARNING('No conversation logs found.'))
            return
        
        for log in logs:
            if log.get('exists', False):
                size_kb = log['size_bytes'] / 1024
                self.stdout.write(
                    f"{log['message_type']}_{log['song_id']}.log: "
                    f"{log['sessions']} sessions, {size_kb:.1f} KB"
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f"{log['message_type']}_{log['song_id']}.log: Not found")
                )
        
        self.stdout.write(f"\nTotal: {len(logs)} log files")

    def show_log_info(self, message_type: str, song_id: int):
        """Show information about a specific log file."""
        self.stdout.write(
            self.style.SUCCESS(f'Log Info: {message_type}_{song_id}.log')
        )
        self.stdout.write('=' * 50)
        
        log_info = LLMConversationLogger.get_conversation_log_info(message_type, song_id)
        
        if log_info.get('exists', False):
            size_kb = log_info['size_bytes'] / 1024
            self.stdout.write(f"Path: {log_info['path']}")
            self.stdout.write(f"Size: {size_kb:.1f} KB ({log_info['size_bytes']} bytes)")
            self.stdout.write(f"Sessions: {log_info['sessions']}")
            self.stdout.write(f"Last modified: {log_info['modified']}")
        else:
            self.stdout.write(
                self.style.WARNING(f"Log file does not exist: {log_info['path']}")
            )

    def cleanup_logs(self, days: int):
        """Clean up old log files."""
        self.stdout.write(
            self.style.SUCCESS(f'Cleaning up logs older than {days} days...')
        )
        
        try:
            LLMConversationLogger.cleanup_old_logs(days)
            self.stdout.write(
                self.style.SUCCESS('Cleanup completed successfully.')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Cleanup failed: {e}')
            )

    def view_log(self, message_type: str, song_id: int):
        """View the content of a specific log file."""
        self.stdout.write(
            self.style.SUCCESS(f'Content: {message_type}_{song_id}.log')
        )
        self.stdout.write('=' * 50)
        
        log_path = LLMConversationLogger.get_log_file_path(message_type, song_id)
        
        if log_path.exists():
            try:
                with open(log_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Show last 1000 characters for large files
                if len(content) > 1000:
                    self.stdout.write(
                        self.style.WARNING(f'File is large ({len(content)} chars). Showing last 1000 characters:')
                    )
                    self.stdout.write('-' * 50)
                    self.stdout.write(content[-1000:])
                else:
                    self.stdout.write(content)
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error reading file: {e}')
                )
        else:
            self.stdout.write(
                self.style.WARNING(f'Log file does not exist: {log_path}')
            )