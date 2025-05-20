from django.shortcuts import render
from .. import models


def show_lyrics_page(request):
    return render(request, "lyrical/lyrics.html", {      
    })

