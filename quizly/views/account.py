from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from ..models import *


def login_view(request):
    """
    Handle login request
    """
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("browse"))
        else:
            return render(request, "quizly/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "quizly/login.html", {
            "active_filter": "login"
        })


def logout_view(request):
    """
    Handle logout request
    """
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    """
    Handle registration request
    """
    if request.method == "POST":
        # get the form data
        username = request.POST["username"]
        email = request.POST["email"]
        firstname = request.POST["firstname"]
        lastname = request.POST["lastname"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "quizly/register.html", {
                "message": "Passwords must match.",
                "active_filter": "register"
            })

        try:
            # Attempt to create and save the new user
            user = User.objects.create_user(
                username=username, 
                email=email, 
                password=password,
                first_name=firstname, 
                last_name=lastname)
            user.save()
        except IntegrityError:
            # If username already taken, show error message
            return render(request, "quizly/register.html", {
                "message": "Username already taken.",
                "active_filter": "register"
            })
        # Automatically log the user in after registration
        login(request, user)
        return HttpResponseRedirect(reverse("browse"))
    else:
        # GET request, show the registration form
        return render(request, "quizly/register.html", {
            "active_filter": "register"
        })
