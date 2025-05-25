import logging
from django.contrib.auth import authenticate, login
from django.shortcuts import render
from django.http import HttpResponseServerError
from django.conf import settings
from .. import models


logger = logging.getLogger(__name__)


def page_index(request):
    """
    render the main index/home page with optional development user authentication
    
    args:
        request: django http request object
        
    returns:
        httpresponse: rendered index page or error page
    """
    try:
        # handle automatic authentication for development environment
        if not request.user.is_authenticated:
            # only attempt auto-login in development mode
            if getattr(settings, 'DEBUG', False):
                try:
                    user = authenticate(request, username="mpetrou", password="mike")
                    if user is not None:
                        login(request, user)
                        logger.info(f"development auto-login successful for user '{user.username}'")
                    else:
                        logger.warning("development auto-login failed: invalid credentials")
                        
                except Exception as auth_error:
                    logger.error(f"development auto-login error: {str(auth_error)}")
                    # continue without authentication rather than failing
            else:
                logger.debug("production environment - skipping auto-login")
        
        # gather basic page statistics for display
        try:
            total_users = models.User.objects.count()
            total_songs = models.Song.objects.count()
            
            logger.debug(f"index page stats: {total_users} users, {total_songs} songs")
            
        except Exception as stats_error:
            logger.error(f"error gathering index page statistics: {str(stats_error)}")
            # set default values if database query fails
            total_users = 0
            total_songs = 0
        
        # prepare template context
        context = {
            "total_users": total_users,
            "total_songs": total_songs,
            "is_authenticated": request.user.is_authenticated,
        }
        
        if request.user.is_authenticated:
            context["username"] = request.user.username
            logger.info(f"index page loaded for authenticated user '{request.user.username}'")
        else:
            logger.info("index page loaded for anonymous user")
        
        return render(request, 'lyrical/index.html', context)
        
    except Exception as e:
        logger.error(f"unexpected error loading index page: {str(e)}")
        return HttpResponseServerError(
            "an error occurred while loading the home page, please try again later"
        )
