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
    cost_per_1m_tokens = models.FloatField(default=0.0)
    provider = models.ForeignKey(LLMProvider, on_delete=models.CASCADE, related_name='llms')
    
    def __str__(self):
        return f"{self.display_name}"


class User(AbstractUser):
    llm_model = models.ForeignKey(LLM, on_delete=models.SET_NULL, null=True, blank=True)
    llm_temperature = models.FloatField(default=0.5)
    llm_max_tokens = models.IntegerField(default=1000)

    def __str__(self):
        return f"{self.username} ({self.first_name} {self.last_name})"


class UserAPIKey(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    provider = models.ForeignKey(LLMProvider, on_delete=models.CASCADE)
    api_key = models.CharField(max_length=255, unique=False, default='')

    def __str__(self):
        return f"{self.user.username} ({self.provider.display_name}: {self.api_key})"


class Song(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='songs')
    name = models.CharField(max_length=255, unique=True)
    theme = models.TextField(default='')
    structure = models.TextField(default='')
    stage = models.CharField(max_length=50, choices=[
        ('new', 'New'),             # song has just been created
        ('liked', 'Liked'),         # song is added to the liked list
        ('disliked', 'Disliked'),   # song is added to the disliked list
        ('generated', 'Generated')  # song is no longer a song name, but now a full song
    ], default='new')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.stage})"
    

class Lyrics(models.Model):
    song = models.ForeignKey('Song', on_delete=models.CASCADE, related_name='lyrics')
    type = models.CharField(max_length=50, choices=[
        ('verse', 'Verse'),
        ('chorus', 'Chorus'),
        ('bridge', 'Bridge'),
        ('pre-chorus', 'Pre-Chorus'),
        ('outro', 'Outro'),
    ])
    index = models.IntegerField(default=0)
    lyrics = models.TextField(default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Section(models.Model):
    song = models.ForeignKey('Song', on_delete=models.CASCADE, related_name='sections')
    type = models.CharField(max_length=50, choices=[
        ('theme', 'Theme'),
        ('hook', 'Hook'),
        ('verse', 'Verse'),
        ('chorus', 'Chorus'),
        ('bridge', 'Bridge'),
        ('pre-chorus', 'Pre-Chorus'),
        ('outro', 'Outro'),
        ('vocalisation', 'Vocalisation')
    ])
    lyrics = models.TextField(default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Message(models.Model):
    role = models.CharField(max_length=50, choices=[('system', 'System'), ('user', 'User'), ('assistant', 'Assistant')])
    content = models.TextField()
    llm = models.ForeignKey(LLM, on_delete=models.SET_NULL, null=True, blank=True)
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name='messages')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.role}: {self.content[:50]}... ({self.song.title})"
    