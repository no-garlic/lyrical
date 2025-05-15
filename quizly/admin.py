from django.contrib import admin
from .models import *


class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    list_filter = ('is_staff', 'is_active', 'date_joined')
    ordering = ('username',)

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name', 'description')
    ordering = ('name',)

class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'quiz', 'solution')
    search_fields = ('text', 'quiz__name')
    list_filter = ('quiz', 'solution')
    ordering = ('quiz', 'id')

class QuizAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at', 'created_by', 'category')
    search_fields = ('name', 'description', 'created_by__username')
    list_filter = ('category', 'created_at', 'created_by')
    ordering = ('-created_at',)

class QuizRatingAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'user', 'rating')
    search_fields = ('quiz__name', 'user__username')
    list_filter = ('rating', 'quiz')
    ordering = ('quiz', '-rating')

class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'user', 'score', 'date_taken')
    search_fields = ('quiz__name', 'user__username')
    list_filter = ('quiz', 'date_taken')
    ordering = ('-date_taken',)

class AnswerAdmin(admin.ModelAdmin):
    list_display = ('quiz_attempt', 'question', 'answer')
    search_fields = ('quiz_attempt__quiz__name', 'question__text')
    list_filter = ('quiz_attempt__quiz', 'answer')
    ordering = ('quiz_attempt', 'id')

class SavedForLaterAdmin(admin.ModelAdmin): 
    list_display = ('quiz', 'user')
    search_fields = ('quiz__name', 'user__username')
    list_filter = ('quiz', 'user')
    ordering = ('user', 'quiz')

admin.site.register(User, UserAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(Question, QuestionAdmin)
admin.site.register(Quiz, QuizAdmin)
admin.site.register(QuizRating, QuizRatingAdmin)
admin.site.register(QuizAttempt, QuizAttemptAdmin)
admin.site.register(Answer, AnswerAdmin)
admin.site.register(SavedForLater, SavedForLaterAdmin)
