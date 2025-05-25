import logging
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render
from django.urls import reverse
from django.http import HttpResponseRedirect


logger = logging.getLogger(__name__)


def page_login(request):
    """
    handle user login authentication and render login page
    
    args:
        request: django http request object
        
    returns:
        httpresponse: redirect to library on success or login page with errors
    """
    try:
        if request.method == "POST":
            # validate required fields are present
            username = request.POST.get("username", "").strip()
            password = request.POST.get("password", "")
            
            if not username:
                logger.warning("login attempt failed: missing username")
                return render(request, "lyrical/login.html", {
                    "error_message": "username is required to log in"
                })
            
            if not password:
                logger.warning(f"login attempt failed for user '{username}': missing password")
                return render(request, "lyrical/login.html", {
                    "error_message": "password is required to log in"
                })
            
            # validate username length and format
            if len(username) > 150:
                logger.warning(f"login attempt failed: username too long ({len(username)} characters)")
                return render(request, "lyrical/login.html", {
                    "error_message": "username cannot exceed 150 characters"
                })
            
            # attempt to authenticate user
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                if user.is_active:
                    login(request, user)
                    logger.info(f"user '{username}' logged in successfully")
                    return HttpResponseRedirect(reverse("library"))
                else:
                    logger.warning(f"login attempt failed for user '{username}': account is deactivated")
                    return render(request, "lyrical/login.html", {
                        "error_message": "your account has been deactivated, please contact support"
                    })
            else:
                logger.warning(f"login attempt failed for user '{username}': invalid credentials")
                return render(request, "lyrical/login.html", {
                    "error_message": "the username or password you entered is incorrect"
                })
        else:
            # handle get request - show login form
            return render(request, "lyrical/login.html")
            
    except Exception as e:
        logger.error(f"unexpected error during login process: {str(e)}")
        return render(request, "lyrical/login.html", {
            "error_message": "an error occurred while processing your login, please try again"
        })


def action_logout(request):
    """
    handle user logout and redirect to index page
    
    args:
        request: django http request object
        
    returns:
        httpresponseRedirect: redirect to index page
    """
    try:
        if request.user.is_authenticated:
            username = request.user.username
            logout(request)
            logger.info(f"user '{username}' logged out successfully")
        else:
            logger.warning("logout attempt by unauthenticated user")
            
        return HttpResponseRedirect(reverse("index"))
        
    except Exception as e:
        logger.error(f"unexpected error during logout process: {str(e)}")
        # still redirect to index even if logout fails
        return HttpResponseRedirect(reverse("index"))
