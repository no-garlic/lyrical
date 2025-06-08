"""
Central logging configuration for the Lyrical application.

This module configures all loggers used throughout the application with
appropriate handlers, formatters, and log levels.

Logger Categories:
- apis: API endpoints and request handling
- views: Page views and template rendering  
- services: Business logic and LLM services
- migrations: Database migrations and schema changes
"""

import logging
import logging.handlers
import os
from pathlib import Path


# Define logger names
LOGGER_APIS = "apis"
LOGGER_VIEWS = "views"  
LOGGER_SERVICES = "services"
LOGGER_MIGRATIONS = "migrations"
LOGGER_LITELLM = "LiteLLM"
LOGGER_DJANGO = "django"
LOGGER_ASYNCIO = "asyncio"


# Log levels for each logger (can be customized)
LOGGER_LEVELS = {
    LOGGER_APIS: logging.DEBUG,
    LOGGER_VIEWS: logging.DEBUG,
    LOGGER_SERVICES: logging.DEBUG,
    LOGGER_MIGRATIONS: logging.INFO,
    LOGGER_LITELLM: logging.WARNING,
    LOGGER_DJANGO: logging.WARNING,
    LOGGER_ASYNCIO: logging.WARNING,
}

# Log file path
PROJECT_ROOT = Path(__file__).parent.parent
LOG_FILE_PATH = PROJECT_ROOT / "logs" / "lyrical.log"

# Ensure logs directory exists
LOG_FILE_PATH.parent.mkdir(exist_ok=True)


# Custom filter to exclude logs containing "/.well-known/"
class WellKnownFilter(logging.Filter):
    def filter(self, record):
        # Check if the logger name is django.request and the message contains "/.well-known/"
        if record.name == 'django.request' and '/.well-known/' in record.getMessage():
            return False
        return True

def setup_logging():
    """
    Configure all loggers for the Lyrical application.
    
    Sets up:
    - Console handler for WARNING+ messages
    - File handler for ALL messages with timestamps
    - Appropriate formatters for each handler
    - Individual loggers for each application area
    """
    
    # Create formatters
    console_formatter = logging.Formatter(
        fmt='[%(levelname)s] %(name)s: %(message)s'
    )
    
    file_formatter = logging.Formatter(
        fmt='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Create console handler (WARNING and above)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(console_formatter)
    
    # Create file handler (DEBUG and above, rotating file)
    file_handler = logging.handlers.RotatingFileHandler(
        filename=LOG_FILE_PATH,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(file_formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    
    # Clear any existing handlers
    root_logger.handlers.clear()
    
    # Add handlers to root logger
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Add custom filter to django.request logger
    django_request_logger = logging.getLogger('django.request')
    django_request_logger.addFilter(WellKnownFilter())

    # Disable some basic informational loggers
    logging.getLogger('django.db.backends').setLevel(logging.WARNING)
    logging.getLogger('django.security').setLevel(logging.WARNING)
    logging.getLogger('django.template').setLevel(logging.WARNING)
    logging.getLogger('django.server').setLevel(logging.WARNING)
    logging.getLogger('django.request').setLevel(logging.WARNING)
    logging.getLogger('django').setLevel(logging.WARNING)
    logging.getLogger('httpcore.connection').setLevel(logging.WARNING)
    logging.getLogger('httpcore.http11').setLevel(logging.WARNING)
    
    # Configure individual loggers
    for logger_name, level in LOGGER_LEVELS.items():
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)
        # Loggers inherit handlers from root logger
        logger.propagate = True
    
    # Log that logging has been configured
    setup_logger = logging.getLogger(LOGGER_SERVICES)
    setup_logger.info("Logging configuration complete")
    setup_logger.info(f"Console logging: WARNING+ levels")
    setup_logger.info(f"File logging: ALL levels to {LOG_FILE_PATH}")
    setup_logger.debug("Debug logging enabled for file output")


def get_logger(category: str) -> logging.Logger:
    """
    Get a logger for the specified category.
    
    Args:
        category: One of 'apis', 'views', 'services', 'migrations'
        
    Returns:
        Configured logger instance
        
    Raises:
        ValueError: If category is not recognized
    """
    if category not in LOGGER_LEVELS:
        raise ValueError(f"Unknown logger category: {category}. Must be one of: {list(LOGGER_LEVELS.keys())}")
    
    return logging.getLogger(category)


def set_logger_level(category: str, level: int):
    """
    Dynamically change the log level for a specific logger.
    
    Args:
        category: Logger category name
        level: New logging level (e.g., logging.DEBUG, logging.INFO)
    """
    if category not in LOGGER_LEVELS:
        raise ValueError(f"Unknown logger category: {category}")
    
    logger = logging.getLogger(category)
    logger.setLevel(level)
    LOGGER_LEVELS[category] = level
    
    # Log the change
    services_logger = logging.getLogger(LOGGER_SERVICES)
    services_logger.info(f"Changed {category} logger level to {logging.getLevelName(level)}")


def get_logger_info() -> dict:
    """
    Get information about all configured loggers.
    
    Returns:
        Dictionary with logger names, levels, and status
    """
    info = {}
    for logger_name in LOGGER_LEVELS:
        logger = logging.getLogger(logger_name)
        info[logger_name] = {
            'level': logging.getLevelName(logger.level),
            'level_numeric': logger.level,
            'handlers': len(logger.handlers),
            'propagate': logger.propagate
        }
    return info


# Initialize logging when module is imported
if not logging.getLogger().handlers:
    setup_logging()