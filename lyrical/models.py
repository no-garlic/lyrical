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
    llm_model = models.ForeignKey(LLM, on_delete=models.PROTECT, null=False, blank=False)
    llm_temperature = models.FloatField(default=0.2)
    llm_max_tokens = models.IntegerField(default=2000)

    # song name default params
    song_name_theme_inc = models.CharField(max_length=255, default='')
    song_name_theme_exc = models.CharField(max_length=255, default='')
    song_name_words_inc = models.CharField(max_length=255, default='')
    song_name_words_exc = models.CharField(max_length=255, default='')
    song_name_starts_with = models.CharField(max_length=255, default='')
    song_name_ends_with = models.CharField(max_length=255, default='')
    song_name_length_min = models.IntegerField(default=1)
    song_name_length_max = models.IntegerField(default=5)
    song_name_gen_count = models.IntegerField(default=5)

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

    # Song Name
    name = models.CharField(max_length=255, unique=True)
    
    # Song Style
    theme = models.TextField(default='')
    narrative = models.TextField(default='')
    mood = models.TextField(default='')
    
    # Song Structure
    structure = models.TextField(default='')

    # Song Structure Parameters
    structure_custom_request = models.TextField(default='')
    structure_vocalisation_level = models.IntegerField(default=2, choices=[(0, 'None'), (1, 'Low'), (2, 'Medium'), (3, 'High')])
    structure_vocalisation_terms = models.CharField(default='ah, ahh, oh, ooh, whoa', max_length=255)
    structure_average_syllables = models.IntegerField(default=8)
    structure_verse_lines = models.IntegerField(default=4)
    structure_pre_chorus_lines = models.IntegerField(default=4)
    structure_chorus_lines = models.IntegerField(default=4)
    structure_bridge_lines = models.IntegerField(default=4)
    structure_intro_lines = models.IntegerField(default=4)
    structure_outro_lines = models.IntegerField(default=4)
    structure_vocalisation_lines = models.IntegerField(default=2)

    # Song Stage
    stage = models.CharField(max_length=50, choices=[
        ('new', 'New'),             # song has just been created
        ('liked', 'Liked'),         # song is added to the liked list
        ('disliked', 'Disliked'),   # song is added to the disliked list
        ('generated', 'Generated'), # song is no longer a song name, but now a full song
        ('published', 'Published'), # song is published and available in the song names list
    ], default='new')

    # Audit History
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.stage})"

    @property
    def new(self):
        return self.stage == 'new'
    
    @property
    def liked(self):
        return self.stage == 'liked'
    
    @property
    def disliked(self):
        return self.stage == 'disliked'

    @property
    def generated(self):
        return self.stage == 'generated'

    @property
    def published(self):
        return self.stage == 'published'
    
    @property
    def structure_verse_count(self):
        return self.structure.count('verse') if self.structure else 0
    
    def apply_user_defaults(self, user):
        # song name default params
        self.song_name_theme_inc = user.song_name_theme_inc
        self.song_name_theme_exc = user.song_name_theme_exc
        self.song_name_words_inc = user.song_name_words_inc
        self.song_name_words_exc = user.song_name_words_exc
        self.song_name_starts_with = user.song_name_starts_with
        self.song_name_ends_with = user.song_name_ends_with
        self.song_name_length_min = user.song_name_length_min
        self.song_name_length_max = user.song_name_length_max
        self.song_name_gen_count = user.song_name_gen_count
    

class SongStructureTemplate(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='structure_templates')
    name = models.CharField(max_length=255, unique=True)

    # Structure Parameters
    custom_request = models.TextField(default='')
    vocalisation_level = models.IntegerField(default=2, choices=[(0, 'None'), (1, 'Low'), (2, 'Medium'), (3, 'High')])
    vocalisation_terms = models.CharField(default='ah, ahh, oh, ooh, whoa', max_length=255)
    average_syllables = models.IntegerField(default=8)
    verse_lines = models.IntegerField(default=4)
    pre_chorus_lines = models.IntegerField(default=4)
    chorus_lines = models.IntegerField(default=4)
    bridge_lines = models.IntegerField(default=4)
    intro_lines = models.IntegerField(default=4)
    outro_lines = models.IntegerField(default=4)
    vocalisation_lines = models.IntegerField(default=2)
    structure = models.TextField(default='')

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class SongMetadata(models.Model):
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name='metadata')
    key = models.CharField(max_length=255)
    value = models.TextField(default='')

    def __str__(self):
        return f"{self.self.name} - {self.key}: {self.value}"


class Lyrics(models.Model):
    song = models.ForeignKey('Song', on_delete=models.CASCADE, related_name='lyrics')
    type = models.CharField(max_length=50, choices=[
        ('intro', 'Intro'),
        ('verse', 'Verse'),
        ('chorus', 'Chorus'),
        ('bridge', 'Bridge'),
        ('pre-chorus', 'Pre-Chorus'),
        ('outro', 'Outro'),
        ('vocalisation', 'Vocalisation'),
    ])
    index = models.IntegerField(default=0)
    words = models.TextField(default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Section(models.Model):
    song = models.ForeignKey('Song', on_delete=models.CASCADE, related_name='sections')
    type = models.CharField(max_length=50, choices=[
        ('theme', 'Theme'),
        ("narrative", "Narrative"),
        ("mood", "Mood"),
        ('intro', 'Intro'),
        ('verse', 'Verse'),
        ('chorus', 'Chorus'),
        ('bridge', 'Bridge'),
        ('pre-chorus', 'Pre-Chorus'),
        ('outro', 'Outro'),
        ('vocalisation', 'Vocalisation')
    ])
    text = models.TextField(default='')
    hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def badge_name(self):
        return self.type.upper()

    def badge_style(self):
        return f"badge-{self.type}"


class Message(models.Model):
    type = models.CharField(max_length=50, choices=[('style', 'style'), ('lyrics', 'Lyrics')])
    role = models.CharField(max_length=50, choices=[('system', 'System'), ('user', 'User'), ('assistant', 'Assistant')])
    content = models.TextField()
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name='messages')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.role}: {self.content[:50]}... ({self.song.name})"
    