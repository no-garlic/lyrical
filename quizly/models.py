from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    def __str__(self):
        """
        Return the username of the user.
        """
        return self.username
    
    def display_name(self):
        """
        Return the display name of the user.
        """
        return f"{self.first_name} {self.last_name}" if self.first_name and self.last_name else self.username
    
    def get_saved_for_later(self):
        """
        Get the quizzes saved for later by the user.
        """
        saved_quiz_ids = SavedForLater.objects.filter(user=self).values_list('quiz', flat=True)
        return Quiz.objects.filter(id__in=saved_quiz_ids)

    def get_quiz_attempts(self):
        """
        Get the quizzes completed by the user.
        """
        return QuizAttempt.objects.filter(user=self)
        

class Category(models.Model):
    """
    Category model representing a category for auctions.
    """
    name = models.CharField(max_length=255)
    description = models.TextField()

    def __str__(self):
        """
        Return the name of the category.
        """
        return self.name
    
    def get_num_quizzes(self):
        """
        Count the number of quizzes in this category.
        """
        return Quiz.objects.filter(category=self).count()   

    def get_num_unique_quizzes_attempted(self, user):
        """
        Count the number of unique quizzes attempted in this category by a user.
        """
        attempts = QuizAttempt.objects.filter(quiz__category=self, user=user)
        unique_quizzes = set(attempt.quiz for attempt in attempts)
        return len(unique_quizzes)

    def get_num_questions(self):
        """
        Count the number of questions in this category.
        """
        return Question.objects.filter(quiz__category=self).count()    


class Question(models.Model):
    """
    Question model representing a question in the quiz.
    """
    text = models.TextField()
    hint = models.TextField()
    option1 = models.CharField(max_length=255)
    option2 = models.CharField(max_length=255)
    option3 = models.CharField(max_length=255)
    option4 = models.CharField(max_length=255)
    solution = models.IntegerField(choices=[
        (1, 'Option1'),
        (2, 'Option2'),
        (3, 'Option3'),
        (4, 'Option4'),
    ])
    quiz = models.ForeignKey('Quiz', on_delete=models.CASCADE, related_name='questions')

    def __str__(self):
        """
        Return the text of the question.
        """
        return self.text
    
    def get_solution_text(self):
        """
        Get the text of the solution option.
        """
        if self.solution == 1:
            return self.option1
        elif self.solution == 2:
            return self.option2
        elif self.solution == 3:
            return self.option3
        elif self.solution == 4:
            return self.option4
        return None
    

class Quiz(models.Model):
    """
    Quiz model representing a quiz.
    """
    name = models.CharField(max_length=255)
    description = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quizzes')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='quizzes')

    def __str__(self):
        """
        Return the name of the quiz.
        """
        return self.name
    
    def get_average_rating(self):
        """
        Calculate the average rating for the quiz.
        """
        ratings = self.ratings.all()
        if ratings.exists():
            return sum(rating.rating for rating in ratings) / ratings.count()
        return 0.0
    
    def get_average_rating_html(self):
        """
        Get the average rating as HTML.
        """
        average_rating = self.get_average_rating()
        stars = int(average_rating)
        half_star = 1 if average_rating - stars >= 0.5 else 0
        empty_stars = 5 - stars - half_star
        return f"{'<i class="bi bi-star-fill"></i>' * stars}{'<i class="bi bi-star-half"></i>' * half_star}{'<i class="bi bi-star"></i>' * empty_stars}"

    def get_rating_for_user(self, user):
        """
        Get the rating given by a specific user for the quiz.
        """
        rating = self.ratings.filter(user=user).first()
        return rating.rating if rating else None
    
    def get_average_score(self):
        """
        Calculate the average score for the quiz.
        """
        attempts = self.attempts.all()
        if attempts.exists():
            score_value = sum(attempt.score for attempt in attempts) / attempts.count()
            average_score = (int(score_value * 10) / 10)
            if average_score.is_integer():
                return int(average_score)
            return average_score
        return 0

    def get_is_saved_for_later(self, user):
        """
        Check if the quiz is saved for later by the user.
        """
        return self.saved_for_later.filter(user=user).exists()
    
    def get_questions(self):
        """
        Get the questions for the quiz.
        """
        questions = Question.objects.filter(quiz=self)
        return questions
    
    def get_question_count(self):
        """
        Get the number of questions in the quiz.
        """
        return self.get_questions().count()
    
    def has_questions(self):
        """
        Check if the quiz has any questions.
        """
        return self.get_question_count() > 0
    
    def get_number_of_attempts(self):
        """
        Get the number of attempts for the quiz.
        """
        return self.attempts.count()
    
    def get_attempts_for_user(self, user):
        """
        Get the attempts for the quiz by a specific user.
        """
        return self.attempts.filter(user=user).order_by("-score", "-date_taken")
    
    def get_best_attempt(self, user):
        """
        Get the best attempt for the quiz by a specific user.
        """
        attempts = self.get_attempts_for_user(user)
        if attempts.exists():
            return attempts.first()
        return None
    
    def get_leaderboard(self, number_of_users=10):
        """
        Get the leaderboard for the quiz, showing only the highest score for each user.
        """
        all_attempts = self.attempts.all()
        best_attempts = {}
        
        # get the best attempt for each user
        for attempt in all_attempts:
            user_id = attempt.user_id
            if user_id not in best_attempts or attempt.score > best_attempts[user_id].score:
                best_attempts[user_id] = attempt
        
        # sort the attempts by score
        sorted_attempts = sorted(best_attempts.values(), key=lambda x: x.score, reverse=True)
        return sorted_attempts[:number_of_users]


class QuizRating(models.Model):
    """
    QuizRating model representing a user's rating for a quiz.
    """
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ratings')
    rating = models.IntegerField(choices=[
        (1, '1 Star'),
        (2, '2 Stars'),
        (3, '3 Stars'),
        (4, '4 Stars'),
        (5, '5 Stars'),
    ])

    def __str__(self):
        """
        Return a string representation of the rating.
        """
        return f"{self.user.username} - {self.quiz.name} - {self.rating}"


class QuizAttempt(models.Model):
    """
    QuizAttempt model representing an attempt to take a quiz.
    """
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attempts')
    score = models.IntegerField()
    date_taken = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """
        Return a string representation of the quiz attempt.
        """
        return f"{self.user.username} - {self.quiz.name} - {self.score}"


class Answer(models.Model):
    """
    Answer model representing a user's answer to a quiz question.
    """
    quiz_attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    answer = models.IntegerField(choices=[
        (1, 'Option1'),
        (2, 'Option2'),
        (3, 'Option3'),
        (4, 'Option4'),
    ])

    def __str__(self):
        """
        Return a string representation of the answer.
        """
        return f"{self.quiz_attempt.user.username} - {self.question.text} - {self.answer}"


class SavedForLater(models.Model):
    """
    SavedForLater model representing a quiz saved for later by a user.
    """
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='saved_for_later')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_for_later')

    def __str__(self):
        """
        Return a string representation of the saved quiz.
        """
        return f"{self.user.username} - {self.quiz.name}"
