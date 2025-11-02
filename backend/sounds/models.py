from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Tag(models.Model):
    """Tag model for categorizing sounds"""
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Sound(models.Model):
    """Sound model for storing audio files and metadata"""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    mp3_file = models.FileField(upload_to='sounds/mp3/')
    image = models.ImageField(upload_to='sounds/images/', blank=True, null=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_sounds')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    tags = models.ManyToManyField(Tag, related_name='sounds', blank=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']


class Comment(models.Model):
    """Comment model for user comments on sounds"""
    sound = models.ForeignKey(Sound, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.sound.name}"

    class Meta:
        ordering = ['-created_at']


class Favorite(models.Model):
    """Favorite model for users to favorite sounds"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    sound = models.ForeignKey(Sound, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'sound']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} favorited {self.sound.name}"
