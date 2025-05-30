import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from django.db.models.functions import Lower
from .. import models


logger = logging.getLogger('views')


@login_required
def page_hook(request, song_id: int):

    navigation = [
        {"name": "SONG", "url": "song", "active": True, "selected": False, "enabled": True},
        {"name": "STYLE", "url": "style", "active": True, "selected": False, "enabled": True},
        {"name": "STRUCTURE", "url": "structure", "active": True, "selected": False, "enabled": True},
        {"name": "HOOK", "url": "hook", "active": True, "selected": True, "enabled": True},
        {"name": "LYRICS", "url": "lyrics", "active": False, "selected": False, "enabled": False},
    ]

    if not song_id:
        logger.error("page_hook: song_id is None or invalid")
        return HttpResponseServerError("Invalid song ID")

    try:
        song = models.Song.objects.get(id=song_id, user=request.user)
    except models.Song.DoesNotExist:
        logger.error(f"page_hook: song with id {song_id} does not exist for user '{request.user.username}'")
        return HttpResponseServerError("Song not found")
    except Exception as e:
        logger.error(f"page_hook: error fetching song with id {song_id} for user '{request.user.username}': {str(e)}")
        return HttpResponseServerError("An error occurred while fetching the song")

    # extract song sections
    section_names = ['hook']
    song_sections = models.Section.objects.filter(song=song, type__in=section_names).order_by('created_at')


    # Get the overriden values for the hook section
    hook_defaults = {
        "vocalisation_level": song.hook_vocalisation_level,
        "vocalisation_terms": song.hook_vocalisation_terms,
        "average_syllables": song.hook_average_syllables,
        "max_lines": song.hook_max_lines,
        "custom_request": song.hook_custom_request,
        "rhyme_with": song.hook_rhyme_with,
    }

    # Get the structure defaults incase the hook values have not been overridden
    structure_defaults = {
        "vocalisation_level": song.structure_vocalisation_level,
        "vocalisation_terms": song.structure_vocalisation_terms,
        "average_syllables": song.structure_average_syllables,
    }

    # Update the hook section with the defaults if they are None
    if hook_defaults["vocalisation_level"] is None:
        hook_defaults["vocalisation_level"] = structure_defaults["vocalisation_level"]
    if hook_defaults["vocalisation_terms"] is None:
        hook_defaults["vocalisation_terms"] = structure_defaults["vocalisation_terms"]
    if hook_defaults["average_syllables"] is None:
        hook_defaults["average_syllables"] = structure_defaults["average_syllables"]

    context = {
        "active_page": "lyrics",
        "navigation": navigation,
        "selectedSongId": song_id,
        "song": song,
        'song_sections': song_sections,
        'vocalisation_level': hook_defaults["vocalisation_level"],
        'vocalisation_terms': hook_defaults["vocalisation_terms"],
        'average_syllables': hook_defaults["average_syllables"],
        'max_lines': hook_defaults["max_lines"],
        'custom_request': hook_defaults["custom_request"],
        'rhyme_with': hook_defaults["rhyme_with"],
    }

    try:
        context.update({
            "llm_models": models.LLM.objects.all(),
        })

    except Exception as db_error:
        logger.error(f"database error fetching data for user '{request.user.username}': {str(db_error)}")
        
        context.update({
            "error_message": "unable to load data at this time, please try again later"
        })

    return render(request, "lyrical/hook.html", context)


