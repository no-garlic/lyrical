from django.shortcuts import render
from ..models import *


def index(request):
    """
    Show the index page with general information about the application.
    """
    return render(request, "quizly/index.html", {
        "active_filter": "index",
    })


def browse(request):
    """
    Show the list of quizzes filtered by category, or the list of categories.
    """
    # See if there is a category selected
    selected_category_id = request.GET.get("category")
    selected_category = None
    filtered_quizzes = None
    all_categories = []

    # If a category is selected, filter quizzes by that category
    if selected_category_id:
        filtered_quizzes = Quiz.objects.filter(category=selected_category_id)
        selected_category = Category.objects.get(id=selected_category_id)

        # Add the users best score to each quiz if the user is authenticated
        if request.user.is_authenticated:
            for quiz in filtered_quizzes:
                quiz.best_attempt = quiz.get_best_attempt(request.user)

    else:
        # If no category is selected, show all categories
        all_categories = Category.objects.all()
        
        # Add the attempted count to each category if the user is authenticated
        if request.user.is_authenticated:
            for category in all_categories:
                category.attempted_count = category.get_num_unique_quizzes_attempted(request.user)

    # Render the list page with the filtered quizzes or categories
    return render(request, "quizly/list.html", {
        "active_filter": "browse",
        "all_categories": all_categories,
        "selected_category": selected_category,
        "filtered_quizzes": filtered_quizzes,
    })

