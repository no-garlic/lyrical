from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
import json
import logging
from ..logging_config import get_logger


logger = get_logger('apis')


@login_required
def api_structure_template_edit(request):
    """
    Edit a template by ID.
    
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

        logger.debug(f"Structure Template edit request data: {json.dumps(edit_data, indent=2)}")

        template_id = edit_data.get("template_id")
        template_name = edit_data.get("template_name")

        # validate template ID is provided
        if not template_id:
            return JsonResponse({"error": "Template ID must be provided"}, status=400)

        # get the template object and verify ownership
        try:
            template = models.SongStructureTemplate.objects.get(id=template_id, user=request.user)
        except models.Song.DoesNotExist:
            return JsonResponse({"error": f"Template with ID {template_id} not found or you don't have permission to edit it"}, status=404)

        # check if template name already exists for this user (if updating name)
        if template_name and template_name.strip() != template.name:
            if models.SongStructureTemplate.objects.filter(name=template_name.strip(), user=request.user).exclude(id=template_id).exists():
                return JsonResponse({"error": f"A template with the name '{template_name}' already exists"}, status=400)

        # update fields based on what was provided
        updates = []
        if template_name:
            old_name = template.name
            template.name = template_name.strip()
            updates.append(f"name from '{old_name}' to '{template.name}'")
        
        template.save()

        logger.info(f"User {request.user.username} updated template {template_id}: {', '.join(updates)}")
        return JsonResponse({"status": "success", "song_id": template.id}, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to edit template for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to edit template. Please try again."}, status=500)
