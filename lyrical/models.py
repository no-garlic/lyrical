from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


    
class LLMProvider(models.Model):
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name


class LLM(models.Model):
    name = models.CharField(max_length=255)
    model_name = models.CharField(max_length=255)
    provider = models.ForeignKey(LLMProvider, on_delete=models.CASCADE, related_name='llms')

    def __str__(self):
        return f"{self.name} ({self.provider}: {self.model_name})"


class User(AbstractUser):
    default_model = models.ForeignKey(LLM, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.first_name} {self.last_name})"


class UserAPIKey(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    provider = models.ForeignKey(LLMProvider, on_delete=models.CASCADE)
    api_key = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return f"{self.user.username} ({self.provider.name}: {self.api_key})"



