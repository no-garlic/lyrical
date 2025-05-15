
from django.urls import path

from .views.index import *
from .views.account import *
from .views.profile import *


urlpatterns = [
    # landing page
    path("", index, name="index"),

    # browse page
    path("browse", browse, name="browse"),




    # user profile
    path("profile/<str:username>", profile, name="profile"),

    # account management
    path("login", login_view, name="login"),
    path("logout", logout_view, name="logout"),
    path("register", register, name="register")    
]
