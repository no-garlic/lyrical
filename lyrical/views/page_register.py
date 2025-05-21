from django.contrib.auth import login
from django.db import IntegrityError
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from ..models import *


def page_register(request):
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
            return render(request, "lyrical/register.html", {
                "error_message": "Passwords must match."
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
            return render(request, "lyrical/register.html", {
                "error_message": "Username already taken."
            })
        
        # Automatically log the user in after registration
        login(request, user)
        return HttpResponseRedirect(reverse("library"))
    else:
        # GET request, show the registration form
        return render(request, "lyrical/register.html")
