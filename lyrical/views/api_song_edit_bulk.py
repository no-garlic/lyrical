from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
import json
import logging


logger = logging.getLogger(__name__)


@login_required
def api_song_edit_bulk(request):
    """
    Edit a list of songs by stage.
    
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

        song_stage_from = edit_data.get("song_stage_from")
        song_stage_to = edit_data.get("song_stage_to")

        # validate song ID is provided
        if not song_stage_from or not song_stage_to:
            return JsonResponse({"error": "Both song_stage_from and song_stage_to must be provided"}, status=400)

        # get the songs to change
        songs_from = models.Song.objects.filter(stage=song_stage_from, user=request.user)

        # iterate through the songs and apply updates
        for song in songs_from:
            # update the stage of each song and save
            song.stage = song_stage_to
            song.save()

        # collect a list of the id's of all updated songs
        updated_song_ids = [song.id for song in songs_from]

        # log the update
        logger.info(f"User {request.user.username} updated {len(songs_from)} songs from stage '{song_stage_from} to stage '{song_stage_to}'")
        return JsonResponse({"status": "success", "updated_song_ids": updated_song_ids}, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to update the stage of songs for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to update the stage of the selected songs. Please try again."}, status=500)
