# Base image
FROM python:3.9-slim-bullseye

# Set working directory
WORKDIR /app

# Install system dependencies required for OpenCV and other image libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8001

# Command to run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
