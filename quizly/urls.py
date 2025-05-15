
from django.urls import path

from .views.account import *
from .views.profile import *
from .views.search import *
from .views.browse import *
from .views.create import *
from .views.quiz import *


urlpatterns = [
    path("", index, name="index"),

    # create a quiz
    path("create", create, name="create"),
    
    # show quizzes or categories
    path("browse", browse, name="browse"),
    path("search", search, name="search"),
    
    # show a users profile
    path("profile/<str:username>", profile, name="profile"),

    # show the quiz details
    path("quiz/<int:quiz_id>", quiz, name="quiz"),
    
    # attempt a quiz or show the quiz results
    path("attempt/show/<int:quiz_attempt_id>", show_attempt, name="show_attempt"),
    path("new_attempt/<int:quiz_id>", new_attempt, name="new_attempt"),

    # rate and save a quiz for later
    path("rate", rate_quiz, name="rate_quiz"),
    path("save_for_later", save_for_later, name="save_for_later"),

    # account management
    path("login", login_view, name="login"),
    path("logout", logout_view, name="logout"),
    path("register", register, name="register")
]
