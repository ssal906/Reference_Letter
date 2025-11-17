# Python 백엔드 Dockerfile
# 멀티스테이지 빌드로 이미지 크기 최소화
FROM python:3.13-slim as builder

WORKDIR /app

# 빌드 의존성만 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 최종 이미지 (런타임만 포함)
FROM python:3.13-slim

WORKDIR /app

# 런타임 의존성만 복사 (빌드 도구 제외)
COPY --from=builder /root/.local /root/.local

# PATH에 사용자 설치 패키지 추가
ENV PATH=/root/.local/bin:$PATH

# static 디렉토리 미리 생성
RUN mkdir -p /app/static/audio/temp

# 애플리케이션 코드 복사
COPY server.py .

# 포트 노출
EXPOSE 8000

# 서버 실행
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]

