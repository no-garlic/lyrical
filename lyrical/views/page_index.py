import logging
from django.contrib.auth import authenticate, login
from django.shortcuts import render
from django.http import HttpResponseServerError
from django.conf import settings
from .. import models


logger = logging.getLogger('views')


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
        
        return render(request, 'lyrical/index.html', {})
        
    except Exception as e:
        logger.error(f"unexpected error loading index page: {str(e)}")
        return HttpResponseServerError(
            "an error occurred while loading the home page, please try again later"
        )
