from django.urls import path

from .views.song_names import *
from .views.song import *
from .views.index import *
from .views.account import *
from .views.profile import *


urlpatterns = [
    # landing page
    path("", index, name="index"),

    # calls to the LLM
    path("generate_song", generate_song, name="generate_song"),
    path("generate_song_names", generate_song_names, name="generate_song_names"),



    # browse page
    path("browse", browse, name="browse"),




    # user profile
    path("profile/<str:username>", profile, name="profile"),

    # account management
    path("login", login_view, name="login"),
    path("logout", logout_view, name="logout"),
    path("register", register, name="register")    
]
