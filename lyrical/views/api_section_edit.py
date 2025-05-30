from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
import json
import logging


logger = logging.getLogger('apis')


@login_required
def api_section_edit(request):
    """
    Edit a section by ID.
    
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

        section_id = edit_data.get("section_id")
        hidden = edit_data.get("hidden")

        # validate section ID is provided
        if not section_id:
            return JsonResponse({"error": "Section ID must be provided"}, status=400)

        # must provide the hidden flag
        if hidden is None:
            return JsonResponse({"error": "Hidden flag must be provided for update"}, status=400)

        # get the section object and verify ownership
        try:
            section = models.Section.objects.get(id=section_id)
        except models.Section.DoesNotExist:
            return JsonResponse({"error": f"Section with ID {section_id} not found or you don't have permission to edit it"}, status=404)

        # change the hidden status and save
        section.hidden = hidden
        section.save()

        logger.info(f"User {request.user.username} updated section {section_id} hidden status to {hidden}")
       
        return JsonResponse({"status": "success", "section_id": section.id}, status=200)
    
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to edit section for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to edit section. Please try again."}, status=500)
