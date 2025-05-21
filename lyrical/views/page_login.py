from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render
from django.urls import reverse
from django.http import HttpResponseRedirect


def page_login(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("library"))
        else:
            return render(request, "quizly/login.html", {
                "error_message": "Invalid username and/or password."
            })
    else:
        return render(request, "lyrical/login.html")


def action_logout(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))
