from django.apps import AppConfig


class LyricalConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'lyrical'
    
    def ready(self):
        """
        Initialize application when Django starts.
        """
        # Import and initialize logging configuration
        from . import logging_config
        
        # Logging is automatically configured when the module is imported
        # The setup_logging() function is called during module import
