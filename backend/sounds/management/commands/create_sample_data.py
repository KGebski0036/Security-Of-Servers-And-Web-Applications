"""
Management command to create sample data for SoundVault
Run with: python manage.py create_sample_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from sounds.models import Sound, Tag, Comment, Favorite
from django.db import transaction
import logging

# Get the custom user model safely
User = get_user_model()
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Creates sample data for SoundVault safely and idempotently'

    def handle(self, *args, **options):
        self.stdout.write('Checking for sample data...')

        try:
            # Atomic block ensures all-or-nothing execution
            with transaction.atomic():
                self.create_data()
                self.stdout.write(self.style.SUCCESS('Sample data check complete.'))
        except Exception as e:
            # Log the error but don't crash the container (useful for auto-scaling race conditions)
            self.stdout.write(self.style.WARNING(f"Note: Data creation skipped or rolled back due to: {e}"))

    def create_data(self):
        # 1. Create Users
        # We use get_or_create to handle race conditions safely
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@soundvault.com',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('ffFdbgBGE42vwervr#!')
            admin_user.save()
            self.stdout.write(f'Created admin user: {admin_user.username}')

        regular_user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'email': 'testuser@soundvault.com',
                'is_staff': False
            }
        )
        if created:
            regular_user.set_password('test123')
            regular_user.save()
            self.stdout.write(f'Created regular user: {regular_user.username}')

        # 2. Create Tags
        tag_names = [
            'Nature', 'Water', 'Relaxation', 'Birds', 'Morning',
            'Weather', 'Rain', 'Dramatic', 'Urban', 'Traffic',
            'Background', 'Music', 'Instrumental', 'Calm', 'Fire',
            'Cozy', 'Indoor', 'Ocean', 'Forest', 'Piano'
        ]
        
        tags_cache = {}
        for tag_name in tag_names:
            tag, _ = Tag.objects.get_or_create(name=tag_name)
            tags_cache[tag_name] = tag

        # 3. Create Sounds
        sample_sounds = [
            {
                'name': 'Ocean Waves',
                'description': 'Peaceful ocean waves recorded at sunset on a calm beach.',
                'tags': ['Nature', 'Water', 'Relaxation', 'Ocean'],
                'uploaded_by': admin_user
            },
            {
                'name': 'Forest Birds',
                'description': 'Chirping birds in a peaceful forest during morning hours.',
                'tags': ['Nature', 'Birds', 'Morning', 'Forest'],
                'uploaded_by': admin_user
            },
            {
                'name': 'Thunder Storm',
                'description': 'Dramatic thunder and rain sounds from a powerful storm.',
                'tags': ['Weather', 'Rain', 'Dramatic'],
                'uploaded_by': admin_user
            },
            {
                'name': 'City Ambience',
                'description': 'Urban city sounds with traffic and background noise.',
                'tags': ['Urban', 'Traffic', 'Background'],
                'uploaded_by': admin_user
            },
            {
                'name': 'Piano Melody',
                'description': 'Calming piano melody perfect for focus and relaxation.',
                'tags': ['Music', 'Instrumental', 'Calm', 'Piano'],
                'uploaded_by': admin_user
            },
            {
                'name': 'Fireplace Crackling',
                'description': 'Cozy fireplace sounds with crackling fire.',
                'tags': ['Fire', 'Cozy', 'Indoor'],
                'uploaded_by': admin_user
            },
        ]

        created_sounds = []
        for sound_data in sample_sounds:
            sound, created = Sound.objects.get_or_create(
                name=sound_data['name'],
                defaults={
                    'description': sound_data['description'],
                    'uploaded_by': sound_data['uploaded_by'],
                }
            )
            
            # Ensure tags are set (even if sound already existed, we confirm tags are there)
            current_tags = [tags_cache[t] for t in sound_data['tags'] if t in tags_cache]
            sound.tags.add(*current_tags)
            
            if created:
                self.stdout.write(f'Created sound: {sound.name}')
            
            created_sounds.append(sound)

        # 4. Create Comments
        if created_sounds:
            comments_data = [
                {'sound': created_sounds[0], 'user': regular_user, 'content': 'Amazing sound quality!'},
                {'sound': created_sounds[0], 'user': admin_user, 'content': 'Great for meditation.'},
                {'sound': created_sounds[1], 'user': regular_user, 'content': 'Love this nature sound.'},
                {'sound': created_sounds[2], 'user': regular_user, 'content': 'Perfect for background ambience.'},
            ]
            
            for c_data in comments_data:
                Comment.objects.get_or_create(
                    sound=c_data['sound'],
                    user=c_data['user'],
                    defaults={'content': c_data['content']}
                )

        # 5. Create Favorites
        if created_sounds and regular_user:
            Favorite.objects.get_or_create(user=regular_user, sound=created_sounds[0])
            Favorite.objects.get_or_create(user=regular_user, sound=created_sounds[1])