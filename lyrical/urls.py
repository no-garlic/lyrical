from django.urls import path

from .views.page_index import *
from .views.page_register import *
from .views.page_style import *
from .views.page_hook import *
from .views.page_login import *
from .views.page_library import *
from .views.page_names import *
from .views.page_song import *
from .views.page_profile import *
from .views.page_lyrics import *
from .views.page_structure import *

from .views.api_render_component import *
from .views.api_user_llm import *

from .views.api_song_add import *
from .views.api_song_edit import *
from .views.api_song_edit_bulk import *
from .views.api_song_delete import *

from .views.api_section_edit import *
from .views.api_section_edit_bulk import *

from .views.api_gen_song import *
from .views.api_gen_song_names import *
from .views.api_gen_song_styles import *
from .views.api_gen_song_hooks import *


urlpatterns = [
    # landing page
    path("", page_index, name="index"),
    
    # auth pages
    path("register", page_register, name="register"),
    path("login", page_login, name="login"),
    path("logout", action_logout, name="logout"),
    path("profile", page_profile, name="profile"),

    # main pages
    path("library", page_library, name="library"),
    path("names", page_names, name="names"),

    # edit pages
    path("song", page_song, name="song"),
    path("style/<int:song_id>", page_style, name="style"),
    path("hook/<int:song_id>", page_hook, name="hook"),
    path("lyrics/<int:song_id>", page_lyrics, name="lyrics"),
    path("structure/<int:song_id>", page_structure, name="structure"),

    # api pages
    path("api_render_component/<str:component_name>", api_render_component, name="api_render_component"),
    path("api_user_llm", api_user_llm, name="api_user_llm"),

    # api song management
    path("api_song_delete", api_song_delete, name="api_song_delete"),
    path("api_song_edit", api_song_edit, name="api_song_edit"),
    path("api_song_edit_bulk", api_song_edit_bulk, name="api_song_edit_bulk"),
    path("api_song_add", api_song_add, name="api_song_add"),

    # api section management
    path("api_section_edit", api_section_edit, name="api_section_edit"),
    path("api_section_edit_bulk", api_section_edit_bulk, name="api_section_edit_bulk"),

    # llm calls
    path("api_gen_song", api_gen_song, name="api_gen_song"),
    path("api_gen_song_names", api_gen_song_names, name="api_gen_song_names"),
    path("api_gen_song_styles", api_gen_song_styles, name="api_gen_song_styles"),
    path("api_gen_song_hooks", api_gen_song_hooks, name="api_gen_song_hooks"),
    
]
