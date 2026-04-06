# Backend uchun optimal Dockerfile (Python)
FROM python:3.12-slim

# Xotirani asrash va jarayonlarni optimizallashtirish 
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Maxsus postgres kutubxonalari uchun dependensiyalar
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    libpq-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# requirements tushib qolmasligi uchun (eng muhimlari yozilgan default o'rnatish)
COPY requirements.txt ./
# Agar fayl bosa uni o'rnatamiz 
RUN pip install --no-cache-dir -r requirements.txt || \
    pip install django djangorestframework django-cors-headers django-filter \
    psycopg2-binary python-dotenv openpyxl reportlab gunicorn celery redis

COPY . .

# Xavfsiz tizimlarda Static va Media fayllar portlashi uchun kerakli papkalar
RUN mkdir -p /app/media
RUN mkdir -p /app/staticfiles

EXPOSE 8000
