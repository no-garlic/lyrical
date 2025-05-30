from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
import json
import logging
from ..logging_config import get_logger


logger = get_logger('apis')


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

        logger.debug(f"Song edit request data: {json.dumps(edit_data, indent=2)}")

        song_id = edit_data.get("song_id")
        song_name = edit_data.get("song_name")
        song_stage = edit_data.get("song_stage")
        song_theme = edit_data.get("song_theme")
        song_narrative = edit_data.get("song_narrative")
        song_mood = edit_data.get("song_mood")
        song_hook = edit_data.get("song_hook")

        custom_prompt = edit_data.get("custom_prompt")
        rhyme_with = edit_data.get("rhyme_with")
        vocalisation_level = edit_data.get("vocalisation_level")
        vocalisation_terms = edit_data.get("vocalisation_terms")
        max_hook_lines = edit_data.get("max_hook_lines", 2)  # default to 2 if not provided
        max_syllables_per_line = edit_data.get("max_syllables_per_line", 8)  # default to 8 if not provided

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

        if song_hook:
            old_hook = song.hook
            song.hook = song_hook
            updates.append(f"hook from '{old_hook}' to '{song_hook}'")

        if custom_prompt:
            old_custom_prompt = song.hook_custom_request
            song.hook_custom_request = custom_prompt
            updates.append(f"custom prompt from '{old_custom_prompt}' to '{custom_prompt}'")

        if rhyme_with:
            old_rhyme_with = song.hook_rhyme_with
            song.hook_rhyme_with = rhyme_with
            updates.append(f"rhyme with from '{old_rhyme_with}' to '{rhyme_with}'")

        if vocalisation_level is not None:
            old_vocalisation_level = song.hook_vocalisation_level
            song.hook_vocalisation_level = vocalisation_level
            updates.append(f"vocalisation level from '{old_vocalisation_level}' to '{vocalisation_level}'")

        if vocalisation_terms:
            old_vocalisation_terms = song.hook_vocalisation_terms
            song.hook_vocalisation_terms = vocalisation_terms
            updates.append(f"vocalisation terms from '{old_vocalisation_terms}' to '{vocalisation_terms}'")

        if max_hook_lines is not None:
            old_max_hook_lines = song.hook_max_lines
            song.hook_max_lines = max_hook_lines
            updates.append(f"max hook lines from '{old_max_hook_lines}' to '{max_hook_lines}'")

        if max_syllables_per_line is not None:
            old_max_syllables = song.hook_average_syllables
            song.hook_average_syllables = max_syllables_per_line
            updates.append(f"max syllables per line from '{old_max_syllables}' to '{max_syllables_per_line}'")

        song.save()

        logger.info(f"User {request.user.username} updated song {song_id}: {', '.join(updates)}")
        return JsonResponse({"status": "success", "song_id": song.id}, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to edit song for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to edit song. Please try again."}, status=500)
