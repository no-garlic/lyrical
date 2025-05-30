"""
Django management command to test the logging configuration.

Usage: python manage.py test_logging
"""

import logging
from django.core.management.base import BaseCommand
from ...logging_config import get_logger, get_logger_info


class Command(BaseCommand):
    help = 'Test the logging configuration for all logger categories'

    def add_arguments(self, parser):
        parser.add_argument(
            '--level',
            type=str,
            choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
            default='INFO',
            help='Minimum log level to test (default: INFO)',
        )

    def handle(self, *args, **options):
        """Test logging for all configured logger categories."""
        
        self.stdout.write(
            self.style.SUCCESS('Testing Lyrical Logging Configuration')
        )
        self.stdout.write('=' * 50)
        
        # Get logger info
        logger_info = get_logger_info()
        self.stdout.write(f"Configured loggers: {', '.join(logger_info.keys())}")
        
        # Test each logger category
        categories = ['apis', 'views', 'services', 'migrations']
        levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        
        min_level = getattr(logging, options['level'])
        
        for category in categories:
            self.stdout.write(f"\nTesting {category} logger:")
            logger = get_logger(category)
            
            for level_name in levels:
                level_value = getattr(logging, level_name)
                if level_value >= min_level:
                    test_message = f"Test {level_name} message from {category} logger"
                    getattr(logger, level_name.lower())(test_message)
                    self.stdout.write(f"  ✓ {level_name}: {test_message}")
        
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(
            self.style.SUCCESS('Logging test complete! Check console and log file for output.')
        )
        
        # Display logger configuration info
        self.stdout.write('\nLogger Configuration:')
        for name, info in logger_info.items():
            self.stdout.write(f"  {name}: level={info['level']}, handlers={info['handlers']}")
        
        self.stdout.write(f"\nLog file location: /Users/michael/Dev/lyrical/logs/lyrical.log")
        self.stdout.write("Console output: WARNING+ levels")
        self.stdout.write("File output: ALL levels")