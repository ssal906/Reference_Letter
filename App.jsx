// App.jsx
import { useState, useEffect } from "react";

// ----- 톤 한국어 매핑 -----
const TONE_LABELS = {
  Formal: "공식적",
  Friendly: "친근한",
  Concise: "간결한",
  Persuasive: "설득형",
  Neutral: "중립적",
};

// ----- 초기 상태 (server 스키마에 맞춤) -----
const INITIAL_FORM = {
  recommender_name: "",
  requester_name: "",
  requester_email: "",
  major_field: "",      // 전공 분야 (선택)
  relationship: "",     // 요청자와의 관계
  strengths: "",        // 장점
  memorable: "",        // 특별히 기억나는 내용
  tone: "Formal",
  selected_score: "1",
  workspace_id: "",
};

function LoginForm({ onLogin, onToggleMode }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "로그인 실패");
      onLogin(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">로그인</h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="이메일 주소"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <div className="text-center">
          <button onClick={onToggleMode} className="text-sm text-blue-600 hover:text-blue-500">
            회원가입하기
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterForm({ onRegister, onToggleMode }) {
  const [form, setForm] = useState({ email: "", password: "", name: "", nickname: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "회원가입 실패");
      onRegister(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">회원가입</h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input
            className="border p-2 rounded w-full"
            placeholder="이메일"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="border p-2 rounded w-full"
            placeholder="비밀번호"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <input
            className="border p-2 rounded w-full"
            placeholder="이름"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="border p-2 rounded w-full"
            placeholder="닉네임"
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2 rounded"
          >
            {loading ? "가입 중..." : "가입"}
          </button>
        </form>
        <div className="text-center mt-3">
          <button onClick={onToggleMode} className="text-sm text-blue-600 hover:text-blue-500">
            로그인하기
          </button>
        </div>
      </div>
    </div>
  );
}

function Navigation({ user, onLogout }) {
  return (
    <nav className="bg-white shadow-md fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-blue-600">AI 추천서</span>
          </div>
          <div className="flex items-center space-x-4">
            <a href="#" className="text-gray-600 hover:text-blue-600">홈</a>
            <a href="#lookup" className="text-gray-600 hover:text-blue-600">조회</a>
            <a href="#generate" className="text-gray-600 hover:text-blue-600">생성</a>
            {user && (
              <>
                <span className="text-sm text-gray-700">{user.name} ({user.email})</span>
                <button onClick={onLogout} className="text-sm text-red-600 hover:text-red-500">로그아웃</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  // 인증/사용자
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // 폼/조회/결과 상태
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [nickname, setNickname] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookup, setLookup] = useState(null);

  // 공통 리셋
  const resetAllUiStates = () => {
    setForm({ ...INITIAL_FORM });
    setRecommendation("");
    setNickname("");
    setLookup(null);
    setLookupLoading(false);
  };

  // 토큰 복원
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchUserData(savedToken);
    }
  }, []);

  // user 변경 감지 시 상태 초기화(계정 전환 대응)
  useEffect(() => {
    if (user?.email) resetAllUiStates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // 강제 리마운트용 key (계정 바뀌면 컴포넌트 전체 초기화)
  const viewKey = user?.email || "guest";

  const fetchUserData = async (currentToken) => {
    try {
      const response = await fetch("http://localhost:8000/me", {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        handleLogout();
      }
    } catch (e) {
      handleLogout();
    }
  };

  const handleLogin = (data) => {
    resetAllUiStates(); // 로그인 성공 시 이전 사용자 잔여 상태 제거
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem("token", data.access_token);
  };

  const handleRegister = (data) => {
    resetAllUiStates();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem("token", data.access_token);
  };

  const handleLogout = () => {
    resetAllUiStates();
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    setAuthMode("login");
  };

  const doLookup = async () => {
    setLookupLoading(true);
    setLookup(null);
    try {
      const res = await fetch("http://localhost:8000/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search: nickname }),
      });
      const data = await res.json();
      setLookup(data);
      // 결과를 폼에 반영(선택적)
      if (data?.exists && data?.candidates?.length === 1) {
        const c = data.candidates[0];
        setForm((f) => ({
          ...f,
          requester_name: c.nickname || c.name || "",
          requester_email: c.email || "",
        }));
      }
    } catch {
      setLookup({ exists: false, message: "서버 연결 오류" });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setRecommendation("");
    try {
      const response = await fetch("http://localhost:8000/generate-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 서버 스키마와 동일한 키로 전송!
        body: JSON.stringify({
          recommender_name: form.recommender_name,
          requester_name: form.requester_name,
          requester_email: form.requester_email,
          major_field: form.major_field || null,
          relationship: form.relationship,
          strengths: form.strengths,
          memorable: form.memorable,
          tone: form.tone,
          selected_score: form.selected_score,
          workspace_id: form.workspace_id || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "생성 실패");
      setRecommendation(data.recommendation);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 인증이 안 됐으면 로그인/회원가입
  if (!user) {
    return authMode === "login" ? (
      <LoginForm onLogin={handleLogin} onToggleMode={() => setAuthMode("register")} />
    ) : (
      <RegisterForm onRegister={handleRegister} onToggleMode={() => setAuthMode("login")} />
    );
  }

  // 필수값 체크(전공 분야는 선택)
  const canGenerate =
    form.recommender_name.trim() &&
    form.requester_name.trim() &&
    form.requester_email.trim() &&
    form.relationship.trim() &&
    form.strengths.trim() &&
    form.memorable.trim() &&
    form.tone.trim() &&
    form.selected_score.trim();

  return (
    <div key={viewKey} className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      <Navigation user={user} onLogout={handleLogout} />
      <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">AI 추천서 생성기</span>
            <span className="block text-blue-600 text-2xl sm:text-3xl mt-3">
              전문적인 추천서를 손쉽게 작성하세요
            </span>
          </h1>
        </div>

        {/* ===== 조회 박스 ===== */}
        <div
          id="lookup"
          className="grid gap-3 w-full max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg mb-8 transition-all hover:shadow-xl"
        >
          <h2 className="text-xl font-semibold">사용자 조회(선택사항)</h2>
          <p className="text-sm text-gray-600 mb-2">
            닉네임/이름으로 DB 존재 여부를 확인할 수 있습니다. 서버는 존재하지 않으면 자동으로 차단합니다.
          </p>
          <div className="flex gap-2">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임 또는 이름"
              className="border p-2 rounded w-full"
            />
            <button
              onClick={doLookup}
              disabled={lookupLoading || !nickname.trim()}
              className="bg-emerald-500 text-white px-4 rounded hover:bg-emerald-600"
            >
              {lookupLoading ? "조회 중..." : "확인"}
            </button>
          </div>
          {lookup && lookup.exists === false && (
            <div className="p-3 rounded bg-red-50 text-red-600">
              {lookup.message || "DB에 없는 데이터입니다."}
            </div>
          )}
          {lookup && lookup.exists && lookup.candidates?.length > 0 && (
            <div className="p-4 rounded border mt-4 bg-yellow-50">
              <h3 className="text-lg font-semibold mb-2">검색 결과</h3>
              <p className="text-sm text-gray-600 mb-3">요청자를 선택하세요:</p>
              <div className="space-y-2">
                {lookup.candidates.map((c) => (
                  <label key={c.user_id || c.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="candidate"
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          requester_name: c.nickname || c.name,
                          requester_email: c.email,
                        }))
                      }
                    />
                    <span>
                      {c.name} / {c.nickname} ({c.email})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== 생성 폼 ===== */}
        <div
          id="generate"
          className="grid gap-3 w-full max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg transition-all hover:shadow-xl"
        >
          <h2 className="text-xl font-semibold">추천서 입력</h2>

          <input
            className="border p-2 rounded"
            placeholder="작성자 이름(추천자)"
            value={form.recommender_name}
            onChange={(e) => setForm({ ...form, recommender_name: e.target.value })}
          />
          <input
            className="border p-2 rounded"
            placeholder="요청자 이름"
            value={form.requester_name}
            onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
          />
          <input
            className="border p-2 rounded"
            placeholder="요청자 이메일"
            value={form.requester_email}
            onChange={(e) => setForm({ ...form, requester_email: e.target.value })}
          />

          <input
            className="border p-2 rounded"
            placeholder="전공 분야 (선택)"
            value={form.major_field}
            onChange={(e) => setForm({ ...form, major_field: e.target.value })}
          />

          <textarea
            className="border p-2 rounded"
            placeholder="요청자와의 관계"
            value={form.relationship}
            onChange={(e) => setForm({ ...form, relationship: e.target.value })}
          />
          <textarea
            className="border p-2 rounded"
            placeholder="장점"
            value={form.strengths}
            onChange={(e) => setForm({ ...form, strengths: e.target.value })}
          />
          <textarea
            className="border p-2 rounded"
            placeholder="특별히 기억나는 내용"
            value={form.memorable}
            onChange={(e) => setForm({ ...form, memorable: e.target.value })}
          />

          {/* === 톤 선택 UI(한국어 라벨) === */}
          <label className="text-sm text-gray-600">톤 선택</label>
          <select
            className="border p-2 rounded"
            value={form.tone}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
          >
            <option value="Formal">{TONE_LABELS.Formal}</option>
            <option value="Friendly">{TONE_LABELS.Friendly}</option>
            <option value="Concise">{TONE_LABELS.Concise}</option>
            <option value="Persuasive">{TONE_LABELS.Persuasive}</option>
            <option value="Neutral">{TONE_LABELS.Neutral}</option>
          </select>

          <label className="text-sm text-gray-600">점수</label>
          <select
            className="border p-2 rounded"
            value={form.selected_score}
            onChange={(e) => setForm({ ...form, selected_score: e.target.value })}
          >
            {["1", "2", "3", "4", "5"].map((s) => (
              <option key={s} value={s}>
                {s}점
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            className={`${
              canGenerate ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
            } text-white px-4 py-2 rounded`}
            title={!canGenerate ? "필수 항목을 모두 입력하세요" : ""}
          >
            {loading ? "생성 중..." : "추천서 생성"}
          </button>

          {recommendation && (
            <div className="mt-4 p-4 bg-gray-50 rounded border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  생성된 추천서{" "}
                  <span className="text-blue-600">
                    ({form.selected_score}점 · {TONE_LABELS[form.tone] || form.tone})
                  </span>
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(recommendation);
                    alert("추천서가 클립보드에 복사되었습니다.");
                  }}
                  className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                  title="클립보드로 복사"
                >
                  복사하기
                </button>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-gray-700">{recommendation}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
