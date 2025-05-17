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


# For StreamingHttpResponse, we need a way to pass results from the thread to the response stream.
# This is a simplified mechanism. For robust production systems, consider Django Channels or a proper queue.
task_events = {} # Stores threading.Event objects
task_results_for_streaming = {} # Stores results for active streaming responses

# Determine the base directory of the Django project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROMPTS_FILE_PATH = os.path.join(BASE_DIR, "prompts.yaml")

def stream_llm_response_generator(task_id_event_tuple):
    task_id, event = task_id_event_tuple
    print(f"Stream Generator: Waiting for task {task_id} to complete...")
    
    # Wait for the event to be set by the background thread, with a timeout
    if not event.wait(timeout=300): # Timeout after 5 minutes, adjust as needed
        print(f"Stream Generator: Task {task_id} timed out.")
        yield json.dumps({"error": "Task timed out waiting for LLM response.", "status": "error"})
        # Clean up
        if task_id in task_events: del task_events[task_id]
        if task_id in task_results_for_streaming: del task_results_for_streaming[task_id]
        return

    print(f"Stream Generator: Task {task_id} completed. Retrieving result.")
    result = task_results_for_streaming.get(task_id, {"error": "Result not found after task completion.", "status": "error"})
    
    yield json.dumps(result)
    print(f"Stream Generator: Sent result for task {task_id}.")

    # Clean up after sending the result
    if task_id in task_events: del task_events[task_id]
    if task_id in task_results_for_streaming: del task_results_for_streaming[task_id]


def call_llm(request):
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

    task_id = str(uuid.uuid4())
    event = threading.Event()
    task_events[task_id] = event
    task_results_for_streaming[task_id] = None # Placeholder for the result

    print(f"Generated streaming task ID: {task_id} for user: {current_user.username} with prompt: {prompt_name}")

    def task_runner():
        print(f"Task {task_id}: Starting LLM call in background thread for prompt: {prompt_name}.")
        try:
            # Ensure the user object passed to llm_call is the one we resolved (current_user)
            result = llm_call(user_message=user_message, user=current_user, llm=llm_model)
            task_results_for_streaming[task_id] = result
            print(f"Task {task_id}: LLM call complete. Result stored for streaming.")
        except Exception as e:
            print(f"Task {task_id}: Error during LLM call: {e}")
            detailed_error = {"error": str(e), "traceback": traceback.format_exc(), "status": "error"}
            task_results_for_streaming[task_id] = detailed_error
        finally:
            event.set() # Signal that the task is done (success or failure)
            print(f"Task {task_id}: Event set.")

    thread = threading.Thread(target=task_runner)
    thread.start()

    print(f"Task {task_id}: Background thread started. Returning StreamingHttpResponse.")
    # Pass a tuple (task_id, event) to the generator
    response = StreamingHttpResponse(stream_llm_response_generator((task_id, event)), content_type="application/json")
    return response
