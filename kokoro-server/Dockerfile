FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y espeak-ng && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir fastapi uvicorn[standard] soundfile kokoro==0.9.4
COPY server.py .
EXPOSE 40001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "40001"]
