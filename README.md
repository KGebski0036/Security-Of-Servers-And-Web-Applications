# Security-Of-Servers-And-Web-Applications.

Repository for a cloud-based web application project. Includes development of a simple web app with login, user interaction, scalable cloud architecture, CI/CD pipeline, and security implementation.

A Spotify-like sound storage application with React frontend and Django REST Framework backend.
 
## Project Structure

```
BQuote/
├── frontend/          # React + Vite + TypeScript frontend
├── backend/           # Django REST Framework backend
├── docker-compose.yml # Docker compose for all services
└── README.md          # This file
```

## Quick Start with Docker

```bash
   cp backend/env.example backend/.env
   # Edit backend/.env with your settings
   docker-compose up --build
   docker-compose exec backend python manage.py create_sample_data
```

