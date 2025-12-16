#!/bin/bash
# Initialize database and start the Flask application
python3 -c "from app import init_db; init_db()"
gunicorn app:app --bind 0.0.0.0:${PORT:-3000} --workers 2

