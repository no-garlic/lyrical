#!/bin/bash
# Script to update dependencies and restart the Django server

echo "Updating dependencies..."
pip install -r requirements.txt

echo "Cleaning up Python cache files to ensure clean restart..."
find . -name "__pycache__" -type d -exec rm -rf {} +  2>/dev/null || true
find . -name "*.pyc" -delete

echo "Stopping any running Django servers..."
pkill -f "python manage.py runserver" || echo "No running servers found."

echo "Starting Django server..."
python manage.py runserver
