from django.urls import path

from .views.page_index import *
from .views.page_register import *
from .views.page_style import *
from .views.page_login import *
from .views.page_library import *
from .views.page_names import *
from .views.page_song import *
from .views.page_profile import *
from .views.page_lyrics import *
from .views.page_structure import *
from .views.page_edit import *

from .views.api_render_component import *
from .views.api_user_llm import *

from .views.api_song_add import *
from .views.api_song_edit import *
from .views.api_song_edit_bulk import *
from .views.api_song_delete import *

from .views.api_lyrics_edit import *

from .views.api_structure_template_edit import *
from .views.api_structure_template_get import *

from .views.api_section_edit import *
from .views.api_section_edit_bulk import *

from .views.api_gen_song_lyrics import *
from .views.api_gen_song_names import *
from .views.api_gen_song_styles import *


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
    path("structure/<int:song_id>", page_structure, name="structure"),
    path("lyrics/<int:song_id>", page_lyrics, name="lyrics"),
    path("edit/<int:song_id>", page_edit, name="edit"),

    # api pages
    path("api_render_component/<str:component_name>", api_render_component, name="api_render_component"),
    path("api_user_llm", api_user_llm, name="api_user_llm"),

    # api song management
    path("api_song_delete", api_song_delete, name="api_song_delete"),
    path("api_song_edit", api_song_edit, name="api_song_edit"),
    path("api_song_edit_bulk", api_song_edit_bulk, name="api_song_edit_bulk"),
    path("api_song_add", api_song_add, name="api_song_add"),

    # api lyrics management
    path("api_lyrics_edit", api_lyrics_edit, name="api_lyrics_edit"),

    # api structure template management
    path("api_structure_template_edit", api_structure_template_edit, name="api_structure_template_edit"),
    path("api_structure_template_get", api_structure_template_get, name="api_structure_template_get"),

    # api section management
    path("api_section_edit", api_section_edit, name="api_section_edit"),
    path("api_section_edit_bulk", api_section_edit_bulk, name="api_section_edit_bulk"),

    # llm calls
    path("api_gen_song_lyrics", api_gen_song_lyrics, name="api_gen_song_lyrics"),
    path("api_gen_song_names", api_gen_song_names, name="api_gen_song_names"),
    path("api_gen_song_styles", api_gen_song_styles, name="api_gen_song_styles"),
    
]
