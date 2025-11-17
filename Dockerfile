# Python 백엔드 Dockerfile
FROM python:3.12-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# static 디렉토리 미리 생성
RUN mkdir -p /app/static/audio/temp

# evals 디렉토리 복사
COPY evals ./evals

# 애플리케이션 코드 복사
COPY server.py .

# 포트 노출
EXPOSE 8000

# 시작 스크립트 생성
RUN echo '#!/bin/sh\nPORT=${PORT:-8000}\nexec uvicorn server:app --host 0.0.0.0 --port "$PORT"' > /app/start.sh && \
    chmod +x /app/start.sh

# 서버 실행
CMD ["/app/start.sh"]

