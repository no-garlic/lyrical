from django.shortcuts import render
from .. import models


def song_edit(request):
    return render(request, "lyrical/song_edit.html", {      
    })

