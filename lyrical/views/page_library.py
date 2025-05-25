import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from pathlib import Path
from .. import models


logger = logging.getLogger(__name__)


@login_required
def page_library(request):
    """
    render the song library page showing user's song collection
    
    args:
        request: django http request object
        
    returns:
        httpresponse: rendered library page with user songs or error page
    """
    try:
        # validate user is authenticated
        if not request.user.is_authenticated:
            logger.warning("unauthenticated user attempted to access library page")
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
        
        # fetch user's songs with error handling
        try:
            user_songs = models.Song.objects.filter(user=request.user).order_by('-updated_at')
            songs_count = user_songs.count()
            
            logger.info(f"library page loaded for user '{request.user.username}' with {songs_count} songs")
            
        except Exception as db_error:
            logger.error(f"database error fetching songs for user '{request.user.username}': {str(db_error)}")
            user_songs = []
            songs_count = 0
        
        # prepare template context
        context = {
            "active_page": "library",
            "page_name": "SONG LIBRARY",
            "songs": user_songs,
            "songs_count": songs_count,
        }
        
        return render(request, html_file, context)
        
    except Exception as e:
        logger.error(f"unexpected error loading library page for user '{request.user.username}': {str(e)}")
        return HttpResponseServerError(
            "an error occurred while loading the library page, please try again later"
        )