# Oyu · Суралцах орон зай — production image
FROM python:3.14-slim

WORKDIR /app

# Хамаарлыг эхэлж суулгаж layer cache ашиглана
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY . .

# Өгөгдлийн хавтас (SQLite + uploads)
RUN mkdir -p data/uploads

EXPOSE 8000
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
