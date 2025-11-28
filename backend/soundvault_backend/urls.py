"""
URL configuration for soundvault_backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from sounds.views import (
    SoundViewSet,
    TagViewSet,
    CommentViewSet,
    FavoriteViewSet,
    whoami,
)
from sounds.auth_views import register, login, logout, me
from rest_framework_simplejwt.views import TokenRefreshView

# Create router and register viewsets
router = DefaultRouter()
router.register(r'sounds', SoundViewSet, basename='sound')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'favorites', FavoriteViewSet, basename='favorite')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API routes
    path('api/', include(router.urls)),
    
    # Authentication routes
    path('api/auth/register/', register, name='register'),
    path('api/auth/login/', login, name='login'),
    path('api/auth/logout/', logout, name='logout'),
    path('api/auth/me/', me, name='me'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/whoami/', whoami, name='whoami'),
    
    # Note: Admin sound routes are handled by the SoundViewSet
    # POST /api/sounds/ - create (admin only)
    # PUT/PATCH/DELETE /api/sounds/<id>/ - update/delete (admin only)
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
