from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Sound, Tag, Comment, Favorite


class SoundModelTest(TestCase):
    """Test Sound model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.tag = Tag.objects.create(name='Nature')
        
    def test_sound_creation(self):
        sound = Sound.objects.create(
            name='Test Sound',
            description='Test description',
            uploaded_by=self.user
        )
        sound.tags.add(self.tag)
        
        self.assertEqual(str(sound), 'Test Sound')
        self.assertEqual(sound.uploaded_by, self.user)
        self.assertIn(self.tag, sound.tags.all())


class TagModelTest(TestCase):
    """Test Tag model"""
    
    def test_tag_creation(self):
        tag = Tag.objects.create(name='Relaxation')
        self.assertEqual(str(tag), 'Relaxation')


class CommentModelTest(TestCase):
    """Test Comment model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.sound = Sound.objects.create(
            name='Test Sound',
            uploaded_by=self.user
        )
    
    def test_comment_creation(self):
        comment = Comment.objects.create(
            sound=self.sound,
            user=self.user,
            content='Test comment'
        )
        self.assertEqual(str(comment), f'{self.user.username} - {self.sound.name}')


class FavoriteModelTest(TestCase):
    """Test Favorite model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.sound = Sound.objects.create(
            name='Test Sound',
            uploaded_by=self.user
        )
    
    def test_favorite_creation(self):
        favorite = Favorite.objects.create(
            user=self.user,
            sound=self.sound
        )
        self.assertEqual(favorite.user, self.user)
        self.assertEqual(favorite.sound, self.sound)


class SoundAPITest(TestCase):
    """Test Sound API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.admin_user = User.objects.create_user(
            username='admin',
            password='admin123',
            is_staff=True
        )
        self.sound = Sound.objects.create(
            name='Test Sound',
            description='Test description',
            uploaded_by=self.user
        )
    
    def test_list_sounds(self):
        """Test GET /api/sounds/"""
        response = self.client.get('/api/sounds/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_retrieve_sound(self):
        """Test GET /api/sounds/<id>/"""
        response = self.client.get(f'/api/sounds/{self.sound.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Sound')
    
    def test_create_sound_requires_admin(self):
        """Test POST /api/sounds/ requires admin"""
        response = self.client.post('/api/sounds/', {
            'name': 'New Sound',
            'description': 'New description'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Login as admin
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/sounds/', {
            'name': 'New Sound',
            'description': 'New description'
        })
        # This will fail without mp3_file, but should get past auth
        self.assertNotEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TagAPITest(TestCase):
    """Test Tag API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.tag = Tag.objects.create(name='Nature')
    
    def test_list_tags(self):
        """Test GET /api/tags/"""
        response = self.client.get('/api/tags/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)


class CommentAPITest(TestCase):
    """Test Comment API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.sound = Sound.objects.create(
            name='Test Sound',
            uploaded_by=self.user
        )
    
    def test_create_comment_requires_auth(self):
        """Test POST /api/comments/ requires authentication"""
        response = self.client.post('/api/comments/', {
            'sound': self.sound.id,
            'content': 'Test comment'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Login
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/comments/', {
            'sound': self.sound.id,
            'content': 'Test comment'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class FavoriteAPITest(TestCase):
    """Test Favorite API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.sound = Sound.objects.create(
            name='Test Sound',
            uploaded_by=self.user
        )
    
    def test_create_favorite_requires_auth(self):
        """Test POST /api/favorites/ requires authentication"""
        response = self.client.post('/api/favorites/', {
            'sound': self.sound.id
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Login
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/favorites/', {
            'sound': self.sound.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class AuthAPITest(TestCase):
    """Test Authentication API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_register(self):
        """Test POST /api/auth/register/"""
        response = self.client.post('/api/auth/register/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
    
    def test_login(self):
        """Test POST /api/auth/login/"""
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
    
    def test_me_endpoint(self):
        """Test GET /api/auth/me/"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
