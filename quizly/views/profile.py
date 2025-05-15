from django.shortcuts import render
from ..models import *


def profile(request, username):
    """
    Show the user's profile page with their saved quizzes and quiz attempts.
    """
    # Get the user profile based on the username, and their saved quizzes and quiz attempts
    profile_user = User.objects.filter(username=username).first()
    saved_for_later = profile_user.get_saved_for_later() if profile_user else []
    quiz_attempts = profile_user.get_quiz_attempts().order_by("-date_taken") if profile_user else []

    # Flag the active filter for the profile page if the user is authenticated and viewing their own profile
    active_filter = ""
    if request.user.is_authenticated and request.user.username == username:
        active_filter = "profile"

    # Render the profile page with the user's saved quizzes and quiz attempts
    return render(request, "quizly/profile.html", {
        "active_filter": active_filter,
        "profile_user": profile_user,
        "saved_for_later": saved_for_later,
        "quiz_attempts": quiz_attempts
    })
