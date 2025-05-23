from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .. import models


@login_required
def page_names(request):

    new_songs = models.Song.objects.filter(user=request.user, stage='new')
    liked_songs = models.Song.objects.filter(user=request.user, stage='liked')
    disliked_songs = models.Song.objects.filter(user=request.user, stage='disliked')



    return render(request, "lyrical/names.html", {
        "active_page": "names",
        "page_name": "SONG NAMES",
        "new_songs": new_songs,
        "liked_songs": liked_songs,
        "disliked_songs": disliked_songs,
    })