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
        
        hook = edit_data.get("hook")
        hook_custom_request = edit_data.get("hook_custom_request")
        hook_rhyme_with = edit_data.get("hook_rhyme_with")
        hook_vocalisation_level = edit_data.get("hook_vocalisation_level")
        hook_vocalisation_terms = edit_data.get("hook_vocalisation_terms")
        hook_max_lines = edit_data.get("hook_max_lines")
        hook_average_syllables = edit_data.get("hook_average_syllables")

        structure_intro_lines = edit_data.get("structure_intro_lines")
        structure_outro_lines = edit_data.get("structure_outro_lines")
        structure_verse_count = edit_data.get("structure_verse_count")
        structure_verse_lines = edit_data.get("structure_verse_lines")
        structure_pre_chorus_lines = edit_data.get("structure_pre_chorus_lines")
        structure_chorus_lines = edit_data.get("structure_chorus_lines")
        structure_bridge_lines = edit_data.get("structure_bridge_lines")
        structure_average_syllables = edit_data.get("structure_average_syllables")
        structure_vocalisation_level = edit_data.get("structure_vocalisation_level")
        structure_vocalisation_lines = edit_data.get("structure_vocalisation_lines")
        structure_vocalisation_terms = edit_data.get("structure_vocalisation_terms")
        structure_custom_request = edit_data.get("structure_custom_request")
        structure = edit_data.get("structure")

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

        if hook:
            old_hook = song.hook
            song.hook = hook
            updates.append(f"hook from '{old_hook}' to '{hook}'")

        if hook_custom_request:
            old_custom_prompt = song.hook_custom_request
            song.hook_custom_request = hook_custom_request
            updates.append(f"custom prompt from '{old_custom_prompt}' to '{hook_custom_request}'")

        if hook_rhyme_with:
            old_rhyme_with = song.hook_rhyme_with
            song.hook_rhyme_with = hook_rhyme_with
            updates.append(f"rhyme with from '{old_rhyme_with}' to '{hook_rhyme_with}'")

        if hook_vocalisation_level is not None:
            old_vocalisation_level = song.hook_vocalisation_level
            song.hook_vocalisation_level = hook_vocalisation_level
            updates.append(f"vocalisation level from '{old_vocalisation_level}' to '{hook_vocalisation_level}'")

        if hook_vocalisation_terms:
            old_vocalisation_terms = song.hook_vocalisation_terms
            song.hook_vocalisation_terms = hook_vocalisation_terms
            updates.append(f"vocalisation terms from '{old_vocalisation_terms}' to '{hook_vocalisation_terms}'")

        if hook_max_lines is not None:
            old_max_hook_lines = song.hook_max_lines
            song.hook_max_lines = hook_max_lines
            updates.append(f"max hook lines from '{old_max_hook_lines}' to '{hook_max_lines}'")

        if hook_average_syllables is not None:
            old_max_syllables = song.hook_average_syllables
            song.hook_average_syllables = hook_average_syllables
            updates.append(f"max syllables per line from '{old_max_syllables}' to '{hook_average_syllables}'")

        if structure_intro_lines is not None:
            old_intro_lines = song.structure_intro_lines
            song.structure_intro_lines = structure_intro_lines
            updates.append(f"intro lines from '{old_intro_lines}' to '{structure_intro_lines}'")

        if structure_outro_lines is not None:
            old_outro_lines = song.structure_outro_lines
            song.structure_outro_lines = structure_outro_lines
            updates.append(f"outro lines from '{old_outro_lines}' to '{structure_outro_lines}'")

        if structure_verse_count is not None:
            old_verse_count = song.structure_verse_count
            song.structure_verse_count = structure_verse_count
            updates.append(f"verse count from '{old_verse_count}' to '{structure_verse_count}'")

        if structure_verse_lines is not None:
            old_verse_lines = song.structure_verse_lines
            song.structure_verse_lines = structure_verse_lines
            updates.append(f"verse lines from '{old_verse_lines}' to '{structure_verse_lines}'")

        if structure_pre_chorus_lines is not None:
            old_pre_chorus_lines = song.structure_pre_chorus_lines
            song.structure_pre_chorus_lines = structure_pre_chorus_lines
            updates.append(f"pre-chorus lines from '{old_pre_chorus_lines}' to '{structure_pre_chorus_lines}'")

        if structure_chorus_lines is not None:
            old_chorus_lines = song.structure_chorus_lines
            song.structure_chorus_lines = structure_chorus_lines
            updates.append(f"chorus lines from '{old_chorus_lines}' to '{structure_chorus_lines}'")

        if structure_bridge_lines is not None:
            old_bridge_lines = song.structure_bridge_lines
            song.structure_bridge_lines = structure_bridge_lines
            updates.append(f"bridge lines from '{old_bridge_lines}' to '{structure_bridge_lines}'")
        if structure_average_syllables is not None:

            old_average_syllables = song.structure_average_syllables
            song.structure_average_syllables = structure_average_syllables
            updates.append(f"average syllables per line from '{old_average_syllables}' to '{structure_average_syllables}'")

        if structure_vocalisation_level is not None:
            old_vocalisation_level = song.structure_vocalisation_level
            song.structure_vocalisation_level = structure_vocalisation_level
            updates.append(f"vocalisation level from '{old_vocalisation_level}' to '{structure_vocalisation_level}'")

        if structure_vocalisation_lines is not None:
            old_vocalisation_lines = song.structure_vocalisation_lines
            song.structure_vocalisation_lines = structure_vocalisation_lines
            updates.append(f"vocalisation lines from '{old_vocalisation_lines}' to '{structure_vocalisation_lines}'")

        if structure_vocalisation_terms:
            old_vocalisation_terms = song.structure_vocalisation_terms
            song.structure_vocalisation_terms = structure_vocalisation_terms
            updates.append(f"vocalisation terms from '{old_vocalisation_terms}' to '{structure_vocalisation_terms}'")

        if structure_custom_request:
            old_custom_request = song.structure_custom_request
            song.structure_custom_request = structure_custom_request
            updates.append(f"custom request from '{old_custom_request}' to '{structure_custom_request}'")

        if structure is not None:
            old_structure = song.structure
            song.structure = structure
            updates.append(f"structure from '{old_structure}' to '{structure}'")

        song.save()

        logger.info(f"User {request.user.username} updated song {song_id}:\n  {', \n  '.join(updates)}")
        return JsonResponse({"status": "success", "song_id": song.id}, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to edit song for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to edit song. Please try again."}, status=500)
