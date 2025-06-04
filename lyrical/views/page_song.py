import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from django.db.models.functions import Lower
from .. import models


logger = logging.getLogger('views')


@login_required
def page_song(request):

    navigation = [
        {"name": "SONG", "url": "song", "active": True, "selected": True, "enabled": True},
        {"name": "STYLE", "url": "style", "active": False, "selected": False, "enabled": False},
        {"name": "STRUCTURE", "url": "structure", "active": False, "selected": False, "enabled": False},
        {"name": "LYRICS", "url": "lyrics", "active": False, "selected": False, "enabled": False},
    ]

    stages = ['new', 'liked', 'generated', 'published']

    context = {
        "active_page": "lyrics",
        "navigation": navigation,
        "filter_liked": True,
        "selectedSongId" : None,
        "songs": models.Song.objects.filter(user=request.user, stage__in=stages).order_by(Lower('name')),
    }

    song_name = request.GET.get('q')
    if song_name:
        context.update({
            "search_term": song_name,
            "filter_new": True,
            "filter_generated": True,
            "filter_published": True,
        })

    song_id = request.GET.get('id')
    if song_id:
        try:
            song = models.Song.objects.get(id=song_id, user=request.user)
            context.update({
                "search_term": song.name,
                "filter_new": True,
                "filter_generated": True,
                "filter_published": True,
            })
        except models.Song.DoesNotExist:
            logger.warning(f"song with id '{song_id}' not found for user '{request.user.username}'")
        except Exception as e:
            logger.error(f"error fetching song with id '{song_id}' for user '{request.user.username}': {str(e)}")

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
