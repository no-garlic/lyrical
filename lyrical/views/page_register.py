import logging
import re
from django.contrib.auth import login
from django.db import IntegrityError
from django.http import HttpResponseRedirect, HttpResponseServerError
from django.shortcuts import render
from django.urls import reverse
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from ..models import User


logger = logging.getLogger(__name__)


def page_register(request):
    """
    handle user registration with comprehensive validation and error handling
    
    args:
        request: django http request object
        
    returns:
        httpresponse: redirect to library on success or registration page with errors
    """
    try:
        if request.method == "POST":
            # extract and validate form data
            username = request.POST.get("username", "").strip()
            email = request.POST.get("email", "").strip().lower()
            firstname = request.POST.get("firstname", "").strip()
            lastname = request.POST.get("lastname", "").strip()
            password = request.POST.get("password", "")
            confirmation = request.POST.get("confirmation", "")
            
            # validate required fields
            if not username:
                logger.warning("registration failed: missing username")
                return render(request, "lyrical/register.html", {
                    "error_message": "username is required for registration"
                })
            
            if not email:
                logger.warning(f"registration failed for username '{username}': missing email")
                return render(request, "lyrical/register.html", {
                    "error_message": "email address is required for registration"
                })
            
            if not firstname:
                logger.warning(f"registration failed for username '{username}': missing first name")
                return render(request, "lyrical/register.html", {
                    "error_message": "first name is required for registration"
                })
            
            if not lastname:
                logger.warning(f"registration failed for username '{username}': missing last name")
                return render(request, "lyrical/register.html", {
                    "error_message": "last name is required for registration"
                })
            
            if not password:
                logger.warning(f"registration failed for username '{username}': missing password")
                return render(request, "lyrical/register.html", {
                    "error_message": "password is required for registration"
                })
            
            # validate username format and length
            if len(username) < 3:
                logger.warning(f"registration failed: username '{username}' too short")
                return render(request, "lyrical/register.html", {
                    "error_message": "username must be at least 3 characters long"
                })
            
            if len(username) > 150:
                logger.warning(f"registration failed: username '{username}' too long")
                return render(request, "lyrical/register.html", {
                    "error_message": "username cannot exceed 150 characters"
                })
            
            # validate username contains only allowed characters
            if not re.match(r'^[a-zA-Z0-9_-]+$', username):
                logger.warning(f"registration failed: invalid username format '{username}'")
                return render(request, "lyrical/register.html", {
                    "error_message": "username can only contain letters, numbers, hyphens, and underscores"
                })
            
            # validate email format
            try:
                validate_email(email)
            except ValidationError:
                logger.warning(f"registration failed for username '{username}': invalid email format '{email}'")
                return render(request, "lyrical/register.html", {
                    "error_message": "please enter a valid email address"
                })
            
            # validate name fields length and format
            if len(firstname) > 150:
                logger.warning(f"registration failed for username '{username}': first name too long")
                return render(request, "lyrical/register.html", {
                    "error_message": "first name cannot exceed 150 characters"
                })
            
            if len(lastname) > 150:
                logger.warning(f"registration failed for username '{username}': last name too long")
                return render(request, "lyrical/register.html", {
                    "error_message": "last name cannot exceed 150 characters"
                })
            
            # validate names contain only letters, spaces, hyphens, and apostrophes
            name_pattern = r'^[a-zA-Z\s\'-]+$'
            if not re.match(name_pattern, firstname):
                logger.warning(f"registration failed for username '{username}': invalid first name format")
                return render(request, "lyrical/register.html", {
                    "error_message": "first name can only contain letters, spaces, hyphens, and apostrophes"
                })
            
            if not re.match(name_pattern, lastname):
                logger.warning(f"registration failed for username '{username}': invalid last name format")
                return render(request, "lyrical/register.html", {
                    "error_message": "last name can only contain letters, spaces, hyphens, and apostrophes"
                })
            
            # validate password strength
            if len(password) < 8:
                logger.warning(f"registration failed for username '{username}': password too short")
                return render(request, "lyrical/register.html", {
                    "error_message": "password must be at least 8 characters long"
                })
            
            if len(password) > 128:
                logger.warning(f"registration failed for username '{username}': password too long")
                return render(request, "lyrical/register.html", {
                    "error_message": "password cannot exceed 128 characters"
                })
            
            # ensure password matches confirmation
            if password != confirmation:
                logger.warning(f"registration failed for username '{username}': password mismatch")
                return render(request, "lyrical/register.html", {
                    "error_message": "password and confirmation must match exactly"
                })
            
            # check if username or email already exists
            try:
                if User.objects.filter(username=username).exists():
                    logger.warning(f"registration failed: username '{username}' already exists")
                    return render(request, "lyrical/register.html", {
                        "error_message": "username is already taken, please choose a different one"
                    })
                
                if User.objects.filter(email=email).exists():
                    logger.warning(f"registration failed: email '{email}' already exists")
                    return render(request, "lyrical/register.html", {
                        "error_message": "email address is already registered, please use a different one"
                    })
                
            except Exception as check_error:
                logger.error(f"error checking existing users during registration: {str(check_error)}")
                return render(request, "lyrical/register.html", {
                    "error_message": "unable to verify account uniqueness, please try again later"
                })
            
            # attempt to create new user
            try:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=firstname,
                    last_name=lastname
                )
                user.save()
                
                logger.info(f"new user '{username}' registered successfully")
                
                # automatically log the user in after registration
                login(request, user)
                logger.info(f"user '{username}' logged in automatically after registration")
                
                return HttpResponseRedirect(reverse("library"))
                
            except IntegrityError as integrity_error:
                logger.error(f"registration failed for username '{username}': integrity error - {str(integrity_error)}")
                return render(request, "lyrical/register.html", {
                    "error_message": "username or email is already taken, please choose different values"
                })
            
            except Exception as create_error:
                logger.error(f"registration failed for username '{username}': user creation error - {str(create_error)}")
                return render(request, "lyrical/register.html", {
                    "error_message": "unable to create account, please try again later"
                })
        
        else:
            # handle get request - show registration form
            return render(request, "lyrical/register.html")
    
    except Exception as e:
        logger.error(f"unexpected error during registration process: {str(e)}")
        return HttpResponseServerError(
            "an error occurred while processing your registration, please try again later"
        )
