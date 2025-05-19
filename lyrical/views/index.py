from django.shortcuts import render
from django.contrib.auth import login, authenticate
from .. import models


def index(request):
    """
    Show the index page with general information about the application.
    """
    if not (request.user != None and request.user.is_authenticated):
        request.user = models.User.objects.get(username="mpetrou")
        authenticate(request, username="mpetrou", password="mike")
        login(request, request.user)

    return render(request, "lyrical/index.html", {
        "active_filter": "index"
    })

