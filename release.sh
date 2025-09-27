#!/bin/bash

# Heroku release phase script
# This runs before the application starts

echo "Running database migrations..."
alembic upgrade head

echo "Database setup complete!"
