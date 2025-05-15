import json
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, redirect
from ..models import *


def quiz(request, quiz_id):
    """
    Show the quiz details and user attempts.
    """
    quiz = Quiz.objects.get(id=quiz_id)

    # Check if the quiz exists
    if quiz is None:
        return render(request, "quizly/index.html")
    
    # Defaults    
    user_attempts = []
    user_rating = None
    is_saved_for_later = False
    
    # Check if the user is authenticated, and if so, get their attempts and rating
    if request.user.is_authenticated:
        user_attempts = quiz.get_attempts_for_user(request.user)
        user_rating = quiz.get_rating_for_user(request.user)
        is_saved_for_later = quiz.get_is_saved_for_later(request.user)
    
    # Render the quiz page with the quiz details, user attempts, and rating
    return render(request, "quizly/quiz.html", {
        "quiz": quiz,
        "user_attempts": user_attempts,
        "user_rating": user_rating,
        "is_saved_for_later": is_saved_for_later
    })


def show_attempt(request, quiz_attempt_id):
    """
    Show the quiz attempt details.
    """
    # Get the quiz attempt by ID
    quiz_attempt = QuizAttempt.objects.get(id=quiz_attempt_id)

    # Render the attempt page with the quiz attempt details
    return render(request, "quizly/attempt.html", {
        "active_filter": "attempt",
        "quiz_attempt": quiz_attempt,
        "answers": quiz_attempt.answers.all(),
        "quiz": quiz_attempt.quiz,
    })
    

@login_required
def new_attempt(request, quiz_id):
    """
    Create a new quiz attempt and save the answers.
    """
    # POST request to save the quiz attempt
    if request.method == "POST":
        quiz = Quiz.objects.get(id=quiz_id)
        user = request.user
        score = 0

        # Parse the JSON string from the 'answers' field
        answers_data = json.loads(request.POST.get('answers', '{}'))
        
        # First, create and save the quiz attempt
        quiz_attempt = QuizAttempt(quiz=quiz, user=user, score=0)
        quiz_attempt.save()
        
        # Now create and save answer objects with the quiz_attempt reference
        for question in quiz.questions.all():
            question_id = str(question.id)
            if question_id in answers_data:
                answer_value = int(answers_data[question_id])
                answer_obj = Answer(
                    question=question, 
                    answer=answer_value,
                    quiz_attempt=quiz_attempt
                )
                answer_obj.save()
                
                # Check if the answer is correct and increment score
                if question.solution == answer_value:
                    score += 1

        # Update the score on the quiz attempt
        quiz_attempt.score = score
        quiz_attempt.save()

        # Redirect to the quiz attempt page to show the results
        return redirect("show_attempt", quiz_attempt_id=quiz_attempt.id)

    else:
        # GET request to show the quiz attempt page
        quiz = Quiz.objects.get(id=quiz_id)
        return render(request, "quizly/attempt.html", {
            "active_filter": "attempt",
            "questions": quiz.questions.all(),
            "quiz": quiz,
        })


@login_required
def rate_quiz(request):
    """
    Rate a quiz.
    """
    # POST request to save the quiz rating
    if request.method == "POST":
        # Get the quiz ID and rating from the request
        quiz_id = request.POST.get("quiz_id")
        rating = request.POST.get("rating")
        quiz = Quiz.objects.get(id=quiz_id)
        user = request.user

        # Check if the user has already rated the quiz
        existing_rating = QuizRating.objects.filter(quiz=quiz, user=user).first()
        if existing_rating:
            # Update the existing rating
            existing_rating.rating = rating
            existing_rating.save()
        else:
            # Create a new rating
            new_rating = QuizRating(quiz=quiz, user=user, rating=rating)
            new_rating.save()

        # Return the response
        return JsonResponse({"status": "success", "message": "Rating submitted successfully."})
    else:        
        # GET method is not allowed
        return JsonResponse({"status": "error", "message": "Invalid request method."})
    
    
@login_required
def save_for_later(request):
    """
    Add a quiz to the saved for later list.
    """
    # POST request to save the quiz for later
    if request.method == "POST":
        # Get the quiz ID from the request
        quiz_id = request.POST.get("quiz_id")
        quiz = Quiz.objects.get(id=quiz_id)
        user = request.user

        # Check if the quiz is already saved for later
        existing_save = SavedForLater.objects.filter(quiz=quiz, user=user).first()
        if existing_save:
            # Remove the existing save
            existing_save.delete()
            return JsonResponse({"status": "success", "message": "Quiz removed from saved for later.", "is_saved": False})
        else:
            # Create a new save for later entry
            new_save = SavedForLater(quiz=quiz, user=user)
            new_save.save()
            return JsonResponse({"status": "success", "message": "Quiz saved for later.", "is_saved": True})
    else:
        # GET method is not allowed
        return JsonResponse({"status": "error", "message": "Invalid request method."})

