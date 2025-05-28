import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from django.db.models.functions import Lower
from .. import models


logger = logging.getLogger(__name__)


@login_required
def page_theme(request, song_id: int):

    navigation = [
        {"name": "SONG", "url": "song", "active": True, "selected": False, "enabled": True},
        {"name": "THEME", "url": "theme", "active": True, "selected": True, "enabled": True},
        {"name": "HOOK", "url": "hook", "active": False, "selected": False, "enabled": False},
        {"name": "LYRICS", "url": "lyrics", "active": False, "selected": False, "enabled": False},
        {"name": "STRUCTURE", "url": "structure", "active": False, "selected": False, "enabled": False},
    ]

    print(f"page_theme: song_id={song_id}")

    context = {
        "active_page": "lyrics",
        "navigation": navigation,
        "btn_next": None,
        "btn_previous": None,
        "selectedSongId": song_id,
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

    return render(request, "lyrical/theme.html", context)


