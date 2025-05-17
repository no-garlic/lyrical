import yaml
import os
from django.http import JsonResponse, StreamingHttpResponse
from django.contrib.auth import login, authenticate
import uuid
import threading
import traceback
import json
import time
from .. import models
from ..services.llm_service import llm_call

# Determine the base directory of the Django project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROMPTS_FILE_PATH = os.path.join(BASE_DIR, "prompts.yaml")

def call_llm_view(request):
    print("Received request to call LLM (Streaming)")
    prompt_name = request.GET.get("prompt")

    if not prompt_name:
        return JsonResponse({"error": "Prompt name not provided"}, status=400)

    try:
        with open(PROMPTS_FILE_PATH, "r") as f:
            prompts = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"Error: prompts.yaml not found at {PROMPTS_FILE_PATH}")
        return JsonResponse({"error": "Prompts configuration file not found."}, status=500)
    except yaml.YAMLError:
        print(f"Error: Could not parse prompts.yaml at {PROMPTS_FILE_PATH}")
        return JsonResponse({"error": "Error parsing prompts configuration file."}, status=500)

    user_message = prompts.get(prompt_name)

    if user_message is None:
        print(f"Error: Prompt '{prompt_name}' not found in prompts.yaml")
        return JsonResponse({"error": f"Prompt '{prompt_name}' not found"}, status=404)

    current_user = request.user
    if not current_user.is_authenticated:
        try:
            current_user = models.User.objects.get(username="mpetrou") # Use a specific user for unauthenticated
        except models.User.DoesNotExist:
            return JsonResponse({"error": "Default user for unauthenticated request not found."}, status=500)

    try:
        llm_model = models.LLM.objects.get(internal_name="gemini-2.0-flash")
    except models.LLM.DoesNotExist:
        print("Error: LLM model 'gemini-2.0-flash' not found in database.")
        return JsonResponse({"error": "LLM model configuration not found."}, status=500)

    # The llm_call service function is now a generator.
    # We pass this generator directly to StreamingHttpResponse.
    # Django will iterate over it and send each yielded chunk to the client.
    response_stream_generator = llm_call(user_message=user_message, user=current_user, llm=llm_model)
    
    # Set content type to 'text/event-stream' for Server-Sent Events (SSE)
    # or 'application/x-ndjson' (newline delimited JSON) if preferred for simpler client parsing.
    # For this example, we'll use 'application/json' and assume the client will concatenate
    # the stream into a single JSON string before parsing. This is simpler for the current JS client.
    # A more robust SSE or ndjson approach would require client-side changes.
    # For now, we'll stream raw text chunks and let the client accumulate them.
    # The client-side will need to handle assembling these chunks.
    
    # If llm_call yields JSON strings for each chunk (e.g., for structured streaming):
    return StreamingHttpResponse(response_stream_generator, content_type="application/x-ndjson") # Changed to application/x-ndjson

    # If llm_call yields raw text chunks that form a single JSON at the end:
    # return StreamingHttpResponse(response_stream_generator, content_type="application/json")
