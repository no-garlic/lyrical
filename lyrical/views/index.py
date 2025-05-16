from django.shortcuts import render
from .. import models
from ..services.llm_service import *
import json

def index(request):
    """
    Show the index page with general information about the application.
    """

    llm = models.LLM.objects.get(name="Claude 3.5")

    print(f"Model: {llm.name}, Provider: {llm.provider.name}")
    prompt = "Please provide a JSON object with the following structure: {\"name\": \"string\", \"age\": \"integer\"}"
    result = invoke_json(llm, prompt)
    print(json.dumps(result, indent=4))

    return render(request, "lyrical/index.html", {
        "active_filter": "index",
    })

def browse(request):
    """
    Show the browse page.
    """
    return render(request, "lyrical/browse.html", {
        "active_filter": "browse"
    })
