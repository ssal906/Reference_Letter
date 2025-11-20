import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# .env에서 키/DB 정보 로드 (가장 먼저!)
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

import json
import jwt
import re
import io
import base64
import time
from passlib.context import CryptContext
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum
from langchain_anthropic import ChatAnthropic
import uvicorn
from datetime import datetime, timedelta
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from urllib.parse import quote
from openai import OpenAI
import docx
import PyPDF2
import chardet

# ▼ DB 연결
from sqlalchemy import create_engine, text

# ▼ 기존 evals 시스템 import
# evals 디렉토리가 server.py와 같은 레벨에 있으므로 경로 추가
evals_path = str(Path(__file__).resolve().parent)
if evals_path not in sys.path:
    sys.path.insert(0, evals_path)

# 동적 import로 IDE 경고 방지
RecoEvaluator = None  # 타입 힌트를 위한 초기화
try:
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "reco_evaluator",
        Path(evals_path) / "evals" / "evaluators" / "reco_evaluator.py"
    )
    if spec and spec.loader:
        reco_evaluator_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(reco_evaluator_module)
        RecoEvaluator = reco_evaluator_module.RecoEvaluator
        print("✅ RecoEvaluator 로드 완료")
    else:
        raise ImportError("reco_evaluator 모듈을 찾을 수 없습니다.")
except Exception as e:
    print(f"⚠️  RecoEvaluator 로드 실패: {e}")
    print("   evals/evaluators/reco_evaluator.py 파일을 확인하세요.")
    raise

api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    raise ValueError("ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다!")

# OpenAI API Key 확인 (추천서 평가용 + 음성 입력)
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    print("⚠️  Warning: OPENAI_API_KEY가 설정되지 않았습니다.")
    print("   추천서 품질 평가 및 음성 입력 기능을 사용하려면 .env 파일에 OPENAI_API_KEY를 추가하세요.")

# OpenAI 클라이언트 초기화
openai_client = OpenAI(api_key=openai_api_key) if openai_api_key else None

# DATABASE_URL 자동 변환: mysql:// -> mysql+pymysql://
_raw_db_url = os.getenv("DATABASE_URL", "mysql+pymysql://app:app@localhost:3306/collyai_dev?charset=utf8mb4")
if _raw_db_url.startswith("mysql://") and not _raw_db_url.startswith("mysql+pymysql://"):
    # Railway MySQL URL을 PyMySQL 형식으로 변환
    _raw_db_url = _raw_db_url.replace("mysql://", "mysql+pymysql://", 1)
    # charset=utf8mb4 추가 (없는 경우)
    if "charset=" not in _raw_db_url:
        _raw_db_url += ("&" if "?" in _raw_db_url else "?") + "charset=utf8mb4"
DATABASE_URL = _raw_db_url
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24시간

# OAuth2 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# 비밀번호 해싱 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 성별 enum
class Gender(Enum):
    NONE = 0
    MALE = 1
    FEMALE = 2

# 워크스페이스 등급 (제거됨 - DB에서 grade 컬럼 삭제)

# 요청 타입(유지: 과거 호환용)
class RequestType(Enum):
    REFERENCE = 1  # 추천서

# Claude 모델
llm = ChatAnthropic(
    model="claude-sonnet-4-5-20250929", 
    temperature=0.3, 
    api_key=api_key,
    max_tokens=4096  # 충분한 길이의 추천서 생성을 위해 토큰 수 증가
)

# DB 엔진
engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True, 
    future=True,
    connect_args={'charset': 'utf8mb4'}
)

app = FastAPI()

# 정적 파일 제공 (HTML, CSS, JS)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# 음성 파일 임시 저장 디렉토리
AUDIO_TEMP_DIR = os.path.join(STATIC_DIR, "audio", "temp")
if not os.path.exists(AUDIO_TEMP_DIR):
    os.makedirs(AUDIO_TEMP_DIR)

# 422 에러 핸들러
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print("=== VALIDATION ERROR ===")
    print(f"Error details: {exc.errors()}")
    print(f"Body: {exc.body}")
    print("=" * 30)
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 중에는 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# ===== 추천서 요청 (새 양식) =====
class RecommendationRequest(BaseModel):
    recommender_name: str            # 작성자 이름
    requester_name: str              # 요청자 이름
    requester_email: EmailStr        # 요청자 이메일
    major_field: Optional[str] = None  # 전공 분야(선택)
    relationship: Optional[str] = None # 요청자와의 관계
    strengths: Optional[str] = None    # 장점
    memorable: Optional[str] = None    # 특별히 기억나는 내용
    additional_info: Optional[str] = None  # 추가 내용
    tone: str = "Formal"             # "Formal" | "Friendly" | ...
    selected_score: str = "5"        # "1" ~ "5"
    workspace_id: Optional[int] = None  # 더 이상 DB에 기록하지 않음(레거시 유지 파라미터)
    include_user_details: Optional[bool] = False  # 사용자 상세정보 포함 여부
    word_count: Optional[int] = None  # 목표 단어 수 (선택)
    template_id: Optional[int] = None  # 참고할 양식 ID (선택)
    signature_data: Optional[str] = None  # 서명 데이터 (base64 또는 텍스트)
    signature_type: Optional[str] = None  # 서명 타입 ("draw" | "text" | "upload")

def build_recommendation_prompt(inputs: RecommendationRequest, score: int, recommender_email: str = "", user_details: dict = None, template_content: str = None, writing_style: dict = None) -> str:
    major_line = f"\n전공 분야: {inputs.major_field}" if inputs.major_field else ""
    
    # 사용자 상세정보가 있으면 추가
    details_section = ""
    if user_details:
        details_section = "\n\n[요청자 상세 정보]"
        
        # 경력
        if user_details.get("experiences"):
            details_section += "\n\n<경력 사항>"
            for exp in user_details["experiences"]:
                details_section += f"\n- {exp.get('company', '')}, {exp.get('position', '')} ({exp.get('startDate', '')} ~ {exp.get('endDate', '')})"
                if exp.get('description'):
                    details_section += f"\n  업무: {exp.get('description')}"
        
        # 수상 이력
        if user_details.get("awards"):
            details_section += "\n\n<수상 이력>"
            for award in user_details["awards"]:
                details_section += f"\n- {award.get('title', '')} ({award.get('organization', '')}, {award.get('awardDate', '')})"
                if award.get('description'):
                    details_section += f": {award.get('description')}"
        
        # 자격증
        if user_details.get("certifications"):
            details_section += "\n\n<자격증>"
            for cert in user_details["certifications"]:
                details_section += f"\n- {cert.get('name', '')} ({cert.get('issuer', '')}, {cert.get('issueDate', '')})"
        
        # 강점
        if user_details.get("strengths"):
            details_section += "\n\n<강점>"
            for strength in user_details["strengths"]:
                category = f"[{strength.get('category', '일반')}]" if strength.get('category') else ""
                details_section += f"\n- {category} {strength.get('strength', '')}"
                if strength.get('description'):
                    details_section += f": {strength.get('description')}"
        
        # 프로젝트
        if user_details.get("projects"):
            details_section += "\n\n<프로젝트>"
            for proj in user_details["projects"]:
                details_section += f"\n- {proj.get('title', '')} ({proj.get('startDate', '')} ~ {proj.get('endDate', '')})"
                if proj.get('role'):
                    details_section += f"\n  역할: {proj.get('role')}"
                if proj.get('technologies'):
                    details_section += f"\n  기술: {proj.get('technologies')}"
                if proj.get('achievement'):
                    details_section += f"\n  성과: {proj.get('achievement')}"

    current_date = datetime.now().strftime("%Y년 %m월 %d일")

    # 단어 수 지정
    word_count_instruction = ""
    if inputs.word_count and inputs.word_count > 0:
        word_count_instruction = f"\n- 본문 내용은 정확히 {inputs.word_count}자로 작성하세요. 반드시 이 글자수를 준수해야 합니다."
    
    # 참고 양식
    template_section = ""
    if template_content:
        template_section = f"""

[참고 양식]
아래는 좋은 추천서의 예시입니다. 이 양식의 구조, 톤, 표현 방식을 참고하되, 절대 내용을 복사하지 말고 새롭게 작성하세요:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{template_content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

위 양식의 문체, 구조, 표현 방식을 참고하되 내용은 입력된 정보를 바탕으로 완전히 새롭게 작성하세요.
"""

    # 글자수 관련 지시문 생성 - 동적 계산
    purpose_word_count = ""
    length_instructions = ""
    
    # 기본값을 1000자로 설정
    target_word_count = inputs.word_count if inputs.word_count else 1000
    
    if target_word_count:
        # 문단 수와 문단당 길이를 글자수에 따라 동적으로 계산
        # 기본적으로 문단당 300-500자를 목표로 함
        avg_chars_per_paragraph = 400
        num_paragraphs = max(3, int(target_word_count / avg_chars_per_paragraph))
        chars_per_paragraph = int(target_word_count / num_paragraphs)
        paragraph_description = f"약 {num_paragraphs}개 문단, 각 문단 평균 {chars_per_paragraph}자"
        
        # 단순하고 직접적인 지시
        purpose_word_count = f"\n\n━━━━━━━━━━━━━━━━━━━━━━\n최우선 목표: 본문 정확히 {target_word_count}자\n━━━━━━━━━━━━━━━━━━━━━━"
        
        length_instructions = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━
[본문 길이 규칙 - 반드시 준수]
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 본문 전체: 정확히 {target_word_count}자 (공백 포함)
2. 문단 수: 약 {num_paragraphs}개 문단 작성
3. 각 문단 길이: 평균 {chars_per_paragraph}자 정도
4. 요청된 {target_word_count}자를 정확히 맞추는 것이 최우선입니다.
5. 모든 내용을 요청된 길이에 맞게 작성하세요.
6. 예시, 수치, 구체적 상황을 포함하되 전체 길이를 준수하세요.
━━━━━━━━━━━━━━━━━━━━━━━━━━"""
    
    # 문체 반영이 있으면 프롬프트 시작 부분에 강력하게 추가
    style_prefix = ""
    if writing_style:
        common_phrases = writing_style.get('common_phrases', [])
        if common_phrases:
            # 물결표(~) 제거 - "~거든요" → "거든요"
            phrase1 = common_phrases[0].replace('~', '') if len(common_phrases) > 0 else "해요"
            phrase2 = common_phrases[1].replace('~', '') if len(common_phrases) > 1 else phrase1
            phrase3 = common_phrases[2].replace('~', '') if len(common_phrases) > 2 else phrase2
            
            style_prefix = f"""
🚨🚨🚨 최우선 규칙 - 반드시 준수 🚨🚨🚨

이 추천서는 {inputs.recommender_name}님의 고유한 말투로 작성됩니다.
일반적인 "~합니다", "~입니다" 표현은 절대 사용하지 마세요!

【반드시 사용해야 할 끝맺음 표현】
• {phrase1}
• {phrase2}
• {phrase3}

【예시 - 이렇게 작성하세요】
❌ 틀림: "김나비님은 뛰어난 인재입니다"
✅ 정답: "김나비님은 뛰어난 인재{phrase1}"

❌ 틀림: "프로젝트를 성공적으로 완수했습니다"
✅ 정답: "프로젝트를 성공적으로 완수했{phrase2}"

❌ 틀림: "탁월한 성과를 보여주었습니다"
✅ 정답: "탁월한 성과를 보여주었{phrase3}"

⚠️ 중요: 본문의 모든 문장 끝은 위의 3가지 표현 중 하나로만 끝나야 합니다!
⚠️ "~합니다", "~입니다", "~했습니다" 같은 일반 격식체는 절대 사용 금지!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"""
    
    # 문체가 없을 때만 기본 격식체 지시 추가
    tone_instruction = ""
    if not writing_style:
        tone_instruction = "- 높임 표현(~하셨습니다, ~하십니다 등) 사용을 지양하고, 평서문 형태(~했습니다, ~합니다 등)로 작성합니다."
    
    prompt = f"""
{style_prefix}당신은 전문 추천서 작성자입니다. 아래 입력값을 바탕으로 "공식 추천서"를 작성합니다.
출력은 한국어만 사용합니다. 고유명사 외 영문 표현 금지.
{tone_instruction}

[작성 목적]
- 요청자의 역량·성과·적합성을 명확히 전달하는 추천서를 생성합니다.
{purpose_word_count}

[형식]
1) 제목: 추천서
2) 빈 줄
3) 본문 ({paragraph_description}){' - 🔴 모든 문장 끝은 위에서 지정한 끝맺음 표현만 사용!' if writing_style else ''}
   - 작성자 소개와 관계
   - 첫 인상과 전반적 역량 평가
   - 구체적 성과 사례 (상세히)
   - 협업 및 커뮤니케이션 능력
   - 문제 해결 능력과 창의성
   - 성장 과정과 학습 태도
   - 추가 장점과 특별한 자질
   - 종합 평가 및 추천
   (요청된 글자수에 맞게 문단 수와 내용을 조절하세요)
4) 빈 줄 2개
5) 작성 날짜: "{current_date}"
6) 빈 줄 1개
7) 작성자 정보
   - 작성자: {inputs.recommender_name}
   - 소속/직위: (관계 정보에서 자연스럽게 추출)
   - 연락처: {recommender_email}
   - 서명:

[형식 규칙]
- 해당 형식을 참고하되, 작성할 정보가 부족한 경우 변형 가능합니다.
- 대괄호(예: [도입], [마무리])나 섹션 번호를 사용하지 않습니다.
- 'To whom it may concern', 'Sincerely' 같은 영문 인사말 금지.
- 이름/이메일은 그대로 유지합니다(변형 금지).
- 문단은 자연스럽게 이어지되, 각 문단 사이에 빈 줄 하나를 넣습니다.

{length_instructions}

[내용 원칙]
- 사실성: 제공된 입력·상세정보만 사용하고, 새로운 사실을 창작하지 않습니다(환각 금지).
- 구체성: “무능/탁월” 같은 추상어보다 지표·결과·행동·맥락을 함께 제시합니다.
- 응집성: 문단 간 논리 연결어(예: 무엇보다, 특히, 또한, 따라서)를 적절히 배치합니다.
- 포용성: 과장/차별/비하/정치적 발언 금지. 비공개 정보·민감 정보는 드러내지 않습니다.
- 나열체 금지: 상세 정보가 주어지면 문장 흐름 속에 자연스럽게 녹입니다.

[추천 강도 및 평점 기준]
- 점수 {score}에 맞게 마지막 문단의 추천 어조와 본문의 평가 방식을 조절하세요.
- 평점별 특징:
  * 1점(매우 약하게 추천): 사실 나열만 포함, 주관적 평가 최소화. 마지막 문단은 "추천합니다" 정도로 마무리.
  * 2점(약하게 추천): 사실 중심이나 일부 평가 포함. 마지막 문단은 "추천합니다" 정도로 마무리.
  * 3점(추천함): 사실과 평가를 균형있게 포함. 마지막 문단은 "추천합니다" 정도로 표현.
  * 4점(강력히 추천): 평가와 주관적 의견을 적극 포함. 마지막 문단은 "강력히 추천" 또는 "적극 추천"으로 표현.
  * 5점(최우선 추천): 주관적 평가와 의견을 충분히 포함. 마지막 문단은 "강력히 추천", "이러한 능력을 갖췄으므로 인재로 적합하다" 등 강한 표현 사용.
- 점수가 높을수록 주관적 평가와 의견을 더 많이 포함하고, 점수가 낮을수록 사실 나열에 집중합니다.

[전공/도메인]
- 전공 분야가 제공되면 서론과 중간 문단에서 도메인 적합성과 기술/지식 정합성을 연결합니다.
{major_line}

[입력]
- 점수: {score}점
- 추천서 톤: {inputs.tone}
  * 톤 종류 및 상세 특징:
    
    [공식적 톤]
    - 문체: 격식 있고 정중하며, 공식 문서에 적합한 문체
    - 어휘 특징:
      * 사용 권장: "임무를 수행했습니다", "역량을 발휘했습니다", "성과를 달성했습니다", "기여했습니다", "보여주었습니다", "입증했습니다", "검증되었습니다", "입지했습니다", "기대됩니다", "권장합니다"
      * 평가 표현: "탁월한", "뛰어난", "우수한", "능력 있는", "적합한", "기대되는"
      * 금지 어휘: "좋아요", "괜찮아요", "멋져요", "대단해요" 등 구어체, "~했어요", "~했음" 등 비격식 표현
    - 문장 구조: 주어-서술어 구조가 명확하고, 수동태 사용 가능, 복문 활용
    - 표현 방식: 객관적 사실 서술, 수치와 데이터 강조, 공식적 평가 표현
    - 예시: "저는 {inputs.requester_name}이 업무 수행 과정에서 탁월한 역량을 발휘했음을 확인했습니다."
    
    [친근한 톤]
    - 문체: 편안하고 따뜻하며, 개인적 경험을 바탕으로 한 친밀한 문체
    - 어휘 특징:
      * 사용 권장: "함께 일했습니다", "지켜봤습니다", "느꼈습니다", "경험했습니다", "인상 깊었습니다", "기억에 남습니다", "특히 좋았던 점은", "인상적이었습니다", "감동받았습니다", "자랑스럽습니다"
      * 평가 표현: "훌륭한", "멋진", "뛰어난", "좋은", "특별한", "인상적인"
      * 허용 어휘: "정말", "매우", "너무나도" 등 감정 표현 수식어 사용 가능
    - 문장 구조: 주관적 경험 서술, 감정 표현 포함, 구체적 일화 활용
    - 표현 방식: 개인적 관찰과 경험 강조, 따뜻한 어조, 구체적 상황 묘사
    - 예시: "저는 {inputs.requester_name}과 함께 일하면서 정말 인상 깊었던 점이 많았습니다."
    
    [간결한 톤]
    - 문체: 핵심만 간단명료하게, 불필요한 수식어 없이 직설적
    - 어휘 특징:
      * 사용 권장: "했습니다", "완료했습니다", "달성했습니다", "보유하고 있습니다", "능력이 있습니다", "적합합니다", "추천합니다"
      * 평가 표현: "우수", "능력", "적합", "기대" (수식어 최소화)
      * 금지 어휘: "매우", "정말", "너무나도", "특히", "무엇보다" 등 과도한 수식어, 장황한 설명
    - 문장 구조: 단문 위주, 주어-서술어-목적어 구조 명확, 불필요한 부사/형용사 제거
    - 표현 방식: 사실 중심, 핵심만 간결히, 직설적 표현, 나열식 구조 활용
    - 예시: "저는 {inputs.requester_name}을 추천합니다. 업무 능력이 우수하고 적합한 인재입니다."
    
    [설득형 톤]
    - 문체: 논리적 근거와 구체적 사례를 바탕으로 한 적극적 추천 문체
    - 어휘 특징:
      * 사용 권장: "입증했습니다", "보여주었습니다", "증명했습니다", "강력히 추천합니다", "적극 추천합니다", "확신합니다", "자신합니다", "권장합니다", "기대합니다", "기대됩니다"
      * 평가 표현: "탁월한", "뛰어난", "우수한", "최고의", "이상적인", "완벽한"
      * 강조 표현: "특히", "무엇보다", "더욱이", "또한", "따라서", "그 결과"
    - 문장 구조: 논리적 연결 구조, 인과관계 명시, 대조/비교 활용
    - 표현 방식: 구체적 사례와 수치 강조, 논리적 근거 제시, 적극적 추천 어조
    - 예시: "저는 {inputs.requester_name}을 강력히 추천합니다. 특히 업무 수행 과정에서 보여준 역량은 입증된 사실입니다."
  
  * 선택된 톤({inputs.tone})에 맞는 위 특징을 엄격히 준수하여 일관된 문체와 어휘를 사용하세요.
  * 예시 형식은 참고만 하고 똑같이 사용하지 마세요.
  * 톤별 어휘와 표현 방식을 혼용하지 말고, 선택한 톤의 특징만 사용하세요.

- 작성자: {inputs.recommender_name}
- 요청자: {inputs.requester_name} / {inputs.requester_email}
- 관계: {inputs.relationship or ""}
- 장점: {inputs.strengths or ""}
- 기억에 남는 사례: {inputs.memorable or ""}
- 추가 내용: {inputs.additional_info or ""}

[요청자 상세 정보(선택)]
아래 정보가 주어지면, 본문에 자연스럽게 녹여 기술합니다. 표제·대괄호를 본문에 그대로 노출하지 마십시오.
{details_section}

[참고 양식(선택)]
아래 예시는 구조·톤·표현 방식만 참고하고, 내용은 절대 복사하지 않습니다.
{template_section}

[점검사항]
- 본문이 충분히 긴가? (최소 {inputs.word_count if inputs.word_count else 800}자 이상)
- 각 문단이 상세한가?
- 구체적 사례가 포함되었는가?

[작성 예시 형식]
추천서

저는 [관계]로서 {inputs.requester_name}님을 [기간]동안 함께 일하며 지켜본 {inputs.recommender_name}{'입니다' if not writing_style else (writing_style.get('common_phrases', ['입니다'])[0] if writing_style and writing_style.get('common_phrases') else '입니다')}...

[본문 문단들...]{' 🔴 모든 문장이 지정된 끝맺음으로 끝나야 함!' if writing_style else ''}

위와 같은 이유로 {inputs.requester_name}님을 적극 추천{'합니다' if not writing_style else (writing_style.get('common_phrases', ['합니다'])[1] if writing_style and len(writing_style.get('common_phrases', [])) > 1 else writing_style.get('common_phrases', ['합니다'])[0] if writing_style and writing_style.get('common_phrases') else '합니다')}... (점수에 따라 추천 강도 조절)


{current_date}

작성자: {inputs.recommender_name}
소속/직위: [관계에서 추출]
연락처: {recommender_email}
서명:

[주의]
- 요청된 글자수를 정확히 맞추는 것이 가장 중요합니다.
- 각 문단은 요청된 전체 글자수에 맞게 작성하세요.
- 글자수가 지정되지 않은 경우에만 자세하고 길게 작성하세요.
"""
    return prompt.strip()

def generate_single_score_recommendation(inputs: RecommendationRequest, score: int, recommender_email: str = "", user_details: dict = None, template_content: str = None, writing_style: dict = None, max_retries: int = 3) -> str:
    """
    추천서 생성 함수 (재시도 로직 포함)
    OverloadedError(529) 발생 시 자동으로 재시도합니다.
    """
    prompt = build_recommendation_prompt(inputs, score, recommender_email, user_details, template_content, writing_style)
    
    for attempt in range(max_retries):
        try:
            result = llm.invoke(prompt)
            return getattr(result, "content", str(result))
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            
            # OverloadedError 또는 529 에러인 경우 재시도
            is_overloaded = (
                error_type == "OverloadedError" or
                "overloaded" in error_msg.lower() or
                "529" in error_msg or
                (hasattr(e, 'status_code') and e.status_code == 529)
            )
            
            if is_overloaded and attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2  # 2초, 4초, 6초로 증가
                print(f"⚠️ API 과부하 감지 (시도 {attempt + 1}/{max_retries}). {wait_time}초 후 재시도...")
                time.sleep(wait_time)
                continue
            else:
                # 재시도 불가능하거나 최대 재시도 횟수 초과
                raise


# ===== 인증 관련 모델 =====
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ▼ 마이그레이션의 users 컬럼명과 1:1로 맞춤 (serialNumber/phone/postCode/addressDetail/avatar 등)
#   참고: users 스키마 :contentReference[oaicite:5]{index=5}
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    nickname: str
    gender: Optional[int] = None
    birth: Optional[str] = None
    serialNumber: Optional[str] = None
    phone: Optional[str] = None
    postCode: Optional[str] = None
    address: Optional[str] = None
    addressDetail: Optional[str] = None
    avatar: Optional[str] = None

# ===== 모델 정의 =====
class UserBase(BaseModel):
    email: EmailStr
    nickname: str
    gender: Optional[int] = None
    birth: Optional[str] = None
    serialNumber: Optional[str] = None
    phone: Optional[str] = None
    postCode: Optional[str] = None
    address: Optional[str] = None
    addressDetail: Optional[str] = None
    avatar: Optional[str] = None

class WorkspaceBase(BaseModel):
    name: str
    serial_number: Optional[str] = None
    is_public: bool = False

# ===== 인증 관련 함수 =====
def hash_password(password: str) -> str:
    """비밀번호를 해시화하는 함수 (72바이트 제한 처리)"""
    # 비밀번호를 72바이트로 제한
    password = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        exp = payload.get("exp")
        if exp is None:
            raise HTTPException(status_code=401, detail="Token has no expiration")
        if datetime.fromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    try:
        with engine.connect() as conn:
            user_sql = text("""
                SELECT id, email, nickname 
                FROM users 
                WHERE email = :email AND deletedAt IS NULL
                LIMIT 1
            """)
            user_result = conn.execute(user_sql, {"email": email}).first()
            if not user_result:
                raise HTTPException(status_code=401, detail="User not found")
            return {
                "id": user_result._mapping.get("id"),
                "email": user_result._mapping.get("email"),
                "nickname": user_result._mapping.get("nickname")
            }
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")

# ===== 문서 처리 함수 =====
async def extract_text_from_file(file: UploadFile) -> str:
    """
    업로드된 문서 파일에서 텍스트 추출
    지원 형식: TXT, DOCX, PDF
    """
    filename_lower = file.filename.lower() if file.filename else ""
    content = await file.read()
    
    try:
        if filename_lower.endswith('.txt'):
            # TXT 파일: 인코딩 자동 감지
            detected = chardet.detect(content)
            encoding = detected.get('encoding', 'utf-8')
            return content.decode(encoding)
        
        elif filename_lower.endswith('.docx'):
            # DOCX 파일
            doc = docx.Document(io.BytesIO(content))
            return '\n'.join([paragraph.text for paragraph in doc.paragraphs])
        
        elif filename_lower.endswith('.pdf'):
            # PDF 파일
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            text_parts = []
            for page in pdf_reader.pages:
                text_parts.append(page.extract_text())
            return '\n'.join(text_parts)
        
        else:
            raise ValueError(f"지원하지 않는 파일 형식: {filename_lower}")
    
    except Exception as e:
        raise ValueError(f"파일 텍스트 추출 실패: {str(e)}")

def analyze_writing_style_with_ai(text: str) -> dict:
    """
    AI를 사용하여 텍스트의 문체 분석
    Claude API 사용
    """
    # 너무 긴 텍스트는 앞부분만 사용 (토큰 제한)
    sample_text = text[:5000] if len(text) > 5000 else text
    
    prompt = f"""
다음 텍스트를 분석하여 작성자의 문체 특징을 파악해주세요.
특히 **문장 끝맺음 표현**에 집중해주세요.

텍스트:
\"\"\"
{sample_text}
\"\"\"

다음 형식의 JSON으로 응답해주세요:
{{
  "tone": "어조 (예: 친근한, 격식있는, 권위적인, 캐주얼한 등)",
  "sentence_length": "문장 길이 (짧음/보통/김)",
  "vocabulary_level": "어휘 수준 (일상적/학술적/전문적)",
  "common_phrases": ["자주 사용하는 끝맺음 표현 3-5개 (예: ~하더라고요, ~네요, ~합니다 등)"],
  "characteristics": ["기타 특징 2-3개"]
}}

**중요**: common_phrases는 실제로 텍스트에서 발견된 구체적인 끝맺음 표현을 포함해야 합니다.
예: "~하더라고요", "~네요", "~거든요", "~했어요", "~ㅂ니다" 등
"""
    
    try:
        result = llm.invoke(prompt)
        response_text = getattr(result, "content", str(result))
        
        # JSON 추출 (```json ... ``` 형식 처리)
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group(1)
        
        style_data = json.loads(response_text)
        return style_data
    
    except Exception as e:
        raise ValueError(f"문체 분석 실패: {str(e)}")

def parse_document_to_fields(document_text: str) -> dict:
    """
    Claude를 사용하여 이력서/문서 내용을 추천서 필드로 분류
    (음성 입력과 동일한 방식)
    """
    try:
        prompt = f"""다음은 사용자가 업로드한 이력서 또는 문서입니다.
이 내용을 분석해서 추천서 작성에 필요한 각 필드에 적합한 내용으로 분류해주세요.

문서 내용:
{document_text}

다음 JSON 형식으로 응답해주세요:
{{
  "relationship": "요청자와의 관계 (예: 지도교수, 상사, 동료 등)",
  "strengths": "요청자의 주요 강점이나 장점 (학력, 경력, 기술, 수상경력, 자격증 등 포함)",
  "memorable": "기억에 남는 일이나 특별한 성과 (프로젝트, 대회, 리더십 경험 등)",
  "additional_info": "위 세 카테고리에 명확히 속하지 않는 추가 정보 (봉사활동, 동아리, 기타 특기사항 등)"
}}

주의사항:
1. 각 필드는 간결하고 명확하게 작성
2. 학력, 전공, 경력 정보는 strengths에 포함
3. 특별한 성과는 memorable에 포함
4. 애매한 내용은 additional_info에 포함
5. 내용이 없는 필드는 빈 문자열 ""로 반환
6. 반드시 JSON 형식만 반환 (다른 설명 없이)
"""
        
        response = llm.invoke(prompt)
        result_text = response.content.strip()
        
        # JSON 추출 (```json ``` 마크다운 제거)
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        parsed_data = json.loads(result_text)
        
        return {
            "relationship": parsed_data.get("relationship", ""),
            "strengths": parsed_data.get("strengths", ""),
            "memorable": parsed_data.get("memorable", ""),
            "additional_info": parsed_data.get("additional_info", "")
        }
    
    except Exception as e:
        print(f"문서 필드 분류 오류: {e}")
        # 실패 시 전체 텍스트를 additional_info에 넣음
        return {
            "relationship": "",
            "strengths": "",
            "memorable": "",
            "additional_info": document_text[:1000]  # 너무 길면 잘라냄
        }

# 히스토리 파일(백업용)
HISTORY_FILE = "recommendation_history.json"

def load_history():
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"히스토리 로드 오류: {e}")
        return []

def save_history(history_data):
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"히스토리 저장 오류: {e}")

# ===== 문체 분석 API =====
@app.post("/upload-writing-sample")
async def upload_writing_sample(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    사용자의 글 샘플 업로드 및 문체 분석
    분석 결과는 DB에 저장되어 추천서 생성 시 활용
    """
    user_id = current_user.get("id")
    
    # 1) 파일 타입 검증
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 없습니다.")
    
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith('.txt') or 
            filename_lower.endswith('.docx') or 
            filename_lower.endswith('.pdf')):
        raise HTTPException(
            status_code=400, 
            detail="지원하지 않는 파일 형식입니다. (.txt, .docx, .pdf만 가능)"
        )
    
    # 2) 텍스트 추출
    try:
        text = await extract_text_from_file(file)
        if not text or len(text.strip()) < 100:
            raise HTTPException(
                status_code=400, 
                detail="텍스트가 너무 짧습니다. 최소 100자 이상의 글을 업로드해주세요."
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # 3) AI 문체 분석
    try:
        style_analysis = analyze_writing_style_with_ai(text)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # 4) DB에 저장 (기존 데이터가 있으면 업데이트)
    try:
        with engine.connect() as conn:
            # 기존 데이터 확인
            check_sql = text("""
                SELECT id FROM writing_styles 
                WHERE userId = :user_id 
                LIMIT 1
            """)
            existing = conn.execute(check_sql, {"user_id": user_id}).first()
            
            sample_text = text[:1000]  # 처음 1000자만 저장
            style_json = json.dumps(style_analysis, ensure_ascii=False)
            
            if existing:
                # 업데이트
                update_sql = text("""
                    UPDATE writing_styles
                    SET styleAnalysis = :style_json,
                        sampleText = :sample_text,
                        originalFilename = :filename,
                        updatedAt = NOW()
                    WHERE userId = :user_id
                """)
                conn.execute(update_sql, {
                    "style_json": style_json,
                    "sample_text": sample_text,
                    "filename": file.filename,
                    "user_id": user_id
                })
            else:
                # 신규 생성
                insert_sql = text("""
                    INSERT INTO writing_styles 
                    (userId, styleAnalysis, sampleText, originalFilename, createdAt, updatedAt)
                    VALUES (:user_id, :style_json, :sample_text, :filename, NOW(), NOW())
                """)
                conn.execute(insert_sql, {
                    "user_id": user_id,
                    "style_json": style_json,
                    "sample_text": sample_text,
                    "filename": file.filename
                })
            
            conn.commit()
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB 저장 실패: {str(e)}")
    
    return {
        "success": True,
        "message": "문체 분석이 완료되었습니다!",
        "style_analysis": style_analysis,
        "filename": file.filename
    }

@app.get("/my-writing-style")
async def get_my_writing_style(current_user: dict = Depends(get_current_user)):
    """
    로그인한 사용자의 저장된 문체 정보 조회
    """
    user_id = current_user.get("id")
    
    try:
        with engine.connect() as conn:
            sql = text("""
                SELECT styleAnalysis, sampleText, originalFilename, updatedAt
                FROM writing_styles
                WHERE userId = :user_id
                LIMIT 1
            """)
            row = conn.execute(sql, {"user_id": user_id}).first()
            
            if not row:
                raise HTTPException(status_code=404, detail="저장된 문체 정보가 없습니다.")
            
            style_analysis = json.loads(row._mapping.get("styleAnalysis")) if row._mapping.get("styleAnalysis") else {}
            
            return {
                "success": True,
                "style_analysis": style_analysis,
                "sample_text": row._mapping.get("sampleText"),
                "original_filename": row._mapping.get("originalFilename"),
                "updated_at": row._mapping.get("updatedAt").isoformat() if row._mapping.get("updatedAt") else None
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"조회 실패: {str(e)}")

# ===== 문서 파싱 API =====
@app.post("/parse-document")
async def parse_document(file: UploadFile = File(...)):
    """
    이력서/문서 파일을 업로드하여 추천서 필드로 자동 분류
    지원 형식: TXT, DOCX, PDF
    """
    print("=== 문서 파싱 요청 ===")
    print(f"파일명: {file.filename}")
    print(f"Content-Type: {file.content_type}")
    
    # 1. 파일 타입 검증
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 없습니다.")
    
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith('.txt') or 
            filename_lower.endswith('.docx') or 
            filename_lower.endswith('.pdf')):
        raise HTTPException(
            status_code=400, 
            detail="지원하지 않는 파일 형식입니다. (.txt, .docx, .pdf만 가능)"
        )
    
    try:
        # 2. 텍스트 추출
        document_text = await extract_text_from_file(file)
        print(f"추출된 텍스트 길이: {len(document_text)}자")
        print(f"텍스트 미리보기: {document_text[:200]}...")
        
        if not document_text or len(document_text.strip()) < 50:
            raise HTTPException(
                status_code=400, 
                detail="텍스트가 너무 짧습니다. 최소 50자 이상의 내용이 필요합니다."
            )
        
        # 3. AI 분석: 텍스트 → 필드 분류
        parsed_fields = parse_document_to_fields(document_text)
        print(f"분류된 필드: {parsed_fields}")
        
        return {
            "success": True,
            "extracted_text": document_text[:500],  # 미리보기용 (처음 500자)
            "fields": parsed_fields
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"문서 파싱 오류: {e}")
        raise HTTPException(status_code=500, detail=f"문서 처리 실패: {str(e)}")

# ===== 음성 입력 처리 함수 =====
async def transcribe_audio(audio_file: UploadFile) -> str:
    """
    OpenAI Whisper API를 사용하여 음성을 텍스트로 변환
    """
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI API가 설정되지 않았습니다.")
    
    try:
        # 임시 파일로 저장
        temp_file_path = os.path.join(AUDIO_TEMP_DIR, f"temp_{datetime.now().timestamp()}.webm")
        
        with open(temp_file_path, "wb") as f:
            content = await audio_file.read()
            f.write(content)
        
        # Whisper API로 변환
        with open(temp_file_path, "rb") as audio:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                language="ko"  # 한국어
            )
        
        # 임시 파일 삭제
        try:
            os.remove(temp_file_path)
        except:
            pass
        
        return transcript.text
    
    except Exception as e:
        print(f"음성 변환 오류: {e}")
        raise HTTPException(status_code=500, detail=f"음성 변환 실패: {str(e)}")


def parse_voice_to_fields(transcribed_text: str) -> dict:
    """
    Claude를 사용하여 음성 텍스트를 추천서 필드로 분류
    """
    try:
        prompt = f"""다음은 추천서 작성을 위해 사용자가 말한 내용입니다. 
이 내용을 분석해서 각 필드에 적합한 내용으로 분류해주세요.

발화 내용:
{transcribed_text}

다음 JSON 형식으로 응답해주세요:
{{
  "relationship": "요청자와의 관계 (예: 지도교수, 상사, 동료 등)",
  "strengths": "요청자의 주요 강점이나 장점",
  "memorable": "기억에 남는 일이나 특별한 성과",
  "additional_info": "위 세 카테고리에 명확히 속하지 않는 추가 정보"
}}

주의사항:
1. 각 필드는 간결하고 명확하게 작성
2. 애매한 내용은 additional_info에 포함
3. 내용이 없는 필드는 빈 문자열 ""로 반환
4. 반드시 JSON 형식만 반환 (다른 설명 없이)
"""
        
        response = llm.invoke(prompt)
        result_text = response.content.strip()
        
        # JSON 추출 (```json ``` 마크다운 제거)
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        parsed_data = json.loads(result_text)
        
        return {
            "relationship": parsed_data.get("relationship", ""),
            "strengths": parsed_data.get("strengths", ""),
            "memorable": parsed_data.get("memorable", ""),
            "additional_info": parsed_data.get("additional_info", "")
        }
    
    except Exception as e:
        print(f"필드 분류 오류: {e}")
        # 실패 시 전체 텍스트를 additional_info에 넣음
        return {
            "relationship": "",
            "strengths": "",
            "memorable": "",
            "additional_info": transcribed_text
        }


@app.post("/parse-voice-input")
async def parse_voice_input(audio_file: UploadFile = File(...)):
    """
    음성 파일을 받아서 텍스트로 변환하고 추천서 필드로 분류
    """
    print("=== 음성 입력 파싱 요청 ===")
    print(f"파일명: {audio_file.filename}")
    print(f"Content-Type: {audio_file.content_type}")
    
    try:
        # 1. STT: 음성 → 텍스트
        transcribed_text = await transcribe_audio(audio_file)
        print(f"변환된 텍스트: {transcribed_text}")
        
        # 2. AI 분석: 텍스트 → 필드 분류
        parsed_fields = parse_voice_to_fields(transcribed_text)
        print(f"분류된 필드: {parsed_fields}")
        
        return {
            "success": True,
            "transcribed_text": transcribed_text,
            "fields": parsed_fields
        }
    
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"음성 파싱 오류: {e}")
        raise HTTPException(status_code=500, detail=f"음성 처리 실패: {str(e)}")


# ===== 추천서 읽기 (TTS) API =====
class TTSRequest(BaseModel):
    text: str

@app.post("/read-recommendation")
async def read_recommendation(request: TTSRequest):
    """
    추천서 텍스트를 음성으로 변환 (TTS)
    """
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI API가 설정되지 않았습니다.")
    
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="텍스트가 비어있습니다.")
    
    print(f"=== TTS 요청 (텍스트 길이: {len(request.text)}) ===")
    print(f"텍스트 미리보기: {request.text[:100]}...")
    
    try:
        # 텍스트 길이에 따라 최적화
        text_to_convert = request.text[:4096]  # TTS 최대 길이 제한
        
        # OpenAI TTS API 호출 (속도 최적화)
        response = openai_client.audio.speech.create(
            model="tts-1",  # tts-1이 tts-1-hd보다 빠름
            voice="nova",   # alloy, echo, fable, onyx, nova, shimmer
            input=text_to_convert,
            speed=1.1       # 1.0~1.25 (약간 빠르게 읽기)
        )
        
        # 음성 데이터를 바이트로 변환
        audio_content = response.content
        
        print(f"✅ TTS 생성 완료 (오디오 크기: {len(audio_content)} bytes)")
        
        # 스트리밍 응답으로 반환
        return StreamingResponse(
            io.BytesIO(audio_content),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=recommendation.mp3",
                "Access-Control-Allow-Origin": "*"
            }
        )
    
    except Exception as e:
        print(f"❌ TTS 생성 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"음성 생성 실패: {str(e)}")

# ===== 추천서 생성 API =====
@app.post("/generate-recommendation")
async def generate(request: RecommendationRequest):
    """
    - 자동 사용자 생성 금지
    - 작성자(추천자), 요청자 모두 DB에 존재해야 진행
    - 새 양식 필드 반영
    - 요청/진행상태 기록은 requests 테이블을 사용하지 않음(폐기)
    """
    print("=== 추천서 생성 요청 받음 ===")
    print(f"recommender_name: '{request.recommender_name}' (길이: {len(request.recommender_name)})")
    print(f"requester_name: '{request.requester_name}' (길이: {len(request.requester_name)})")
    print(f"requester_email: '{request.requester_email}'")
    print(f"relationship: '{request.relationship}' (길이: {len(request.relationship or '')})")
    print(f"strengths: '{request.strengths}' (길이: {len(request.strengths or '')})")
    print(f"memorable: '{request.memorable}' (길이: {len(request.memorable or '')})")
    print(f"tone: {request.tone}")
    print(f"selected_score: {request.selected_score}")
    print(f"signature_data 있음: {bool(request.signature_data)}")
    print(f"signature_type: {request.signature_type}")
    print("=" * 30)
    
    # 0) 사용자 존재 체크 및 서명 조회
    with engine.connect() as conn:
        from_user = conn.execute(
            text(
                """
                SELECT id, email FROM users
                WHERE deletedAt IS NULL
                  AND TRIM(nickname) = TRIM(:name)
                LIMIT 1
                """
            ),
            {"name": request.recommender_name},
        ).first()

        to_user = conn.execute(
            text(
                """
                SELECT id FROM users
                WHERE deletedAt IS NULL
                  AND (
                        TRIM(email) = TRIM(:email)
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
    
    # 작성자의 서명 정보 처리
    recommender_signature = None
    try:
        with engine.connect() as conn:
            # 1) 요청에 새 서명이 포함되어 있으면 DB에 저장
            if request.signature_data and request.signature_type:
                # 기존 서명이 있는지 확인
                existing_sig_sql = text("""
                    SELECT id FROM userSignatures
                    WHERE userId = :user_id AND deletedAt IS NULL
                    LIMIT 1
                """)
                existing_sig = conn.execute(existing_sig_sql, {"user_id": from_user.id}).first()
                
                if existing_sig:
                    # 기존 서명 업데이트
                    update_sig_sql = text("""
                        UPDATE userSignatures
                        SET signatureData = :data, signatureType = :type, updatedAt = NOW()
                        WHERE id = :sig_id
                    """)
                    conn.execute(update_sig_sql, {
                        "data": request.signature_data,
                        "type": request.signature_type,
                        "sig_id": existing_sig.id
                    })
                    print(f"기존 서명 업데이트 완료 (타입: {request.signature_type})")
                else:
                    # 새 서명 생성
                    insert_sig_sql = text("""
                        INSERT INTO userSignatures (userId, signatureData, signatureType, createdAt, updatedAt)
                        VALUES (:user_id, :data, :type, NOW(), NOW())
                    """)
                    conn.execute(insert_sig_sql, {
                        "user_id": from_user.id,
                        "data": request.signature_data,
                        "type": request.signature_type
                    })
                    print(f"새 서명 저장 완료 (타입: {request.signature_type})")
                
                conn.commit()
                
                recommender_signature = {
                    "data": request.signature_data,
                    "type": request.signature_type
                }
            else:
                # 2) 요청에 서명이 없으면 DB에서 조회
                signature_sql = text("""
                    SELECT signatureData, signatureType
                    FROM userSignatures
                    WHERE userId = :user_id AND deletedAt IS NULL
                    LIMIT 1
                """)
                sig_row = conn.execute(signature_sql, {"user_id": from_user.id}).first()
                if sig_row:
                    recommender_signature = {
                        "data": sig_row._mapping.get("signatureData"),
                        "type": sig_row._mapping.get("signatureType")
                    }
                    print(f"기존 서명 조회 완료 (타입: {recommender_signature['type']})")
    except Exception as e:
        print(f"서명 처리 오류 (계속 진행): {e}")

    # 1) 사용자 상세정보 조회 (include_user_details가 True인 경우)
    user_details = None
    if request.include_user_details:
        try:
            with engine.connect() as conn:
                # 경력
                experiences_sql = text("""
                    SELECT id, company, position, startDate, endDate, description
                    FROM userExperiences
                    WHERE userId = :user_id AND deletedAt IS NULL
                    ORDER BY startDate DESC
                """)
                experiences = []
                for row in conn.execute(experiences_sql, {"user_id": to_user.id}).fetchall():
                    experiences.append({
                        "id": row._mapping.get("id"),
                        "company": row._mapping.get("company"),
                        "position": row._mapping.get("position"),
                        "startDate": row._mapping.get("startDate").strftime('%Y-%m-%d') if row._mapping.get("startDate") else None,
                        "endDate": row._mapping.get("endDate").strftime('%Y-%m-%d') if row._mapping.get("endDate") else "현재",
                        "description": row._mapping.get("description")
                    })
                
                # 수상 이력
                awards_sql = text("""
                    SELECT id, title, organization, awardDate, description
                    FROM userAwards
                    WHERE userId = :user_id AND deletedAt IS NULL
                    ORDER BY awardDate DESC
                """)
                awards = []
                for row in conn.execute(awards_sql, {"user_id": to_user.id}).fetchall():
                    awards.append({
                        "id": row._mapping.get("id"),
                        "title": row._mapping.get("title"),
                        "organization": row._mapping.get("organization"),
                        "awardDate": row._mapping.get("awardDate").strftime('%Y-%m-%d') if row._mapping.get("awardDate") else None,
                        "description": row._mapping.get("description")
                    })
                
                # 자격증
                certifications_sql = text("""
                    SELECT id, name, issuer, issueDate, expiryDate, certificationNumber
                    FROM userCertifications
                    WHERE userId = :user_id AND deletedAt IS NULL
                    ORDER BY issueDate DESC
                """)
                certifications = []
                for row in conn.execute(certifications_sql, {"user_id": to_user.id}).fetchall():
                    certifications.append({
                        "id": row._mapping.get("id"),
                        "name": row._mapping.get("name"),
                        "issuer": row._mapping.get("issuer"),
                        "issueDate": row._mapping.get("issueDate").strftime('%Y-%m-%d') if row._mapping.get("issueDate") else None,
                        "expiryDate": row._mapping.get("expiryDate").strftime('%Y-%m-%d') if row._mapping.get("expiryDate") else "무제한",
                        "certificationNumber": row._mapping.get("certificationNumber")
                    })
                
                # 강점
                strengths_sql = text("""
                    SELECT id, category, strength, description
                    FROM userStrengths
                    WHERE userId = :user_id AND deletedAt IS NULL
                    ORDER BY category, id
                """)
                strengths = []
                for row in conn.execute(strengths_sql, {"user_id": to_user.id}).fetchall():
                    strengths.append({
                        "id": row._mapping.get("id"),
                        "category": row._mapping.get("category"),
                        "strength": row._mapping.get("strength"),
                        "description": row._mapping.get("description")
                    })
                
                # 프로젝트
                projects_sql = text("""
                    SELECT id, title, role, startDate, endDate, description, technologies, achievement, url
                    FROM userProjects
                    WHERE userId = :user_id AND deletedAt IS NULL
                    ORDER BY startDate DESC
                """)
                projects = []
                for row in conn.execute(projects_sql, {"user_id": to_user.id}).fetchall():
                    projects.append({
                        "id": row._mapping.get("id"),
                        "title": row._mapping.get("title"),
                        "role": row._mapping.get("role"),
                        "startDate": row._mapping.get("startDate").strftime('%Y-%m-%d') if row._mapping.get("startDate") else None,
                        "endDate": row._mapping.get("endDate").strftime('%Y-%m-%d') if row._mapping.get("endDate") else "진행중",
                        "description": row._mapping.get("description"),
                        "technologies": row._mapping.get("technologies"),
                        "achievement": row._mapping.get("achievement"),
                        "url": row._mapping.get("url")
                    })
                
                user_details = {
                    "experiences": experiences,
                    "awards": awards,
                    "certifications": certifications,
                    "strengths": strengths,
                    "projects": projects
                }
                print(f"사용자 상세정보 조회 완료 (경력: {len(experiences)}, 수상: {len(awards)}, 자격증: {len(certifications)}, 강점: {len(strengths)}, 프로젝트: {len(projects)})")
        except Exception as e:
            print(f"사용자 상세정보 조회 오류 (계속 진행): {e}")
            # 에러가 발생해도 추천서 생성은 계속 진행
    
    # 2) 참고 양식 조회 (있는 경우)
    template_content = None
    if request.template_id:
        try:
            with engine.connect() as conn:
                template_sql = text("""
                    SELECT content FROM recommendationTemplates
                    WHERE id = :template_id AND deletedAt IS NULL
                    LIMIT 1
                """)
                template_row = conn.execute(template_sql, {"template_id": request.template_id}).first()
                if template_row:
                    template_content = template_row._mapping.get("content")
                    print(f"참고 양식 로드 완료 (ID: {request.template_id})")
        except Exception as e:
            print(f"양식 조회 오류 (계속 진행): {e}")
    
    # 2-1) 작성자의 문체 정보 조회 (있는 경우)
    writing_style = None
    try:
        with engine.connect() as conn:
            style_sql = text("""
                SELECT styleAnalysis FROM writing_styles
                WHERE userId = :user_id
                LIMIT 1
            """)
            style_row = conn.execute(style_sql, {"user_id": from_user.id}).first()
            if style_row and style_row._mapping.get("styleAnalysis"):
                writing_style = json.loads(style_row._mapping.get("styleAnalysis"))
                print(f"문체 정보 로드 완료 (사용자 ID: {from_user.id})")
    except Exception as e:
        print(f"문체 정보 조회 오류 (계속 진행): {e}")
    
    # 3) 추천서 텍스트 생성
    try:
        score = int(request.selected_score)
        print(f"추천서 생성 시작 (점수: {score}, 문체 반영: {bool(writing_style)})")
        recommender_email = from_user.email if from_user and from_user.email else ""
        recommendation = generate_single_score_recommendation(request, score, recommender_email, user_details, template_content, writing_style)
        print(f"추천서 생성 완료 (길이: {len(recommendation)} 자)")
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"=== 추천서 생성 오류 ===")
        print(f"에러 타입: {error_type}")
        print(f"에러 메시지: {error_msg}")
        
        # Anthropic API 에러 객체에서 상세 정보 추출 시도
        error_detail = None
        error_code = None
        error_type_name = None
        
        try:
            # Anthropic API 에러 객체인 경우
            if hasattr(e, 'response'):
                if hasattr(e.response, 'json'):
                    error_detail = e.response.json()
                    print(f"Anthropic API 응답: {error_detail}")
                    if error_detail and 'error' in error_detail:
                        error_code = error_detail.get('error', {}).get('code')
                        error_type_name = error_detail.get('error', {}).get('type')
                        print(f"에러 코드: {error_code}, 에러 타입: {error_type_name}")
            # LangChain이 래핑한 경우 또는 Anthropic 라이브러리 직접 사용
            elif hasattr(e, 'status_code'):
                print(f"HTTP 상태 코드: {e.status_code}")
            # Anthropic 에러 객체의 다른 속성 확인
            if hasattr(e, 'body'):
                try:
                    error_detail = json.loads(e.body) if isinstance(e.body, str) else e.body
                    print(f"에러 body: {error_detail}")
                    if error_detail and 'error' in error_detail:
                        error_code = error_detail.get('error', {}).get('code')
                        error_type_name = error_detail.get('error', {}).get('type')
                except:
                    pass
        except Exception as parse_error:
            print(f"에러 파싱 실패: {parse_error}")
        
        import traceback
        traceback.print_exc()
        
        # 중요: Quota 체크를 Rate Limit보다 먼저 수행
        # Anthropic은 RateLimitError로 래핑하지만 실제로는 quota 문제일 수 있음
        is_quota = (
            "insufficient_quota" in error_msg.lower() or 
            error_code == 'insufficient_quota' or
            error_type_name == 'insufficient_quota' or
            ("quota" in error_msg.lower() and "insufficient" in error_msg.lower())
        )
        
        is_rate_limit = (
            (not is_quota) and (  # quota가 아닐 때만 rate limit 체크
                "rate_limit" in error_msg.lower() or 
                "too many requests" in error_msg.lower() or
                error_code == 'rate_limit_exceeded' or
                error_type_name == 'rate_limit_error'
            )
        )
        
        # OverloadedError (529) 처리
        is_overloaded = (
            error_type == "OverloadedError" or
            "overloaded" in error_msg.lower() or
            "529" in error_msg or
            error_code == 529 or
            error_type_name == 'overloaded_error'
        )
        
        # 429 에러는 Rate Limit일 수도 있고 Quota일 수도 있음
        is_429 = "429" in error_msg or error_type == "RateLimitError"
        
        # Quota 에러 우선 처리 (RateLimitError로 래핑되어도 실제로는 quota일 수 있음)
        if is_quota:
            raise HTTPException(
                status_code=503,
                detail="Anthropic API 사용량 한도를 초과했습니다. Anthropic 계정의 플랜 및 결제 정보를 확인해주세요. (Error: Insufficient Quota)"
            )
        elif is_rate_limit:
            raise HTTPException(
                status_code=429,
                detail="요청 빈도가 너무 높습니다. 잠시 후 다시 시도해주세요. (Rate Limit Exceeded)"
            )
        elif is_overloaded:
            raise HTTPException(
                status_code=503,
                detail="Anthropic API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요. (Error: Overloaded - 재시도 로직이 이미 실행되었지만 실패했습니다)"
            )
        # 429 에러이지만 rate_limit도 quota도 아닌 경우
        elif is_429:
            # 에러 메시지에 "quota"가 포함되어 있으면 quota로 처리
            if "quota" in error_msg.lower():
                raise HTTPException(
                    status_code=503,
                    detail="Anthropic API 사용량 한도를 초과했습니다. Anthropic 계정의 플랜 및 결제 정보를 확인해주세요."
                )
            else:
                raise HTTPException(
                    status_code=429,
                    detail="요청 빈도가 너무 높습니다. 잠시 후 다시 시도해주세요."
                )
        # 기타 Anthropic API 에러 처리
        elif "anthropic" in error_msg.lower() or "api" in error_msg.lower() or error_type.startswith("Anthropic") or "RateLimitError" in error_type:
            raise HTTPException(
                status_code=503,
                detail=f"AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요. (오류: {error_msg[:150]})"
            )
        else:
            raise HTTPException(status_code=500, detail=f"추천서 생성 실패: {error_msg[:200]}")

    # 4) DB 저장 (recommendation 테이블만 사용)
    try:
        with engine.connect() as conn:
            # 서명 데이터를 JSON으로 변환하여 저장
            signature_json = None
            if recommender_signature:
                signature_json = json.dumps(recommender_signature)
            
            result = conn.execute(
                text(
                    """
                    INSERT INTO recommendation (fromUserId, toUserId, content, signatureData, createdAt, updatedAt)
                    VALUES (:from_id, :to_id, :content, :signature_data, NOW(), NOW())
                    """
                ),
                {
                    "from_id": from_user.id, 
                    "to_id": to_user.id, 
                    "content": recommendation,
                    "signature_data": signature_json
                },
            )
            recommendation_id = result.lastrowid

            # 🔸 과거에 requests에 쓰던 로직 제거 (requests 미사용)
            #    recommendation 스키마만 이용 (fromUserId, toUserId, content, signatureData)

            conn.commit()
            print(f"추천서 DB 저장 완료 (ID: {recommendation_id}, 서명 포함: {bool(recommender_signature)})")
    except Exception as e:
        print(f"데이터베이스 저장 오류: {e}")
        raise HTTPException(status_code=500, detail="추천서 저장 실패")

    return {
        "recommendation": recommendation, 
        "id": recommendation_id,
        "has_signature": bool(recommender_signature)
    }

# ===== 히스토리 조회 API =====
@app.get("/history")
async def get_history(email: str = None):
    """저장된 히스토리 조회 (이메일 필터링 가능)"""
    try:
        with engine.connect() as conn:
            if email:
                history_sql = text("""
                    SELECT 
                        rl.id,
                        rl.content,
                        rl.createdAt,
                        u_from.email AS from_email,
                        u_to.nickname AS to_name,
                        u_to.email AS to_email
                    FROM recommendation rl
                    JOIN users u_from ON u_from.id = rl.fromUserId
                    JOIN users u_to ON u_to.id = rl.toUserId
                    WHERE rl.deletedAt IS NULL
                    AND u_to.email = :email
                    ORDER BY rl.createdAt DESC
                    LIMIT 3
                """)
                result = conn.execute(history_sql, {"email": email}).fetchall()
            else:
                history_sql = text("""
                    SELECT 
                        rl.id,
                        rl.content,
                        rl.createdAt,
                        u_from.email AS from_email,
                        u_to.nickname AS to_name,
                        u_to.email AS to_email
                    FROM recommendation rl
                    JOIN users u_from ON u_from.id = rl.fromUserId
                    JOIN users u_to ON u_to.id = rl.toUserId
                    WHERE rl.deletedAt IS NULL
                    ORDER BY rl.createdAt DESC
                    LIMIT 100
                """)
                result = conn.execute(history_sql).fetchall()
            
            history = []
            for row in result:
                history.append({
                    "id": row._mapping.get("id"),
                    "timestamp": row._mapping.get("createdAt").strftime('%Y-%m-%d %H:%M:%S') if row._mapping.get("createdAt") else "",
                    "form": {
                        "recommender_email": row._mapping.get("from_email"),
                        "requester_name": row._mapping.get("to_name"),
                        "requester_email": row._mapping.get("to_email"),
                        "reason": "",
                        "strengths": "",
                        "highlight": "",
                        "tone": "공식적"
                    },
                    "recommendation": row._mapping.get("content")
                })
            
            return {"history": history}
            
    except Exception as e:
        print(f"데이터베이스 조회 오류: {e}")
        history = load_history()
        return {"history": history}

@app.delete("/clear-history")
async def clear_history():
    """모든 히스토리 삭제"""
    try:
        with engine.connect() as conn:
            delete_sql = text("""
                UPDATE recommendation 
                SET deletedAt = NOW() 
                WHERE deletedAt IS NULL
            """)
            conn.execute(delete_sql)
            conn.commit()
        if os.path.exists(HISTORY_FILE):
            os.remove(HISTORY_FILE)
        return {"message": "히스토리가 삭제되었습니다."}
    except Exception as e:
        print(f"히스토리 삭제 오류: {e}")
        raise HTTPException(status_code=500, detail="히스토리 삭제 실패")

@app.delete("/delete-history/{item_id}")
async def delete_history_item(item_id: int):
    """특정 히스토리 아이템 삭제"""
    try:
        with engine.connect() as conn:
            delete_sql = text("""
                UPDATE recommendation 
                SET deletedAt = NOW() 
                WHERE id = :item_id AND deletedAt IS NULL
            """)
            result = conn.execute(delete_sql, {"item_id": item_id})
            conn.commit()
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="해당 히스토리를 찾을 수 없습니다.")
        return {"message": "히스토리 아이템이 삭제되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"히스토리 아이템 삭제 오류: {e}")
        raise HTTPException(status_code=500, detail="히스토리 아이템 삭제 실패")

# ===== 인증 API =====
@app.post("/register")
async def register(user: UserRegister):
    with engine.connect() as conn:
        existing_user = conn.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": user.email}
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = hash_password(user.password)
        
        # ▼ 마이그레이션 컬럼명과 동일하게 INSERT
        #   users(email,password,serialNumber,nickname,gender,birth,phone,postCode,address,addressDetail,avatar,createdAt,updatedAt)
        #   참고: 마이그레이션 스키마 :contentReference[oaicite:7]{index=7}
        conn.execute(
            text("""
                INSERT INTO users (
                    email, password, serialNumber, nickname, gender, birth,
                    phone, postCode, address, addressDetail, avatar,
                    createdAt, updatedAt
                )
                VALUES (
                    :email, :password, :serialNumber, :nickname, :gender, :birth,
                    :phone, :postCode, :address, :addressDetail, :avatar,
                    NOW(), NOW()
                )
            """),
            {
                "email": user.email,
                "password": hashed_password,
                "serialNumber": user.serialNumber,
                "nickname": user.nickname,
                "gender": user.gender,
                "birth": user.birth,
                "phone": user.phone,
                "postCode": user.postCode,
                "address": user.address,
                "addressDetail": user.addressDetail,
                "avatar": user.avatar
            }
        )
        conn.commit()
        
        access_token = create_access_token({"sub": user.email})
        return Token(
            access_token=access_token,
            token_type="bearer",
            user={
                "email": user.email,
                "nickname": user.nickname
            }
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
    return {
        "user": current_user,
        "workspaces": []
    }

# ===== 비밀번호 해시 생성용 임시 함수 =====
@app.get("/generate-hash/{password}")
async def generate_hash(password: str):
    hashed = hash_password(password)
    print(f"Generated hash for '{password}': {hashed}")
    return {"hash": hashed}

# ===== 이름 기반 조회 =====
class LookupRequest(BaseModel):
    search: str  # 닉네임으로 검색

@app.post("/lookup")
async def lookup(req: LookupRequest):
    users_sql = text("""
        SELECT DISTINCT
            u.id       AS user_id,
            u.nickname AS nickname,
            u.email    AS email
        FROM users u
        WHERE u.email = :search
        AND u.deletedAt IS NULL
    """)

    workspace_sql = text("""
        SELECT
            w.id             AS workspace_id,
            w.name           AS workspace_name,
            w.registrationNumber AS workspace_serial
        FROM workspaceUsers wu
        JOIN workspaces w ON w.id = wu.workspaceId 
        WHERE wu.userId = :user_id 
        AND wu.deletedAt IS NULL
        AND w.deletedAt IS NULL
    """)
    with engine.connect() as conn:
        users = conn.execute(users_sql, {"search": req.search}).fetchall()

        if not users:
            return {"exists": False, "message": "DB에 없는 데이터입니다."}

        users_data = []
        for user in users:
            user_id = user._mapping.get("user_id")
            
            workspaces = []
            workspace_rows = conn.execute(workspace_sql, {"user_id": user_id}).fetchall()
            
            for w in workspace_rows:
                workspaces.append({
                    "id": w._mapping.get("workspace_id"),
                    "name": w._mapping.get("workspace_name"),
                    "serial_number": w._mapping.get("workspace_serial")
                })

            total_ref_sql = text("""
                SELECT COUNT(DISTINCT rl.id) as total_count
                FROM recommendation rl
                WHERE (
                    (rl.fromUserId = :user_id)
                    OR 
                    (rl.toUserId = :user_id)
                )
                AND rl.deletedAt IS NULL
            """)
            
            total_count_result = conn.execute(total_ref_sql, {
                "user_id": user_id
            }).first()
            total_count = total_count_result._mapping.get("total_count", 0) if total_count_result else 0
            
            users_data.append({
                "id": user_id,
                "email": user._mapping.get("email"),
                "nickname": user._mapping.get("nickname"),
                "name": user._mapping.get("nickname"),  # name 컬럼이 없으므로 nickname 사용
                "workspaces": workspaces,
                "reference_count": total_count
            })

    return {
        "exists": True,
        "users": users_data
    }

# ===== 추천서 수정 요청 모델 =====
class UpdateRecommendationRequest(BaseModel):
    content: str

# ===== 추천서 개선 요청 모델 =====
class RefineRecommendationRequest(BaseModel):
    current_content: str  # 현재 수정된 추천서 내용
    improvement_notes: str  # AI에게 전달할 개선사항/피드백
    tone: Optional[str] = "Formal"  # 톤 유지
    selected_score: Optional[str] = "5"  # 점수 유지

# ===== 추천서 수정 API =====
@app.patch("/update-recommendation/{recommendation_id}")
async def update_recommendation(recommendation_id: int, req: UpdateRecommendationRequest, current_user: dict = Depends(get_current_user)):
    """추천서 내용을 수정합니다."""
    try:
        with engine.connect() as conn:
            check_sql = text("""
                SELECT id, fromUserId, toUserId 
                FROM recommendation 
                WHERE id = :ref_id AND deletedAt IS NULL
            """)
            ref = conn.execute(check_sql, {"ref_id": recommendation_id}).first()
            
            if not ref:
                raise HTTPException(status_code=404, detail="추천서를 찾을 수 없습니다.")
            
            update_sql = text("""
                UPDATE recommendation 
                SET content = :content, updatedAt = NOW() 
                WHERE id = :ref_id AND deletedAt IS NULL
            """)
            conn.execute(update_sql, {"content": req.content, "ref_id": recommendation_id})
            conn.commit()
            
            print(f"추천서 {recommendation_id} 업데이트 완료")
            return {"message": "추천서가 수정되었습니다.", "id": recommendation_id}
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"추천서 수정 오류: {e}")
        raise HTTPException(status_code=500, detail="추천서 수정 실패")

# ===== 추천서 최종 완성 API =====
@app.post("/refine-recommendation")
async def refine_recommendation(req: RefineRecommendationRequest):
    """수정된 추천서와 개선사항을 받아 AI가 최종 완성본을 생성합니다."""
    try:
        # AI 프롬프트 구성
        prompt = f"""
당신은 전문 추천서 개선 AI입니다.
사용자가 직접 작성/수정한 추천서와 추가 개선 요청사항을 받았습니다.

**중요: 사용자가 수정한 아래 추천서 내용이 최우선입니다. 이 내용을 기반으로 개선사항만 반영하세요.**

아래는 사용자가 직접 작성/수정한 추천서와 개선 요청사항입니다.
목표는 “사용자의 현재 문서”를 최대한 보존하면서, 요청된 개선점만 정밀 반영한 최종본을 만드는 것입니다.
출력은 한국어(존댓말)만 사용합니다. 고유명사 외 영문 표현 금지.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[현재 추천서(사용자 수정본)]
{req.current_content}

[개선 요청사항]
{req.improvement_notes}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[최우선 원칙]
1) “현재 추천서”의 내용·문장·표현을 최대한 보존합니다.
2) 사용자가 명시적으로 수정·기입한 이름/날짜/수치/사실은 절대 변경 금지.
3) 개선 요청사항과 충돌 시, 현재 문서 우선. 모호하면 최소 변경 원칙.
4) 품질 기준(유창성/사실성/응집성/정확성)은 항상 최고 수준으로 유지합니다.

[개선 범위(요청사항에 해당할 때만 수행)]
- 구조: 문단 재배열, 연결어 보완으로 흐름 개선
- 명료성: 중복 축약, 장문 분할, 모호표현 구체화
- 구체성: 가능하면 수치·맥락·행동·결과 보강(현재 문서·요청사항에 근거한 범위 내)
- 어조: {req.tone}에 맞게 일관성 정렬(추천 강도는 본문 의미 훼손 없이 표현 수위만 조정)
- 형식: “추천서 → 본문 3~6문단 → 날짜/작성자/서명” 규격 정렬(있다면 유지·보완)

[금지]
- 새로운 사실 창작/추가 금지(환각 금지)
- 불필요한 재서술·대체어 남발 금지
- 영문 인사말/섹션명/번호 목록 사용 금지

[최종 출력 방식]
- 한 번에 완성본만 제시(변경 이력 미표시)
- 제목/본문/날짜/작성자 정보 일체 포함
- 사용자 고유 문장 톤과 어휘를 최대한 유지

[내부 자체 점검(출력 전 체크)]
- 사실성·정합성: 모든 문장이 현재 문서/요청사항에 근거하는가?
- 최소 변경: 불필요한 표현 치환/삭제가 없는가?
- 응집성: 문단 연결이 매끄러운가?
- 톤: {req.tone}에 일관적인가?
- 개인정보: 민감 정보 노출이 없는가?

[작성 방식]
- 현재 추천서를 기본 템플릿으로 사용
- 개선 요청사항에 해당하는 부분만 자연스럽게 수정
- 나머지 부분은 그대로 유지
- 전체적인 흐름과 톤의 일관성 유지

**다시 한 번 강조: 사용자가 수정한 내용을 최대한 보존하면서, 개선 요청사항만 반영한 최종본을 작성하세요.**
"""
        
        # AI 호출
        result = llm.invoke(prompt)
        refined_content = getattr(result, "content", str(result))
        
        print(f"━━━━━━ 추천서 최종 완성 ━━━━━━")
        print(f"[입력] 사용자 수정본 길이: {len(req.current_content)} 자")
        print(f"[입력] 개선 요청: {req.improvement_notes[:100]}...")
        print(f"[출력] 완성본 길이: {len(refined_content)} 자")
        print(f"[요청] 톤: {req.tone}, 점수: {req.selected_score}")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        
        return {"refined_content": refined_content}
        
    except Exception as e:
        print(f"추천서 최종 완성 오류: {e}")
        raise HTTPException(status_code=500, detail="추천서 최종 완성 실패")

# ===== 사용자 상세 정보 조회 API =====
@app.get("/user-details/{user_id}")
async def get_user_details(user_id: int, requester_email: Optional[str] = None):
    """사용자의 상세 정보(경력, 수상이력, 자격증, 강점, 평판, 프로젝트)를 조회합니다."""
    try:
        with engine.connect() as conn:
            # 권한 확인 로직
            # 1. requester_email이 없으면 → 권한 확인 없이 조회 (기존 동작 유지)
            # 2. 본인이면 → 조회 허용
            # 3. 권한이 있으면 → 조회 허용
            # 4. 권한이 없으면 → 403 Forbidden
            
            # requester_email이 있고 비어있지 않으면 권한 확인
            if requester_email and requester_email.strip():
                # 사용자 정보 가져오기
                user_row = conn.execute(text("""
                    SELECT id, email FROM users WHERE id = :uid AND deletedAt IS NULL
                """), {"uid": user_id}).first()
                
                if not user_row:
                    raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
                
                owner_email = user_row._mapping.get("email")
                if not owner_email:
                    raise HTTPException(status_code=404, detail="사용자 이메일을 찾을 수 없습니다.")
                
                requester_email_clean = requester_email.strip().lower()
                owner_email_clean = owner_email.strip().lower()
                
                # 본인인지 확인
                if owner_email_clean == requester_email_clean:
                    # 본인이면 조회 허용
                    pass
                else:
                    # 권한 확인
                    perm = conn.execute(text("""
                        SELECT id FROM userDetailPermissions
                        WHERE ownerEmail = :owner_email AND allowedEmail = :requester_email AND deletedAt IS NULL
                    """), {
                        "owner_email": owner_email_clean,
                        "requester_email": requester_email_clean
                    }).first()
                    
                    if not perm:
                        raise HTTPException(
                            status_code=403, 
                            detail="상세정보를 볼 권한이 없습니다. 추천받는 분께 권한을 요청하세요."
                        )
            
            experiences_sql = text("""
                SELECT id, company, position, startDate, endDate, description
                FROM userExperiences
                WHERE userId = :user_id AND deletedAt IS NULL
                ORDER BY startDate DESC
            """)
            experiences = []
            for row in conn.execute(experiences_sql, {"user_id": user_id}).fetchall():
                experiences.append({
                    "id": row._mapping.get("id"),
                    "company": row._mapping.get("company"),
                    "position": row._mapping.get("position"),
                    "startDate": row._mapping.get("startDate").strftime('%Y-%m-%d') if row._mapping.get("startDate") else None,
                    "endDate": row._mapping.get("endDate").strftime('%Y-%m-%d') if row._mapping.get("endDate") else "현재",
                    "description": row._mapping.get("description")
                })
            
            awards_sql = text("""
                SELECT id, title, organization, awardDate, description
                FROM userAwards
                WHERE userId = :user_id AND deletedAt IS NULL
                ORDER BY awardDate DESC
            """)
            awards = []
            for row in conn.execute(awards_sql, {"user_id": user_id}).fetchall():
                awards.append({
                    "id": row._mapping.get("id"),
                    "title": row._mapping.get("title"),
                    "organization": row._mapping.get("organization"),
                    "awardDate": row._mapping.get("awardDate").strftime('%Y-%m-%d') if row._mapping.get("awardDate") else None,
                    "description": row._mapping.get("description")
                })
            
            certifications_sql = text("""
                SELECT id, name, issuer, issueDate, expiryDate, certificationNumber
                FROM userCertifications
                WHERE userId = :user_id AND deletedAt IS NULL
                ORDER BY issueDate DESC
            """)
            certifications = []
            for row in conn.execute(certifications_sql, {"user_id": user_id}).fetchall():
                certifications.append({
                    "id": row._mapping.get("id"),
                    "name": row._mapping.get("name"),
                    "issuer": row._mapping.get("issuer"),
                    "issueDate": row._mapping.get("issueDate").strftime('%Y-%m-%d') if row._mapping.get("issueDate") else None,
                    "expiryDate": row._mapping.get("expiryDate").strftime('%Y-%m-%d') if row._mapping.get("expiryDate") else "무제한",
                    "certificationNumber": row._mapping.get("certificationNumber")
                })
            
            strengths_sql = text("""
                SELECT id, category, strength, description
                FROM userStrengths
                WHERE userId = :user_id AND deletedAt IS NULL
                ORDER BY category, id
            """)
            strengths = []
            for row in conn.execute(strengths_sql, {"user_id": user_id}).fetchall():
                strengths.append({
                    "id": row._mapping.get("id"),
                    "category": row._mapping.get("category"),
                    "strength": row._mapping.get("strength"),
                    "description": row._mapping.get("description")
                })
            
            reputations_sql = text("""
                SELECT 
                    r.id, r.rating, r.comment, r.category, r.createdAt,
                    u.nickname AS fromName
                FROM userReputations r
                LEFT JOIN users u ON u.id = r.fromUserId
                WHERE r.userId = :user_id AND r.deletedAt IS NULL
                ORDER BY r.createdAt DESC
            """)
            reputations = []
            for row in conn.execute(reputations_sql, {"user_id": user_id}).fetchall():
                reputations.append({
                    "id": row._mapping.get("id"),
                    "rating": row._mapping.get("rating"),
                    "comment": row._mapping.get("comment"),
                    "category": row._mapping.get("category"),
                    "fromName": row._mapping.get("fromName") or "익명",
                    "createdAt": row._mapping.get("createdAt").strftime('%Y-%m-%d') if row._mapping.get("createdAt") else None
                })
            
            projects_sql = text("""
                SELECT id, title, role, startDate, endDate, description, technologies, achievement, url
                FROM userProjects
                WHERE userId = :user_id AND deletedAt IS NULL
                ORDER BY startDate DESC
            """)
            projects = []
            for row in conn.execute(projects_sql, {"user_id": user_id}).fetchall():
                projects.append({
                    "id": row._mapping.get("id"),
                    "title": row._mapping.get("title"),
                    "role": row._mapping.get("role"),
                    "startDate": row._mapping.get("startDate").strftime('%Y-%m-%d') if row._mapping.get("startDate") else None,
                    "endDate": row._mapping.get("endDate").strftime('%Y-%m-%d') if row._mapping.get("endDate") else "진행중",
                    "description": row._mapping.get("description"),
                    "technologies": row._mapping.get("technologies"),
                    "achievement": row._mapping.get("achievement"),
                    "url": row._mapping.get("url")
                })
            
            return {
                "experiences": experiences,
                "awards": awards,
                "certifications": certifications,
                "strengths": strengths,
                "reputations": reputations,
                "projects": projects
            }
            
    except Exception as e:
        print(f"사용자 상세 정보 조회 오류: {e}")
        return {
            "experiences": [],
            "awards": [],
            "certifications": [],
            "strengths": [],
            "reputations": [],
            "projects": []
        }

# ===== 전체 추천서 기록 조회 =====
class ReferenceHistoryRequest(BaseModel):
    user_id: int

@app.post("/reference-history")
async def get_reference_history(req: ReferenceHistoryRequest):
    """특정 사용자의 전체 추천서 기록을 조회합니다."""
    with engine.connect() as conn:
        ref_sql = text("""
            SELECT DISTINCT
                rl.id,
                rl.content,
                rl.createdAt,
                u_from.nickname AS from_name,
                u_from.email AS from_email,
                u_to.nickname AS to_name,
                u_to.email AS to_email
            FROM recommendation rl
            JOIN users u_from ON u_from.id = rl.fromUserId
            JOIN users u_to ON u_to.id = rl.toUserId
            WHERE (
                (rl.fromUserId = :user_id)
                OR 
                (rl.toUserId = :user_id)
            )
            AND rl.deletedAt IS NULL
            ORDER BY rl.createdAt DESC
        """)
        
        references = []
        ref_rows = conn.execute(ref_sql, {
            "user_id": req.user_id
        }).fetchall()
        
        for r in ref_rows:
            references.append({
                "id": r._mapping.get("id"),
                "content": r._mapping.get("content"),
                "created_at": r._mapping.get("createdAt"),
                "from_name": r._mapping.get("from_name"),
                "to_name": r._mapping.get("to_name")
            })

    return {
        "references": references,
        "total_count": len(references)
    }


# =========================
# 회원가입 플로우 전용 모델/유틸
# =========================
from pydantic import Field
from fastapi import Query

class EmailCheckResponse(BaseModel):
    available: bool

@app.get("/auth/email-available", response_model=EmailCheckResponse)
async def check_email_available(email: str = Query(..., min_length=3)):
    """
    3. 이메일 중복 확인
    - 존재하면 available=false
    """
    with engine.connect() as conn:
        row = conn.execute(text("SELECT id FROM users WHERE email = :email AND deletedAt IS NULL"),
                           {"email": email}).first()
        return {"available": False if row else True}

class CompanySearchResponse(BaseModel):
    exists: bool
    companyId: Optional[int] = None
    name: Optional[str] = None

@app.get("/companies/search", response_model=CompanySearchResponse)
async def search_company(name: str = Query(..., min_length=1)):
    """
    6-1. 회사 검색 (workspaces.name LIKE)
    """
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT id, name FROM workspaces 
            WHERE deletedAt IS NULL AND TRIM(name) = TRIM(:name)
            LIMIT 1
        """), {"name": name}).first()
        if row:
            return {"exists": True, "companyId": row.id, "name": row.name}
        return {"exists": False}

class CompanyCreateRequest(BaseModel):
    name: str

class CompanyCreateResponse(BaseModel):
    created: bool
    companyId: int
    name: str

@app.post("/companies", response_model=CompanyCreateResponse)
async def create_company(payload: CompanyCreateRequest):
    """
    7-2. 회사가 없으면 새로 추가
    - workspaces(name) 생성
    - createdAt/updatedAt 반드시 명시(마이그레이션 공통 컬럼 제약 때문)  # users/workspaces 등 공통 타임스탬프 컬럼 정의 참조
    """
    with engine.connect() as conn:
        # 이미 있으면 그대로 반환
        row = conn.execute(text("""
            SELECT id, name FROM workspaces 
            WHERE deletedAt IS NULL AND TRIM(name) = TRIM(:name)
            LIMIT 1
        """), {"name": payload.name}).first()
        if row:
            return {"created": False, "companyId": row.id, "name": row.name}

        result = conn.execute(text("""
            INSERT INTO workspaces (name, createdAt, updatedAt) 
            VALUES (:name, NOW(), NOW())
        """), {"name": payload.name})
        conn.commit()
        return {"created": True, "companyId": result.lastrowid, "name": payload.name}

# ── 슈퍼리더 존재 여부 체크 (제거됨 - grade 컬럼 삭제로 인해 불필요)

# ── 유틸: Role(직책) 보장
def _get_or_create_role(conn, workspace_id: int, role_name: str) -> Optional[int]:
    if not role_name:
        return None
    r = conn.execute(text("""
        SELECT id FROM workspaceRoles 
        WHERE deletedAt IS NULL AND workspaceId = :wid AND TRIM(name) = TRIM(:name)
        LIMIT 1
    """), {"wid": workspace_id, "name": role_name}).first()
    if r:
        return r.id
    res = conn.execute(text("""
        INSERT INTO workspaceRoles (workspaceId, name, createdAt, updatedAt)
        VALUES (:wid, :name, NOW(), NOW())
    """), {"wid": workspace_id, "name": role_name})
    return res.lastrowid

# =========================
# 1단계: 기본 가입 (이름/성별/이메일중복/비번)
# =========================
class SignupStep1Request(BaseModel):
    name: str
    gender: Optional[int] = Gender.NONE.value
    email: EmailStr
    password: str
    password_confirm: str
    nickname: Optional[str] = None  # 별도 입력 없으면 name을 nickname으로 사용

class SignupStep1Response(BaseModel):
    userId: int
    email: EmailStr

@app.post("/signup/step1", response_model=SignupStep1Response)
async def signup_step1(payload: SignupStep1Request):
    # 비밀번호 일치 검사
    if payload.password != payload.password_confirm:
        raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")

    with engine.connect() as conn:
        # 이메일 중복
        exists = conn.execute(text("SELECT id FROM users WHERE email = :email AND deletedAt IS NULL"),
                              {"email": payload.email}).first()
        if exists:
            raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")

        hashed = hash_password(payload.password)
        res = conn.execute(text("""
            INSERT INTO users
              (email, password, nickname, gender, createdAt, updatedAt)
            VALUES
              (:email, :password, :nickname, :gender, NOW(), NOW())
        """), {
            "email": payload.email,
            "password": hashed,
            "nickname": payload.nickname or payload.name,  # 스키마에 name 컬럼 없음 → nickname 사용
            "gender": int(payload.gender or 0)
        })
        user_id = res.lastrowid
        conn.commit()

    return {"userId": user_id, "email": payload.email}

# =========================
# 2단계: 재직 여부/회사/등급/직책 연결
# =========================
class EmploymentChoice(str, Enum):
    YES = "yes"
    NO = "no"

class SignupStep2Request(BaseModel):
    userId: int
    employed: EmploymentChoice                # 'yes' | 'no'
    companyId: Optional[int] = None           # employed=yes일 때 필요
    companyName: Optional[str] = None         # 검색/신규등록용
    positionTitle: Optional[str] = None       # 직책명 (workspaceRoles.name)

class SignupStep2Response(BaseModel):
    mapped: bool
    workspaceUserId: Optional[int] = None

@app.post("/signup/step2", response_model=SignupStep2Response)
async def signup_step2(payload: SignupStep2Request):
    """
    6~9단계 로직:
    - employed=no → 회사/직책 입력칸 비활성(프런트), 바로 통과
    - employed=yes → 회사 존재 확인/신규 생성, Role(직책) 보장 후 workspaceUsers 매핑
    """
    with engine.connect() as conn:
        # 사용자 존재
        u = conn.execute(text("SELECT id FROM users WHERE id = :uid AND deletedAt IS NULL"),
                         {"uid": payload.userId}).first()
        if not u:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

        # employed = NO → 매핑 없음
        if payload.employed == EmploymentChoice.NO:
            return {"mapped": False, "workspaceUserId": None}

        # employed = YES → 회사 식별/생성
        workspace_id = payload.companyId
        if not workspace_id:
            if not payload.companyName:
                raise HTTPException(status_code=400, detail="회사 정보가 필요합니다.")
            # 회사 검색
            w = conn.execute(text("""
                SELECT id FROM workspaces 
                WHERE deletedAt IS NULL AND TRIM(name) = TRIM(:name) LIMIT 1
            """), {"name": payload.companyName}).first()
            if w:
                workspace_id = w.id
            else:
                ins = conn.execute(text("""
                    INSERT INTO workspaces (name, createdAt, updatedAt)
                    VALUES (:name, NOW(), NOW())
                """), {"name": payload.companyName})
                workspace_id = ins.lastrowid

        # 직책 Role 보장
        role_id = _get_or_create_role(conn, workspace_id, payload.positionTitle or "")

        # workspaceUsers 매핑(중복 방지)
        existing = conn.execute(text("""
            SELECT id FROM workspaceUsers 
            WHERE deletedAt IS NULL AND workspaceId = :wid AND userId = :uid
            LIMIT 1
        """), {"wid": workspace_id, "uid": payload.userId}).first()
        if existing:
            raise HTTPException(status_code=409, detail="해당 회사에 이미 연결되어 있습니다.")

        ins_map = conn.execute(text("""
            INSERT INTO workspaceUsers
                (workspaceId, userId, workspaceRoleId, createdAt, updatedAt)
            VALUES
                (:wid, :uid, :rid, NOW(), NOW())
        """), {
            "wid": workspace_id,
            "uid": payload.userId,
            "rid": role_id,
        })
        conn.commit()
        return {"mapped": True, "workspaceUserId": ins_map.lastrowid}

# =========================
# 3단계(선택): 프로필 상세 등록
# =========================
class ExperienceItem(BaseModel):
    company: str
    position: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    description: Optional[str] = None

class AwardItem(BaseModel):
    title: str
    organization: Optional[str] = None
    awardDate: Optional[str] = None
    description: Optional[str] = None

class CertItem(BaseModel):
    name: str
    issuer: Optional[str] = None
    issueDate: Optional[str] = None
    expiryDate: Optional[str] = None
    certificationNumber: Optional[str] = None

class StrengthItem(BaseModel):
    category: Optional[str] = None
    strength: str
    description: Optional[str] = None

class ProjectItem(BaseModel):
    title: str
    role: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    description: Optional[str] = None
    technologies: Optional[str] = None
    achievement: Optional[str] = None
    url: Optional[str] = None

class SignupProfileRequest(BaseModel):
    userId: int
    experiences: Optional[List[ExperienceItem]] = None
    awards: Optional[List[AwardItem]] = None
    certifications: Optional[List[CertItem]] = None
    projects: Optional[List[ProjectItem]] = None
    strengths: Optional[List[StrengthItem]] = None

class SignupProfileResponse(BaseModel):
    saved: bool

@app.post("/signup/profile", response_model=SignupProfileResponse)
async def signup_profile(payload: SignupProfileRequest):
    """
    11단계: 프로필 상세 입력(선택)
    - 각 테이블은 공통 타임스탬프 NOT NULL → createdAt/updatedAt 반드시 기입
    - 마이그레이션의 상세 테이블 정의와 인덱스 참고
    """
    with engine.begin() as conn:  # 트랜잭션
        # 사용자 확인
        u = conn.execute(text("SELECT id FROM users WHERE id = :uid AND deletedAt IS NULL"),
                         {"uid": payload.userId}).first()
        if not u:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

        # 경력
        if payload.experiences:
            for e in payload.experiences:
                conn.execute(text("""
                    INSERT INTO userExperiences
                      (userId, company, position, startDate, endDate, description, createdAt, updatedAt)
                    VALUES
                      (:uid, :company, :position, :startDate, :endDate, :description, NOW(), NOW())
                """), {
                    "uid": payload.userId,
                    "company": e.company, "position": e.position,
                    "startDate": e.startDate, "endDate": e.endDate,
                    "description": e.description
                })

        # 수상
        if payload.awards:
            for a in payload.awards:
                conn.execute(text("""
                    INSERT INTO userAwards
                      (userId, title, organization, awardDate, description, createdAt, updatedAt)
                    VALUES
                      (:uid, :title, :organization, :awardDate, :description, NOW(), NOW())
                """), {
                    "uid": payload.userId,
                    "title": a.title, "organization": a.organization,
                    "awardDate": a.awardDate, "description": a.description
                })

        # 자격증
        if payload.certifications:
            for c in payload.certifications:
                conn.execute(text("""
                    INSERT INTO userCertifications
                      (userId, name, issuer, issueDate, expiryDate, certificationNumber, createdAt, updatedAt)
                    VALUES
                      (:uid, :name, :issuer, :issueDate, :expiryDate, :num, NOW(), NOW())
                """), {
                    "uid": payload.userId,
                    "name": c.name, "issuer": c.issuer,
                    "issueDate": c.issueDate, "expiryDate": c.expiryDate,
                    "num": c.certificationNumber
                })

        # 프로젝트
        if payload.projects:
            for p in payload.projects:
                conn.execute(text("""
                    INSERT INTO userProjects
                      (userId, title, role, startDate, endDate, description, technologies, achievement, url, createdAt, updatedAt)
                    VALUES
                      (:uid, :title, :role, :startDate, :endDate, :description, :technologies, :achievement, :url, NOW(), NOW())
                """), {
                    "uid": payload.userId,
                    "title": p.title, "role": p.role,
                    "startDate": p.startDate, "endDate": p.endDate,
                    "description": p.description, "technologies": p.technologies,
                    "achievement": p.achievement, "url": p.url
                })

        # 강점
        if payload.strengths:
            for s in payload.strengths:
                conn.execute(text("""
                    INSERT INTO userStrengths
                      (userId, category, strength, description, createdAt, updatedAt)
                    VALUES
                      (:uid, :category, :strength, :description, NOW(), NOW())
                """), {
                    "uid": payload.userId,
                    "category": s.category, "strength": s.strength, "description": s.description
                })

    return {"saved": True}

# ===== 프로필 정보 조회/수정 및 상세 항목 CRUD =====

from fastapi import Body

class ProfileInfo(BaseModel):
    name: Optional[str] = None  # users.nickname
    email: Optional[EmailStr] = None
    birth: Optional[str] = None
    gender: Optional[int] = None
    phone: Optional[str] = None
    postCode: Optional[str] = None
    address: Optional[str] = None
    addressDetail: Optional[str] = None

class PasswordChange(BaseModel):
    new_password: str
    new_password_confirm: str

def _user_row_by_id(conn, user_id: int):
    return conn.execute(text("""
        SELECT id, email, nickname, gender, birth, phone, postCode, address, addressDetail
        FROM users
        WHERE id = :uid AND deletedAt IS NULL
        LIMIT 1
    """), {"uid": user_id}).first()

@app.get("/profile/info")
async def get_profile_info(current_user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        u = _user_row_by_id(conn, current_user["id"])
        if not u:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        m = u._mapping
        return {
            "name": m.get("nickname"),
            "email": m.get("email"),
            "birth": m.get("birth"),
            "gender": m.get("gender"),
            "phone": m.get("phone"),
            "postCode": m.get("postCode"),
            "address": m.get("address"),
            "addressDetail": m.get("addressDetail"),
        }

@app.put("/profile/info")
async def update_profile_info(
    payload: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    # payload: { name, birth, gender, phone, postCode, address, addressDetail, pwd? }
    name = payload.get("name")
    birth = payload.get("birth")
    gender = payload.get("gender")
    phone = payload.get("phone")
    postCode = payload.get("postCode")
    address = payload.get("address")
    addressDetail = payload.get("addressDetail")
    pwd = payload.get("pwd") or payload.get("password") or None

    with engine.begin() as conn:
        u = _user_row_by_id(conn, current_user["id"])
        if not u:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        # 비밀번호 변경 처리
        if pwd is not None:
            new_p = pwd.get("new_password")
            new_pc = pwd.get("new_password_confirm")
            if new_p != new_pc:
                raise HTTPException(status_code=400, detail="비밀번호 확인이 일치하지 않습니다.")
            if not new_p or len(new_p) < 6:
                raise HTTPException(status_code=400, detail="비밀번호는 6자 이상이어야 합니다.")
            # 이전 비밀번호와 동일 여부 검사
            cur = conn.execute(text("SELECT password FROM users WHERE id = :uid AND deletedAt IS NULL LIMIT 1"), {"uid": current_user["id"]}).first()
            if cur and cur._mapping.get("password"):
                try:
                    same = pwd_context.verify(new_p, cur._mapping.get("password"))
                except Exception:
                    same = False
                if same:
                    raise HTTPException(status_code=400, detail="이전과 동일한 비밀번호입니다.")
            hashed = hash_password(new_p)
            conn.execute(text("""
                UPDATE users SET password = :p, updatedAt = NOW()
                WHERE id = :uid AND deletedAt IS NULL
            """), {"p": hashed, "uid": current_user["id"]})
        # 나머지 필드 업데이트
        conn.execute(text("""
            UPDATE users
            SET
              nickname = COALESCE(:name, nickname),
              birth = COALESCE(:birth, birth),
              gender = COALESCE(:gender, gender),
              phone = COALESCE(:phone, phone),
              postCode = COALESCE(:postCode, postCode),
              address = COALESCE(:address, address),
              addressDetail = COALESCE(:addressDetail, addressDetail),
              updatedAt = NOW()
            WHERE id = :uid AND deletedAt IS NULL
        """), {
            "name": name, "birth": birth, "gender": gender,
            "phone": phone, "postCode": postCode, "address": address,
            "addressDetail": addressDetail, "uid": current_user["id"]
        })
    return {"updated": True}

# ===== 공통 유틸 =====
def _soft_delete(conn, table: str, item_id: int, user_id: int):
    # 사용자 소유만 삭제
    sql = text(f"""
        UPDATE {table}
        SET deletedAt = NOW(), updatedAt = NOW()
        WHERE id = :id AND userId = :uid AND deletedAt IS NULL
    """    )
    r = conn.execute(sql, {"id": item_id, "uid": user_id})
    if r.rowcount == 0:
        raise HTTPException(status_code=404, detail="데이터를 찾을 수 없습니다.")

# ===== Experiences =====
@app.get("/profile/experiences")
async def list_experiences(current_user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, company, position, startDate, endDate, description
            FROM userExperiences
            WHERE userId = :uid AND deletedAt IS NULL
            ORDER BY startDate DESC
        """), {"uid": current_user["id"]}).fetchall()
        out = []
        for r in rows:
            m = r._mapping
            out.append({
                "id": m.get("id"),
                "company": m.get("company"),
                "position": m.get("position"),
                "startDate": m.get("startDate").strftime('%Y-%m-%d') if m.get("startDate") else None,
                "endDate": m.get("endDate").strftime('%Y-%m-%d') if m.get("endDate") else None,
                "description": m.get("description")
            })
        return {"items": out}

class ExperienceUpsert(BaseModel):
    company: str
    position: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    description: Optional[str] = None

@app.post("/profile/experiences")
async def create_experience(payload: ExperienceUpsert, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        # 빈 문자열을 None으로 변환
        data = payload.model_dump()
        if data.get("startDate") == "":
            data["startDate"] = None
        if data.get("endDate") == "":
            data["endDate"] = None
        if data.get("description") == "":
            data["description"] = None
        
        r = conn.execute(text("""
            INSERT INTO userExperiences (userId, company, position, startDate, endDate, description, createdAt, updatedAt)
            VALUES (:uid, :company, :position, :startDate, :endDate, :description, NOW(), NOW())
        """), {"uid": current_user["id"], **data})
        return {"id": r.lastrowid}

@app.put("/profile/experiences/{item_id}")
async def update_experience(item_id: int, payload: ExperienceUpsert, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        # 빈 문자열을 None으로 변환
        data = payload.model_dump()
        if data.get("startDate") == "":
            data["startDate"] = None
        if data.get("endDate") == "":
            data["endDate"] = None
        if data.get("description") == "":
            data["description"] = None
        
        conn.execute(text("""
            UPDATE userExperiences
            SET company=:company, position=:position, startDate=:startDate, endDate=:endDate, description=:description, updatedAt=NOW()
            WHERE id=:id AND userId=:uid AND deletedAt IS NULL
        """), {"id": item_id, "uid": current_user["id"], **data})
    return {"updated": True}

@app.delete("/profile/experiences/{item_id}")
async def delete_experience(item_id: int, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        _soft_delete(conn, "userExperiences", item_id, current_user["id"])
    return {"deleted": True}

# ===== Awards =====
class AwardUpsert(BaseModel):
    title: str
    organization: Optional[str] = None
    awardDate: Optional[str] = None
    description: Optional[str] = None

@app.get("/profile/awards")
async def list_awards(current_user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, title, organization, awardDate, description
            FROM userAwards
            WHERE userId = :uid AND deletedAt IS NULL
            ORDER BY awardDate DESC
        """), {"uid": current_user["id"]}).fetchall()
        out = []
        for r in rows:
            m = r._mapping
            out.append({
                "id": m.get("id"),
                "title": m.get("title"),
                "organization": m.get("organization"),
                "awardDate": m.get("awardDate").strftime('%Y-%m-%d') if m.get("awardDate") else None,
                "description": m.get("description"),
            })
        return {"items": out}

@app.post("/profile/awards")
async def create_award(payload: AwardUpsert, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        # 빈 문자열을 None으로 변환
        data = payload.model_dump()
        if data.get("awardDate") == "":
            data["awardDate"] = None
        if data.get("organization") == "":
            data["organization"] = None
        if data.get("description") == "":
            data["description"] = None
        
        r = conn.execute(text("""
            INSERT INTO userAwards (userId, title, organization, awardDate, description, createdAt, updatedAt)
            VALUES (:uid, :title, :organization, :awardDate, :description, NOW(), NOW())
        """), {"uid": current_user["id"], **data})
        return {"id": r.lastrowid}

@app.put("/profile/awards/{item_id}")
async def update_award(item_id: int, payload: AwardUpsert, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        # 빈 문자열을 None으로 변환
        data = payload.model_dump()
        if data.get("awardDate") == "":
            data["awardDate"] = None
        if data.get("organization") == "":
            data["organization"] = None
        if data.get("description") == "":
            data["description"] = None
        
        conn.execute(text("""
            UPDATE userAwards
            SET title=:title, organization=:organization, awardDate=:awardDate, description=:description, updatedAt=NOW()
            WHERE id=:id AND userId=:uid AND deletedAt IS NULL
        """), {"id": item_id, "uid": current_user["id"], **data})
    return {"updated": True}

@app.delete("/profile/awards/{item_id}")
async def delete_award(item_id: int, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        _soft_delete(conn, "userAwards", item_id, current_user["id"])
    return {"deleted": True}

# ===== Certifications =====
class CertUpsert(BaseModel):
    name: str
    issuer: Optional[str] = None
    issueDate: Optional[str] = None
    expiryDate: Optional[str] = None
    certificationNumber: Optional[str] = None

@app.get("/profile/certifications")
async def list_certs(current_user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, name, issuer, issueDate, expiryDate, certificationNumber
            FROM userCertifications
            WHERE userId = :uid AND deletedAt IS NULL
            ORDER BY issueDate DESC
        """), {"uid": current_user["id"]}).fetchall()
        out = []
        for r in rows:
            m = r._mapping
            out.append({
                "id": m.get("id"),
                "name": m.get("name"),
                "issuer": m.get("issuer"),
                "issueDate": m.get("issueDate").strftime('%Y-%m-%d') if m.get("issueDate") else None,
                "expiryDate": m.get("expiryDate").strftime('%Y-%m-%d') if m.get("expiryDate") else None,
                "certificationNumber": m.get("certificationNumber"),
            })
        return {"items": out}

@app.post("/profile/certifications")
async def create_cert(payload: CertUpsert, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        # 빈 문자열을 None으로 변환
        data = payload.model_dump()
        if data.get("issueDate") == "":
            data["issueDate"] = None
        if data.get("expiryDate") == "":
            data["expiryDate"] = None
        if data.get("issuer") == "":
            data["issuer"] = None
        if data.get("certificationNumber") == "":
            data["certificationNumber"] = None
        
        r = conn.execute(text("""
            INSERT INTO userCertifications (userId, name, issuer, issueDate, expiryDate, certificationNumber, createdAt, updatedAt)
            VALUES (:uid, :name, :issuer, :issueDate, :expiryDate, :certificationNumber, NOW(), NOW())
        """), {"uid": current_user["id"], **data})
        return {"id": r.lastrowid}

@app.put("/profile/certifications/{item_id}")
async def update_cert(item_id: int, payload: CertUpsert, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        # 빈 문자열을 None으로 변환
        data = payload.model_dump()
        if data.get("issueDate") == "":
            data["issueDate"] = None
        if data.get("expiryDate") == "":
            data["expiryDate"] = None
        if data.get("issuer") == "":
            data["issuer"] = None
        if data.get("certificationNumber") == "":
            data["certificationNumber"] = None
        
        conn.execute(text("""
            UPDATE userCertifications
            SET name=:name, issuer=:issuer, issueDate=:issueDate, expiryDate=:expiryDate, certificationNumber=:certificationNumber, updatedAt=NOW()
            WHERE id=:id AND userId=:uid AND deletedAt IS NULL
        """), {"id": item_id, "uid": current_user["id"], **data})
    return {"updated": True}

@app.delete("/profile/certifications/{item_id}")
async def delete_cert(item_id: int, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        _soft_delete(conn, "userCertifications", item_id, current_user["id"])
    return {"deleted": True}

# ===== Projects =====
class ProjectUpsert(BaseModel):
    title: str
    role: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    description: Optional[str] = None
    technologies: Optional[str] = None
    achievement: Optional[str] = None
    url: Optional[str] = None

@app.get("/profile/projects")
async def list_projects(current_user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, title, role, startDate, endDate, description, technologies, achievement, url
            FROM userProjects
            WHERE userId = :uid AND deletedAt IS NULL
            ORDER BY startDate DESC
        """), {"uid": current_user["id"]}).fetchall()
        out = []
        for r in rows:
            m = r._mapping
            out.append({
                "id": m.get("id"),
                "title": m.get("title"),
                "role": m.get("role"),
                "startDate": m.get("startDate").strftime('%Y-%m-%d') if m.get("startDate") else None,
                "endDate": m.get("endDate").strftime('%Y-%m-%d') if m.get("endDate") else None,
                "description": m.get("description"),
                "technologies": m.get("technologies"),
                "achievement": m.get("achievement"),
                "url": m.get("url"),
            })
        return {"items": out}

@app.post("/profile/projects")
async def create_project(payload: ProjectUpsert, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        # 빈 문자열을 None으로 변환
        data = payload.model_dump()
        if data.get("startDate") == "":
            data["startDate"] = None
        if data.get("endDate") == "":
            data["endDate"] = None
        if data.get("role") == "":
            data["role"] = None
        if data.get("description") == "":
            data["description"] = None
        if data.get("technologies") == "":
            data["technologies"] = None
        if data.get("achievement") == "":
            data["achievement"] = None
        if data.get("url") == "":
            data["url"] = None
        
        r = conn.execute(text("""
            INSERT INTO userProjects (userId, title, role, startDate, endDate, description, technologies, achievement, url, createdAt, updatedAt)
            VALUES (:uid, :title, :role, :startDate, :endDate, :description, :technologies, :achievement, :url, NOW(), NOW())
        """), {"uid": current_user["id"], **data})
        return {"id": r.lastrowid}

@app.put("/profile/projects/{item_id}")
async def update_project(item_id: int, payload: ProjectUpsert, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        # 빈 문자열을 None으로 변환
        data = payload.model_dump()
        if data.get("startDate") == "":
            data["startDate"] = None
        if data.get("endDate") == "":
            data["endDate"] = None
        if data.get("role") == "":
            data["role"] = None
        if data.get("description") == "":
            data["description"] = None
        if data.get("technologies") == "":
            data["technologies"] = None
        if data.get("achievement") == "":
            data["achievement"] = None
        if data.get("url") == "":
            data["url"] = None
        
        conn.execute(text("""
            UPDATE userProjects
            SET title=:title, role=:role, startDate=:startDate, endDate=:endDate, description=:description, technologies=:technologies, achievement=:achievement, url=:url, updatedAt=NOW()
            WHERE id=:id AND userId=:uid AND deletedAt IS NULL
        """), {"id": item_id, "uid": current_user["id"], **data})
    return {"updated": True}

@app.delete("/profile/projects/{item_id}")
async def delete_project(item_id: int, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        _soft_delete(conn, "userProjects", item_id, current_user["id"])
    return {"deleted": True}

# ===== Strengths =====
class StrengthUpsert(BaseModel):
    category: Optional[str] = None
    strength: str
    description: Optional[str] = None

@app.get("/profile/strengths")
async def list_strengths(current_user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, category, strength, description
            FROM userStrengths
            WHERE userId = :uid AND deletedAt IS NULL
            ORDER BY category, id
        """), {"uid": current_user["id"]}).fetchall()
        out = []
        for r in rows:
            m = r._mapping
            out.append({
                "id": m.get("id"),
                "category": m.get("category"),
                "strength": m.get("strength"),
                "description": m.get("description"),
            })
        return {"items": out}

@app.post("/profile/strengths")
async def create_strength(payload: StrengthUpsert, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        r = conn.execute(text("""
            INSERT INTO userStrengths (userId, category, strength, description, createdAt, updatedAt)
            VALUES (:uid, :category, :strength, :description, NOW(), NOW())
        """), {"uid": current_user["id"], **payload.model_dump()})
        return {"id": r.lastrowid}

@app.put("/profile/strengths/{item_id}")
async def update_strength(item_id: int, payload: StrengthUpsert, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE userStrengths
            SET category=:category, strength=:strength, description=:description, updatedAt=NOW()
            WHERE id=:id AND userId=:uid AND deletedAt IS NULL
        """), {"id": item_id, "uid": current_user["id"], **payload.model_dump()})
    return {"updated": True}

@app.delete("/profile/strengths/{item_id}")
async def delete_strength(item_id: int, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        _soft_delete(conn, "userStrengths", item_id, current_user["id"])
    return {"deleted": True}

# ===== Reputations =====
class ReputationUpsert(BaseModel):
    target_user_id: int
    category: str
    rating: int
    comment: str

@app.get("/profile/reputations")
async def list_reputations(current_user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT r.id, r.rating, r.comment, r.category, r.createdAt, u.nickname AS fromName
            FROM userReputations r
            LEFT JOIN users u ON u.id = r.fromUserId
            WHERE r.userId = :uid AND r.deletedAt IS NULL
            ORDER BY r.createdAt DESC
        """), {"uid": current_user["id"]}).fetchall()
        out = []
        for r in rows:
            m = r._mapping
            out.append({
                "id": m.get("id"),
                "rating": m.get("rating"),
                "comment": m.get("comment"),
                "category": m.get("category"),
                "fromName": m.get("fromName") or "익명",
                "createdAt": m.get("createdAt").strftime('%Y-%m-%d') if m.get("createdAt") else None,
            })
        return {"items": out}

@app.post("/profile/reputations")
async def create_reputation(payload: ReputationUpsert, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        # 빈 문자열을 None으로 변환
        comment = payload.comment.strip() if payload.comment else None
        
        r = conn.execute(text("""
            INSERT INTO userReputations (userId, fromUserId, rating, comment, category, createdAt, updatedAt)
            VALUES (:target_user_id, :from_user_id, :rating, :comment, :category, NOW(), NOW())
        """), {
            "target_user_id": payload.target_user_id,
            "from_user_id": current_user["id"],
            "rating": payload.rating,
            "comment": comment,
            "category": payload.category
        })
        return {"id": r.lastrowid}

@app.delete("/profile/reputations/{item_id}")
async def delete_reputation(item_id: int, current_user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        # 작성자만 삭제 가능하도록 체크
        check = conn.execute(text("""
            SELECT fromUserId FROM userReputations 
            WHERE id = :id AND deletedAt IS NULL
        """), {"id": item_id}).first()
        
        if not check:
            raise HTTPException(status_code=404, detail="평판을 찾을 수 없습니다.")
        
        if check._mapping.get("fromUserId") != current_user["id"]:
            raise HTTPException(status_code=403, detail="본인이 작성한 평판만 삭제할 수 있습니다.")
        
        # fromUserId로 삭제 (userId가 아닌 fromUserId로 체크)
        r = conn.execute(text("""
            UPDATE userReputations
            SET deletedAt = NOW(), updatedAt = NOW()
            WHERE id = :id AND fromUserId = :uid AND deletedAt IS NULL
        """), {"id": item_id, "uid": current_user["id"]})
        
        if r.rowcount == 0:
            raise HTTPException(status_code=404, detail="평판을 찾을 수 없습니다.")
    return {"deleted": True}

# ===== 추천서 보관함 API =====
@app.get("/my-recommendations/sent")
async def my_recommendations_sent(current_user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT r.id, r.content, r.createdAt, u_to.nickname AS to_name
            FROM recommendation r
            JOIN users u_to ON u_to.id = r.toUserId
            WHERE r.deletedAt IS NULL AND r.fromUserId = :uid
            ORDER BY r.createdAt DESC
        """), {"uid": current_user["id"]}).fetchall()
    items = []
    for row in rows:
        m = row._mapping
        items.append({
            "id": m.get("id"),
            "content": m.get("content"),
            "created_at": m.get("createdAt").strftime("%Y-%m-%d %H:%M:%S") if m.get("createdAt") else "",
            "requester_name": m.get("to_name"),
        })
    return {"items": items}

# ===== 평판 보관함 API =====
@app.get("/my-reputations/sent")
async def my_reputations_sent(current_user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT 
                r.id, 
                r.rating, 
                r.comment, 
                r.category, 
                r.createdAt,
                u.nickname AS target_name,
                u.email AS target_email
            FROM userReputations r
            JOIN users u ON u.id = r.userId
            WHERE r.deletedAt IS NULL AND r.fromUserId = :uid
            ORDER BY r.createdAt DESC
        """), {"uid": current_user["id"]}).fetchall()
    items = []
    for row in rows:
        m = row._mapping
        items.append({
            "id": m.get("id"),
            "rating": m.get("rating"),
            "comment": m.get("comment"),
            "category": m.get("category"),
            "target_name": m.get("target_name"),
            "target_email": m.get("target_email"),
            "created_at": m.get("createdAt").strftime("%Y-%m-%d %H:%M:%S") if m.get("createdAt") else "",
        })
    return {"items": items}

# ===== 권한 관리 API =====
class GrantPermissionRequest(BaseModel):
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    allowed_email: str
    note: Optional[str] = None

class RevokePermissionRequest(BaseModel):
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    allowed_email: str

@app.post("/grant-detail-permission")
async def grant_detail_permission(payload: GrantPermissionRequest, current_user: dict = Depends(get_current_user)):
    """상세정보 조회 권한 부여"""
    with engine.begin() as conn:
        # user_id 또는 user_email로 사용자 찾기
        user_id = payload.user_id
        owner_email = None
        
        if not user_id and payload.user_email:
            # 이메일 공백 제거 및 소문자 변환
            email_clean = payload.user_email.strip().lower()
            user_row = conn.execute(text("""
                SELECT id, email FROM users WHERE LOWER(TRIM(email)) = :email AND deletedAt IS NULL
            """), {"email": email_clean}).first()
            if not user_row:
                raise HTTPException(status_code=404, detail=f"이메일 '{payload.user_email}'로 사용자를 찾을 수 없습니다.")
            user_id = user_row._mapping.get("id")
            owner_email = user_row._mapping.get("email")
        elif not user_id:
            # 둘 다 없으면 현재 로그인한 사용자 사용
            user_id = current_user["id"]
            # 현재 사용자의 이메일 가져오기
            user_row = conn.execute(text("""
                SELECT email FROM users WHERE id = :uid AND deletedAt IS NULL
            """), {"uid": user_id}).first()
            if user_row:
                owner_email = user_row._mapping.get("email")
        
        # owner_email이 없으면 payload.user_email 사용
        if not owner_email:
            if payload.user_email:
                owner_email = payload.user_email.strip().lower()
            else:
                raise HTTPException(status_code=400, detail="권한 소유자 이메일을 확인할 수 없습니다.")
        
        # 중복 체크 (deletedAt이 NULL인 것만) - ownerEmail 기준으로 체크
        existing = conn.execute(text("""
            SELECT id FROM userDetailPermissions 
            WHERE ownerEmail = :owner_email AND allowedEmail = :email AND deletedAt IS NULL
        """), {"owner_email": owner_email, "email": payload.allowed_email}).first()
        
        if existing:
            raise HTTPException(status_code=409, detail="이미 권한이 부여되어 있습니다.")
        
        # 권한 부여
        conn.execute(text("""
            INSERT INTO userDetailPermissions (userId, ownerEmail, allowedEmail, note, createdAt, updatedAt)
            VALUES (:uid, :owner_email, :email, :note, NOW(), NOW())
        """), {
            "uid": user_id,
            "owner_email": owner_email,
            "email": payload.allowed_email,
            "note": payload.note
        })
    
    return {"message": f"{payload.allowed_email}에게 상세정보 조회 권한을 부여했습니다.", "success": True}

@app.post("/revoke-detail-permission")
async def revoke_detail_permission(payload: RevokePermissionRequest, current_user: dict = Depends(get_current_user)):
    """상세정보 조회 권한 취소"""
    with engine.begin() as conn:
        # user_id 또는 user_email로 사용자 찾기
        user_id = payload.user_id
        if not user_id and payload.user_email:
            # 이메일 공백 제거 및 소문자 변환
            email_clean = payload.user_email.strip().lower()
            user_row = conn.execute(text("""
                SELECT id FROM users WHERE LOWER(TRIM(email)) = :email AND deletedAt IS NULL
            """), {"email": email_clean}).first()
            if not user_row:
                raise HTTPException(status_code=404, detail=f"이메일 '{payload.user_email}'로 사용자를 찾을 수 없습니다.")
            user_id = user_row._mapping.get("id")
        elif not user_id:
            # 둘 다 없으면 현재 로그인한 사용자 사용
            user_id = current_user["id"]
        
        # owner_email 가져오기
        owner_email = None
        if payload.user_email:
            owner_email = payload.user_email.strip().lower()
        elif user_id:
            user_row = conn.execute(text("""
                SELECT email FROM users WHERE id = :uid AND deletedAt IS NULL
            """), {"uid": user_id}).first()
            if user_row:
                owner_email = user_row._mapping.get("email")
        
        if not owner_email:
            raise HTTPException(status_code=400, detail="권한 소유자 이메일을 확인할 수 없습니다.")
        
        # 권한 취소 (soft delete) - ownerEmail 기준으로 체크
        r = conn.execute(text("""
            UPDATE userDetailPermissions
            SET deletedAt = NOW(), updatedAt = NOW()
            WHERE ownerEmail = :owner_email AND allowedEmail = :email AND deletedAt IS NULL
        """), {"owner_email": owner_email, "email": payload.allowed_email})
        
        if r.rowcount == 0:
            raise HTTPException(status_code=404, detail="권한을 찾을 수 없습니다.")
    
    return {"message": f"{payload.allowed_email}의 조회 권한을 취소했습니다.", "success": True}

@app.get("/my-permissions/{user_id}")
async def get_my_permissions(user_id: int, user_email: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """부여한 권한 목록 조회"""
    with engine.connect() as conn:
        # user_id가 0이면 user_email로 조회
        actual_user_id = user_id
        if user_id == 0 and user_email:
            # 이메일 공백 제거 및 소문자 변환
            email_clean = user_email.strip().lower()
            user_row = conn.execute(text("""
                SELECT id FROM users WHERE LOWER(TRIM(email)) = :email AND deletedAt IS NULL
            """), {"email": email_clean}).first()
            if user_row:
                actual_user_id = user_row._mapping.get("id")
            else:
                return {"permissions": [], "total": 0}
        
        # ownerEmail 가져오기
        owner_email = None
        if user_email:
            owner_email = user_email.strip().lower()
        elif actual_user_id:
            user_row = conn.execute(text("""
                SELECT email FROM users WHERE id = :uid AND deletedAt IS NULL
            """), {"uid": actual_user_id}).first()
            if user_row:
                owner_email = user_row._mapping.get("email")
        
        if not owner_email:
            return {"permissions": [], "total": 0}
        
        rows = conn.execute(text("""
            SELECT allowedEmail, note, createdAt
            FROM userDetailPermissions
            WHERE ownerEmail = :owner_email AND deletedAt IS NULL
            ORDER BY createdAt DESC
        """), {"owner_email": owner_email}).fetchall()
        
        permissions = []
        for row in rows:
            m = row._mapping
            permissions.append({
                "allowedEmail": m.get("allowedEmail"),
                "note": m.get("note"),
                "createdAt": m.get("createdAt").strftime("%Y-%m-%d %H:%M:%S") if m.get("createdAt") else None
            })
        
        return {"permissions": permissions, "total": len(permissions)}

@app.get("/check-detail-permission/{user_id}")
async def check_detail_permission(user_id: int, requester_email: Optional[str] = None):
    """상세정보 조회 권한 확인"""
    if not requester_email:
        return {"hasPermission": False, "reason": "요청자 이메일이 필요합니다."}
    
    with engine.connect() as conn:
        # 사용자 이메일 가져오기
        user_row = conn.execute(text("""
            SELECT email FROM users WHERE id = :uid AND deletedAt IS NULL
        """), {"uid": user_id}).first()
        
        if not user_row:
            return {"hasPermission": False, "reason": "사용자를 찾을 수 없습니다."}
        
        owner_email = user_row._mapping.get("email")
        
        # 권한 확인 - ownerEmail 기준으로 체크
        perm = conn.execute(text("""
            SELECT note FROM userDetailPermissions
            WHERE ownerEmail = :owner_email AND allowedEmail = :email AND deletedAt IS NULL
        """), {"owner_email": owner_email, "email": requester_email}).first()
        
        if perm:
            return {
                "hasPermission": True,
                "reason": "권한 부여됨",
                "note": perm._mapping.get("note")
            }
        else:
            return {"hasPermission": False, "reason": "권한 없음"}

# ===== 추천서 공유 링크 생성 API =====
@app.get("/share-recommendation/{recommendation_id}")
async def share_recommendation(recommendation_id: int):
    """추천서 공유 링크를 생성합니다."""
    try:
        with engine.connect() as conn:
            check_sql = text("""
                SELECT id, content, fromUserId, toUserId
                FROM recommendation 
                WHERE id = :ref_id AND deletedAt IS NULL
            """)
            ref = conn.execute(check_sql, {"ref_id": recommendation_id}).first()
            
            if not ref:
                raise HTTPException(status_code=404, detail="추천서를 찾을 수 없습니다.")
            
            # 공유 토큰 생성 (24시간 유효)
            share_token = create_access_token({
                "recommendation_id": recommendation_id,
                "type": "share"
            })
            
            share_url = f"http://localhost:3000/shared/{share_token}"
            
            return {
                "share_url": share_url,
                "recommendation_id": recommendation_id
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"공유 링크 생성 오류: {e}")
        raise HTTPException(status_code=500, detail="공유 링크 생성 실패")

# ===== 공유된 추천서 조회 API =====
@app.get("/shared-recommendation/{share_token}")
async def get_shared_recommendation(share_token: str):
    """공유 토큰으로 추천서를 조회합니다."""
    try:
        # 토큰 검증
        payload = jwt.decode(share_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        recommendation_id = payload.get("recommendation_id")
        token_type = payload.get("type")
        
        if token_type != "share" or not recommendation_id:
            raise HTTPException(status_code=401, detail="유효하지 않은 공유 링크입니다.")
        
        with engine.connect() as conn:
            ref_sql = text("""
                SELECT 
                    r.id, r.content, r.createdAt,
                    u_from.nickname AS from_name,
                    u_to.nickname AS to_name
                FROM recommendation r
                JOIN users u_from ON u_from.id = r.fromUserId
                JOIN users u_to ON u_to.id = r.toUserId
                WHERE r.id = :ref_id AND r.deletedAt IS NULL
            """)
            ref = conn.execute(ref_sql, {"ref_id": recommendation_id}).first()
            
            if not ref:
                raise HTTPException(status_code=404, detail="추천서를 찾을 수 없습니다.")
            
            return {
                "id": ref._mapping.get("id"),
                "content": ref._mapping.get("content"),
                "created_at": ref._mapping.get("createdAt").strftime('%Y-%m-%d') if ref._mapping.get("createdAt") else "",
                "from_name": ref._mapping.get("from_name"),
                "to_name": ref._mapping.get("to_name")
            }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="공유 링크가 만료되었습니다.")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 공유 링크입니다.")
    except Exception as e:
        print(f"공유 추천서 조회 오류: {e}")
        raise HTTPException(status_code=500, detail="추천서 조회 실패")

# ===== PDF 다운로드 API =====
@app.get("/download-pdf/{recommendation_id}")
async def download_pdf(recommendation_id: int, current_user: dict = Depends(get_current_user)):
    """추천서를 PDF로 다운로드합니다."""
    try:
        with engine.connect() as conn:
            ref_sql = text("""
                SELECT 
                    r.id, r.content, r.createdAt, r.signatureData,
                    u_from.nickname AS from_name,
                    u_to.nickname AS to_name
                FROM recommendation r
                JOIN users u_from ON u_from.id = r.fromUserId
                JOIN users u_to ON u_to.id = r.toUserId
                WHERE r.id = :ref_id AND r.deletedAt IS NULL
            """)
            ref = conn.execute(ref_sql, {"ref_id": recommendation_id}).first()
            
            if not ref:
                raise HTTPException(status_code=404, detail="추천서를 찾을 수 없습니다.")
            
            # 서명 데이터 파싱
            signature_data = None
            if ref._mapping.get("signatureData"):
                try:
                    signature_data = json.loads(ref._mapping.get("signatureData"))
                except:
                    pass
            
            # PDF 생성 (Canvas 방식 - 한글 처리 개선)
            buffer = io.BytesIO()
            c = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4
            
            # 한글 폰트 등록
            font_registered = False
            try:
                # Windows
                pdfmetrics.registerFont(TTFont('Korean', 'C:/Windows/Fonts/malgun.ttf'))
                font_name = 'Korean'
                font_registered = True
            except:
                try:
                    # Windows - 굴림체
                    pdfmetrics.registerFont(TTFont('Korean', 'C:/Windows/Fonts/gulim.ttc'))
                    font_name = 'Korean'
                    font_registered = True
                except:
                    try:
                        # Mac
                        pdfmetrics.registerFont(TTFont('Korean', '/System/Library/Fonts/AppleGothic.ttf'))
                        font_name = 'Korean'
                        font_registered = True
                    except:
                        # 폰트 등록 실패
                        font_name = 'Helvetica'
                        font_registered = False
            
            # 제목
            c.setFont(font_name if font_registered else 'Helvetica-Bold', 24)
            title = "추천서" if font_registered else "Recommendation Letter"
            c.drawCentredString(width / 2, height - 80, title)
            
            # 본문
            c.setFont(font_name if font_registered else 'Helvetica', 11)
            
            # 내용을 줄바꿈 처리
            content = ref._mapping.get("content", "")
            lines = content.split('\n')
            
            y_position = height - 140
            line_height = 18
            max_width = width - 100
            signature_space = 120 if signature_data else 0  # 서명 공간 확보
            signature_line_index = -1  # 서명: 줄의 인덱스 추적
            signature_y_position = None  # 서명 줄의 y 위치 저장
            signature_line_text = None  # 서명 줄의 텍스트 저장
            
            for idx, line in enumerate(lines):
                line_stripped = line.strip()
                
                # 빈 줄 처리
                if not line_stripped:
                    y_position -= line_height / 2
                    continue
                
                # 가운데 정렬이 필요한 줄 체크 (날짜, 작성자 정보)
                is_centered = (
                    line_stripped.startswith('작성자:') or 
                    line_stripped.startswith('소속/직위:') or 
                    line_stripped.startswith('연락처:') or
                    line_stripped.startswith('서명:') or
                    line_stripped == '추천서' or
                    bool(re.match(r'^\d{4}년\s+\d{1,2}월\s+\d{1,2}일$', line_stripped))
                )
                
                # 서명: 줄 추적
                if line_stripped.startswith('서명:'):
                    signature_line_index = idx
                    signature_y_position = y_position  # 서명 줄의 y 위치 저장
                    signature_line_text = line_stripped  # 서명 줄 텍스트 저장
                
                # 긴 줄 자동 줄바꿈
                if font_registered:
                    # 한글 폰트가 등록된 경우
                    words = line_stripped
                    current_line = ""
                    for char in words:
                        test_line = current_line + char
                        text_width = c.stringWidth(test_line, font_name, 11)
                        if text_width > max_width:
                            if current_line:
                                if is_centered:
                                    c.drawCentredString(width / 2, y_position, current_line)
                                else:
                                    c.drawString(50, y_position, current_line)
                                y_position -= line_height
                                if y_position < (50 + signature_space):
                                    c.showPage()
                                    c.setFont(font_name, 11)
                                    y_position = height - 50
                                current_line = char
                        else:
                            current_line = test_line
                    if current_line:
                        if is_centered:
                            c.drawCentredString(width / 2, y_position, current_line)
                        else:
                            c.drawString(50, y_position, current_line)
                        y_position -= line_height
                else:
                    # 폰트 등록 실패 시 영문만
                    if is_centered:
                        c.drawCentredString(width / 2, y_position, line_stripped[:100])
                    else:
                        c.drawString(50, y_position, line_stripped[:100])
                    y_position -= line_height
                
                # 서명: 줄 바로 다음에 서명 이미지 추가
                if signature_data and idx == signature_line_index:
                    y_position -= 10  # 약간의 여백
                
                # 페이지 넘김
                if y_position < (50 + signature_space):
                    c.showPage()
                    c.setFont(font_name if font_registered else 'Helvetica', 11)
                    y_position = height - 50
            
            # 서명 이미지 추가 ('draw', 'image', 'upload' 모두 허용)
            if signature_data and signature_data.get('type') in ['draw', 'image', 'upload']:
                try:
                    # Base64 이미지 디코딩
                    sig_data = signature_data.get('data', '')
                    # data:image/png;base64, 접두사 제거
                    if ',' in sig_data:
                        sig_data = sig_data.split(',', 1)[1]
                    
                    img_data = base64.b64decode(sig_data)
                    img_buffer = io.BytesIO(img_data)
                    img = ImageReader(img_buffer)
                    
                    # 서명 이미지 크기 및 위치 계산
                    sig_width = 120
                    sig_height = 50
                    
                    # "서명:" 텍스트 오른쪽에 배치
                    if signature_y_position is not None and signature_line_text is not None:
                        # 가운데 정렬된 "서명:" 텍스트의 위치 계산
                        center_x = width / 2
                        # "서명: _____________" 전체 텍스트 너비
                        text_width = c.stringWidth(signature_line_text, font_name if font_registered else 'Helvetica', 11)
                        # 가운데 정렬된 텍스트의 끝 x 위치
                        text_end_x = center_x + (text_width / 2)
                        # 서명 이미지는 텍스트 끝에서 약간 왼쪽 (밑줄 위치)
                        # "서명: "만의 너비를 계산하여 그 오른쪽에 배치
                        sig_label_width = c.stringWidth("서명: ", font_name if font_registered else 'Helvetica', 11)
                        text_start_x = center_x - (text_width / 2)
                        sig_x = text_start_x + sig_label_width + 5  # "서명:" 바로 오른쪽
                        sig_y = signature_y_position - sig_height / 2  # 텍스트와 수직 중앙 정렬
                    else:
                        # 서명 줄을 찾지 못한 경우 기본 위치 (가운데)
                        sig_x = (width - sig_width) / 2
                        sig_y = y_position - sig_height - 10
                    
                    # 공간이 부족하면 새 페이지
                    if sig_y < 50:
                        c.showPage()
                        c.setFont(font_name if font_registered else 'Helvetica', 11)
                        sig_y = height - sig_height - 100
                    
                    # 서명 이미지 그리기
                    c.drawImage(img, sig_x, sig_y, width=sig_width, height=sig_height, preserveAspectRatio=True, mask='auto')
                    
                    print(f"서명 이미지 PDF에 추가됨 (위치: {sig_x}, {sig_y}, 타입: {signature_data.get('type')})")
                except Exception as e:
                    print(f"서명 이미지 추가 오류: {e}")
                    import traceback
                    traceback.print_exc()
            elif signature_data and signature_data.get('type') == 'text':
                try:
                    # 텍스트 서명 추가 - "서명:" 오른쪽에 배치
                    sig_text = signature_data.get('data', '')
                    c.setFont(font_name if font_registered else 'Helvetica', 14)
                    
                    if signature_y_position is not None and signature_line_text is not None:
                        # 가운데 정렬된 "서명:" 텍스트의 위치 계산
                        center_x = width / 2
                        text_width = c.stringWidth(signature_line_text, font_name if font_registered else 'Helvetica', 11)
                        sig_label_width = c.stringWidth("서명: ", font_name if font_registered else 'Helvetica', 11)
                        text_start_x = center_x - (text_width / 2)
                        sig_x = text_start_x + sig_label_width + 5
                        c.drawString(sig_x, signature_y_position, sig_text)
                    else:
                        c.drawString(width - 200, y_position - 40, sig_text)
                    
                    print(f"텍스트 서명 PDF에 추가됨")
                except Exception as e:
                    print(f"텍스트 서명 추가 오류: {e}")
            
            c.save()
            buffer.seek(0)
            
            # 파일명 생성
            to_name = ref._mapping.get('to_name', 'user')
            filename = f"recommendation_{to_name}_{recommendation_id}.pdf"
            filename_encoded = quote(filename.encode('utf-8'))
            
            return StreamingResponse(
                buffer,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename*=UTF-8''{filename_encoded}"
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"PDF 생성 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF 생성 실패: {str(e)}")

# ===== 추천서 양식 관리 API =====
class TemplateCreate(BaseModel):
    title: str
    content: str
    description: Optional[str] = None

class TemplateUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    description: Optional[str] = None

@app.post("/templates")
async def create_template(template: TemplateCreate, current_user: dict = Depends(get_current_user)):
    """추천서 양식을 생성합니다."""
    try:
        with engine.connect() as conn:
            insert_sql = text("""
                INSERT INTO recommendationTemplates (title, content, description, createdAt, updatedAt)
                VALUES (:title, :content, :description, NOW(), NOW())
            """)
            result = conn.execute(insert_sql, {
                "title": template.title,
                "content": template.content,
                "description": template.description
            })
            template_id = result.lastrowid
            conn.commit()
            
            return {
                "id": template_id,
                "title": template.title,
                "message": "양식이 생성되었습니다."
            }
    except Exception as e:
        print(f"양식 생성 오류: {e}")
        raise HTTPException(status_code=500, detail="양식 생성 실패")

@app.get("/templates")
async def get_templates():
    """모든 추천서 양식 목록을 조회합니다."""
    try:
        with engine.connect() as conn:
            templates_sql = text("""
                SELECT id, title, description, createdAt
                FROM recommendationTemplates
                WHERE deletedAt IS NULL
                ORDER BY createdAt DESC
            """)
            templates = []
            for row in conn.execute(templates_sql).fetchall():
                templates.append({
                    "id": row._mapping.get("id"),
                    "title": row._mapping.get("title"),
                    "description": row._mapping.get("description"),
                    "created_at": row._mapping.get("createdAt").strftime('%Y-%m-%d') if row._mapping.get("createdAt") else ""
                })
            
            return {"templates": templates}
    except Exception as e:
        print(f"양식 목록 조회 오류: {e}")
        raise HTTPException(status_code=500, detail="양식 목록 조회 실패")

@app.get("/templates/{template_id}")
async def get_template(template_id: int):
    """특정 추천서 양식을 조회합니다."""
    try:
        with engine.connect() as conn:
            template_sql = text("""
                SELECT id, title, content, description, createdAt
                FROM recommendationTemplates
                WHERE id = :template_id AND deletedAt IS NULL
            """)
            row = conn.execute(template_sql, {"template_id": template_id}).first()
            
            if not row:
                raise HTTPException(status_code=404, detail="양식을 찾을 수 없습니다.")
            
            return {
                "id": row._mapping.get("id"),
                "title": row._mapping.get("title"),
                "content": row._mapping.get("content"),
                "description": row._mapping.get("description"),
                "created_at": row._mapping.get("createdAt").strftime('%Y-%m-%d') if row._mapping.get("createdAt") else ""
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"양식 조회 오류: {e}")
        raise HTTPException(status_code=500, detail="양식 조회 실패")

@app.patch("/templates/{template_id}")
async def update_template(template_id: int, template: TemplateUpdate, current_user: dict = Depends(get_current_user)):
    """추천서 양식을 수정합니다."""
    try:
        with engine.connect() as conn:
            # 기존 양식 확인
            check_sql = text("""
                SELECT id FROM recommendationTemplates
                WHERE id = :template_id AND deletedAt IS NULL
            """)
            existing = conn.execute(check_sql, {"template_id": template_id}).first()
            
            if not existing:
                raise HTTPException(status_code=404, detail="양식을 찾을 수 없습니다.")
            
            # 업데이트할 필드 구성
            update_fields = []
            params = {"template_id": template_id}
            
            if template.title is not None:
                update_fields.append("title = :title")
                params["title"] = template.title
            if template.content is not None:
                update_fields.append("content = :content")
                params["content"] = template.content
            if template.description is not None:
                update_fields.append("description = :description")
                params["description"] = template.description
            
            if not update_fields:
                return {"message": "수정할 내용이 없습니다."}
            
            update_fields.append("updatedAt = NOW()")
            update_sql = text(f"""
                UPDATE recommendationTemplates
                SET {', '.join(update_fields)}
                WHERE id = :template_id
            """)
            
            conn.execute(update_sql, params)
            conn.commit()
            
            return {"message": "양식이 수정되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"양식 수정 오류: {e}")
        raise HTTPException(status_code=500, detail="양식 수정 실패")

@app.delete("/templates/{template_id}")
async def delete_template(template_id: int, current_user: dict = Depends(get_current_user)):
    """추천서 양식을 삭제합니다."""
    try:
        with engine.connect() as conn:
            delete_sql = text("""
                UPDATE recommendationTemplates
                SET deletedAt = NOW()
                WHERE id = :template_id AND deletedAt IS NULL
            """)
            result = conn.execute(delete_sql, {"template_id": template_id})
            conn.commit()
            
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="양식을 찾을 수 없습니다.")
            
            return {"message": "양식이 삭제되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"양식 삭제 오류: {e}")
        raise HTTPException(status_code=500, detail="양식 삭제 실패")

# ===== 서명 페이지 라우트 =====
@app.get("/signature")
async def signature_page():
    """서명 등록 페이지를 제공합니다."""
    signature_file = os.path.join(STATIC_DIR, "signature.html")
    if not os.path.exists(signature_file):
        raise HTTPException(status_code=404, detail=f"서명 페이지를 찾을 수 없습니다: {signature_file}")
    return FileResponse(signature_file)

# ===== 사용자 서명 관리 API =====
class SignatureCreate(BaseModel):
    signature_data: str  # Base64 인코딩된 이미지 또는 서명 텍스트
    signature_type: str = "image"  # "image" 또는 "text"

@app.post("/user-signature")
async def create_or_update_signature(signature: SignatureCreate, current_user: dict = Depends(get_current_user)):
    """사용자의 서명을 등록하거나 업데이트합니다."""
    try:
        user_id = current_user.get("id")
        
        with engine.connect() as conn:
            # 기존 서명이 있는지 확인
            check_sql = text("""
                SELECT id FROM userSignatures
                WHERE userId = :user_id AND deletedAt IS NULL
                LIMIT 1
            """)
            existing = conn.execute(check_sql, {"user_id": user_id}).first()
            
            if existing:
                # 업데이트
                update_sql = text("""
                    UPDATE userSignatures
                    SET signatureData = :signature_data,
                        signatureType = :signature_type,
                        updatedAt = NOW()
                    WHERE userId = :user_id AND deletedAt IS NULL
                """)
                conn.execute(update_sql, {
                    "user_id": user_id,
                    "signature_data": signature.signature_data,
                    "signature_type": signature.signature_type
                })
                message = "서명이 수정되었습니다."
            else:
                # 새로 생성
                insert_sql = text("""
                    INSERT INTO userSignatures (userId, signatureData, signatureType, createdAt, updatedAt)
                    VALUES (:user_id, :signature_data, :signature_type, NOW(), NOW())
                """)
                conn.execute(insert_sql, {
                    "user_id": user_id,
                    "signature_data": signature.signature_data,
                    "signature_type": signature.signature_type
                })
                message = "서명이 등록되었습니다."
            
            conn.commit()
            
            return {
                "success": True,
                "message": message,
                "user_id": user_id
            }
    except Exception as e:
        print(f"서명 등록/수정 오류: {e}")
        raise HTTPException(status_code=500, detail="서명 등록/수정 실패")

@app.get("/user-signature/{user_id}")
async def get_signature(user_id: int):
    """특정 사용자의 서명을 조회합니다."""
    try:
        with engine.connect() as conn:
            signature_sql = text("""
                SELECT id, signatureData, signatureType, createdAt
                FROM userSignatures
                WHERE userId = :user_id AND deletedAt IS NULL
                LIMIT 1
            """)
            row = conn.execute(signature_sql, {"user_id": user_id}).first()
            
            if not row:
                return {
                    "exists": False,
                    "message": "등록된 서명이 없습니다."
                }
            
            return {
                "exists": True,
                "signature_data": row._mapping.get("signatureData"),
                "signature_type": row._mapping.get("signatureType"),
                "created_at": row._mapping.get("createdAt").strftime('%Y-%m-%d') if row._mapping.get("createdAt") else ""
            }
    except Exception as e:
        print(f"서명 조회 오류: {e}")
        raise HTTPException(status_code=500, detail="서명 조회 실패")

@app.get("/my-signature")
async def get_my_signature(current_user: dict = Depends(get_current_user)):
    """현재 로그인한 사용자의 서명을 조회합니다."""
    try:
        user_id = current_user.get("id")
        with engine.connect() as conn:
            signature_sql = text("""
                SELECT id, signatureData, signatureType, createdAt
                FROM userSignatures
                WHERE userId = :user_id AND deletedAt IS NULL
                LIMIT 1
            """)
            row = conn.execute(signature_sql, {"user_id": user_id}).first()
            
            if not row:
                return {
                    "exists": False,
                    "message": "등록된 서명이 없습니다."
                }
            
            return {
                "exists": True,
                "signature_data": row._mapping.get("signatureData"),
                "signature_type": row._mapping.get("signatureType"),
                "created_at": row._mapping.get("createdAt").strftime('%Y-%m-%d') if row._mapping.get("createdAt") else ""
            }
    except Exception as e:
        print(f"서명 조회 오류: {e}")
        raise HTTPException(status_code=500, detail="서명 조회 실패")

@app.delete("/user-signature")
async def delete_signature(current_user: dict = Depends(get_current_user)):
    """현재 로그인한 사용자의 서명을 삭제합니다."""
    try:
        user_id = current_user.get("id")
        
        with engine.connect() as conn:
            delete_sql = text("""
                UPDATE userSignatures
                SET deletedAt = NOW()
                WHERE userId = :user_id AND deletedAt IS NULL
            """)
            result = conn.execute(delete_sql, {"user_id": user_id})
            conn.commit()
            
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="등록된 서명이 없습니다.")
            
            return {"message": "서명이 삭제되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"서명 삭제 오류: {e}")
        raise HTTPException(status_code=500, detail="서명 삭제 실패")

# ===== 추천서 품질 평가 API =====
class EvaluationRequest(BaseModel):
    recommendation_text: str

class EvaluationResponse(BaseModel):
    scores: dict  # 5가지 지표 점수 (1-5)
    improvements: List[dict]  # 개선사항 리스트

@app.post("/evaluate-recommendation", response_model=EvaluationResponse)
async def evaluate_recommendation(request: EvaluationRequest):
    """
    추천서를 5가지 지표로 평가하고 개선사항을 제안합니다. (기존 evals 시스템 사용)
    
    평가 지표 (NLG 인간평가 논문 기준):
    - accuracy: 정확성 (사실 일치성, 허위 정보 없음, 과장되지 않은 진술)
    - professionalism: 전문성 (문법적 안정성, 적절한 문체, 전문적인 어투)
    - coherence: 논리성/구조 (논리적 흐름, 문단 간 연결성, 구조적 일관성)
    - personalization: 개인화 (지원자 특화 사례, 구체적 근거, 고유한 특성)
    - persuasiveness: 설득력 (명확한 추천 의사, 효과적 어필, 신뢰할 수 있는 사례)
    """
    print("=== 추천서 평가 요청 받음 (evals 시스템) ===")
    print(f"추천서 길이: {len(request.recommendation_text)} 자")
    
    try:
        # OpenAI API Key 확인
        if not openai_api_key:
            raise HTTPException(
                status_code=503,
                detail="평가 시스템을 사용할 수 없습니다. OPENAI_API_KEY가 설정되지 않았습니다."
            )
        
        # RecoEvaluator 인스턴스 생성
        print("RecoEvaluator 초기화...")
        evaluator = RecoEvaluator(
            model="gpt-4",
            temperature=0.3
        )
        
        # 추천서 데이터 준비
        recommendation_data = {
            "id": 0,  # 임시 ID
            "text": request.recommendation_text,
            "candidate": "Unknown",
            "author": "Unknown",
            "created_at": datetime.now().strftime('%Y-%m-%d')
        }
        
        # 평가 실행
        print("평가 실행 중...")
        result = evaluator.evaluate_single_recommendation(recommendation_data)
        
        # 점수 딕셔너리 생성 (한글 라벨)
        scores = {
            "정확성": result['scores']['accuracy'],
            "전문성": result['scores']['professionalism'],
            "논리성": result['scores']['coherence'],
            "개인화": result['scores']['personalization'],
            "설득력": result['scores']['persuasiveness']
        }
        
        # 개선사항 추출 (평균 95점 미만이면 개선사항 표시)
        improvements = []
        metrics_map = {
            "accuracy": "정확성",
            "professionalism": "전문성",
            "coherence": "논리성",
            "personalization": "개인화",
            "persuasiveness": "설득력"
        }
        
        # 평균 점수가 4.75 미만(95점 미만)인 경우에만 개선사항 생성
        average_score = result['average_score']
        
        if average_score < 4.75:
            # GPT 응답에서 개선사항 추출
            raw_response = result.get('raw_response', '')
            response_lines = raw_response.split('\n')
            
            # 5점이 아닌 항목들에 대해 개선사항 생성 (낮은 점수 우선)
            sorted_scores = sorted(result['scores'].items(), key=lambda x: x[1])
            
            for key, score in sorted_scores:
                if score < 5:  # 5점이 아닌 항목
                    label = metrics_map[key]
                    
                    # 해당 라인 찾기
                    reason = ""
                    for line in response_lines:
                        if label in line or key.lower() in line.lower():
                            # "정확성: 4점 - 이유" 형태에서 이유 추출
                            parts = line.split('-', 1)
                            if len(parts) > 1:
                                reason = parts[1].strip()
                            break
                    
                    if not reason:
                        reason = f"현재 {score}점입니다"
                    
                    # 개선방안 생성
                    improvement_suggestions = {
                        "정확성": "구체적인 사실과 데이터를 추가하고, 검증 가능한 정보를 포함하세요.",
                        "전문성": "문법을 재확인하고, 전문적인 어투를 일관되게 사용하세요.",
                        "논리성": "도입-전개-결론 구조를 명확히 하고, 문단 간 연결을 강화하세요.",
                        "개인화": "지원자의 고유한 사례와 구체적인 성과(수치, 날짜)를 추가하세요.",
                        "설득력": "명확한 추천 의사를 표현하고, 인상적인 사례로 강조하세요."
                    }
                    
                    improvements.append({
                        "metric": label,
                        "score": score,
                        "reason": reason,
                        "improvement": improvement_suggestions.get(label, "더욱 향상시킬 수 있습니다.")
                    })
        
        print(f"평가 완료 - 평균 점수: {result['average_score']:.1f}")
        print(f"퍼센트: {result['percentage']:.1f}%")
        print(f"개선사항 {len(improvements)}개 발견")
        
        return {
            "scores": scores,
            "improvements": improvements
        }
        
    except Exception as e:
        print(f"=== 평가 오류 ===")
        print(f"에러 타입: {type(e).__name__}")
        print(f"에러 메시지: {str(e)}")
        import traceback
        print(f"스택 트레이스:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"추천서 평가 실패: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
