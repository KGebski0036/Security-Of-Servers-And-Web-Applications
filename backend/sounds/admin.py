from django.contrib import admin
from .models import Sound, Tag, Comment, Favorite


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


@admin.register(Sound)
class SoundAdmin(admin.ModelAdmin):
    list_display = ['name', 'uploaded_by', 'created_at']
    list_filter = ['created_at', 'tags']
    search_fields = ['name', 'description']
    filter_horizontal = ['tags']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['user', 'sound', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'user__username', 'sound__name']
    readonly_fields = ['created_at']


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'sound', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'sound__name']
    readonly_fields = ['created_at']
