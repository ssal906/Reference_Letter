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

# 애플리케이션 코드 복사
COPY server.py .

# 포트 노출
EXPOSE 8000

# 서버 실행 (Railway의 PORT 환경 변수 사용)
# Python으로 포트를 읽어서 안정적으로 처리
CMD python -c "import os; import uvicorn; port = int(os.environ.get('PORT', 8000)); uvicorn.run('server:app', host='0.0.0.0', port=port)"

