import time
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import login, authenticate
from .. import models
from ..services.llm_service import llm_call
import json

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


def call_llm(request):
    print("Calling LLM")
    user_message = """Generate a list of 10 book names recommendations about artificial intelligence.
                      For each book include: 
                      1. the book title 
                      """

    llm = models.LLM.objects.get(internal_name="gemini-2.0-flash")
    result = llm_call(user_message=user_message, user=request.user, llm=llm)

    #result[0]["status"] = "success"
    #print(result)

    print("LLM call complete, sending response")
    return JsonResponse(result, safe=False, status=200, content_type="application/json")


def browse(request):
    """
    Show the browse page.
    """
    return render(request, "lyrical/browse.html", {
        "active_filter": "browse"
    })
