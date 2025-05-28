import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from django.db.models.functions import Lower
from .. import models


logger = logging.getLogger(__name__)


@login_required
def page_song(request):

    navigation = [
        {"name": "SONG", "url": "song", "active": True, "selected": True, "enabled": True},
        {"name": "PREPARE", "url": "prepare", "active": False, "selected": False, "enabled": False},
        {"name": "LYRICS", "url": "lyrics", "active": False, "selected": False, "enabled": False},
        {"name": "STRUCTURE", "url": "structure", "active": False, "selected": False, "enabled": False},
    ]

    context = {
        "active_page": "lyrics",
        "navigation": navigation,
        "songs": models.Song.objects.filter(user=request.user, stage='liked').order_by(Lower('name')),
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

    return render(request, "lyrical/song.html", context)
