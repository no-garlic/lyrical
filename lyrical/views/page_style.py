import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from django.db.models.functions import Lower
from .. import models


logger = logging.getLogger(__name__)


@login_required
def page_style(request, song_id: int):

    navigation = [
        {"name": "SONG", "url": "song", "active": True, "selected": False, "enabled": True},
        {"name": "STYLE", "url": "style", "active": True, "selected": True, "enabled": True},
        {"name": "HOOK", "url": "hook", "active": False, "selected": False, "enabled": False},
        {"name": "LYRICS", "url": "lyrics", "active": False, "selected": False, "enabled": False},
        {"name": "STRUCTURE", "url": "structure", "active": False, "selected": False, "enabled": False},
    ]

    if not song_id:
        logger.error("page_style: song_id is None or invalid")
        return HttpResponseServerError("Invalid song ID")

    try:
        song = models.Song.objects.get(id=song_id, user=request.user)
    except models.Song.DoesNotExist:
        logger.error(f"page_style: song with id {song_id} does not exist for user '{request.user.username}'")
        return HttpResponseServerError("Song not found")
    except Exception as e:
        logger.error(f"page_style: error fetching song with id {song_id} for user '{request.user.username}': {str(e)}")
        return HttpResponseServerError("An error occurred while fetching the song")

    # extract song sections
    section_names = ['theme', 'narrative', 'mood']
    song_sections = models.Section.objects.filter(song=song, type__in=section_names).order_by('created_at')

    context = {
        "active_page": "lyrics",
        "navigation": navigation,
        "selectedSongId": song_id,
        "song": song,
        'song_sections': song_sections,
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

    return render(request, "lyrical/style.html", context)


