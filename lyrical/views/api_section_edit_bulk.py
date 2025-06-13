from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
import json
import logging


logger = logging.getLogger('apis')


@login_required
def api_section_edit_bulk(request):
    """
    Edit a all sections of a song by ID.
    
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

        song_id = edit_data.get("song_id")
        hidden = edit_data.get("hidden")
        style_ids = edit_data.get("style_ids", [])

        # validate section ID is provided
        if not song_id:
            return JsonResponse({"error": "Song ID must be provided"}, status=400)

        # must provide the hidden flag
        if hidden is None:
            return JsonResponse({"error": "Hidden flag must be provided for update"}, status=400)

        # get the sections for the song and verify ownership
        if style_ids and len(style_ids) > 0:
            sections = models.Section.objects.filter(song_id=song_id, id__in=style_ids)
        else:
            sections = models.Section.objects.filter(song_id=song_id)

        # change the hidden status and save
        for section in sections:
            section.hidden = hidden
            section.save()

        logger.info(f"User {request.user.username} updated sections for song {song_id} hidden status to {hidden}")
       
        return JsonResponse({"status": "success", "song_id": song_id}, status=200)
    
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to edit sections for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to edit sections. Please try again."}, status=500)
