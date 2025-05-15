from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from ..models import *


def profile(request, username):
    """
    Show the profile page of a user.
    """
    # Get the user object
    user = User.objects.get(username=username)

    # Render the profile page with user and playlists data
    return render(request, "lyrical/profile.html", {
        "profile_user": user,
        "active_filter": "profile"
    })
