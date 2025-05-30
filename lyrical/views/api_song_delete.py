from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
import json
import logging


logger = logging.getLogger('apis')


@login_required
def api_song_delete(request):
    """
    Delete a song by ID.
    
    Args:
        request: The HTTP request object containing DELETE data with song_id
    
    Returns:
        JsonResponse: Success/error response
    """
    # validate request method
    if request.method != 'DELETE':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        # parse the request body for DELETE requests
        delete_data = json.loads(request.body.decode('utf-8'))
        song_id = delete_data.get("song_id")

        # validate song ID is provided
        if not song_id:
            return JsonResponse({"error": "Song ID must be provided"}, status=400)

        # get the song object and verify ownership
        try:
            song = models.Song.objects.get(id=song_id, user=request.user)
        except models.Song.DoesNotExist:
            return JsonResponse({"error": f"Song with ID {song_id} not found or you don't have permission to delete it"}, status=404)

        # delete the song
        song_name = song.name
        song.delete()

        logger.info(f"User {request.user.username} deleted song '{song_name}' with ID {song_id}")
        return JsonResponse({"status": "success", "song_id": song_id}, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to delete song for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to delete song. Please try again."}, status=500)
