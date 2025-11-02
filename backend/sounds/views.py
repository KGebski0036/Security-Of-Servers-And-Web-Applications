from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Sound, Tag, Comment, Favorite
from .serializers import (
    SoundListSerializer, SoundDetailSerializer, SoundCreateUpdateSerializer,
    TagSerializer, CommentSerializer, FavoriteSerializer, UserSerializer
)


class SoundViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Sound model.
    - List/Retrieve: Public access
    - Create/Update/Delete: Admin only
    """
    queryset = Sound.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'tags__name']
    ordering_fields = ['created_at', 'name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return SoundListSerializer
        elif self.action == 'retrieve':
            return SoundDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return SoundCreateUpdateSerializer
        return SoundListSerializer

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Sound.objects.all().prefetch_related('tags', 'uploaded_by')
        
        # Filter by tags
        tag = self.request.query_params.get('tag', None)
        if tag:
            queryset = queryset.filter(tags__name__icontains=tag).distinct()
        
        # Filter by search query
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(tags__name__icontains=search)
            ).distinct()
        
        return queryset

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)


class TagViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Tag model.
    - List/Retrieve: Public access
    - Create/Update/Delete: Admin only
    """
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]


class CommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Comment model.
    - Create: Authenticated users
    - List/Retrieve: Public access
    - Update/Delete: Only comment owner
    """
    queryset = Comment.objects.all().select_related('user', 'sound')
    serializer_class = CommentSerializer
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Comment.objects.all()
        sound_id = self.request.query_params.get('sound', None)
        if sound_id:
            queryset = queryset.filter(sound_id=sound_id)
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        # Only allow updating own comments
        if serializer.instance.user != self.request.user:
            raise serializers.ValidationError("You can only edit your own comments.")
        serializer.save()

    def perform_destroy(self, instance):
        # Only allow deleting own comments
        if instance.user != self.request.user:
            raise serializers.ValidationError("You can only delete your own comments.")
        instance.delete()


class FavoriteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Favorite model.
    - Create: Authenticated users
    - List: Authenticated users (their favorites only)
    - Delete: Authenticated users (their favorites only)
    """
    serializer_class = FavoriteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user).select_related('sound', 'user')

    def perform_create(self, serializer):
        # Get sound from validated_data (PrimaryKeyRelatedField converts ID to object)
        sound = serializer.validated_data.get('sound')
        if not sound:
            raise serializers.ValidationError("Sound ID is required.")
        
        # Check if favorite already exists
        if Favorite.objects.filter(user=self.request.user, sound=sound).exists():
            raise serializers.ValidationError("Sound is already in favorites.")
        
        # Save with user and sound
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['delete'])
    def remove(self, request):
        """Remove favorite by sound ID"""
        sound_id = request.query_params.get('sound')
        if not sound_id:
            return Response(
                {"error": "Sound ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            favorite = Favorite.objects.get(user=request.user, sound_id=sound_id)
            favorite.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Favorite.DoesNotExist:
            return Response(
                {"error": "Favorite not found."},
                status=status.HTTP_404_NOT_FOUND
            )
