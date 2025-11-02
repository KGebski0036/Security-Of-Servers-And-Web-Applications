"""
Management command to create sample data for SoundVault
Run with: python manage.py create_sample_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from sounds.models import Sound, Tag, Comment, Favorite
from django.core.files import File
from io import BytesIO


class Command(BaseCommand):
    help = 'Creates sample data for SoundVault (tags, sounds, comments, favorites)'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')

        # Create admin user if it doesn't exist
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@soundvault.com',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created admin user: admin/admin123'))

        # Create regular user
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
            self.stdout.write(self.style.SUCCESS(f'Created test user: testuser/test123'))

        # Create tags
        tag_names = [
            'Nature', 'Water', 'Relaxation', 'Birds', 'Morning',
            'Weather', 'Rain', 'Dramatic', 'Urban', 'Traffic',
            'Background', 'Music', 'Instrumental', 'Calm', 'Fire',
            'Cozy', 'Indoor', 'Ocean', 'Forest', 'Piano'
        ]
        
        tags = {}
        for tag_name in tag_names:
            tag, created = Tag.objects.get_or_create(name=tag_name)
            tags[tag_name] = tag
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created tag: {tag_name}'))

        # Create sample sounds (without actual MP3 files - you'll need to add those)
        sample_sounds = [
            {
                'name': 'Ocean Waves',
                'description': 'Peaceful ocean waves recorded at sunset on a calm beach. Perfect for relaxation and meditation.',
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
                    # Note: mp3_file and image are optional for this command
                    # You'll need to add actual files manually or via admin
                }
            )
            
            if created:
                # Add tags
                tag_objects = [tags[tag_name] for tag_name in sound_data['tags'] if tag_name in tags]
                sound.tags.set(tag_objects)
                created_sounds.append(sound)
                self.stdout.write(self.style.SUCCESS(f'Created sound: {sound.name}'))
            else:
                created_sounds.append(sound)

        # Create some comments
        if created_sounds:
            comments_data = [
                {'sound': created_sounds[0], 'user': regular_user, 'content': 'Amazing sound quality!'},
                {'sound': created_sounds[0], 'user': admin_user, 'content': 'Great for meditation.'},
                {'sound': created_sounds[1], 'user': regular_user, 'content': 'Love this nature sound.'},
                {'sound': created_sounds[2], 'user': regular_user, 'content': 'Perfect for background ambience.'},
            ]
            
            for comment_data in comments_data:
                Comment.objects.get_or_create(
                    sound=comment_data['sound'],
                    user=comment_data['user'],
                    defaults={'content': comment_data['content']}
                )
            self.stdout.write(self.style.SUCCESS(f'Created {len(comments_data)} comments'))

        # Create some favorites
        if created_sounds and regular_user:
            Favorite.objects.get_or_create(
                user=regular_user,
                sound=created_sounds[0]
            )
            Favorite.objects.get_or_create(
                user=regular_user,
                sound=created_sounds[1]
            )
            self.stdout.write(self.style.SUCCESS('Created sample favorites'))

        self.stdout.write(self.style.SUCCESS('\nSample data created successfully!'))
        self.stdout.write('\nUsers created:')
        self.stdout.write('  - admin/admin123 (Admin)')
        self.stdout.write('  - testuser/test123 (Regular user)')
        self.stdout.write('\nNote: You need to upload MP3 files and images via admin panel or API.')

