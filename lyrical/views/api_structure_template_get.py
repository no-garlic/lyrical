from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
import json
import logging
from ..logging_config import get_logger


logger = get_logger('apis')


@login_required
def api_structure_template_get(request):
    """
    Edit a template by ID.
    
    Args:
        request: The HTTP request object containing PUT data with song_id and updates
    
    Returns:
        JsonResponse: Success/error response
    """
    # validate request method
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        # parse the request body for PUT requests
        get_data = json.loads(request.body.decode('utf-8'))

        logger.debug(f"Structure Template get request data: {json.dumps(get_data, indent=2)}")

        template_id = get_data.get("template_id")

        # validate template ID is provided
        if not template_id:
            return JsonResponse({"error": "Template ID must be provided"}, status=400)

        # get the template object and verify ownership
        try:
            template = models.SongStructureTemplate.objects.get(id=template_id, user=request.user)
        except models.SongStructureTemplate.DoesNotExist:
            return JsonResponse({"error": f"Template with ID {template_id} not found or you don't have permission to get it"}, status=404)

        # serialize the template data
        template_data = {
            "template_id": template.id,
            "template_name": template.name,
            "intro_lines": template.intro_lines,
            "outro_lines": template.outro_lines,
            "verse_count": template.verse_count,
            "verse_lines": template.verse_lines,
            "pre_chorus_lines": template.pre_chorus_lines,
            "chorus_lines": template.chorus_lines,
            "bridge_lines": template.bridge_lines,
            "average_syllables": template.average_syllables,
            "vocalisation_level": template.vocalisation_level,
            "vocalisation_lines": template.vocalisation_lines,
            "vocalisation_terms": template.vocalisation_terms,
            "custom_request": template.custom_request,
            "structure": template.structure,
        }

        logger.info(f"User {request.user.username} retrieved template {template_id}, \n {template_data}")
        return JsonResponse({"status": "success", "data": template_data}, status=200)
    
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    
    except Exception as e:
        logger.error(f"Failed to get template for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to get template. Please try again."}, status=500)
