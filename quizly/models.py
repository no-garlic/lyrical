from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    def __str__(self):
        return self.username
    
    def display_name(self):
        return f"{self.first_name} {self.last_name}" if self.first_name and self.last_name else self.username
    

class Category(models.Model):
    """
    Category model representing a category for auctions.
    """
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name
    

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
        return self.text
    

class Quiz(models.Model):
    """
    Quiz model representing a quiz.
    """
    name = models.CharField(max_length=255)
    description = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quizzes')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='quizzes')

    def __str__(self):
        return self.name

class QuizAttempt(models.Model):
    """
    QuizAttempt model representing an attempt to take a quiz.
    """
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attempts')
    score = models.IntegerField()
    max_score = models.IntegerField()
    date_taken = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.quiz.title} - {self.score}"