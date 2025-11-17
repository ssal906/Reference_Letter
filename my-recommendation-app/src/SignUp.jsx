// SignUp.jsx
import React, { useMemo, useState } from "react";

const getApiBase = () => {
  const envApiBase = import.meta?.env?.VITE_API_BASE;
  if (envApiBase) return envApiBase.replace(/\/+$/, "");
  const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
  if (isProduction) {
    console.error("⚠️ VITE_API_BASE 환경 변수가 설정되지 않았습니다!");
    return "";
  }
  return "http://localhost:8000";
};
const API_BASE = getApiBase();

const styles = {
  card: {
    background: "white",
    borderRadius: 12,
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    padding: "24px",
    marginBottom: "16px",
  },
  sectionTitle: { fontSize: "1.125rem", fontWeight: 700, color: "#111827" },
  label: { display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: 80,
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    outline: "none",
    resize: "vertical",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "white",
    outline: "none",
  },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  btn: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhost: {
    background: "transparent",
    color: "#ef4444",
    border: "2px solid #fecaca",
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhostDisabled: {
    background: "transparent",
    color: "#fca5a5",
    border: "2px solid #ffe4e6",
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "not-allowed",
    opacity: 0.6,
  },
  hint: { fontSize: "0.8rem", color: "#6b7280" },
  danger: { color: "#dc2626", fontWeight: 700, fontSize: "0.9rem" },
  success: { color: "#059669", fontWeight: 700, fontSize: "0.9rem" },
  mutedBox: {
    background: "#f9fafb",
    border: "1px dashed #e5e7eb",
    borderRadius: 8,
    padding: 12,
    color: "#6b7280",
  },
  itemCard: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
    position: "relative",
  },
  itemGrid: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    rowGap: 6,
    columnGap: 12,
    fontSize: "0.93rem",
    color: "#374151",
  },
  itemLabel: { fontWeight: 700, color: "#6b7280" },
  itemDel: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "transparent",
    border: "1px solid #fecaca",
    color: "#ef4444",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
  },
  catBtn: (active) => ({
    padding: "8px 12px",
    borderRadius: 10,
    border: active ? "2px solid #fb7185" : "2px solid #e5e7eb",
    background: active ? "#ffe4e6" : "white",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all .15s",
  }),
  catWrap: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
};

const GENDER_OPTIONS = [
  { label: "선택 안 함", value: 0 },
  { label: "남성", value: 1 },
  { label: "여성", value: 2 },
];


function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={styles.label}>{label}</label>
      {children}
      {hint ? <div style={styles.hint}>{hint}</div> : null}
    </div>
  );
}

function useApi() {
  const get = (path) =>
    fetch(`${API_BASE}${path}`).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).detail || r.statusText);
      return r.json();
    });
  const post = (path, body) =>
    fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || r.statusText);
      return data;
    });
  return { get, post };
}

/** 공통 배열 에디터 (표시 라벨 한국어) */
function ArrayEditor({ title, schema, value, onChange }) {
  const [item, setItem] = useState(schema.reduce((o, k) => ({ ...o, [k.key]: "" }), {}));

  const add = () => {
    onChange([...(value || []), item]);
    setItem(schema.reduce((o, k) => ({ ...o, [k.key]: "" }), {}));
  };
  const remove = (idx) => {
    const next = [...(value || [])];
    next.splice(idx, 1);
    onChange(next);
  };

  const labelOf = (key) => schema.find((s) => s.key === key)?.label ?? key;

  return (
    <div style={{ ...styles.card, padding: 16 }}>
      <div style={styles.sectionTitle}>{title}</div>
      <div style={{ marginTop: 8 }}>
        {schema.map((f) => (
          <Field key={f.key} label={f.label}>
            {f.as === "textarea" ? (
              <textarea
                style={styles.textarea}
                value={item[f.key] || ""}
                placeholder={f.placeholder}
                onChange={(e) => setItem({ ...item, [f.key]: e.target.value })}
              />
            ) : (
              <input
                style={styles.input}
                value={item[f.key] || ""}
                placeholder={f.placeholder}
                onChange={(e) => setItem({ ...item, [f.key]: e.target.value })}
              />
            )}
          </Field>
        ))}
        <button type="button" style={styles.btn} onClick={add}>
          항목 추가
        </button>
      </div>

      {(value || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          {(value || []).map((row, idx) => (
            <div key={idx} style={{ ...styles.itemCard, marginBottom: 10 }}>
              <button type="button" style={styles.itemDel} onClick={() => remove(idx)}>
                삭제
              </button>
              <div style={styles.itemGrid}>
                {Object.keys(row).map((k) =>
                  row[k] ? (
                    <React.Fragment key={k}>
                      <div style={styles.itemLabel}>{labelOf(k)}</div>
                      <div>{row[k]}</div>
                    </React.Fragment>
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 강점 에디터 */
function StrengthsEditor({ value, onChange }) {
  const CATEGORIES = [
    "기술",
    "리더십",
    "커뮤니케이션",
    "문제해결",
    "프로젝트관리",
    "데이터분석",
    "클라우드/인프라",
    "기타",
  ];
  const [draft, setDraft] = useState({ category: "", strength: "", description: "" });

  const add = () => {
    if (!draft.category || !draft.strength) return;
    onChange([...(value || []), draft]);
    setDraft({ category: draft.category, strength: "", description: "" });
  };
  const remove = (idx) => {
    const next = [...(value || [])];
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div style={{ ...styles.card, padding: 16 }}>
      <div style={styles.sectionTitle}>강점 추가</div>

      <Field label="카테고리 선택">
        <div style={styles.catWrap}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              style={styles.catBtn(draft.category === c)}
              onClick={() => setDraft((d) => ({ ...d, category: d.category === c ? "" : c }))}
              aria-expanded={draft.category === c}
              aria-controls={`cat-panel-${c}`}
            >
              {c}
            </button>
          ))}
        </div>
      </Field>

      {draft.category && (
        <div
          id={`cat-panel-${draft.category}`}
          role="region"
          aria-label={`${draft.category} 세부 입력`}
          style={{ border: "1px solid #f3f4f6", borderRadius: 12, padding: 12, marginBottom: 12, background: "#fff7f7" }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{draft.category}</div>
          <Field label="강점">
            <input
              style={styles.input}
              value={draft.strength}
              placeholder="카테고리를 구체화한 나의 강점 (예: Python/Django 전문가, 팀 리딩 및 멘토링 등)"
              onChange={(e) => setDraft((d) => ({ ...d, strength: e.target.value }))}
            />
          </Field>
          <Field label="상세 설명">
            <textarea
              style={styles.textarea}
              value={draft.description}
              placeholder="강점으로 달성한 것, 구체적인 경험/성과 (예: API 성능 최적화로 응답 80% 단축 등)"
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </Field>
          <button type="button" style={styles.btn} onClick={add}>
            강점 추가
          </button>
        </div>
      )}

      {(value || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          {(value || []).map((row, idx) => (
            <div key={idx} style={{ ...styles.itemCard, marginBottom: 10 }}>
              <button type="button" style={styles.itemDel} onClick={() => remove(idx)}>
                삭제
              </button>
              <div style={styles.itemGrid}>
                <div style={styles.itemLabel}>카테고리</div>
                <div>{row.category}</div>
                <div style={styles.itemLabel}>강점</div>
                <div>{row.strength}</div>
                <div style={styles.itemLabel}>상세 설명</div>
                <div>{row.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SignUp() {
  const { get, post } = useApi();
  const [step, setStep] = useState(1);

  // ===== 1단계 =====
  const [name, setName] = useState("");
  const [gender, setGender] = useState(0);
  const [email, setEmail] = useState("");
  const [emailChecked, setEmailChecked] = useState(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwChecked, setPwChecked] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const pwValid = useMemo(() => pw.length >= 6 && pw === pw2, [pw, pw2]);

  const [step1Payload, setStep1Payload] = useState(null);

  const checkEmail = async () => {
    if (!email) {
      alert("이메일을 입력해주세요.");
      return;
    }
    try {
      const r = await get(`/auth/email-available?email=${encodeURIComponent(email)}`);
      setEmailChecked(r.available);
    } catch (error) {
      console.error("이메일 중복 확인 오류:", error);
      alert("이메일 중복 확인 중 오류가 발생했습니다. 다시 시도해주세요.");
      setEmailChecked(null);
    }
  };

  const handleCheckPw = () => {
    if (pw.length < 6) {
      setPwMsg("비밀번호는 6자 이상 입력해 주세요.");
      setPwChecked(true);
      return;
    }
    if (pw !== pw2) {
      setPwMsg("비밀번호가 일치하지 않습니다.");
      setPwChecked(true);
      return;
    }
    setPwMsg("");
    setPwChecked(true);
  };

  const submitStep1 = async () => {
    if (emailChecked !== true) throw new Error("이메일 중복 확인이 필요합니다.");
    if (!pwChecked) throw new Error("비밀번호를 확인 버튼으로 검증해 주세요.");
    if (!pwValid) throw new Error(pwMsg || "비밀번호를 다시 확인해 주세요.");
    if (!name.trim()) throw new Error("이름을 입력해 주세요.");
    setStep1Payload({
      name,
      gender,
      email,
      password: pw,
      password_confirm: pw2,
      nickname: name,
    });
    setStep(2);
  };

  // ===== 2단계 =====
  const [employed, setEmployed] = useState("no");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [companyExists, setCompanyExists] = useState(false);
  const [positionTitle, setPositionTitle] = useState("");

  const [companyMsg, setCompanyMsg] = useState("");

  // 검색 여부 플래그 (회사 검색 로직은 기존 요구사항 유지)
  const [searched, setSearched] = useState(false);

  const searchCompany = async () => {
    setCompanyMsg("");
    const r = await get(`/companies/search?name=${encodeURIComponent(companyName)}`);
    setSearched(true);
    if (r.exists) {
      setCompanyId(r.companyId);
      setCompanyName(r.name);
      setCompanyExists(true);
      setCompanyMsg("가입이 완료된 회사입니다.");
    } else {
      setCompanyId(null);
      setCompanyExists(false);
      setCompanyMsg("아직 가입 안 된 회사입니다.");
    }
  };

  const createCompany = async () => {
    if (!searched || companyExists || !companyName.trim()) return;
    const r = await post("/companies", { name: companyName.trim() });
    setCompanyId(r.companyId);
    setCompanyExists(true);
    setCompanyMsg("회사 생성이 완료되었습니다. (신규 등록)");
  };

  const [step2Payload, setStep2Payload] = useState(null);

  const submitStep2 = async () => {
    if (!step1Payload) throw new Error("1단계가 선행되어야 합니다.");
    if (employed === "no") {
      setStep2Payload({ employed: "no" });
      setStep(3);
      return;
    }
    if (!companyId && !companyName) throw new Error("회사 정보를 입력하세요.");
    setStep2Payload({
      employed: "yes",
      companyId,
      companyName,
      positionTitle,
    });
    setStep(3);
  };

  // ===== 3단계 =====
  const [experiences, setExperiences] = useState([]);
  const [awards, setAwards] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [strengths, setStrengths] = useState([]);
  const [saving, setSaving] = useState(false);

  const submitProfile = async () => {
    if (!step1Payload) return alert("1단계 정보가 없습니다.");
    if (!step2Payload) return alert("2단계 정보가 없습니다.");

    setSaving(true);
    try {
      const s1 = await post("/signup/step1", step1Payload);
      const userId = s1.userId;

      if (step2Payload.employed === "no") {
        await post("/signup/step2", { userId, employed: "no" });
      } else {
        await post("/signup/step2", {
          userId,
          employed: "yes",
          companyId: step2Payload.companyId,
          companyName: step2Payload.companyName,
          positionTitle: step2Payload.positionTitle,
        });
      }

      await post("/signup/profile", {
        userId,
        experiences,
        awards,
        certifications,
        projects,
        strengths,
      });

      alert("회원가입이 완료되었습니다.");
      window.location.reload();
    } catch (e) {
      alert(e.message || "회원가입 처리 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // ===== 뷰 =====
  const canCreateCompany = searched && !companyExists && companyName.trim().length > 0;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: 16 }}>
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>회원가입</div>
          <div style={styles.hint}>단계 {step} / 3</div>
        </div>
        <div style={{ height: 6, background: "#f3f4f6", borderRadius: 999 }}>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              width: `${(step / 3) * 100}%`,
              background: "linear-gradient(90deg,#ef4444,#dc2626)",
              transition: "width .3s ease",
            }}
          />
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>1) 기본 정보</div>
          <div style={{ marginTop: 12 }}>
            <Field label="이름">
              <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
            </Field>

            <Field label="성별">
              <select style={styles.select} value={gender} onChange={(e) => setGender(Number(e.target.value))}>
                {GENDER_OPTIONS.map((g) => (
                  <option value={g.value} key={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="이메일">
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input
                  style={styles.input}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailChecked(null);
                  }}
                  // ⛔️ onBlur={checkEmail} 제거하여 버튼으로만 중복확인
                  placeholder="name@example.com"
                />
                <button type="button" style={styles.btnGhost} onClick={checkEmail}>
                  중복 확인
                </button>
              </div>
              {emailChecked === true && <div style={styles.success}>사용 가능한 이메일입니다.</div>}
              {emailChecked === false && <div style={styles.danger}>이미 사용 중인 이메일입니다.</div>}
            </Field>

            <div style={styles.row}>
              <Field label="비밀번호">
                <input
                  type="password"
                  style={styles.input}
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value);
                    setPwChecked(false);
                    setPwMsg("");
                  }}
                  placeholder="6자 이상"
                />
              </Field>
              <Field label="비밀번호 확인">
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <input
                    type="password"
                    style={styles.input}
                    value={pw2}
                    onChange={(e) => {
                      setPw2(e.target.value);
                      setPwChecked(false);
                      setPwMsg("");
                    }}
                    placeholder="다시 입력"
                  />
                  <button type="button" style={styles.btnGhost} onClick={handleCheckPw}>
                    비밀번호 확인
                  </button>
                </div>
                {pwChecked && pwMsg && <div style={styles.danger}>{pwMsg}</div>}
                {pwChecked && !pwMsg && pwValid && <div style={styles.success}>비밀번호가 일치합니다.</div>}
              </Field>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              style={{
                ...styles.btn,
                opacity: emailChecked && pwValid && pwChecked && name ? 1 : 0.5,
                cursor: emailChecked && pwValid && pwChecked && name ? "pointer" : "not-allowed",
              }}
              disabled={!(emailChecked && pwValid && pwChecked && name)}
              onClick={() => submitStep1().catch((e) => alert(e.message))}
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>2) 재직 정보</div>

          <Field label="재직 중인가요?">
            <div style={{ display: "flex", gap: 12 }}>
              <label>
                <input type="radio" name="emp" value="yes" checked={employed === "yes"} onChange={() => setEmployed("yes")} /> 네
              </label>
              <label>
                <input type="radio" name="emp" value="no" checked={employed === "no"} onChange={() => setEmployed("no")} /> 아니오
              </label>
            </div>
          </Field>

          {employed === "yes" ? (
            <>
              <Field label="회사명 검색/추가">
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
                  <input
                    style={styles.input}
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setCompanyExists(false);
                      setSearched(false); // 입력 변경 시 재검색 필요
                    }}
                    placeholder="회사명을 입력하세요"
                  />
                  <button type="button" style={styles.btnGhost} onClick={() => searchCompany().catch((e) => alert(e.message))}>
                    검색
                  </button>
                  <button
                    type="button"
                    onClick={() => createCompany().catch((e) => alert(e.message))}
                    style={canCreateCompany ? styles.btnGhost : styles.btnGhostDisabled}
                    disabled={!canCreateCompany}
                    title={
                      !searched
                        ? "검색을 먼저 실행해 주세요."
                        : companyExists
                        ? "이미 등록된 회사입니다."
                        : ""
                    }
                  >
                    회사 추가
                  </button>
                </div>
                {companyMsg && (
                  <div style={{ marginTop: 8, fontWeight: 700, color: companyExists ? "#059669" : "#dc2626" }}>
                    {companyMsg}
                  </div>
                )}
              </Field>

              <Field label="직책">
                <input style={styles.input} value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} placeholder="예: 팀장, 매니저 등" />
              </Field>
            </>
          ) : null}

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
            <button type="button" style={styles.btnGhost} onClick={() => setStep(1)}>
              이전
            </button>
            <button type="button" style={styles.btn} onClick={() => submitStep2().catch((e) => alert(e.message))}>
              다음
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>3) 프로필 (선택)</div>

          <ArrayEditor
            title="경력 추가"
            schema={[
              { key: "company", label: "회사", placeholder: "회사명" },
              { key: "position", label: "직책", placeholder: "예: 백엔드 개발자" },
              { key: "startDate", label: "시작일", placeholder: "YYYY-MM-DD" },
              { key: "endDate", label: "종료일", placeholder: "YYYY-MM-DD 또는 공백" },
              { key: "description", label: "설명", placeholder: "역할/성과", as: "textarea" },
            ]}
            value={experiences}
            onChange={setExperiences}
          />

          <ArrayEditor
            title="수상이력 추가"
            schema={[
              { key: "title", label: "수상명", placeholder: "수상명" },
              { key: "organization", label: "기관", placeholder: "수여기관" },
              { key: "awardDate", label: "수상일", placeholder: "YYYY-MM-DD" },
              { key: "description", label: "설명", placeholder: "설명", as: "textarea" },
            ]}
            value={awards}
            onChange={setAwards}
          />

          <ArrayEditor
            title="자격증 추가"
            schema={[
              { key: "name", label: "명칭", placeholder: "예: 정보처리기사" },
              { key: "issuer", label: "발급기관", placeholder: "발급기관" },
              { key: "issueDate", label: "발급일", placeholder: "YYYY-MM-DD" },
              { key: "expiryDate", label: "만료일", placeholder: "YYYY-MM-DD" },
              { key: "certificationNumber", label: "등록번호", placeholder: "번호" },
            ]}
            value={certifications}
            onChange={setCertifications}
          />

          <ArrayEditor
            title="프로젝트 추가"
            schema={[
              { key: "title", label: "프로젝트명", placeholder: "프로젝트명" },
              { key: "role", label: "역할", placeholder: "예: 리드 개발자, PM 등" },
              { key: "startDate", label: "시작일", placeholder: "YYYY-MM-DD" },
              { key: "endDate", label: "종료일", placeholder: "YYYY-MM-DD" },
              { key: "technologies", label: "사용 기술", placeholder: "예: Python, React, AWS 등", as: "textarea" },
              { key: "achievement", label: "성과", placeholder: "프로젝트 성과 및 결과", as: "textarea" },
              { key: "url", label: "URL", placeholder: "프로젝트 링크 (선택)" },
              { key: "description", label: "설명", placeholder: "프로젝트 상세 설명", as: "textarea" },
            ]}
            value={projects}
            onChange={setProjects}
          />

          <StrengthsEditor value={strengths} onChange={setStrengths} />

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
            <button type="button" style={styles.btnGhost} onClick={() => setStep(2)}>
              이전
            </button>
            <button type="button" style={{ ...styles.btn, opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={submitProfile}>
              {saving ? "처리 중..." : "회원가입 완료"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
