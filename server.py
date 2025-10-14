# server.py
import os
import jwt
import uvicorn
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, text

# ===== LLM =====
from langchain_openai import ChatOpenAI

# ================== 기본 설정 ==================
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다!")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24시간

# OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# DB 엔진
engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)

# LLM
llm = ChatOpenAI(model="gpt-4o", temperature=0, api_key=api_key)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ================== 모델 ==================
class RequestType(Enum):
    REFERENCE = 1  # 추천서

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    nickname: Optional[str] = None
    gender: Optional[int] = None
    birth: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    address_detail: Optional[str] = None
    address_code: Optional[str] = None
    avatar_img: Optional[str] = None

# === 새 양식에 맞춘 추천서 입력 ===
class RecommendationRequest(BaseModel):
    # 필수
    recommender_name: str            # 작성자 이름
    requester_name: str              # 요청자 이름
    requester_email: EmailStr        # 요청자 이메일
    major_field: Optional[str] = None  # 전공 분야(선택)
    relationship: Optional[str] = None # 요청자와의 관계
    strengths: Optional[str] = None    # 장점
    memorable: Optional[str] = None    # 특별히 기억나는 내용
    tone: str                        # "Formal" | "Friendly" | ...
    selected_score: str              # "1" ~ "5"
    workspace_id: Optional[str] = None

class LookupRequest(BaseModel):
    search: str  # 닉네임/이름으로 검색

# ================== 유틸 ==================
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM users WHERE email = :email AND deletedAt IS NULL"),
            {"email": email},
        ).first()
        if result is None:
            raise HTTPException(status_code=401, detail="User not found")
        return dict(result._mapping)

# ================== 인증 API ==================
@app.post("/register")
async def register(user: UserRegister):
    with engine.connect() as conn:
        exists = conn.execute(
            text("SELECT id FROM users WHERE email = :email AND deletedAt IS NULL"),
            {"email": user.email},
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed = pwd_context.hash(user.password)
        conn.execute(
            text(
                """
                INSERT INTO users (
                    email, password, name, nickname, gender, birth,
                    phoneNumber, address, addressDetail, addressCode,
                    avatarImg, isOnboarded, createdAt, updatedAt
                ) VALUES (
                    :email, :password, :name, :nickname, :gender, :birth,
                    :phone_number, :address, :address_detail, :address_code,
                    :avatar_img, true, NOW(), NOW()
                )
                """
            ),
            {
                "email": user.email,
                "password": hashed,
                "name": user.name,
                "nickname": user.nickname,
                "gender": user.gender,
                "birth": user.birth,
                "phone_number": user.phone_number,
                "address": user.address,
                "address_detail": user.address_detail,
                "address_code": user.address_code,
                "avatar_img": user.avatar_img,
            },
        )
        conn.commit()

    token = create_access_token({"sub": user.email})
    return Token(
        access_token=token,
        token_type="bearer",
        user={"email": user.email, "name": user.name, "nickname": user.nickname},
    )

@app.post("/login")
async def login(user: UserLogin):
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM users WHERE email = :email AND deletedAt IS NULL"),
            {"email": user.email},
        ).first()
        if not result:
            raise HTTPException(status_code=401, detail="Invalid email or password")

    user_row = dict(result._mapping)
    stored_hash = user_row.get("password")

    try:
        ok = pwd_context.verify(user.password, stored_hash)
    except Exception:
        ok = False
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.email})
    return Token(
        access_token=token,
        token_type="bearer",
        user={
            "id": user_row.get("id"),
            "email": user_row.get("email"),
            "name": user_row.get("name"),
            "nickname": user_row.get("nickname"),
        },
    )

@app.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT w.*, wu.grade
                FROM workspaces w
                JOIN workspaceUsers wu ON wu.workspaceId = w.id
                WHERE wu.userId = :user_id AND wu.deletedAt IS NULL
                """
            ),
            {"user_id": current_user["id"]},
        ).fetchall()

    workspace_list = [
        {
            "id": r._mapping.get("id"),
            "name": r._mapping.get("name"),
            "serial_number": r._mapping.get("serialNumber"),
            "is_public": r._mapping.get("isPublic"),
            "grade": r._mapping.get("grade"),
        }
        for r in rows
    ]
    return {"user": current_user, "workspaces": workspace_list}

# ================== 조회/유틸 ==================
@app.post("/lookup")
async def lookup(req: LookupRequest):
    sql = text(
        """
        SELECT
            u.id             AS user_id,
            u.name           AS name,
            u.nickname       AS nickname,
            u.email          AS email,
            u.gender         AS gender,
            u.birth          AS birth,
            u.phoneNumber    AS phone_number,
            u.address        AS address,
            u.addressDetail  AS address_detail,
            u.addressCode    AS address_code,
            u.avatarImg      AS avatar_img
        FROM users u
        WHERE (TRIM(u.nickname) = TRIM(:q) OR TRIM(u.name) = TRIM(:q))
          AND u.deletedAt IS NULL
        ORDER BY u.id DESC
        LIMIT 20
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"q": req.search}).fetchall()

    if not rows:
        return {"exists": False, "message": "DB에 없는 데이터입니다."}

    candidates = [
        {
            "id": r._mapping.get("user_id"),
            "name": r._mapping.get("name"),
            "nickname": r._mapping.get("nickname"),
            "email": r._mapping.get("email"),
            "gender": r._mapping.get("gender"),
            "birth": r._mapping.get("birth"),
            "phone_number": r._mapping.get("phone_number"),
            "address": r._mapping.get("address"),
            "address_detail": r._mapping.get("address_detail"),
            "address_code": r._mapping.get("address_code"),
            "avatar_img": r._mapping.get("avatar_img"),
        }
        for r in rows
    ]
    return {"exists": True, "candidates": candidates}

@app.get("/generate-hash/{password}")
async def generate_hash(password: str):
    return {"hash": pwd_context.hash(password)}

# ================== 추천서 생성 ==================
def build_recommendation_prompt(inputs: RecommendationRequest, score: int) -> str:
    major_line = f"\n전공 분야: {inputs.major_field}" if inputs.major_field else ""

    prompt = f"""
당신은 전문 추천서 작성 AI입니다.
아래 입력값을 기반으로 요청자를 평가하는 추천서를 작성하세요.

[출력 언어]
- 한국어로만 작성합니다(존댓말). 고유명사 외 영어 금지.

[형식 규칙]
- 대괄호(예: [도입], [마무리])나 섹션 제목/헤더/번호 목록을 사용하지 않습니다.
- 'To whom it may concern', 'Sincerely' 같은 영문 인사말/서명 금지.
- 총 3~6개의 자연스러운 문단으로만 구성합니다.
- 이름/이메일은 그대로 유지합니다(변형 금지).

[평가 강도]
- 점수에 맞게 톤과 평가 수위를 조절합니다(1점=낮게, 5점=매우 우수).

[입력]
점수: {score}점
추천서 톤: {inputs.tone}{major_line}

작성자 이름: {inputs.recommender_name}
요청자 이름: {inputs.requester_name}
요청자 이메일: {inputs.requester_email}
요청자와의 관계: {inputs.relationship or ""}
장점: {inputs.strengths or ""}
특별히 기억나는 내용: {inputs.memorable or ""}

[작성 목표]
- 도입 → 관계/경험 → 역량/성과 → 강조 포인트 → 마무리의 자연스러운 흐름으로, 문단 제목 없이 서술형으로 작성합니다.
- 과장, 차별, 비하, 폭력, 정치적 발언 금지.
"""
    return prompt.strip()

def generate_single_score_recommendation(inputs: RecommendationRequest, score: int) -> str:
    prompt = build_recommendation_prompt(inputs, score)
    result = llm.invoke(prompt)
    return getattr(result, "content", str(result))

@app.post("/generate-recommendation")
async def generate(request: RecommendationRequest):
    """
    - 자동 사용자 생성 금지
    - 작성자(추천자), 요청자 모두 DB에 존재해야 진행
    - 새 양식 필드 반영
    """
    # 0) 사용자 존재 체크
    with engine.connect() as conn:
        # 추천자: 이름 또는 닉네임으로 식별(운영에서는 이메일 식별 권장)
        from_user = conn.execute(
            text(
                """
                SELECT id FROM users
                WHERE deletedAt IS NULL
                  AND (TRIM(name) = TRIM(:name) OR TRIM(nickname) = TRIM(:name))
                LIMIT 1
                """
            ),
            {"name": request.recommender_name},
        ).first()

        # 요청자: 이메일 우선, 보조로 이름/닉네임 허용
        to_user = conn.execute(
            text(
                """
                SELECT id FROM users
                WHERE deletedAt IS NULL
                  AND (
                        TRIM(email) = TRIM(:email)
                     OR TRIM(name) = TRIM(:rname)
                     OR TRIM(nickname) = TRIM(:rname)
                  )
                LIMIT 1
                """
            ),
            {"email": request.requester_email, "rname": request.requester_name},
        ).first()

    missing = []
    if not from_user:
        missing.append("작성자(추천자)")
    if not to_user:
        missing.append("요청자")
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"DB에 없는 사용자: {', '.join(missing)}. 먼저 사용자 등록 후 다시 시도하세요.",
        )

    # 1) 추천서 텍스트 생성
    score = int(request.selected_score)
    recommendation = generate_single_score_recommendation(request, score)

    # 2) DB 저장
    with engine.connect() as conn:
        conn.execute(
            text(
                """
                INSERT INTO referenceLetters (fromUserId, toUserId, content, isDraft, createdAt, updatedAt)
                VALUES (:from_id, :to_id, :content, false, NOW(), NOW())
                """
            ),
            {"from_id": from_user.id, "to_id": to_user.id, "content": recommendation},
        )

        if request.workspace_id:
            conn.execute(
                text(
                    """
                    INSERT INTO requests (workspaceId, type, fromUserId, toUserId, content, status, createdAt, updatedAt)
                    VALUES (:workspace_id, :type, :from_id, :to_id, :content, '완료', NOW(), NOW())
                    """
                ),
                {
                    "workspace_id": request.workspace_id,
                    "type": RequestType.REFERENCE.value,
                    "from_id": from_user.id,
                    "to_id": to_user.id,
                    "content": recommendation,
                },
            )
        conn.commit()

    return {"recommendation": recommendation}

# ================== 엔트리 ==================
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
