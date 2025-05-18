from django.http import JsonResponse, StreamingHttpResponse
from ..services.llm_service import llm_call
from ..services.utils import prompts
from .. import models


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
        llm_model_name = "gemini-2.0-flash"
        llm_model = models.LLM.objects.get(internal_name=llm_model_name)
    except models.LLM.DoesNotExist:
        print(f"Error: LLM model '{llm_model_name}' not found in database.")
        return JsonResponse({"error": "LLM model configuration not found."}, status=500)

    # Get the prompt from the YAML file
    user_message = prompts.get(prompt_name, llm_model)

    if user_message is None:
        print(f"Error: Prompt '{prompt_name}' not found in prompts.yaml")
        return JsonResponse({"error": f"Prompt '{prompt_name}' not found"}, status=404)

    # Call the LLM with the user message and stream the response
    response_stream_generator = llm_call(user_message=user_message, user=current_user, llm=llm_model)
    
    # If llm_call yields JSON strings for each chunk (e.g., for structured streaming):
    return StreamingHttpResponse(response_stream_generator, content_type="application/x-ndjson") # Changed to application/x-ndjson
