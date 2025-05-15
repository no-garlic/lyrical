from django.shortcuts import render
from . import models


def index(request):
    """
    Show the index page with general information about the application.
    """
    return render(request, "lyrical/index.html", {
        "active_filter": "index",
    })
