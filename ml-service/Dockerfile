FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/model /app/data /app/scripts/data

EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:5001/health || exit 1

# Train on startup if model doesn't exist, then start server
CMD python scripts/generate_data.py 2>/dev/null || true && \
    python scripts/train_model.py 2>/dev/null || true && \
    gunicorn --bind 0.0.0.0:5001 --timeout 120 app:app