from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
import json
import logging


logger = logging.getLogger(__name__)


@login_required
def api_user_llm(request):
    """
    Edit the users LLM settings.
    
    Args:
        request: The HTTP request object containing PUT data with song_id and updates
    
    Returns:
        JsonResponse: Success/error response
    """
    # validate request method
    if request.method != 'PUT':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        # parse the request body for PUT requests
        edit_data = json.loads(request.body.decode('utf-8'))

        # extract the LLM settings from the request data
        llm_model_id = edit_data.get("llm_model_id")
        llm_temperature = edit_data.get("llm_temperature")
        llm_max_tokens = edit_data.get("llm_max_tokens")

        # validate there is minimum 1 parameter to update
        if not llm_model_id and llm_temperature is None and llm_max_tokens is None:
            return JsonResponse({"error": "At least one parameter (llm_model_id, llm_temperature, llm_max_tokens) must be provided for update"}, status=400)

        # update the user's chosen LLM model
        if llm_model_id:
            try:
                llm_model = models.LLM.objects.get(id=llm_model_id)
                request.user.llm_model = llm_model
            except models.LLM.DoesNotExist:
                return JsonResponse({"error": f"LLM model with ID {llm_model_id} not found"}, status=404)

        # update the user's chosen LLM temperature
        if llm_temperature is not None:
            if not isinstance(llm_temperature, (int, float)) or llm_temperature < 0:
                return JsonResponse({"error": "llm_temperature must be a non-negative number"}, status=400)
            request.user.llm_temperature = float(llm_temperature)

        # update the user's chosen LLM max tokens
        if llm_max_tokens is not None:
            if not isinstance(llm_max_tokens, int) or llm_max_tokens <= 0:
                return JsonResponse({"error": "llm_max_tokens must be a positive integer"}, status=400)
            request.user.llm_max_tokens = int(llm_max_tokens)

        # save the user with updated LLM settings
        request.user.save()
        logger.info(f"User {request.user.username} updated LLM settings: model={
            request.user.llm_model.display_name}, temperature={
                request.user.llm_temperature}, max_tokens={request.user.llm_max_tokens}")
        
        return JsonResponse({"status": "success", "llm_model_id": request.user.llm_model.id}, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to edit the LLM settings for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to edit the LLM settings. Please try again."}, status=500)
