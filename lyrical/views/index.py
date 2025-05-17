import yaml
import os  # For constructing path to prompts.yaml
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import login, authenticate
from .. import models
from ..services.llm_service import llm_call
import json
import uuid  # For generating unique task IDs
import threading  # For running LLM call in background
import traceback  # For formatting exception tracebacks

# In-memory store for task status and results.
# For production, use a more robust solution like Redis or a database table.
llm_tasks = {}

# Determine the base directory of the Django project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROMPTS_FILE_PATH = os.path.join(BASE_DIR, "prompts.yaml")


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
    print("Received request to call LLM")
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

    if user_message is None:  # Check if prompt_name exists as a key in the yaml file
        print(f"Error: Prompt '{prompt_name}' not found in prompts.yaml")
        return JsonResponse({"error": f"Prompt '{prompt_name}' not found"}, status=404)

    if not request.user.is_authenticated:
        try:
            request.user = models.User.objects.get(username="mpetrou")
        except models.User.DoesNotExist:
            return JsonResponse({"error": "Default user for unauthenticated request not found."}, status=500)

    try:
        llm_model = models.LLM.objects.get(internal_name="gemini-2.0-flash")
    except models.LLM.DoesNotExist:
        print("Error: LLM model 'gemini-2.0-flash' not found in database.")
        return JsonResponse({"error": "LLM model configuration not found."}, status=500)

    task_id = str(uuid.uuid4())
    llm_tasks[task_id] = {"status": "processing", "result": None}

    print(f"Generated task ID: {task_id} for user: {request.user.username} with prompt: {prompt_name}")

    def task_runner():
        print(f"Task {task_id}: Starting LLM call in background thread for prompt: {prompt_name}.")
        try:
            result = llm_call(user_message=user_message, user=request.user, llm=llm_model)
            llm_tasks[task_id]["status"] = "complete"
            llm_tasks[task_id]["result"] = result
            print(f"Task {task_id}: LLM call complete. Result stored.")
        except Exception as e:
            print(f"Task {task_id}: Error during LLM call: {e}")
            llm_tasks[task_id]["status"] = "error"
            llm_tasks[task_id]["result"] = {"error": str(e), "traceback": traceback.format_exc()}

    thread = threading.Thread(target=task_runner)
    thread.start()

    print(f"Task {task_id}: Background thread started. Returning task ID to client.")
    return JsonResponse({"task_id": task_id, "status": "processing"}, status=202)


def get_llm_result(request, task_id):
    print(f"Received request for result of task ID: {task_id}")
    task_info = llm_tasks.get(task_id)

    if not task_info:
        print(f"Task ID: {task_id} not found.")
        return JsonResponse({"status": "not_found", "error": "Task ID not found."}, status=404)

    if task_info["status"] == "processing":
        print(f"Task ID: {task_id} is still processing.")
        return JsonResponse({"status": "processing"}, status=200)
    elif task_info["status"] == "complete":
        print(f"Task ID: {task_id} is complete. Returning result.")
        return JsonResponse({"status": "complete", "data": task_info["result"]}, safe=False, status=200, content_type="application/json")
    elif task_info["status"] == "error":
        print(f"Task ID: {task_id} encountered an error. Returning error details.")
        return JsonResponse({"status": "error", "data": task_info["result"]}, safe=False, status=200, content_type="application/json")


def browse(request):
    """
    Show the browse page.
    """
    return render(request, "lyrical/browse.html", {
        "active_filter": "browse"
    })
