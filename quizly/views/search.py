from django.shortcuts import render
from ..services.faiss_search_service import QuizSemanticSearchService
from ..models import *


def search(request):
    """
    Search for quizzes based on a query.
    """
    query = request.GET.get("q")
    search_type = request.GET.get("type")

    # If no query or search type is provided, return empty search results
    if not query or not search_type:
        return render(request, "quizly/list.html", {
            "active_filter": "search",
            "filtered_quizzes": [],
        })

    # Get the search results based on the search type
    search_results = []    
    if search_type == "semantic":
        search_results = semantic_search(query)
    else:
        search_results = keyword_search(query)

    # Add the users best score to each quiz if the user is authenticated
    if request.user.is_authenticated:
        for quiz in search_results:
            quiz.best_attempt = quiz.get_best_attempt(request.user)

    # show the page with the search results
    return render(request, "quizly/list.html", {
        "active_filter": "search",
        "filtered_quizzes": search_results,
    })


def keyword_search(query):
    """
    Perform a keyword search on quizzes and categories.
    """
    quizzes = Quiz.objects.filter(name__icontains=query)
    return quizzes


def semantic_search(query):
    """
    Perform a semantic search on quizzes and categories.
    """
    quizzes = list(Quiz.objects.all())
    results = QuizSemanticSearchService.search(query, quizzes, top_k=10)
    return results
