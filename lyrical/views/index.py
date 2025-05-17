import yaml
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import login, authenticate
from .. import models
from ..services.llm_service import llm_call
import json
import uuid  # For generating unique task IDs
import threading  # For running LLM call in background

# In-memory store for task status and results.
# For production, use a more robust solution like Redis or a database table.
llm_tasks = {}

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

    with open("prompts.yaml", "r") as f:
        prompts = yaml.safe_load(f)
    user_message = prompts.get("book_names")

    llm_model = models.LLM.objects.get(internal_name="gemini-2.0-flash")  # Renamed llm to llm_model to avoid conflict

    task_id = str(uuid.uuid4())
    llm_tasks[task_id] = {"status": "processing", "result": None}

    print(f"Generated task ID: {task_id} for user: {request.user.username}")

    # Define a target function for the thread
    def task_runner():
        print(f"Task {task_id}: Starting LLM call in background thread.")
        try:
            result = llm_call(user_message=user_message, user=request.user, llm=llm_model)
            llm_tasks[task_id]["status"] = "complete"
            llm_tasks[task_id]["result"] = result
            print(f"Task {task_id}: LLM call complete. Result stored.")
        except Exception as e:
            print(f"Task {task_id}: Error during LLM call: {e}")
            llm_tasks[task_id]["status"] = "error"
            llm_tasks[task_id]["result"] = {"error": str(e)}

    # Start the LLM call in a new thread
    thread = threading.Thread(target=task_runner)
    thread.start()

    print(f"Task {task_id}: Background thread started. Returning task ID to client.")
    return JsonResponse({"task_id": task_id, "status": "processing"}, status=202)  # 202 Accepted


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
        print(f"Task ID: {task_id} encountered an error.")
        return JsonResponse({"status": "error", "data": task_info["result"]}, safe=False, status=200, content_type="application/json")


def browse(request):
    """
    Show the browse page.
    """
    return render(request, "lyrical/browse.html", {
        "active_filter": "browse"
    })
