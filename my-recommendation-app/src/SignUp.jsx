// SignUp.jsx
import React, { useMemo, useState, useEffect } from "react";

const API_BASE = (import.meta?.env?.VITE_API_BASE ?? "http://localhost:8000").replace(/\/+$/, "");

// 다국어 지원
const TRANSLATIONS = {
  ko: {
    title: "회원가입",
    step: "단계",
    step1: {
      title: "1) 기본 정보",
      name: "이름",
      gender: "성별",
      genderOptions: {
        none: "선택 안 함",
        male: "남성",
        female: "여성",
      },
      email: "이메일",
      emailPlaceholder: "name@example.com",
      emailCheck: "중복 확인",
      emailAvailable: "사용 가능한 이메일입니다.",
      emailUnavailable: "이미 사용 중인 이메일입니다.",
      emailRequired: "이메일을 입력해주세요.",
      emailInvalidFormat: "올바른 이메일 형식으로 입력해주세요. (예: name@example.com)",
      emailCheckError: "이메일 중복 확인 중 오류가 발생했습니다. 다시 시도해주세요.",
      password: "비밀번호",
      passwordPlaceholder: "6자 이상",
      passwordConfirm: "비밀번호 확인",
      passwordConfirmPlaceholder: "다시 입력",
      passwordCheck: "비밀번호 확인",
      passwordTooShort: "비밀번호는 6자 이상 입력해 주세요.",
      passwordMismatch: "비밀번호가 일치하지 않습니다.",
      passwordMatch: "비밀번호가 일치합니다.",
      next: "다음",
      emailCheckRequired: "이메일 중복 확인이 필요합니다.",
      passwordCheckRequired: "비밀번호를 확인 버튼으로 검증해 주세요.",
      passwordInvalid: "비밀번호를 다시 확인해 주세요.",
      nameRequired: "이름을 입력해 주세요.",
    },
    step2: {
      title: "2) 재직 정보",
      employed: "재직 중인가요?",
      yes: "네",
      no: "아니오",
      companySearch: "회사명 검색/추가",
      companyPlaceholder: "회사명을 입력하세요",
      search: "검색",
      addCompany: "회사 추가",
      companyRegistered: "가입이 완료된 회사입니다.",
      companyNotRegistered: "아직 가입 안 된 회사입니다.",
      companyCreated: "회사 생성이 완료되었습니다. (신규 등록)",
      position: "직책",
      positionPlaceholder: "예: 팀장, 매니저 등",
      previous: "이전",
      next: "다음",
      companyRequired: "회사 정보를 입력하세요.",
      searchFirst: "검색을 먼저 실행해 주세요.",
      companyAlreadyExists: "이미 등록된 회사입니다.",
    },
    step3: {
      title: "3) 프로필 (선택)",
      experiences: "경력 추가",
      awards: "수상이력 추가",
      certifications: "자격증 추가",
      projects: "프로젝트 추가",
      strengths: "강점 추가",
      previous: "이전",
      complete: "회원가입 완료",
      processing: "처리 중...",
      success: "회원가입이 완료되었습니다.",
      error: "회원가입 처리 중 오류가 발생했습니다.",
      step1Required: "1단계 정보가 없습니다.",
      step2Required: "2단계 정보가 없습니다.",
      // 경력 필드
      experienceCompany: "회사",
      experienceCompanyPlaceholder: "회사명",
      experiencePosition: "직책",
      experiencePositionPlaceholder: "예: 백엔드 개발자",
      experienceStartDate: "시작일",
      experienceStartDatePlaceholder: "YYYY-MM-DD",
      experienceEndDate: "종료일",
      experienceEndDatePlaceholder: "YYYY-MM-DD 또는 공백",
      experienceDescription: "설명",
      experienceDescriptionPlaceholder: "역할/성과",
      // 수상이력 필드
      awardTitle: "수상명",
      awardTitlePlaceholder: "수상명",
      awardOrganization: "기관",
      awardOrganizationPlaceholder: "수여기관",
      awardDate: "수상일",
      awardDatePlaceholder: "YYYY-MM-DD",
      awardDescription: "설명",
      awardDescriptionPlaceholder: "설명",
      // 자격증 필드
      certName: "명칭",
      certNamePlaceholder: "예: 정보처리기사",
      certIssuer: "발급기관",
      certIssuerPlaceholder: "발급기관",
      certIssueDate: "발급일",
      certIssueDatePlaceholder: "YYYY-MM-DD",
      certExpiryDate: "만료일",
      certExpiryDatePlaceholder: "YYYY-MM-DD",
      certNumber: "등록번호",
      certNumberPlaceholder: "번호",
      // 프로젝트 필드
      projectTitle: "프로젝트명",
      projectTitlePlaceholder: "프로젝트명",
      projectRole: "역할",
      projectRolePlaceholder: "예: 리드 개발자, PM 등",
      projectStartDate: "시작일",
      projectStartDatePlaceholder: "YYYY-MM-DD",
      projectEndDate: "종료일",
      projectEndDatePlaceholder: "YYYY-MM-DD",
      projectTechnologies: "사용 기술",
      projectTechnologiesPlaceholder: "예: Python, React, AWS 등",
      projectAchievement: "성과",
      projectAchievementPlaceholder: "프로젝트 성과 및 결과",
      projectUrl: "URL",
      projectUrlPlaceholder: "프로젝트 링크 (선택)",
      projectDescription: "설명",
      projectDescriptionPlaceholder: "프로젝트 상세 설명",
      // 강점 필드
      strengthPlaceholder: "카테고리를 구체화한 나의 강점 (예: Python/Django 전문가, 팀 리딩 및 멘토링 등)",
      strengthDescPlaceholder: "강점으로 달성한 것, 구체적인 경험/성과 (예: API 성능 최적화로 응답 80% 단축 등)",
    },
    categories: {
      tech: "기술",
      leadership: "리더십",
      communication: "커뮤니케이션",
      problemSolving: "문제해결",
      projectManagement: "프로젝트관리",
      dataAnalysis: "데이터분석",
      cloudInfra: "클라우드/인프라",
      other: "기타",
    },
    common: {
      add: "항목 추가",
      delete: "삭제",
      category: "카테고리",
      strength: "강점",
      description: "상세 설명",
      save: "저장",
      cancel: "취소",
    },
  },
  en: {
    title: "Sign Up",
    step: "Step",
    step1: {
      title: "1) Basic Information",
      name: "Name",
      gender: "Gender",
      genderOptions: {
        none: "Not specified",
        male: "Male",
        female: "Female",
      },
      email: "Email",
      emailPlaceholder: "name@example.com",
      emailCheck: "Check Availability",
      emailAvailable: "Email is available.",
      emailUnavailable: "Email is already in use.",
      emailRequired: "Please enter your email.",
      emailInvalidFormat: "Please enter a valid email address. (e.g., name@example.com)",
      emailCheckError: "An error occurred while checking email availability. Please try again.",
      password: "Password",
      passwordPlaceholder: "6 characters or more",
      passwordConfirm: "Confirm Password",
      passwordConfirmPlaceholder: "Re-enter password",
      passwordCheck: "Verify Password",
      passwordTooShort: "Password must be at least 6 characters.",
      passwordMismatch: "Passwords do not match.",
      passwordMatch: "Passwords match.",
      next: "Next",
      emailCheckRequired: "Email availability check is required.",
      passwordCheckRequired: "Please verify your password using the verify button.",
      passwordInvalid: "Please check your password again.",
      nameRequired: "Please enter your name.",
    },
    step2: {
      title: "2) Employment Information",
      employed: "Are you currently employed?",
      yes: "Yes",
      no: "No",
      companySearch: "Search/Add Company",
      companyPlaceholder: "Enter company name",
      search: "Search",
      addCompany: "Add Company",
      companyRegistered: "Company is already registered.",
      companyNotRegistered: "Company is not yet registered.",
      companyCreated: "Company created successfully. (New registration)",
      position: "Position",
      positionPlaceholder: "e.g., Team Lead, Manager, etc.",
      previous: "Previous",
      next: "Next",
      companyRequired: "Please enter company information.",
      searchFirst: "Please search first.",
      companyAlreadyExists: "Company already exists.",
    },
    step3: {
      title: "3) Profile (Optional)",
      experiences: "Add Experience",
      awards: "Add Awards",
      certifications: "Add Certifications",
      projects: "Add Projects",
      strengths: "Add Strengths",
      previous: "Previous",
      complete: "Complete Sign Up",
      processing: "Processing...",
      success: "Sign up completed successfully.",
      error: "An error occurred during sign up.",
      step1Required: "Step 1 information is missing.",
      step2Required: "Step 2 information is missing.",
      // 경력 필드
      experienceCompany: "Company",
      experienceCompanyPlaceholder: "Company name",
      experiencePosition: "Position",
      experiencePositionPlaceholder: "e.g., Backend Developer",
      experienceStartDate: "Start Date",
      experienceStartDatePlaceholder: "YYYY-MM-DD",
      experienceEndDate: "End Date",
      experienceEndDatePlaceholder: "YYYY-MM-DD or blank",
      experienceDescription: "Description",
      experienceDescriptionPlaceholder: "Role/Achievements",
      // 수상이력 필드
      awardTitle: "Award Title",
      awardTitlePlaceholder: "Award title",
      awardOrganization: "Organization",
      awardOrganizationPlaceholder: "Awarding organization",
      awardDate: "Award Date",
      awardDatePlaceholder: "YYYY-MM-DD",
      awardDescription: "Description",
      awardDescriptionPlaceholder: "Description",
      // 자격증 필드
      certName: "Name",
      certNamePlaceholder: "e.g., Information Processing Engineer",
      certIssuer: "Issuer",
      certIssuerPlaceholder: "Issuing organization",
      certIssueDate: "Issue Date",
      certIssueDatePlaceholder: "YYYY-MM-DD",
      certExpiryDate: "Expiry Date",
      certExpiryDatePlaceholder: "YYYY-MM-DD",
      certNumber: "Registration Number",
      certNumberPlaceholder: "Number",
      // 프로젝트 필드
      projectTitle: "Project Title",
      projectTitlePlaceholder: "Project title",
      projectRole: "Role",
      projectRolePlaceholder: "e.g., Lead Developer, PM, etc.",
      projectStartDate: "Start Date",
      projectStartDatePlaceholder: "YYYY-MM-DD",
      projectEndDate: "End Date",
      projectEndDatePlaceholder: "YYYY-MM-DD",
      projectTechnologies: "Technologies",
      projectTechnologiesPlaceholder: "e.g., Python, React, AWS, etc.",
      projectAchievement: "Achievement",
      projectAchievementPlaceholder: "Project achievements and results",
      projectUrl: "URL",
      projectUrlPlaceholder: "Project link (optional)",
      projectDescription: "Description",
      projectDescriptionPlaceholder: "Project detailed description",
      // 강점 필드
      strengthPlaceholder: "My specific strength in this category (e.g., Python/Django expert, team leading and mentoring, etc.)",
      strengthDescPlaceholder: "Achievements and specific experiences/outcomes (e.g., 80% response time reduction through API performance optimization, etc.)",
    },
    categories: {
      tech: "Technology",
      leadership: "Leadership",
      communication: "Communication",
      problemSolving: "Problem Solving",
      projectManagement: "Project Management",
      dataAnalysis: "Data Analysis",
      cloudInfra: "Cloud/Infrastructure",
      other: "Other",
    },
    common: {
      add: "Add Item",
      delete: "Delete",
      category: "Category",
      strength: "Strength",
      description: "Description",
      save: "Save",
      cancel: "Cancel",
    },
  },
};

const getGenderOptions = (t) => [
  { label: t.genderOptions.none, value: 0 },
  { label: t.genderOptions.male, value: 1 },
  { label: t.genderOptions.female, value: 2 },
];

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
    background: "linear-gradient(135deg, #9370DB 0%, #6A5ACD 100%)",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhost: {
    background: "transparent",
    color: "#9370DB",
    border: "2px solid #fecaca",
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhostDisabled: {
    background: "transparent",
    color: "#b19cd9",
    border: "2px solid #d4c5e9",
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "not-allowed",
    opacity: 0.6,
  },
  hint: { fontSize: "0.8rem", color: "#6b7280" },
  danger: { color: "#9370DB", fontWeight: 700, fontSize: "0.9rem" },
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
    border: "1px solid #9370DB",
    color: "#9370DB",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
  },
  catBtn: (active) => ({
    padding: "8px 12px",
    borderRadius: 10,
    border: active ? "2px solid #9370DB" : "2px solid #e5e7eb",
    background: active ? "#e6d9f7" : "white",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all .15s",
  }),
  catWrap: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
};



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

/** 공통 배열 에디터 */
function ArrayEditor({ title, schema, value, onChange, language = 'ko' }) {
  const [item, setItem] = useState(schema.reduce((o, k) => ({ ...o, [k.key]: "" }), {}));
  const t = TRANSLATIONS[language];

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
          {t.common.add}
        </button>
      </div>

      {(value || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          {(value || []).map((row, idx) => (
            <div key={idx} style={{ ...styles.itemCard, marginBottom: 10 }}>
              <button type="button" style={styles.itemDel} onClick={() => remove(idx)}>
                {t.common.delete}
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
function StrengthsEditor({ value, onChange, language = 'ko' }) {
  const CATEGORY_KEYS = [
    "tech",
    "leadership",
    "communication",
    "problemSolving",
    "projectManagement",
    "dataAnalysis",
    "cloudInfra",
    "other",
  ];
  const [draft, setDraft] = useState({ category: "", strength: "", description: "" });
  const t = TRANSLATIONS[language];

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
      <div style={styles.sectionTitle}>{t.step3.strengths}</div>

      <Field label={t.common.category}>
        <div style={styles.catWrap}>
          {CATEGORY_KEYS.map((key) => {
            const categoryLabel = t.categories[key];
            return (
              <button
                key={key}
                type="button"
                style={styles.catBtn(draft.category === key)}
                onClick={() => setDraft((d) => ({ ...d, category: d.category === key ? "" : key }))}
                aria-expanded={draft.category === key}
                aria-controls={`cat-panel-${key}`}
              >
                {categoryLabel}
              </button>
            );
          })}
        </div>
      </Field>

      {draft.category && (
        <div
          id={`cat-panel-${draft.category}`}
          role="region"
          aria-label={`${t.categories[draft.category]} 세부 입력`}
          style={{ border: "1px solid #f3f4f6", borderRadius: 12, padding: 12, marginBottom: 12, background: "#f3e8ff" }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{t.categories[draft.category]}</div>
          <Field label={t.common.strength}>
            <input
              style={styles.input}
              value={draft.strength}
              placeholder={t.step3.strengthPlaceholder}
              onChange={(e) => setDraft((d) => ({ ...d, strength: e.target.value }))}
            />
          </Field>
          <Field label={t.common.description}>
            <textarea
              style={styles.textarea}
              value={draft.description}
              placeholder={t.step3.strengthDescPlaceholder}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </Field>
          <button type="button" style={styles.btn} onClick={add}>
            {t.step3.strengths}
          </button>
        </div>
      )}

      {(value || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          {(value || []).map((row, idx) => (
            <div key={idx} style={{ ...styles.itemCard, marginBottom: 10 }}>
              <button type="button" style={styles.itemDel} onClick={() => remove(idx)}>
                {t.common.delete}
              </button>
              <div style={styles.itemGrid}>
                <div style={styles.itemLabel}>{t.common.category}</div>
                <div>{t.categories[row.category] || row.category}</div>
                <div style={styles.itemLabel}>{t.common.strength}</div>
                <div>{row.strength}</div>
                <div style={styles.itemLabel}>{t.common.description}</div>
                <div>{row.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Schema 생성 함수들
const getExperienceSchema = (t) => [
  { key: "company", label: t.step3.experienceCompany, placeholder: t.step3.experienceCompanyPlaceholder },
  { key: "position", label: t.step3.experiencePosition, placeholder: t.step3.experiencePositionPlaceholder },
  { key: "startDate", label: t.step3.experienceStartDate, placeholder: t.step3.experienceStartDatePlaceholder },
  { key: "endDate", label: t.step3.experienceEndDate, placeholder: t.step3.experienceEndDatePlaceholder },
  { key: "description", label: t.step3.experienceDescription, placeholder: t.step3.experienceDescriptionPlaceholder, as: "textarea" },
];

const getAwardSchema = (t) => [
  { key: "title", label: t.step3.awardTitle, placeholder: t.step3.awardTitlePlaceholder },
  { key: "organization", label: t.step3.awardOrganization, placeholder: t.step3.awardOrganizationPlaceholder },
  { key: "awardDate", label: t.step3.awardDate, placeholder: t.step3.awardDatePlaceholder },
  { key: "description", label: t.step3.awardDescription, placeholder: t.step3.awardDescriptionPlaceholder, as: "textarea" },
];

const getCertificationSchema = (t) => [
  { key: "name", label: t.step3.certName, placeholder: t.step3.certNamePlaceholder },
  { key: "issuer", label: t.step3.certIssuer, placeholder: t.step3.certIssuerPlaceholder },
  { key: "issueDate", label: t.step3.certIssueDate, placeholder: t.step3.certIssueDatePlaceholder },
  { key: "expiryDate", label: t.step3.certExpiryDate, placeholder: t.step3.certExpiryDatePlaceholder },
  { key: "certificationNumber", label: t.step3.certNumber, placeholder: t.step3.certNumberPlaceholder },
];

const getProjectSchema = (t) => [
  { key: "title", label: t.step3.projectTitle, placeholder: t.step3.projectTitlePlaceholder },
  { key: "role", label: t.step3.projectRole, placeholder: t.step3.projectRolePlaceholder },
  { key: "startDate", label: t.step3.projectStartDate, placeholder: t.step3.projectStartDatePlaceholder },
  { key: "endDate", label: t.step3.projectEndDate, placeholder: t.step3.projectEndDatePlaceholder },
  { key: "technologies", label: t.step3.projectTechnologies, placeholder: t.step3.projectTechnologiesPlaceholder, as: "textarea" },
  { key: "achievement", label: t.step3.projectAchievement, placeholder: t.step3.projectAchievementPlaceholder, as: "textarea" },
  { key: "url", label: t.step3.projectUrl, placeholder: t.step3.projectUrlPlaceholder },
  { key: "description", label: t.step3.projectDescription, placeholder: t.step3.projectDescriptionPlaceholder, as: "textarea" },
];

// eslint-disable-next-line no-unused-vars
export default function SignUp({ language: propLanguage, onLanguageChange: propOnLanguageChange }) {
  const { get, post } = useApi();
  const [step, setStep] = useState(1);
  
  // 언어 상태 관리 (props가 있으면 사용, 없으면 localStorage에서 가져오기)
  const [language, setLanguage] = useState(() => {
    if (propLanguage) return propLanguage;
    return localStorage.getItem('language') || 'ko';
  });
  
  // props가 변경되면 동기화
  useEffect(() => {
    if (propLanguage) {
      setLanguage(propLanguage);
    }
  }, [propLanguage]);

  const t = TRANSLATIONS[language];

  // ===== 1단계 =====
  const [name, setName] = useState("");
  const [gender, setGender] = useState(0);
  const [email, setEmail] = useState("");
  const [emailChecked, setEmailChecked] = useState(null);
  const [emailFormatError, setEmailFormatError] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwChecked, setPwChecked] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const pwValid = useMemo(() => pw.length >= 6 && pw === pw2, [pw, pw2]);

  const [step1Payload, setStep1Payload] = useState(null);

  // 이메일 형식 검증 함수
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkEmail = async () => {
    if (!email) {
      alert(t.step1.emailRequired);
      return;
    }
    if (!isValidEmail(email)) {
      setEmailFormatError(t.step1.emailInvalidFormat);
      setEmailChecked(null);
      return;
    }
    setEmailFormatError(""); // 형식이 올바르면 오류 메시지 제거
    try {
      const r = await get(`/auth/email-available?email=${encodeURIComponent(email)}`);
      setEmailChecked(r.available);
    } catch (error) {
      console.error("이메일 중복 확인 오류:", error);
      alert(t.step1.emailCheckError);
      setEmailChecked(null);
    }
  };

  const handleCheckPw = () => {
    if (pw.length < 6) {
      setPwMsg(t.step1.passwordTooShort);
      setPwChecked(true);
      return;
    }
    if (pw !== pw2) {
      setPwMsg(t.step1.passwordMismatch);
      setPwChecked(true);
      return;
    }
    setPwMsg("");
    setPwChecked(true);
  };

  const submitStep1 = async () => {
    if (emailChecked !== true) throw new Error(t.step1.emailCheckRequired);
    if (!pwChecked) throw new Error(t.step1.passwordCheckRequired);
    if (!pwValid) throw new Error(pwMsg || t.step1.passwordInvalid);
    if (!name.trim()) throw new Error(t.step1.nameRequired);
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
      setCompanyMsg(t.step2.companyRegistered);
    } else {
      setCompanyId(null);
      setCompanyExists(false);
      setCompanyMsg(t.step2.companyNotRegistered);
    }
  };

  const createCompany = async () => {
    if (!searched || companyExists || !companyName.trim()) return;
    const r = await post("/companies", { name: companyName.trim() });
    setCompanyId(r.companyId);
    setCompanyExists(true);
    setCompanyMsg(t.step2.companyCreated);
  };

  const [step2Payload, setStep2Payload] = useState(null);

  const submitStep2 = async () => {
    if (!step1Payload) throw new Error("1단계가 선행되어야 합니다.");
    if (employed === "no") {
      setStep2Payload({ employed: "no" });
      setStep(3);
      return;
    }
    if (!companyId && !companyName) throw new Error(t.step2.companyRequired);
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
    if (!step1Payload) return alert(t.step3.step1Required);
    if (!step2Payload) return alert(t.step3.step2Required);

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

      alert(t.step3.success);
      window.location.reload();
    } catch (e) {
      alert(e.message || t.step3.error);
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
          <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{t.title}</div>
          <div style={styles.hint}>{t.step} {step} / 3</div>
        </div>
        <div style={{ height: 6, background: "#f3f4f6", borderRadius: 999 }}>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              width: `${(step / 3) * 100}%`,
              background: "linear-gradient(90deg,#9370DB,#6A5ACD)",
              transition: "width .3s ease",
            }}
          />
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>{t.step1.title}</div>
          <div style={{ marginTop: 12 }}>
            <Field label={t.step1.name}>
              <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.step1.name} />
            </Field>

            <Field label={t.step1.gender}>
              <select style={styles.select} value={gender} onChange={(e) => setGender(Number(e.target.value))}>
                {getGenderOptions(t.step1).map((g) => (
                  <option value={g.value} key={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t.step1.email}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input
                  style={styles.input}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailChecked(null);
                    setEmailFormatError(""); // 입력 시 오류 메시지 제거
                  }}
                  // ⛔️ onBlur={checkEmail} 제거하여 버튼으로만 중복확인
                  placeholder={t.step1.emailPlaceholder}
                />
                <button 
                  type="button" 
                  style={{...styles.btnGhost, border: "2px solid #9370DB", color: "#9370DB"}} 
                  onClick={checkEmail}
                >
                  {t.step1.emailCheck}
                </button>
              </div>
              {emailFormatError && <div style={styles.danger}>{emailFormatError}</div>}
              {!emailFormatError && emailChecked === true && <div style={styles.success}>{t.step1.emailAvailable}</div>}
              {!emailFormatError && emailChecked === false && <div style={styles.danger}>{t.step1.emailUnavailable}</div>}
            </Field>

            <div style={styles.row}>
              <Field label={t.step1.password}>
                <input
                  type="password"
                  style={styles.input}
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value);
                    setPwChecked(false);
                    setPwMsg("");
                  }}
                  placeholder={t.step1.passwordPlaceholder}
                />
              </Field>
              <Field label={t.step1.passwordConfirm}>
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
                    placeholder={t.step1.passwordConfirmPlaceholder}
                  />
                  <button 
                    type="button" 
                    style={{...styles.btnGhost, border: "2px solid #9370DB", color: "#9370DB"}} 
                    onClick={handleCheckPw}
                  >
                    {t.step1.passwordCheck}
                  </button>
                </div>
                {pwChecked && pwMsg && <div style={styles.danger}>{pwMsg}</div>}
                {pwChecked && !pwMsg && pwValid && <div style={styles.success}>{t.step1.passwordMatch}</div>}
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
              {t.step1.next}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>{t.step2.title}</div>

          <Field label={t.step2.employed}>
            <div style={{ display: "flex", gap: 12 }}>
              <label>
                <input type="radio" name="emp" value="yes" checked={employed === "yes"} onChange={() => setEmployed("yes")} /> {t.step2.yes}
              </label>
              <label>
                <input type="radio" name="emp" value="no" checked={employed === "no"} onChange={() => setEmployed("no")} /> {t.step2.no}
              </label>
            </div>
          </Field>

          {employed === "yes" ? (
            <>
              <Field label={t.step2.companySearch}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
                  <input
                    style={styles.input}
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setCompanyExists(false);
                      setSearched(false); // 입력 변경 시 재검색 필요
                    }}
                    placeholder={t.step2.companyPlaceholder}
                  />
                  <button 
                    type="button" 
                    style={{...styles.btnGhost, border: "2px solid #9370DB", color: "#9370DB"}} 
                    onClick={() => searchCompany().catch((e) => alert(e.message))}
                  >
                    {t.step2.search}
                  </button>
                  <button
                    type="button"
                    onClick={() => createCompany().catch((e) => alert(e.message))}
                    style={canCreateCompany ? {...styles.btnGhost, border: "2px solid #9370DB", color: "#9370DB"} : styles.btnGhostDisabled}
                    disabled={!canCreateCompany}
                    title={
                      !searched
                        ? t.step2.searchFirst
                        : companyExists
                        ? t.step2.companyAlreadyExists
                        : ""
                    }
                  >
                    {t.step2.addCompany}
                  </button>
                </div>
                {companyMsg && (
                  <div style={{ marginTop: 8, fontWeight: 700, color: companyExists ? "#059669" : "#9370DB" }}>
                    {companyMsg}
                  </div>
                )}
              </Field>

              <Field label={t.step2.position}>
                <input style={styles.input} value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} placeholder={t.step2.positionPlaceholder} />
              </Field>
            </>
          ) : null}

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
            <button type="button" style={{...styles.btnGhost, border: "2px solid #9370DB", color: "#9370DB"}} onClick={() => setStep(1)}>
              {t.step2.previous}
            </button>
            <button type="button" style={styles.btn} onClick={() => submitStep2().catch((e) => alert(e.message))}>
              {t.step2.next}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>{t.step3.title}</div>

          <ArrayEditor
            title={t.step3.experiences}
            schema={getExperienceSchema(t)}
            value={experiences}
            onChange={setExperiences}
            language={language}
          />

          <ArrayEditor
            title={t.step3.awards}
            schema={getAwardSchema(t)}
            value={awards}
            onChange={setAwards}
            language={language}
          />

          <ArrayEditor
            title={t.step3.certifications}
            schema={getCertificationSchema(t)}
            value={certifications}
            onChange={setCertifications}
            language={language}
          />

          <ArrayEditor
            title={t.step3.projects}
            schema={getProjectSchema(t)}
            value={projects}
            onChange={setProjects}
            language={language}
          />

          <StrengthsEditor value={strengths} onChange={setStrengths} language={language} />

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
            <button type="button" style={{...styles.btnGhost, border: "2px solid #9370DB", color: "#9370DB"}} onClick={() => setStep(2)}>
              {t.step3.previous}
            </button>
            <button type="button" style={{ ...styles.btn, opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={submitProfile}>
              {saving ? t.step3.processing : t.step3.complete}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
