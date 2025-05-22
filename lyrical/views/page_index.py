from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render
from .. import models


def page_index(request):

    if not request.user.is_authenticated:
        user = authenticate(request, username="mpetrou", password="mike")
        if user is not None:
            login(request, user)

    return render(request, 'lyrical/index.html', {
    })
