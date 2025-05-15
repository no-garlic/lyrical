
from django.urls import path

from .views.index import *
from .views.account import *


urlpatterns = [
    # landing page
    path("", index, name="index"),



    # account management
    path("login", login_view, name="login"),
    path("logout", logout_view, name="logout"),
    path("register", register, name="register")    
]
