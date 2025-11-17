# Python 백엔드 Dockerfile
FROM python:3.13-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY server.py .
COPY .env* ./

# 포트 노출 (Railway는 동적 포트 사용, EXPOSE는 문서화 목적)
EXPOSE 8000

# 서버 실행 (Railway의 PORT 환경 변수 사용)
# JSON 형식으로 변경하여 경고 제거
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]

