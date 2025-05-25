import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from pathlib import Path
from .. import models


logger = logging.getLogger(__name__)


@login_required
def page_prepare(request):
    """
    render the song preparation page for editing song details before lyrics generation
    
    args:
        request: django http request object
        
    returns:
        httpresponse: rendered prepare page with navigation or error page
    """
    try:
        # validate user is authenticated
        if not request.user.is_authenticated:
            logger.warning("unauthenticated user attempted to access prepare page")
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
            {"name": "SONG", "url": "song", "active": True, "selected": False, "enabled": True},
            {"name": "PREPARE", "url": "prepare", "active": True, "selected": True, "enabled": True},
            {"name": "LYRICS", "url": "lyrics", "active": False, "selected": False, "enabled": True},
            {"name": "STRUCTURE", "url": "structure", "active": False, "selected": False, "enabled": False},
        ]
        
        # validate navigation structure
        for item in navigation_items:
            if not all(key in item for key in ["name", "url", "active", "selected", "enabled"]):
                logger.error("invalid navigation item structure detected")
                return HttpResponseServerError(
                    "navigation configuration error, please contact support"
                )
        
        # prepare template context
        context = {
            "active_page": "edit",
            "llm_models": models.LLM.objects.all(),
            "navigation": navigation_items,
        }
        
        logger.info(f"prepare page loaded successfully for user '{request.user.username}'")
        return render(request, html_file, context)
        
    except Exception as e:
        logger.error(f"unexpected error loading prepare page for user '{request.user.username}': {str(e)}")
        return HttpResponseServerError(
            "an error occurred while loading the page, please try again later"
        )