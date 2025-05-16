from django.contrib import admin
from .models import *


class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'first_name', 'last_name', 'email', 'is_staff', 'is_active')
    search_fields = ('id', 'username', 'first_name', 'last_name')
    list_filter = ('is_staff', 'is_active', 'date_joined')
    ordering = ('username',)


class LLMProviderAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('id', 'name')
    ordering = ('name',)


class LLMAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'model_name', 'provider')
    search_fields = ('id', 'name', 'model_name')
    list_filter = ('provider',)
    ordering = ('name',)


class UserAPIKeyAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'provider', 'api_key')
    search_fields = ('id', 'user__username', 'provider__name', 'api_key')
    list_filter = ('provider',)
    ordering = ('user', 'provider')


admin.site.register(User, UserAdmin)
admin.site.register(LLMProvider, LLMProviderAdmin)
admin.site.register(LLM, LLMAdmin)
admin.site.register(UserAPIKey, UserAPIKeyAdmin)
