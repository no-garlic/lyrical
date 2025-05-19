from django.urls import path

from .views.song_names import *
from .views.song_edit import *
from .views.song import *
from .views.index import *


urlpatterns = [
    # landing page
    path("", index, name="index"),

    # song operations
    path("song_edit", song_edit, name="song_edit"),

    # calls to the LLM
    path("generate_song", generate_song, name="generate_song"),
    path("generate_song_names", generate_song_names, name="generate_song_names"),



]
