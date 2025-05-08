import json
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, redirect
from django.urls import reverse
from django import forms
from django.core.paginator import Paginator
from .models import *


def index(request):
    return render(request, "quizly/index.html", {
        "active_filter": "index",
    })


def quiz(request):
    return render(request, "quizly/index.html", {
        "active_filter": "create",
    })


def browse(request):
    return render(request, "quizly/index.html", {
        "active_filter": "browse",
    })


def search(request):
    return render(request, "quizly/index.html", {
        "active_filter": "search",
    })

def profile(request):
    return render(request, "quizly/index.html", {
        "active_filter": "profile",
    })


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
            return HttpResponseRedirect(reverse("index"))
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
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "quizly/register.html", {
                "message": "Passwords must match.",
                "active_filter": "register"
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "quizly/register.html", {
                "message": "Username already taken.",
                "active_filter": "register"
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "quizly/register.html", {
            "active_filter": "register"
        })
