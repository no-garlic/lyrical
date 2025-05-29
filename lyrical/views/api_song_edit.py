from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
import json
import logging


logger = logging.getLogger(__name__)


@login_required
def api_song_edit(request):
    """
    Edit a song by ID.
    
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

        print(json.dumps(edit_data, indent=2))  # Debugging output

        song_id = edit_data.get("song_id")
        song_name = edit_data.get("song_name")
        song_stage = edit_data.get("song_stage")
        song_theme = edit_data.get("song_theme")
        song_narrative = edit_data.get("song_narrative")
        song_mood = edit_data.get("song_mood")

        # validate song ID is provided
        if not song_id:
            return JsonResponse({"error": "Song ID must be provided"}, status=400)

        # get the song object and verify ownership
        try:
            song = models.Song.objects.get(id=song_id, user=request.user)
        except models.Song.DoesNotExist:
            return JsonResponse({"error": f"Song with ID {song_id} not found or you don't have permission to edit it"}, status=404)

        # check if song name already exists for this user (if updating name)
        if song_name and song_name.strip() != song.name:
            if models.Song.objects.filter(name=song_name.strip(), user=request.user).exclude(id=song_id).exists():
                return JsonResponse({"error": f"A song with the name '{song_name}' already exists"}, status=400)

        # update fields based on what was provided
        updates = []
        if song_name:
            old_name = song.name
            song.name = song_name.strip()
            updates.append(f"name from '{old_name}' to '{song.name}'")
        
        if song_stage:
            old_stage = song.stage
            song.stage = song_stage
            updates.append(f"stage from '{old_stage}' to '{song_stage}'")
        
        if song_theme:
            old_theme = song.theme
            song.theme = song_theme
            updates.append(f"theme from '{old_theme}' to '{song_theme}'")

        if song_narrative:
            old_narrative = song.narrative
            song.narrative = song_narrative
            updates.append(f"narrative from '{old_narrative}' to '{song_narrative}'")

        if song_mood:
            old_mood = song.mood
            song.mood = song_mood
            updates.append(f"mood from '{old_mood}' to '{song_mood}'")

        song.save()

        print(f"User {request.user.username} updated song {song_id}: {', '.join(updates)}")
        return JsonResponse({"status": "success", "song_id": song.id}, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to edit song for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to edit song. Please try again."}, status=500)
