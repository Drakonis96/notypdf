# Dockerfile for Python backend
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

# Create data directory for configuration storage
RUN mkdir -p /app/data

EXPOSE 5000

CMD ["python", "app.py"]
