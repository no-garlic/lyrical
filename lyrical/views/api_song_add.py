from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
import json
import logging


logger = logging.getLogger(__name__)


@login_required
def api_song_add(request):
    """
    Add a new song for the authenticated user.
    
    Args:
        request: The HTTP request object containing POST data with song_name
    
    Returns:
        JsonResponse: Success response with song_id or error message
    """
    # validate request method
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        # parse the request body
        request_data = json.loads(request.body.decode('utf-8'))
        song_name = request_data.get("song_name")

        # validate song name is provided
        if not song_name:
            return JsonResponse({"error": "Song name must be provided"}, status=400)

        # validate song name is not empty or just whitespace
        if not song_name.strip():
            return JsonResponse({"error": "Song name cannot be empty"}, status=400)

        # check if song already exists for this user
        if models.Song.objects.filter(name=song_name, user=request.user).exists():
            return JsonResponse({"error": f"A song with the name '{song_name}' already exists"}, status=400)

        # create a new song object
        song = models.Song(name=song_name.strip(), user=request.user)
        song.save()

        logger.info(f"User {request.user.username} created song '{song_name}' with ID {song.id}")
        return JsonResponse({"status": "success", "song_id": song.id}, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to create song for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to create song. Please try again."}, status=500)
