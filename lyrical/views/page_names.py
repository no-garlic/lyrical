import logging
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseServerError
from django.db.models.functions import Lower
from .. import models


logger = logging.getLogger('views')


@login_required
def page_names(request):

    context = {
        "active_page": "names",
#        "page_name": "SONG NAMES",
    }

    try:
        context.update({
            "llm_models": models.LLM.objects.all(),
            "new_songs": models.Song.objects.filter(user=request.user, stage='new').order_by(Lower('name')),
            "liked_songs": models.Song.objects.filter(user=request.user, stage='liked').order_by(Lower('name')),
            "disliked_songs": models.Song.objects.filter(user=request.user, stage='disliked').order_by(Lower('name')),
        })

    except Exception as db_error:
        logger.error(f"database error fetching data for user '{request.user.username}': {str(db_error)}")
        
        context.update({
            "error_message": "unable to load data at this time, please try again later"
        })

    return render(request, "lyrical/names.html", context)
