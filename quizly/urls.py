
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("create", views.quiz, name="create"),
    path("browse", views.browse, name="browse"),
    path("search", views.search, name="search"),
    path("profile", views.profile, name="profile"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register")
]
