import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from pathlib import Path
from .. import models


logger = logging.getLogger(__name__)


@login_required
def page_profile(request):
    """
    render the user profile page showing account information and settings
    
    args:
        request: django http request object
        
    returns:
        httpresponse: rendered profile page with user data or error page
    """
    try:
        # validate user is authenticated
        if not request.user.is_authenticated:
            logger.warning("unauthenticated user attempted to access profile page")
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
        
        # gather user statistics with error handling
        try:
            user_songs_count = models.Song.objects.filter(user=request.user).count()
            user_new_songs_count = models.Song.objects.filter(user=request.user, stage='new').count()
            user_liked_songs_count = models.Song.objects.filter(user=request.user, stage='liked').count()
            user_disliked_songs_count = models.Song.objects.filter(user=request.user, stage='disliked').count()
            
            logger.info(f"profile page loaded for user '{request.user.username}' with {user_songs_count} total songs")
            
        except Exception as db_error:
            logger.error(f"database error fetching user statistics for '{request.user.username}': {str(db_error)}")
            # set default values if database query fails
            user_songs_count = 0
            user_new_songs_count = 0
            user_liked_songs_count = 0
            user_disliked_songs_count = 0
        
        # prepare template context with user information
        context = {
            "active_page": "profile",
            "user": request.user,
            "user_songs_count": user_songs_count,
            "user_new_songs_count": user_new_songs_count,
            "user_liked_songs_count": user_liked_songs_count,
            "user_disliked_songs_count": user_disliked_songs_count,
        }
        
        return render(request, html_file, context)
        
    except Exception as e:
        logger.error(f"unexpected error loading profile page for user '{request.user.username}': {str(e)}")
        return HttpResponseServerError(
            "an error occurred while loading the profile page, please try again later"
        )