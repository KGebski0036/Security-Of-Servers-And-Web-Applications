#!/bin/bash
set -e

echo "Waiting for database..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo "Database is up!"

echo "Running migrations..."
gosu root python manage.py migrate --noinput

echo "Collecting static files..."
gosu root python manage.py collectstatic --noinput || true

echo "Create admin account and some data"
gosu root python manage.py create_sample_data

echo "Starting server..."
exec gosu nonrootuser "$@"

