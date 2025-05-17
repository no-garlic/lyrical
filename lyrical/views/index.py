from django.shortcuts import render
from .. import models
from ..services.llm_service import *
import json

def index(request):
    """
    Show the index page with general information about the application.
    """

    user_message = """Generate a list of 3 book recommendations about artificial intelligence.
                      For each book include: 
                      1. title 
                      2. author
                      3. publication_year 
                      4. rating (on a scale of 1-5)
                      5. description (short summary)"""
    

    result = invoke_json(user_message)
    print(json.dumps(result, indent=4))

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
