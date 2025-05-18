from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

    
class LLMProvider(models.Model):
    display_name = models.CharField(max_length=255, unique=True)
    internal_name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.display_name


class LLM(models.Model):
    display_name = models.CharField(max_length=255, unique=True)
    internal_name = models.CharField(max_length=255, unique=True)
    temperature = models.FloatField(default=0.5)
    max_tokens = models.IntegerField(default=1000)
    provider = models.ForeignKey(LLMProvider, on_delete=models.CASCADE, related_name='llms')
    features = models.JSONField(default=dict)
    comments = models.TextField(default='')
    cost = models.FloatField(default=0.0)
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)], default=1)
    
    def __str__(self):
        return f"{self.display_name}"


class User(AbstractUser):
    default_model = models.ForeignKey(LLM, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.first_name} {self.last_name})"


class UserAPIKey(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    provider = models.ForeignKey(LLMProvider, on_delete=models.CASCADE)
    api_key = models.CharField(max_length=255, unique=False, default='')

    def __str__(self):
        return f"{self.user.username} ({self.provider.display_name}: {self.api_key})"


class Workspace(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workspaces')
    display_name = models.CharField(max_length=255)
    internal_name = models.CharField(max_length=50, choices=[('new', 'New'), ('working', 'Working'), ('published', 'Published'), ('archive', 'Archive'), ('custom', 'Custom')])

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class Song(models.Model):
    title = models.CharField(max_length=255)
    theme = models.TextField(default='')
    lyrics = models.TextField(default='')
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='songs')
    llm = models.ForeignKey(LLM, on_delete=models.SET_NULL, null=True, blank=True)
    llm_temperature = models.FloatField(default=0.5)

    def __str__(self):
        return f"{self.title} by {self.artist} ({self.workspace.name})"


class Message(models.Model):
    role = models.CharField(max_length=50, choices=[('system', 'System'), ('user', 'User'), ('assistant', 'Assistant')])
    content = models.TextField()
    llm = models.ForeignKey(LLM, on_delete=models.SET_NULL, null=True, blank=True)
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name='messages')

    def __str__(self):
        return f"{self.role}: {self.content[:50]}... ({self.song.title})"
    

class ExcludeSongName(models.Model):
    title = models.CharField(max_length=64, unique=True)

    def __str__(self):
        return self.title
