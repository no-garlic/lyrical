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
from ..services.utils import prompts


def call_llm_view(request):
    print("Received request to call LLM (Streaming)")
    prompt_name = request.GET.get("prompt")

    if not prompt_name:
        return JsonResponse({"error": "Prompt name not provided"}, status=400)

    current_user = request.user
    if not current_user.is_authenticated:
        try:
            current_user = models.User.objects.get(username="mpetrou") # Use a specific user for unauthenticated
        except models.User.DoesNotExist:
            return JsonResponse({"error": "Default user for unauthenticated request not found."}, status=500)

    try:
        #llm_model = models.LLM.objects.get(internal_name="gemini-2.0-flash")
        llm_model_name = "gemini-2.0-flash" # This should be dynamic based on user or request
        llm_model = models.LLM.objects.get(internal_name=llm_model_name)
    except models.LLM.DoesNotExist:
        print(f"Error: LLM model '{llm_model_name}' not found in database.")
        return JsonResponse({"error": "LLM model configuration not found."}, status=500)

    # Get the prompt from the YAML file
    user_message = prompts.get(prompt_name, llm_model)

    if user_message is None:
        print(f"Error: Prompt '{prompt_name}' not found in prompts.yaml")
        return JsonResponse({"error": f"Prompt '{prompt_name}' not found"}, status=404)


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
