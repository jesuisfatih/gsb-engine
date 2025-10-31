# Renderer Service (Python for image processing)
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY services/renderer-service/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY services/renderer-service/src ./src

ENV PORT=4002
ENV PYTHONUNBUFFERED=1

EXPOSE 4002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:4002/health')"

CMD ["python", "-m", "src.main"]

