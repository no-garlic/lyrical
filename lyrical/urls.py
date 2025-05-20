from django.urls import path

from .views.song_names import *
from .views.lyrics import *
from .views.song import *
from .views.index import *


urlpatterns = [
    # landing page
    path("", index, name="index"),

    # song operations
    path("lyrics", show_lyrics_page, name="lyrics"),

    # calls to the LLM
    path("generate_song", generate_song, name="generate_song"),
    path("generate_song_names", generate_song_names, name="generate_song_names"),



]
