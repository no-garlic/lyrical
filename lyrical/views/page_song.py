import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from pathlib import Path
from .. import models


logger = logging.getLogger(__name__)


@login_required
def page_song(request):
    """
    render the song selection/editing page with navigation structure
    
    args:
        request: django http request object
        
    returns:
        httpresponse: rendered song page with navigation or error page
    """
    try:
        # validate user is authenticated
        if not request.user.is_authenticated:
            logger.warning("unauthenticated user attempted to access song page")
            return render(request, "lyrical/login.html", {
                "error_message": "you must be logged in to access this page"
            })
        
        # determine template file path safely
        try:
            page_name = Path(__file__).name.split(".")[0].replace("page_", "")
            html_file = f"lyrical/{page_name}.html"
            
            # validate page name contains only safe characters
            if not page_name.replace('_', '').isalnum():
                logger.error(f"invalid page name detected: '{page_name}'")
                raise ValueError("invalid page name format")
                
            logger.debug(f"rendering template: {html_file}")
            
        except Exception as path_error:
            logger.error(f"error determining template path: {str(path_error)}")
            return HttpResponseServerError(
                "unable to load page template, please try again later"
            )
        
        # prepare navigation context with validation
        navigation_items = [
            {"name": "SONG", "url": "song", "active": True, "selected": True, "enabled": True},
            {"name": "PREPARE", "url": "prepare", "active": False, "selected": False, "enabled": False},
            {"name": "LYRICS", "url": "lyrics", "active": False, "selected": False, "enabled": False},
            {"name": "STRUCTURE", "url": "structure", "active": False, "selected": False, "enabled": False},
        ]
        
        # validate navigation structure
        for item in navigation_items:
            if not all(key in item for key in ["name", "url", "active", "selected", "enabled"]):
                logger.error("invalid navigation item structure detected")
                return HttpResponseServerError(
                    "navigation configuration error, please contact support"
                )
        
        # gather user's songs for song selection context
        try:
            user_songs = models.Song.objects.filter(user=request.user).order_by('-updated_at')
            songs_count = user_songs.count()
            
            logger.info(f"song page loaded for user '{request.user.username}' with {songs_count} available songs")
            
        except Exception as db_error:
            logger.error(f"database error fetching songs for user '{request.user.username}': {str(db_error)}")
            # provide empty list if database query fails
            user_songs = []
            songs_count = 0
        
        # prepare template context
        context = {
            "active_page": "edit",
            "navigation": navigation_items,
            "user_songs": user_songs,
            "songs_count": songs_count,
        }
        
        logger.info(f"song page loaded successfully for user '{request.user.username}'")
        return render(request, html_file, context)
        
    except Exception as e:
        logger.error(f"unexpected error loading song page for user '{request.user.username}': {str(e)}")
        return HttpResponseServerError(
            "an error occurred while loading the page, please try again later"
        )