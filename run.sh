#!/bin/bash
# Build and run the PDF Reader with Notion Integration

# Check if .env file exists, if not, create from example
if [ ! -f .env ]; then
  echo "Creating .env file from template..."
  cp .env.example .env
  echo "Please edit the .env file to add your Notion API key"
  exit 1
fi

# Build and run with Docker Compose
echo "Building and running PDF Reader with Notion Integration..."
docker-compose up --build -d

echo "Application is running at http://localhost:5026"
echo "Press Ctrl+C to view logs or run 'docker-compose logs -f'"
