from django.apps import AppConfig
import threading
import sys
import os


class QuizlyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'quizly'
    
    def ready(self):
        # I only want to run this in the main process, not in the reloader process.
        # This is so I dont double load the model and index when using the development server.
        if 'runserver' in sys.argv:
            # Check if this is the main process or the reloader process
            if not os.environ.get('RUN_MAIN', False):
                # skip loading in the reloader process
                return
        
        # Also skip starting the search thread if we're running migrations
        if 'migrate' in sys.argv or 'makemigrations' in sys.argv:
            return

        # Also skip starting the search thread if we're running tests
        if 'test' in sys.argv:
            return
        
        # Also skip starting the search thread if we're running download_search_model
        if 'download_search_model' in sys.argv:
            return

        # Import here to avoid circular imports
        from .services.faiss_search_service import QuizSemanticSearchService
        
        # Start background thread to load model and index
        print("Starting background loading of resources")
        thread = threading.Thread(target=QuizSemanticSearchService.preload_resources)
        thread.daemon = True
        thread.start()
