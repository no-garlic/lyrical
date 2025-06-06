from django.contrib import admin
from .models import *


class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'first_name', 'last_name', 'email', 'is_staff', 'is_active', 'llm_model', 'llm_temperature', 'llm_max_tokens')
    search_fields = ('id', 'username', 'first_name', 'last_name', 'email')
    list_filter = ('is_staff', 'is_active', 'date_joined', 'llm_model__provider')
    ordering = ('username',)
    readonly_fields = ('date_joined', 'last_login')
    
    fieldsets = (
        ('User Information', {
            'fields': ('username', 'first_name', 'last_name', 'email', 'is_staff', 'is_active', 'date_joined', 'last_login')
        }),
        ('LLM Settings', {
            'fields': ('llm_model', 'llm_temperature', 'llm_max_tokens')
        }),
        ('Song Name Defaults', {
            'fields': (
                'song_name_theme_inc', 'song_name_theme_exc',
                'song_name_words_inc', 'song_name_words_exc', 
                'song_name_starts_with', 'song_name_ends_with',
                'song_name_length_min', 'song_name_length_max', 'song_name_gen_count'
            ),
            'classes': ('collapse',)
        }),
    )


class LLMProviderAdmin(admin.ModelAdmin):
    list_display = ('id', 'display_name', 'internal_name', 'llm_count')
    search_fields = ('id', 'display_name', 'internal_name')
    ordering = ('display_name',)
    
    def llm_count(self, obj):
        return obj.llms.count()
    llm_count.short_description = 'Number of LLMs'


class LLMAdmin(admin.ModelAdmin):
    list_display = ('id', 'display_name', 'internal_name', 'provider', 'cost_per_1m_tokens')
    search_fields = ('id', 'display_name', 'internal_name')
    list_filter = ('provider',)
    ordering = ('provider', 'display_name')


class UserAPIKeyAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'provider', 'masked_api_key')
    search_fields = ('id', 'user__username', 'provider__display_name')
    list_filter = ('provider',)
    ordering = ('user', 'provider')
    
    def masked_api_key(self, obj):
        if len(obj.api_key) > 8:
            return f"{obj.api_key[:4]}...{obj.api_key[-4:]}"
        return obj.api_key
    masked_api_key.short_description = 'API Key'


class SongAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'user', 'stage', 'created_at', 'updated_at')
    search_fields = ('id', 'name', 'user__username', 'theme', 'narrative', 'mood')
    list_filter = ('stage', 'created_at', 'updated_at', 'user')
    ordering = ('-updated_at',)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'name', 'stage', 'created_at', 'updated_at')
        }),
        ('Song Style', {
            'fields': ('theme', 'narrative', 'mood')
        }),
        ('Song Structure', {
            'fields': ('structure',)
        }),
        ('Structure Parameters', {
            'fields': (
                'structure_custom_request', 'structure_vocalisation_level', 'structure_vocalisation_terms',
                'structure_average_syllables', 'structure_verse_lines', 'structure_pre_chorus_lines',
                'structure_chorus_lines', 'structure_bridge_lines', 'structure_intro_lines',
                'structure_outro_lines', 'structure_vocalisation_lines'
            ),
            'classes': ('collapse',)
        }),
    )


class SongStructureTemplateAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'user', 'vocalisation_level', 'average_syllables')
    search_fields = ('id', 'name', 'user__username', 'custom_request')
    list_filter = ('vocalisation_level', 'user')
    ordering = ('name',)
    
    fieldsets = (
        ('Template Information', {
            'fields': ('user', 'name')
        }),
        ('Structure Parameters', {
            'fields': (
                'custom_request', 'vocalisation_level', 'vocalisation_terms',
                'average_syllables', 'verse_lines', 'pre_chorus_lines',
                'chorus_lines', 'bridge_lines', 'intro_lines',
                'outro_lines', 'vocalisation_lines', 'structure'
            )
        }),
    )


class SongMetadataAdmin(admin.ModelAdmin):
    list_display = ('id', 'song', 'key', 'value_preview')
    search_fields = ('id', 'song__name', 'key', 'value')
    list_filter = ('key',)
    ordering = ('song', 'key')
    
    def value_preview(self, obj):
        return obj.value[:50] + '...' if len(obj.value) > 50 else obj.value
    value_preview.short_description = 'Value'


class LyricsAdmin(admin.ModelAdmin):
    list_display = ('id', 'song_name', 'type', 'index', 'words_preview', 'created_at', 'updated_at')
    search_fields = ('id', 'song__name', 'type', 'words')
    list_filter = ('type', 'created_at', 'updated_at')
    ordering = ('song', 'type', 'index')
    readonly_fields = ('created_at', 'updated_at')
    
    def song_name(self, obj):
        return obj.song.name
    song_name.short_description = 'Song'
    
    def words_preview(self, obj):
        return obj.words[:50] + '...' if len(obj.words) > 50 else obj.words
    words_preview.short_description = 'Words'


class SectionAdmin(admin.ModelAdmin):
    list_display = ('id', 'song_name', 'type', 'text_preview', 'hidden', 'created_at', 'updated_at')
    search_fields = ('id', 'song__name', 'type', 'text')
    list_filter = ('type', 'hidden', 'created_at', 'updated_at')
    ordering = ('song', 'type', '-created_at')
    readonly_fields = ('created_at', 'updated_at')
    
    def song_name(self, obj):
        return obj.song.name
    song_name.short_description = 'Song'
    
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Text'


class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'song_name', 'type', 'role', 'content_preview', 'created_at')
    search_fields = ('id', 'song__name', 'type', 'role', 'content')
    list_filter = ('type', 'role', 'created_at')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    
    def song_name(self, obj):
        return obj.song.name
    song_name.short_description = 'Song'
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'


# Register all models
admin.site.register(User, UserAdmin)
admin.site.register(LLMProvider, LLMProviderAdmin)
admin.site.register(LLM, LLMAdmin)
admin.site.register(UserAPIKey, UserAPIKeyAdmin)
admin.site.register(Song, SongAdmin)
admin.site.register(SongStructureTemplate, SongStructureTemplateAdmin)
admin.site.register(SongMetadata, SongMetadataAdmin)
admin.site.register(Lyrics, LyricsAdmin)
admin.site.register(Section, SectionAdmin)
admin.site.register(Message, MessageAdmin)