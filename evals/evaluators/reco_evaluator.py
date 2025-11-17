"""
추천서 자동 평가 Evaluator
NLG 인간평가 논문 기준 (정확성, 전문성, 논리성/구조, 개인화, 설득력)
"""

# ⚠️ 중요: evals import 전에 환경 변수를 먼저 로드해야 합니다
import os
from dotenv import load_dotenv

# .env 파일 로드 (프로젝트 루트의 .env 파일)
# Collyai 디렉토리의 .env 파일 경로 지정
env_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Collyai', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f"✅ .env 파일 로드 완료: {env_path}")
else:
    # 프로젝트 루트의 .env 파일 시도
    load_dotenv()
    print("✅ 기본 .env 파일 로드 시도")

# OPENAI_API_KEY 확인
if not os.getenv("OPENAI_API_KEY"):
    print("⚠️  Warning: OPENAI_API_KEY가 설정되지 않았습니다.")
    print("   Collyai/.env 파일에 OPENAI_API_KEY가 있는지 확인하세요.")

import re
import csv
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

# OpenAI Evals imports (선택사항)
try:
    from evals.api import CompletionFn
    from evals.elsuite.basic.match import Match
    from evals.record import RecorderBase
    EVALS_AVAILABLE = True
except ImportError:
    # OpenAI evals 프레임워크 없이 직접 OpenAI API 사용 (정상 동작)
    EVALS_AVAILABLE = False


class RecoEvaluator:
    """추천서 자동 평가 클래스"""
    
    def __init__(
        self,
        completion_fn: Optional[Any] = None,
        model: str = "gpt-4",
        temperature: float = 0.3,
        output_dir: str = "eval_results"
    ):
        self.completion_fn = completion_fn
        self.model = model
        self.temperature = temperature
        self.output_dir = output_dir
        
        # 평가 기준 정의
        self.criteria = {
            "accuracy": "정확성 (사실 일치성, 허위 정보 없음, 과장되지 않은 진술)",
            "professionalism": "전문성 (문법적 안정성, 적절한 문체, 전문적인 어투)",
            "coherence": "논리성/구조 (논리적 흐름, 문단 간 연결성, 구조적 일관성)",
            "personalization": "개인화 (지원자 특화 사례, 구체적 근거, 고유한 특성)",
            "persuasiveness": "설득력 (명확한 추천 의사, 효과적 어필, 신뢰할 수 있는 사례)"
        }
        
        # 결과 저장 디렉토리 생성
        os.makedirs(self.output_dir, exist_ok=True)
    
    def fetch_recommendations_from_db(self) -> List[Dict[str, Any]]:
        """
        DB에서 추천서 목록을 불러오는 함수
        
        Collyai DB 구조:
        - recommendation 테이블: id, fromUserId, toUserId, content, signatureData, createdAt, updatedAt, deletedAt
        - users 테이블: id, email, nickname, gender, deletedAt
        
        Returns:
            List[Dict]: 추천서 목록
                [
                    {
                        "id": 1,
                        "text": "추천서 내용...",
                        "author": "추천인 이름",
                        "candidate": "피추천인 이름",
                        "created_at": "2025-11-05"
                    },
                    ...
                ]
        """
        import os
        from sqlalchemy import create_engine, text
        from dotenv import load_dotenv
        
        try:
            # .env 파일에서 DB 연결 정보 로드
            load_dotenv()
            DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://app:app@localhost:3306/collyai_dev")
            
            # DB 엔진 생성
            engine = create_engine(DATABASE_URL, pool_pre_ping=True)
            
            # SQL 쿼리 실행
            with engine.connect() as conn:
                query = text("""
                    SELECT 
                        r.id,
                        r.content AS text,
                        r.createdAt AS created_at,
                        u_from.nickname AS author,
                        u_from.email AS author_email,
                        u_to.nickname AS candidate,
                        u_to.email AS candidate_email
                    FROM recommendation r
                    JOIN users u_from ON u_from.id = r.fromUserId
                    JOIN users u_to ON u_to.id = r.toUserId
                    WHERE r.deletedAt IS NULL
                      AND u_from.deletedAt IS NULL
                      AND u_to.deletedAt IS NULL
                    ORDER BY r.createdAt DESC
                    LIMIT 100
                """)
                
                result = conn.execute(query)
                rows = result.fetchall()
                
                recommendations = []
                for row in rows:
                    recommendations.append({
                        "id": row._mapping.get("id"),
                        "text": row._mapping.get("text", ""),
                        "author": row._mapping.get("author", "Unknown"),
                        "author_email": row._mapping.get("author_email", ""),
                        "candidate": row._mapping.get("candidate", "Unknown"),
                        "candidate_email": row._mapping.get("candidate_email", ""),
                        "created_at": row._mapping.get("created_at").strftime('%Y-%m-%d') if row._mapping.get("created_at") else "Unknown"
                    })
                
                print(f"✅ DB에서 {len(recommendations)}개의 추천서를 불러왔습니다.")
                return recommendations
                
        except Exception as e:
            print(f"❌ DB 연결 오류: {e}")
            print("DB 연결에 실패했습니다. DATABASE_URL 환경변수를 확인하세요.")
            return []
    
    def create_evaluation_prompt(self, recommendation_text: str) -> str:
        """
        GPT 모델에게 전달할 평가 프롬프트 생성
        
        Args:
            recommendation_text: 추천서 텍스트
            
        Returns:
            str: 평가 프롬프트
        """
        prompt = f"""당신은 엄격한 추천서 평가 전문가입니다. 다음 추천서를 5가지 기준으로 
        **매우 엄격하게** 평가해주세요.
평가 시 다음 원칙을 반드시 지켜주세요:
- 5점은 "거의 완벽한 수준"에만 부여 (상위 5% 이내)
- 4점은 "매우 우수한 수준"에만 부여 (상위 20% 이내)
- 3점은 "평균적인 수준"
- 2점 이하는 "개선이 필요한 수준"
- 사소한 문제나 부족한 점이 있으면 반드시 감점

추천서 텍스트:
\"\"\"{recommendation_text}\"\"\"

평가 기준 (엄격하게 적용):

1. 정확성 (Accuracy): 
   - 5점: 모든 내용이 검증 가능하고, 과장이나 추상적 표현이 전혀 없음
   - 4점: 대부분 사실 기반이나 일부 검증하기 어려운 표현이 있음
   - 3점: 사실과 추상적 표현이 혼재
   - 2점: 과장된 표현이나 검증 불가능한 내용이 다수 포함
   - 1점: 허위 정보나 명백한 과장이 있음

2. 전문성 (Professionalism):
   - 5점: 문법·맞춤법 완벽, 전문적 어투 일관성 유지, 세련된 문장
   - 4점: 문법 정확하나 일부 문장이 어색하거나 단조로움
   - 3점: 기본적인 문법은 맞으나 전문성이 부족하거나 띄어쓰기 오류 있음
   - 2점: 문법 오류가 여러 개 있거나 비전문적인 표현 사용
   - 1점: 심각한 문법 오류 또는 구어체 사용

3. 논리성/구조 (Coherence):
   - 5점: 도입→사례→결론 흐름이 완벽하고, 모든 문단이 긴밀하게 연결됨
   - 4점: 전체 구조는 갖췄으나 일부 문단 연결이 매끄럽지 않음
   - 3점: 기본 구조는 있으나 논리적 비약이나 갑작스러운 전개가 있음
   - 2점: 구조가 불명확하거나 논리적 흐름이 부족함
   - 1점: 구조가 없고 내용이 산만함

4. 개인화 (Personalization):
   - 5점: 지원자만의 고유한 사례와 구체적 성과가 다수 포함, 숫자/날짜 등 구체적 정보
   - 4점: 구체적 사례가 있으나 일부 일반적인 표현도 섞여 있음
   - 3점: 일반적 칭찬과 구체적 사례가 반반 정도
   - 2점: 대부분 "성실하다", "책임감 있다" 등 일반적 표현 위주
   - 1점: 템플릿형 내용, 누구에게나 적용 가능한 내용

5. 설득력 (Persuasiveness):
   - 5점: 명확한 추천 의사 + 구체적 근거 + 인상적인 사례 + 효과적 강조
   - 4점: 추천 의사와 근거는 있으나 임팩트가 다소 부족
   - 3점: 추천 의사는 있으나 근거가 약하거나 설득력이 보통 수준
   - 2점: 추천 의사가 명확하지 않거나 근거가 매우 빈약함
   - 1점: 추천 의사가 불분명하고 설득력이 없음

응답 형식 (반드시 아래 형식을 정확히 따라주세요):
정확성: X점 - [한 줄 이유]
전문성: X점 - [한 줄 이유]
논리성: X점 - [한 줄 이유]
개인화: X점 - [한 줄 이유]
설득력: X점 - [한 줄 이유]

주의: 각 항목을 반드시 한 줄로 작성하고, "X점" 형식을 꼭 지켜주세요.
"""
        return prompt
    
    def extract_scores_from_response(self, response: str) -> Dict[str, int]:
        """
        모델 응답에서 점수 추출
        
        Args:
            response: GPT 모델 응답 텍스트
            
        Returns:
            Dict[str, int]: 각 항목별 점수
        """
        scores = {}
        
        # 정규식 패턴으로 점수 추출 (매우 유연하게)
        patterns = {
            "accuracy": [r"정확성[:\s]*[\(]?[Aa]ccuracy[\)]?[:\s]*(\d)\s*점", r"정확성[:\s]+(\d)"],
            "professionalism": [r"전문성[:\s]*[\(]?[Pp]rofessionalism[\)]?[:\s]*(\d)\s*점", r"전문성[:\s]+(\d)"],
            "coherence": [r"논리성[/·\s]*구조?[:\s]*[\(]?[Cc]oherence[\)]?[:\s]*(\d)\s*점", r"논리성[:\s]+(\d)", r"구조[:\s]+(\d)"],
            "personalization": [r"개인화[:\s]*[\(]?[Pp]ersonalization[\)]?[:\s]*(\d)\s*점", r"개인화[:\s]+(\d)"],
            "persuasiveness": [r"설득력[:\s]*[\(]?[Pp]ersuasiveness[\)]?[:\s]*(\d)\s*점", r"설득력[:\s]+(\d)"]
        }
        
        for key, pattern_list in patterns.items():
            score_found = False
            for pattern in pattern_list:
                match = re.search(pattern, response, re.IGNORECASE)
                if match:
                    score = int(match.group(1))
                    # 1-5 범위로 제한
                    scores[key] = max(1, min(5, score))
                    score_found = True
                    break
            
            if not score_found:
                # 추출 실패 시 기본값 3점
                scores[key] = 3
                print(f"Warning: {key} 점수를 추출하지 못했습니다. 기본값 3점 적용.")
                print(f"  응답 내용 확인: {response[:200]}...")
        
        return scores
    
    def calculate_percentage(self, scores: Dict[str, int]) -> float:
        """
        점수를 퍼센트로 변환
        
        Args:
            scores: 각 항목별 점수 (1-5)
            
        Returns:
            float: 평균 점수의 퍼센트 (0-100)
        """
        if not scores:
            return 0.0
        
        average_score = sum(scores.values()) / len(scores)
        # 1-5점 스케일을 0-100% 스케일로 변환
        percentage = ((average_score - 1) / 4) * 100
        return round(percentage, 2)
    
    def call_gpt_model(self, prompt: str) -> str:
        """
        GPT 모델 호출 (OpenAI >= 1.0.0 방식)
        
        Args:
            prompt: 평가 프롬프트
            
        Returns:
            str: 모델 응답
        """
        # OpenAI Evals CompletionFn 사용
        if self.completion_fn:
            try:
                result = self.completion_fn(prompt)
                return result.get_completions()[0]
            except Exception as e:
                print(f"CompletionFn 호출 오류: {e}")
        
        # 대체: 직접 OpenAI API 호출 (openai >= 1.0.0 방식)
        try:
            from openai import OpenAI
            
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "당신은 추천서 품질을 평가하는 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=500
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI API 호출 오류: {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    def evaluate_single_recommendation(self, recommendation: Dict[str, Any]) -> Dict[str, Any]:
        """
        단일 추천서 평가
        
        Args:
            recommendation: 추천서 데이터
            
        Returns:
            Dict: 평가 결과
        """
        # 프롬프트 생성
        prompt = self.create_evaluation_prompt(recommendation["text"])
        
        # GPT 모델 호출
        response = self.call_gpt_model(prompt)
        
        # 점수 추출
        scores = self.extract_scores_from_response(response)
        
        # 퍼센트 계산
        percentage = self.calculate_percentage(scores)
        
        # 결과 구성
        result = {
            "id": recommendation["id"],
            "candidate": recommendation.get("candidate", "Unknown"),
            "author": recommendation.get("author", "Unknown"),
            "created_at": recommendation.get("created_at", "Unknown"),
            "scores": scores,
            "average_score": round(sum(scores.values()) / len(scores), 2),
            "percentage": percentage,
            "raw_response": response,
            "evaluated_at": datetime.now().isoformat()
        }
        
        return result
    
    def evaluate_all_recommendations(self) -> List[Dict[str, Any]]:
        """
        모든 추천서 평가 실행
        
        Returns:
            List[Dict]: 전체 평가 결과
        """
        # DB에서 추천서 불러오기
        recommendations = self.fetch_recommendations_from_db()
        
        print(f"총 {len(recommendations)}개의 추천서를 평가합니다...")
        
        results = []
        for idx, recommendation in enumerate(recommendations, 1):
            print(f"\n[{idx}/{len(recommendations)}] 추천서 ID {recommendation['id']} 평가 중...")
            
            try:
                result = self.evaluate_single_recommendation(recommendation)
                results.append(result)
                
                # 진행 상황 출력
                print(f"  - 정확성: {result['scores']['accuracy']}/5")
                print(f"  - 전문성: {result['scores']['professionalism']}/5")
                print(f"  - 논리성: {result['scores']['coherence']}/5")
                print(f"  - 개인화: {result['scores']['personalization']}/5")
                print(f"  - 설득력: {result['scores']['persuasiveness']}/5")
                print(f"  - 종합 점수: {result['percentage']}%")
                
            except Exception as e:
                print(f"  ❌ 평가 실패: {e}")
                continue
        
        return results
    
    def export_to_csv(self, results: List[Dict[str, Any]], filename: Optional[str] = None) -> str:
        """
        평가 결과를 CSV 파일로 저장
        
        Args:
            results: 평가 결과 리스트
            filename: 저장할 파일명 (None이면 자동 생성)
            
        Returns:
            str: 저장된 파일 경로
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"reco_eval_results_{timestamp}.csv"
        
        filepath = os.path.join(self.output_dir, filename)
        
        # CSV 작성
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as csvfile:
            fieldnames = [
                'id', 'candidate', 'author', 'created_at',
                'accuracy', 'professionalism', 'coherence', 'personalization', 'persuasiveness',
                'average_score', 'percentage', 'evaluated_at'
            ]
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for result in results:
                row = {
                    'id': result['id'],
                    'candidate': result['candidate'],
                    'author': result['author'],
                    'created_at': result['created_at'],
                    'accuracy': result['scores']['accuracy'],
                    'professionalism': result['scores']['professionalism'],
                    'coherence': result['scores']['coherence'],
                    'personalization': result['scores']['personalization'],
                    'persuasiveness': result['scores']['persuasiveness'],
                    'average_score': result['average_score'],
                    'percentage': result['percentage'],
                    'evaluated_at': result['evaluated_at']
                }
                writer.writerow(row)
        
        print(f"\n✅ 결과가 저장되었습니다: {filepath}")
        return filepath
    
    def export_to_json(self, results: List[Dict[str, Any]], filename: Optional[str] = None) -> str:
        """
        평가 결과를 JSON 파일로 저장 (상세 정보 포함)
        
        Args:
            results: 평가 결과 리스트
            filename: 저장할 파일명 (None이면 자동 생성)
            
        Returns:
            str: 저장된 파일 경로
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"reco_eval_results_{timestamp}.json"
        
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as jsonfile:
            json.dump(results, jsonfile, ensure_ascii=False, indent=2)
        
        print(f"✅ 상세 결과가 저장되었습니다: {filepath}")
        return filepath
    
    def run_evaluation(self) -> Dict[str, Any]:
        """
        전체 평가 프로세스 실행
        
        Returns:
            Dict: 평가 요약 정보
        """
        print("=" * 60)
        print("추천서 자동 평가 시스템 시작")
        print("=" * 60)
        
        # 평가 실행
        results = self.evaluate_all_recommendations()
        
        if not results:
            print("\n❌ 평가할 추천서가 없습니다.")
            return {}
        
        # 결과 저장
        csv_path = self.export_to_csv(results)
        json_path = self.export_to_json(results)
        
        # 통계 계산
        total_count = len(results)
        avg_accuracy = sum(r['scores']['accuracy'] for r in results) / total_count
        avg_professionalism = sum(r['scores']['professionalism'] for r in results) / total_count
        avg_coherence = sum(r['scores']['coherence'] for r in results) / total_count
        avg_personalization = sum(r['scores']['personalization'] for r in results) / total_count
        avg_persuasiveness = sum(r['scores']['persuasiveness'] for r in results) / total_count
        avg_percentage = sum(r['percentage'] for r in results) / total_count
        
        summary = {
            "total_evaluated": total_count,
            "average_scores": {
                "accuracy": round(avg_accuracy, 2),
                "professionalism": round(avg_professionalism, 2),
                "coherence": round(avg_coherence, 2),
                "personalization": round(avg_personalization, 2),
                "persuasiveness": round(avg_persuasiveness, 2)
            },
            "average_percentage": round(avg_percentage, 2),
            "output_files": {
                "csv": csv_path,
                "json": json_path
            }
        }
        
        # 요약 출력
        print("\n" + "=" * 60)
        print("평가 완료 요약")
        print("=" * 60)
        print(f"총 평가 건수: {total_count}개")
        print(f"\n평균 점수:")
        print(f"  - 정확성: {avg_accuracy:.2f}/5")
        print(f"  - 전문성: {avg_professionalism:.2f}/5")
        print(f"  - 논리성: {avg_coherence:.2f}/5")
        print(f"  - 개인화: {avg_personalization:.2f}/5")
        print(f"  - 설득력: {avg_persuasiveness:.2f}/5")
        print(f"\n종합 평가: {avg_percentage:.2f}%")
        print("=" * 60)
        
        return summary


# 실행 예제
if __name__ == "__main__":
    # Evaluator 인스턴스 생성
    evaluator = RecoEvaluator(
        model="gpt-4",
        temperature=0.3,
        output_dir="eval_results"
    )
    
    # 평가 실행
    summary = evaluator.run_evaluation()
    
    # 결과 확인
    print("\n평가 시스템이 완료되었습니다.")
    print(f"결과 파일: {summary.get('output_files', {})}")

