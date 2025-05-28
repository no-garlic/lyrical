import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from django.db.models.functions import Lower
from .. import models


logger = logging.getLogger(__name__)


@login_required
def page_structure(request, song_id: int):

    navigation = [
        {"name": "SONG", "url": "song", "active": False, "selected": False, "enabled": True},
        {"name": "THEME", "url": "theme", "active": False, "selected": False, "enabled": True},
        {"name": "HOOK", "url": "hook", "active": False, "selected": False, "enabled": True},
        {"name": "LYRICS", "url": "lyrics", "active": False, "selected": False, "enabled": True},
        {"name": "STRUCTURE", "url": "structure", "active": True, "selected": True, "enabled": True},
    ]

    if not song_id:
        logger.error("page_theme: song_id is None or invalid")
        return HttpResponseServerError("Invalid song ID")

    try:
        song = models.Song.objects.get(id=song_id, user=request.user)
    except models.Song.DoesNotExist:
        logger.error(f"page_theme: song with id {song_id} does not exist for user '{request.user.username}'")
        return HttpResponseServerError("Song not found")
    except Exception as e:
        logger.error(f"page_theme: error fetching song with id {song_id} for user '{request.user.username}': {str(e)}")
        return HttpResponseServerError("An error occurred while fetching the song")

    context = {
        "active_page": "lyrics",
        "navigation": navigation,
        "btn_next": "btn-disabled",
        "btn_previous": None,
        "selectedSongId": song_id,
        "song": song,
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

    return render(request, "lyrical/structure.html", context)
