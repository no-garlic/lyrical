import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from django.db.models.functions import Lower
from .. import models


logger = logging.getLogger(__name__)


@login_required
def page_names(request):
    """
    render the song names page showing categorized songs by stage
    
    args:
        request: django http request object
        
    returns:
        httpresponse: rendered names page with song lists or error page
    """
    try:
        # validate user is authenticated (decorator should handle this, but double-check)
        if not request.user.is_authenticated:
            logger.warning("unauthenticated user attempted to access names page")
            return render(request, "lyrical/login.html", {
                "error_message": "you must be logged in to access this page"
            })
        
        # fetch songs organized by stage with error handling
        try:
            new_songs = models.Song.objects.filter(
                user=request.user, 
                stage='new'
            ).order_by(Lower('name'))
            
            liked_songs = models.Song.objects.filter(
                user=request.user, 
                stage='liked'
            ).order_by(Lower('name'))
            
            disliked_songs = models.Song.objects.filter(
                user=request.user, 
                stage='disliked'
            ).order_by(Lower('name'))

            # log successful data retrieval
            total_songs = new_songs.count() + liked_songs.count() + disliked_songs.count()
            logger.info(f"names page loaded for user '{request.user.username}' with {total_songs} songs")
            
        except Exception as db_error:
            logger.error(f"database error fetching songs for user '{request.user.username}': {str(db_error)}")
            return render(request, "lyrical/names.html", {
                "active_page": "names",
                "llm_models": models.LLM.objects.all(),
                "page_name": "SONG NAMES",
                "new_songs": [],
                "liked_songs": [],
                "disliked_songs": [],
                "error_message": "unable to load your songs at this time, please try again later"
            })
        
        # prepare context data for template
        context = {
            "active_page": "names",
            "page_name": "SONG NAMES",
            "llm_models": models.LLM.objects.all(),
            "new_songs": new_songs,
            "liked_songs": liked_songs,
            "disliked_songs": disliked_songs,
        }

        return render(request, "lyrical/names.html", context)
        
    except Exception as e:
        logger.error(f"unexpected error loading names page for user '{request.user.username}': {str(e)}")
        return HttpResponseServerError(
            "an error occurred while loading the page, please try again later"
        )