from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings
from .models import Sound, Tag, Comment, Favorite


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff']
        read_only_fields = ['id', 'is_staff']


class SoundListSerializer(serializers.ModelSerializer):
    """Serializer for listing sounds (less detail)"""
    tags = TagSerializer(many=True, read_only=True)
    uploaded_by = serializers.StringRelatedField()
    image_url = serializers.SerializerMethodField()
    mp3_url = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Sound
        fields = [
            'id', 'name', 'description', 'image_url', 'mp3_url',
            'tags', 'uploaded_by', 'created_at', 'is_favorite'
        ]
        read_only_fields = ['created_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                url = request.build_absolute_uri(obj.image.url)
                # Force HTTPS - App Runner serves over HTTPS
                # Check if behind proxy (X-Forwarded-Proto header) or force HTTPS
                if url.startswith('http://'):
                    # Check for proxy header or force HTTPS in production
                    if request.META.get('HTTP_X_FORWARDED_PROTO') == 'https' or not settings.DEBUG:
                        url = url.replace('http://', 'https://')
                return url
            # Fallback: use BASE_URL if available
            if settings.BASE_URL:
                return f"{settings.BASE_URL.rstrip('/')}{obj.image.url}"
            return obj.image.url
        return None

    def get_mp3_url(self, obj):
        if obj.mp3_file:
            request = self.context.get('request')
            if request:
                url = request.build_absolute_uri(obj.mp3_file.url)
                # Force HTTPS - App Runner serves over HTTPS
                # Check if behind proxy (X-Forwarded-Proto header) or force HTTPS
                if url.startswith('http://'):
                    # Check for proxy header or force HTTPS in production
                    if request.META.get('HTTP_X_FORWARDED_PROTO') == 'https' or not settings.DEBUG:
                        url = url.replace('http://', 'https://')
                return url
            # Fallback: use BASE_URL if available
            if settings.BASE_URL:
                return f"{settings.BASE_URL.rstrip('/')}{obj.mp3_file.url}"
            return obj.mp3_file.url
        return None

    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, sound=obj).exists()
        return False


class SoundDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed sound view"""
    tags = TagSerializer(many=True, read_only=True)
    uploaded_by = UserSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    mp3_url = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    favorite_count = serializers.SerializerMethodField()

    class Meta:
        model = Sound
        fields = [
            'id', 'name', 'description', 'image_url', 'mp3_url',
            'tags', 'uploaded_by', 'created_at', 'updated_at',
            'is_favorite', 'comments', 'favorite_count'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                url = request.build_absolute_uri(obj.image.url)
                # Force HTTPS - App Runner serves over HTTPS
                # Check if behind proxy (X-Forwarded-Proto header) or force HTTPS
                if url.startswith('http://'):
                    # Check for proxy header or force HTTPS in production
                    if request.META.get('HTTP_X_FORWARDED_PROTO') == 'https' or not settings.DEBUG:
                        url = url.replace('http://', 'https://')
                return url
            # Fallback: use BASE_URL if available
            if settings.BASE_URL:
                return f"{settings.BASE_URL.rstrip('/')}{obj.image.url}"
            return obj.image.url
        return None

    def get_mp3_url(self, obj):
        if obj.mp3_file:
            request = self.context.get('request')
            if request:
                url = request.build_absolute_uri(obj.mp3_file.url)
                # Force HTTPS - App Runner serves over HTTPS
                # Check if behind proxy (X-Forwarded-Proto header) or force HTTPS
                if url.startswith('http://'):
                    # Check for proxy header or force HTTPS in production
                    if request.META.get('HTTP_X_FORWARDED_PROTO') == 'https' or not settings.DEBUG:
                        url = url.replace('http://', 'https://')
                return url
            # Fallback: use BASE_URL if available
            if settings.BASE_URL:
                return f"{settings.BASE_URL.rstrip('/')}{obj.mp3_file.url}"
            return obj.mp3_file.url
        return None

    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, sound=obj).exists()
        return False

    def get_comments(self, obj):
        comments = obj.comments.all()[:10]  # Limit to 10 most recent
        return CommentSerializer(comments, many=True, context=self.context).data

    def get_favorite_count(self, obj):
        return obj.favorited_by.count()


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'sound', 'user', 'user_name', 'content', 'created_at']
        read_only_fields = ['user', 'created_at']

    def get_user_name(self, obj):
        return obj.user.username

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    def validate_content(self, value):
        clean_value = bleach.clean(value, strip=True)
        return clean_value


class FavoriteSerializer(serializers.ModelSerializer):
    sound_detail = SoundListSerializer(source='sound', read_only=True)
    sound = serializers.PrimaryKeyRelatedField(queryset=Sound.objects.all(), write_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'sound', 'sound_detail', 'user', 'created_at']
        read_only_fields = ['user', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class SoundCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating sounds (admin only)"""
    tags = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        required=False
    )

    class Meta:
        model = Sound
        fields = [
            'id', 'name', 'description', 'mp3_file', 'image',
            'tags', 'uploaded_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['uploaded_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        tags_data = validated_data.pop('tags', [])
        validated_data['uploaded_by'] = self.context['request'].user
        sound = Sound.objects.create(**validated_data)
        if tags_data:
            sound.tags.set(tags_data)
        return sound

    def update(self, instance, validated_data):
        tags_data = validated_data.pop('tags', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tags_data is not None:
            instance.tags.set(tags_data)
        return instance

