import logging
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from django.conf import settings
from .. import models


logger = logging.getLogger(__name__)


def test_streaming(request):
    """
    render the streaming test page for development and testing purposes
    this view handles automatic authentication for testing environments only
    
    args:
        request: django http request object
        
    returns:
        httpresponse: rendered streaming test page or error response
    """
    try:
        # check if user is already authenticated
        if request.user.is_authenticated:
            logger.info(f"streaming test page accessed by authenticated user '{request.user.username}'")
            return render(request, "lyrical/api_test_streaming.html", {
                "user": request.user,
                "page_title": "streaming test interface"
            })
        
        # only allow automatic authentication in development/testing environments
        if not getattr(settings, 'DEBUG', False):
            logger.warning("streaming test page accessed in production without authentication")
            return redirect('page_login')
        
        # attempt automatic authentication for testing (development only)
        try:
            test_user = models.User.objects.get(username="mpetrou")
            
            # authenticate the test user
            authenticated_user = authenticate(request, username="mpetrou", password="mike")
            
            if authenticated_user is not None and authenticated_user.is_active:
                login(request, authenticated_user)
                logger.info("automatic test authentication successful for streaming test page")
                
                return render(request, "lyrical/api_test_streaming.html", {
                    "user": authenticated_user,
                    "page_title": "streaming test interface",
                    "test_mode": True
                })
            else:
                logger.error("automatic test authentication failed: user authentication failed")
                return render(request, "lyrical/api_test_streaming.html", {
                    "error_message": "test authentication failed, please login manually",
                    "page_title": "streaming test interface"
                })
                
        except models.User.DoesNotExist:
            logger.error("automatic test authentication failed: test user 'mpetrou' does not exist")
            return render(request, "lyrical/api_test_streaming.html", {
                "error_message": "test user not found, please login manually",
                "page_title": "streaming test interface"
            })
        
        except Exception as auth_error:
            logger.error(f"automatic test authentication failed: {str(auth_error)}")
            return render(request, "lyrical/api_test_streaming.html", {
                "error_message": "authentication error occurred, please login manually",
                "page_title": "streaming test interface"
            })
    
    except Exception as e:
        logger.error(f"unexpected error in streaming test page: {str(e)}")
        return HttpResponseServerError(
            "an error occurred while loading the streaming test page"
        )

