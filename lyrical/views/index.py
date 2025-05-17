from django.shortcuts import render
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
        user = authenticate(request, username="mpetrou", password="mike")
        login(request, request.user)

    user_message = """Generate a list of 3 book recommendations about artificial intelligence.
                      For each book include: 
                      1. title 
                      2. author
                      3. publication_year 
                      4. rating (on a scale of 1-5)
                      5. description (short summary)"""
    
    #model_name = "anthropic/claude-3-5-sonnet-latest"
    #model_name = "ollama/gemma3:12b"
    #model_name = "openai/gpt-4o-mini"
    #model_name = "gemini/gemini-2.0-flash"
    #model_name = "ollama/gemma3:12b"

    llm = models.LLM.objects.get(internal_name="gemini-2.0-flash")

    result = llm_call(user_message=user_message, user=request.user, llm=llm)

    return render(request, "lyrical/index.html", {
        "active_filter": "index",
        "json_data": json.dumps(result, indent=4),
    })

def browse(request):
    """
    Show the browse page.
    """
    return render(request, "lyrical/browse.html", {
        "active_filter": "browse"
    })
