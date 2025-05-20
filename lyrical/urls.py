from django.urls import path

from .views.page_index import *
from .views.page_register import *
from .views.page_themes import *
from .views.page_login import *
from .views.page_library import *
from .views.page_names import *
from .views.page_profile import *
from .views.page_lyrics import *

from .views.generate_song import *
from .views.generate_song_names import *

from .views._test_streaming import *


urlpatterns = [
    # landing page
    path("", page_index, name="index"),
    
    # auth pages
    path("register", page_register, name="register"),
    path("login", page_login, name="login"),
    path("profile", page_profile, name="profile"),

    # main pages
    path("library", page_library, name="library"),
    path("names", page_names, name="names"),
    path("themes", page_themes, name="themes"),
    path("lyrics", page_lyrics, name="lyrics"),

    # llm calls
    path("generate_song", generate_song, name="generate_song"),
    path("generate_song_names", generate_song_names, name="generate_song_names"),

    # test pages
    path("_test_streaming", test_streaming, name="test_streaming"),

]
