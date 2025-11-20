import React, { useEffect, useState, useCallback } from "react";

/** API base */
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

// 다국어 지원
const TRANSLATIONS = {
  ko: {
    sections: {
      info: "내 정보",
      experience: "경력",
      awards: "수상이력",
      certifications: "자격증",
      projects: "프로젝트",
      strengths: "강점",
      reputations: "받은 평판",
    },
    empty: {
      info: "정보가 존재하지 않습니다.",
      experience: "경력 정보가 존재하지 않습니다.",
      awards: "수상이력 정보가 존재하지 않습니다.",
      certifications: "자격증 정보가 존재하지 않습니다.",
      projects: "프로젝트 정보가 존재하지 않습니다.",
      strengths: "강점 정보가 존재하지 않습니다.",
      reputations: "평판 정보가 존재하지 않습니다.",
    },
    buttons: {
      add: "추가",
      edit: "수정",
      delete: "삭제",
      save: "저장",
      cancel: "취소",
    },
    labels: {
      company: "회사명",
      position: "직책/직위",
      startDate: "시작일",
      endDate: "종료일",
      description: "업무 내용",
      title: "수상명",
      organization: "수여기관",
      awardDate: "수상일",
      name: "자격증명",
      issuer: "발급기관",
      issueDate: "발급일",
      expiryDate: "만료일",
      certificationNumber: "자격증 번호",
      projectTitle: "프로젝트명",
      role: "역할",
      technologies: "사용 기술",
      achievement: "성과",
      url: "URL",
      category: "카테고리",
      strength: "강점",
      general: "일반",
      // 내 정보 섹션
      fullName: "이름",
      email: "이메일",
      emailReadOnly: "이메일(수정 불가)",
      newPassword: "새 비밀번호",
      newPasswordConfirm: "새 비밀번호 확인",
      birthDate: "생년월일",
      gender: "성별",
      phone: "휴대전화번호",
      postCode: "우편번호",
      address: "주소",
      addressDetail: "상세주소",
    },
    genderOptions: {
      none: "선택 안 함",
      male: "남성",
      female: "여성",
    },
    placeholders: {
      strength: "카테고리를 구체화한 나의 강점",
      strengthDesc: "강점으로 달성한 것, 구체적인 경험/성과",
      // 내 정보 섹션
      fullName: "이름",
      newPassword: "새 비밀번호 (6자 이상)",
      newPasswordConfirm: "새 비밀번호 확인",
      phone: "010-0000-0000",
      postCode: "우편번호",
      address: "주소",
      addressDetail: "상세주소",
    },
    reputation: {
      userEmail: "평판을 작성할 사용자 이메일",
      category: "평판 카테고리",
      rating: "별점 (1-5)",
      comment: "코멘트",
      commentPlaceholder: "평판 코멘트를 작성해주세요...",
      searchUser: "검색",
      searching: "검색 중...",
      userFound: "사용자를 찾았습니다",
      userNotFound: "해당 이메일의 사용자를 찾을 수 없습니다.",
      searchError: "사용자 검색 중 오류가 발생했습니다.",
      emailRequired: "이메일을 입력해주세요.",
      userRequired: "먼저 사용자를 검색해주세요.",
      categoryRequired: "카테고리를 선택해주세요.",
      ratingRequired: "별점을 선택해주세요 (1-5점).",
      commentRequired: "코멘트를 입력해주세요.",
      created: "평판을 작성했습니다.",
      error: "평판 작성 중 오류가 발생했습니다.",
      defaultCategory: "평판",
      fromName: "작성자",
      createdAt: "작성일",
    },
    alerts: {
      passwordConfirm: "새 비밀번호를 다시 입력해 확인해주세요.",
      passwordMismatch: "새 비밀번호와 확인 비밀번호가 일치하지 않습니다.",
      passwordTooShort: "비밀번호는 6자 이상으로 작성해주세요.",
      saved: "수정했습니다.",
      saveError: "수정 중 오류가 발생했습니다.",
      added: "추가했습니다.",
      updated: "수정했습니다.",
      deleted: "삭제했습니다.",
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
    reputationCategories: {
      collaboration: "협업능력",
      expertise: "전문성",
      responsibility: "책임감",
      leadership: "리더십",
      communication: "커뮤니케이션",
      problemSolving: "문제해결",
      creativity: "창의성",
      timeManagement: "시간관리",
      other: "기타",
    },
    permissions: {
      title: "🔑 상세정보 권한 관리",
      description: "추천서 작성자에게 내 상세정보 접근 권한을 부여하고 관리하세요",
      whatIs: "권한 관리란?",
      whatIsDesc: "추천서를 작성할 사람의 이메일을 추가하면, 추가한 사람들만 자신의 상세정보(경력, 수상, 프로젝트 등)를 볼 수 있습니다.\n추천서 작성이 끝나면 언제든 권한을 취소할 수 있습니다.",
      addTitle: "➕ 권한 추가",
      emailLabel: "이메일 주소",
      emailPlaceholder: "prof@university.com",
      noteLabel: "메모 (선택)",
      notePlaceholder: "예: 이교수님 추천서용",
      grant: "권한 부여",
      listTitle: "📋 부여한 권한 목록",
      noPermissions: "부여한 권한이 없습니다",
      added: "추가",
      revoke: "취소",
      grantSuccess: "상세정보 조회 권한을 부여했습니다.",
      revokeSuccess: "권한이 취소되었습니다.",
      revokeConfirm: "의 조회 권한을 취소하시겠습니까?",
      grantError: "권한 부여에 실패했습니다.",
      revokeError: "권한 취소에 실패했습니다.",
      emailRequired: "이메일을 입력해주세요.",
      emailInvalid: "올바른 이메일 형식을 입력해주세요.",
      userInfoError: "사용자 정보를 불러올 수 없습니다. 페이지를 새로고침 해주세요.",
      userInfoError2: "사용자 정보를 불러올 수 없습니다.",
    },
    loading: "정보 불러오는 중…",
  },
  en: {
    sections: {
      info: "My Info",
      experience: "Experience",
      awards: "Awards",
      certifications: "Certifications",
      projects: "Projects",
      strengths: "Strengths",
      reputations: "Received Reputations",
    },
    empty: {
      info: "No information available.",
      experience: "No experience information available.",
      awards: "No awards information available.",
      certifications: "No certifications information available.",
      projects: "No projects information available.",
      strengths: "No strengths information available.",
      reputations: "No reputations information available.",
    },
    buttons: {
      add: "Add",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      cancel: "Cancel",
    },
    labels: {
      company: "Company",
      position: "Position",
      startDate: "Start Date",
      endDate: "End Date",
      description: "Description",
      title: "Award Title",
      organization: "Organization",
      awardDate: "Award Date",
      name: "Certification Name",
      issuer: "Issuer",
      issueDate: "Issue Date",
      expiryDate: "Expiry Date",
      certificationNumber: "Certification Number",
      projectTitle: "Project Title",
      role: "Role",
      technologies: "Technologies",
      achievement: "Achievement",
      url: "URL",
      category: "Category",
      strength: "Strength",
      general: "General",
      // 내 정보 섹션
      fullName: "Name",
      email: "Email",
      emailReadOnly: "Email (Read-only)",
      newPassword: "New Password",
      newPasswordConfirm: "Confirm New Password",
      birthDate: "Date of Birth",
      gender: "Gender",
      phone: "Phone Number",
      postCode: "Postal Code",
      address: "Address",
      addressDetail: "Address Detail",
    },
    genderOptions: {
      none: "Not specified",
      male: "Male",
      female: "Female",
    },
    placeholders: {
      strength: "My specific strength in this category",
      strengthDesc: "Achievements and specific experiences/outcomes",
      // 내 정보 섹션
      fullName: "Name",
      newPassword: "New password (6 characters or more)",
      newPasswordConfirm: "Confirm new password",
      phone: "010-0000-0000",
      postCode: "Postal code",
      address: "Address",
      addressDetail: "Address detail",
    },
    reputation: {
      userEmail: "User Email for Reputation",
      category: "Reputation Category",
      rating: "Rating (1-5)",
      comment: "Comment",
      commentPlaceholder: "Please write a reputation comment...",
      searchUser: "Search",
      searching: "Searching...",
      userFound: "User found",
      userNotFound: "User with this email not found.",
      searchError: "An error occurred while searching for user.",
      emailRequired: "Please enter an email.",
      userRequired: "Please search for a user first.",
      categoryRequired: "Please select a category.",
      ratingRequired: "Please select a rating (1-5).",
      commentRequired: "Please enter a comment.",
      created: "Reputation created.",
      error: "An error occurred while creating reputation.",
      defaultCategory: "Reputation",
      fromName: "From",
      createdAt: "Created",
    },
    alerts: {
      passwordConfirm: "Please re-enter your new password to confirm.",
      passwordMismatch: "New password and confirmation password do not match.",
      passwordTooShort: "Password must be at least 6 characters.",
      saved: "Saved.",
      saveError: "An error occurred while saving.",
      added: "Added.",
      updated: "Updated.",
      deleted: "Deleted.",
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
    reputationCategories: {
      collaboration: "Collaboration",
      expertise: "Expertise",
      responsibility: "Responsibility",
      leadership: "Leadership",
      communication: "Communication",
      problemSolving: "Problem Solving",
      creativity: "Creativity",
      timeManagement: "Time Management",
      other: "Other",
    },
    permissions: {
      title: "🔑 Detail Information Permission Management",
      description: "Grant and manage access permissions for your detailed information to recommendation writers",
      whatIs: "What is Permission Management?",
      whatIsDesc: "By adding the email of professors or supervisors who will write recommendations, only they can view your detailed information (experience, awards, projects, etc.).\nYou can revoke permissions at any time after the recommendation is written.",
      addTitle: "➕ Add Permission",
      emailLabel: "Email Address",
      emailPlaceholder: "prof@university.com",
      noteLabel: "Note (Optional)",
      notePlaceholder: "e.g., For Prof. Lee's recommendation",
      grant: "Grant Permission",
      listTitle: "📋 Granted Permissions List",
      noPermissions: "No permissions granted",
      added: "Added",
      revoke: "Revoke",
      grantSuccess: "Detail information access permission granted.",
      revokeSuccess: "Permission revoked.",
      revokeConfirm: "'s access permission?",
      grantError: "Failed to grant permission.",
      revokeError: "Failed to revoke permission.",
      emailRequired: "Please enter an email.",
      emailInvalid: "Please enter a valid email format.",
      userInfoError: "Unable to load user information. Please refresh the page.",
      userInfoError2: "Unable to load user information.",
    },
    loading: "Loading information…",
  },
};

/** 스타일 */
const styles = {
  card: { background: "white", borderRadius: 16, boxShadow: "0 4px 6px rgba(0,0,0,.07)", padding: 20, marginBottom: 60 },
  sectionTitle: { fontSize: "1.25rem", fontWeight: 800, marginBottom: 12, background: "linear-gradient(to right, #9370DB, #6A5ACD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  input: { width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 14 },
  inputDisabled: { width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 14, background: "#f3f4f6", color: "#9ca3af", cursor: "not-allowed" },
  button: { padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700 },
  dangerBtn: { background: "linear-gradient(to right, #e9d5ff, #ddd6fe)", color: "#7c3aed", border: "1px solid #c084fc" },
  primaryBtn: { background: "linear-gradient(to right, #9370DB, #6A5ACD)", color: "white" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  mutedBox: { background: "#f9fafb", border: "1px dashed #e5e7eb", borderRadius: 12, padding: 12, color: "#6b7280" },
  itemCard: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, boxShadow: "0 4px 10px rgba(0,0,0,0.05)", position: "relative", marginBottom: 20 },
  itemLabel: { fontWeight: 700, color: "#6b7280", minWidth: 110, display: "inline-block" },
};

/** API 유틸 */
function useApi() {
  const authHeader = () => {
    const t = localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  };
  const get = (p) =>
    fetch(`${API_BASE}${p}`, { headers: { ...authHeader() } }).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.detail || r.statusText);
      return j;
    });
  const send = (method, p, body) =>
    fetch(`${API_BASE}${p}`, {
      method,
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: body ? JSON.stringify(body) : undefined,
    }).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.detail || r.statusText);
      return j;
    });
  return { get, post: (p, b) => send("POST", p, b), put: (p, b) => send("PUT", p, b), del: (p) => send("DELETE", p) };
}

/** 아코디언 */
function Accordion({ title, openByDefault = true, children }) {
  const [open, setOpen] = useState(openByDefault);
  return (
    <div style={styles.card}>
      <button
        onClick={() => setOpen(!open)}
        style={{ ...styles.button, background: "transparent", color: "#374151", padding: 0, marginBottom: 8 }}
        aria-expanded={open}
      >
        <span style={styles.sectionTitle}>{title}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

/** 공통 인라인 폼 */
function InlineForm({ schema, onSubmit, onCancel, defaults = {}, language = 'ko' }) {
  const [draft, setDraft] = useState(schema.reduce((o, f) => ({ ...o, [f.key]: defaults[f.key] ?? "" }), {}));
  const t = TRANSLATIONS[language];
  return (
    <div className="inline-form" style={{ ...styles.card, background: "#faf5ff", border: "1px solid #e9d5ff" }}>
      <div style={{ ...styles.row }}>
        {schema.map((f) => (
          <div key={f.key}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{f.label}</div>
            {f.as === "textarea" ? (
              <textarea
                style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
                value={draft[f.key] || ""}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                placeholder={f.placeholder}
              />
            ) : (
              <input
                style={styles.input}
                type={f.type || "text"}
                value={draft[f.key] || ""}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" style={{ ...styles.button, ...styles.primaryBtn }} onClick={() => onSubmit(draft)}>
          {t.buttons.save}
        </button>
        <button type="button" style={{ ...styles.button }} onClick={onCancel}>
          {t.buttons.cancel}
        </button>
      </div>
    </div>
  );
}

// 평판 카테고리 키
const REPUTATION_CATEGORY_KEYS = [
  "collaboration",
  "expertise",
  "responsibility",
  "leadership",
  "communication",
  "problemSolving",
  "creativity",
  "timeManagement",
  "other",
];

// 평판 작성 폼 컴포넌트 - Profile 외부로 이동하여 리렌더링 시 재생성 방지
const ReputationForm = React.memo(({ onSubmit, onCancel, searchingUser, searchUserByEmail, language = 'ko' }) => {
  // InlineForm처럼 내부에서 상태 관리
  const [draft, setDraft] = useState({
    userEmail: "",
    category: "",
    rating: 0,
    comment: "",
  });
  const [localSearchedUser, setLocalSearchedUser] = useState(null);
  const t = TRANSLATIONS[language];

  return (
    <div className="inline-form" style={{ ...styles.card, background: "#faf5ff", border: "1px solid #e9d5ff", marginBottom: 16 }}>
      {/* 사용자 검색 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{t.reputation.userEmail}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={styles.input}
            type="email"
            value={draft.userEmail || ""}
            onChange={(e) => setDraft({ ...draft, userEmail: e.target.value })}
            placeholder="user@example.com"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                searchUserByEmail(draft.userEmail, setLocalSearchedUser);
              }
            }}
          />
          <button
            type="button"
            style={{ ...styles.button, ...styles.primaryBtn }}
            onClick={() => searchUserByEmail(draft.userEmail, setLocalSearchedUser)}
            disabled={searchingUser}
          >
            {searchingUser ? t.reputation.searching : t.reputation.searchUser}
          </button>
        </div>
        {localSearchedUser && (
          <div style={{ marginTop: 8, padding: 8, background: "#f0fdf4", borderRadius: 8, border: "1px solid #86efac" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>
              ✓ {localSearchedUser.name || localSearchedUser.nickname} ({localSearchedUser.email})
            </div>
          </div>
        )}
      </div>

      {/* 카테고리 선택 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{t.reputation.category}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {REPUTATION_CATEGORY_KEYS.map((key) => {
            const categoryLabel = t.reputationCategories[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setDraft({ ...draft, category: key })}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: draft.category === key ? "2px solid #9370DB" : "2px solid #e5e7eb",
                  background: draft.category === key ? "#e9d5ff" : "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all .15s",
                  fontSize: 13,
                }}
              >
                {categoryLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* 별점 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{t.reputation.rating}</div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setDraft({ ...draft, rating: star })}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 28,
                color: draft.rating >= star ? "#9370DB" : "#d1d5db",
                transition: "all .15s",
                padding: 4,
              }}
              title={`${star}${language === 'ko' ? '점' : ''}`}
            >
              ★
            </button>
          ))}
          {draft.rating > 0 && (
            <span style={{ fontSize: 14, fontWeight: 600, color: "#6b7280", marginLeft: 8 }}>
              {draft.rating}{language === 'ko' ? '점' : ''}
            </span>
          )}
        </div>
      </div>

      {/* 코멘트 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{t.reputation.comment}</div>
        <textarea
          style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
          value={draft.comment || ""}
          onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
          placeholder={t.reputation.commentPlaceholder}
        />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          style={{ ...styles.button, ...styles.primaryBtn }}
          onClick={() => {
            // 검색된 사용자가 있는지 확인
            if (!localSearchedUser) {
              window.alert(t.reputation.userRequired);
              return;
            }
            onSubmit({
              ...draft,
              target_user_id: localSearchedUser.id,
            });
          }}
        >
          {t.buttons.save}
        </button>
        <button
          type="button"
          style={{ ...styles.button }}
          onClick={() => {
            onCancel();
          }}
        >
          {t.buttons.cancel}
        </button>
      </div>
    </div>
  );
});

export default function Profile({ initialSection: _initialSection, onLoaded, loading, permissionsOnly = false, language = 'ko' }) { // eslint-disable-line no-unused-vars
  const { get, post, put, del } = useApi();
  const t = TRANSLATIONS[language];

  // ===== 내 정보 =====
  const [me, setMe] = useState(null);
  const [pwd, setPwd] = useState({ p1: "", p2: "" });
  const [isBootLoading, setIsBootLoading] = useState(true);

  const loadInfo = async () => {
    const info = await get("/profile/info");
    setMe(info);
    return info; // 사용자 정보 반환
  };

  const saveInfo = async () => {
    // ✅ 검증 순서: 재입력 누락 → 불일치 → 길이(6자 이상)
    if (pwd.p1 && !pwd.p2) {
      window.alert(t.alerts.passwordConfirm);
      return;
    }
    if (pwd.p1 && pwd.p2 && pwd.p1 !== pwd.p2) {
      window.alert(t.alerts.passwordMismatch);
      return;
    }
    if ((pwd.p1 || pwd.p2) && (pwd.p1.length < 6 || pwd.p2.length < 6)) {
      window.alert(t.alerts.passwordTooShort);
      return;
    }

    const payload = {
      name: me?.name ?? "",
      birth: me?.birth || null,
      gender: Number(me?.gender ?? 0),
      phone: me?.phone || null,
      postCode: me?.postCode || null,
      address: me?.address || null,
      addressDetail: me?.addressDetail || null,
    };
    const pwdBlock = pwd.p1 || pwd.p2 ? { new_password: pwd.p1, new_password_confirm: pwd.p2 } : null;

    try {
      await put("/profile/info", { ...payload, ...(pwdBlock ? { pwd: pwdBlock } : {}) });
      window.alert(t.alerts.saved);
      // ✅ 성공 시 비밀번호 입력칸 초기화
      setPwd({ p1: "", p2: "" });
    } catch (e) {
      window.alert(e?.message || t.alerts.saveError);
    }
  };

  // ===== 리스트 상태 =====
  const [expList, setExpList] = useState([]);
  const [awardList, setAwardList] = useState([]);
  const [certList, setCertList] = useState([]);
  const [projList, setProjList] = useState([]);
  const [strengthList, setStrengthList] = useState([]);
  const [repList, setRepList] = useState([]);

  // 폼 열림/편집 상태
  const [openForm, setOpenForm] = useState({ exp: false, award: false, cert: false, proj: false, strength: false });
  const [editRow, setEditRow] = useState({ type: null, data: null });

  // ===== 권한 관리 상태 =====
  const [permissionList, setPermissionList] = useState([]);
  const [permissionEmail, setPermissionEmail] = useState("");
  const [permissionNote, setPermissionNote] = useState("");

  // 평판 작성 관련 상태
  const [openRepForm, setOpenRepForm] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);

  // 사용자 검색 (이메일로) - 콜백 함수 지원 - useCallback으로 메모이제이션하여 안정적인 참조 유지
  // early return 전에 정의해야 함
  const searchUserByEmail = useCallback(async (email, setSearchedUserCallback = null) => {
    if (!email || !email.trim()) {
      window.alert(t.reputation.emailRequired);
      return;
    }
    setSearchingUser(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/lookup`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ search: email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t.reputation.userNotFound);
      
      if (data.exists && data.users && data.users.length > 0) {
        const user = data.users.find(u => u.email === email) || data.users[0];
        if (setSearchedUserCallback) {
          setSearchedUserCallback(user);
        }
        window.alert(`${t.reputation.userFound}: ${user.name || user.nickname} (${user.email})`);
        return user;
      } else {
        window.alert(t.reputation.userNotFound);
        if (setSearchedUserCallback) {
          setSearchedUserCallback(null);
        }
        return null;
      }
    } catch (e) {
      window.alert(e?.message || t.reputation.searchError);
      if (setSearchedUserCallback) {
        setSearchedUserCallback(null);
      }
      return null;
    } finally {
      setSearchingUser(false);
    }
  }, [t]);

  const loadAll = async (userInfo = null) => {
    const user = userInfo || me; // 파라미터로 받거나 state에서 가져오기
    try {
      const [exps, awards, certs, projs, strengths, reps, perms] = await Promise.allSettled([
        get("/profile/experiences"),
        get("/profile/awards"),
        get("/profile/certifications"),
        get("/profile/projects"),
        get("/profile/strengths"),
        get("/profile/reputations"),
        user?.email ? get(`/my-permissions/0?user_email=${encodeURIComponent(user.email)}`) : 
        user?.id ? get(`/my-permissions/${user.id}`) : 
        Promise.resolve({ permissions: [] }),
      ]);
      setExpList(exps.status === "fulfilled" ? (exps.value.items || []) : []);
      setAwardList(awards.status === "fulfilled" ? (awards.value.items || []) : []);
      setCertList(certs.status === "fulfilled" ? (certs.value.items || []) : []);
      setProjList(projs.status === "fulfilled" ? (projs.value.items || []) : []);
      setStrengthList(strengths.status === "fulfilled" ? (strengths.value.items || []) : []);
      setRepList(reps.status === "fulfilled" ? (reps.value.items || []) : []);
      setPermissionList(perms.status === "fulfilled" ? (perms.value.permissions || []) : []);
    } catch (e) {
      console.error("loadAll error:", e);
      // 에러가 발생해도 빈 배열로 설정하여 다른 섹션은 정상 작동하도록
      setExpList([]);
      setAwardList([]);
      setCertList([]);
      setProjList([]);
      setStrengthList([]);
      setRepList([]);
      setPermissionList([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    setIsBootLoading(true); // permissionsOnly 변경 시 로딩 상태 초기화
    // permissionsOnly가 true면 권한 데이터만 로드, false면 전체 데이터 로드
    (async () => {
      try {
        const userInfo = await loadInfo(); // 먼저 사용자 정보 로드
        if (permissionsOnly) {
          // 권한 관리만 필요한 경우 권한 데이터만 로드
          const user = userInfo || me;
          try {
            const perms = await (user?.email ? get(`/my-permissions/0?user_email=${encodeURIComponent(user.email)}`) : 
                                user?.id ? get(`/my-permissions/${user.id}`) : 
                                Promise.resolve({ permissions: [] }));
            if (mounted) {
              setPermissionList(perms.permissions || []);
            }
          } catch (e) {
            console.error("권한 데이터 로드 오류:", e);
            if (mounted) setPermissionList([]);
          }
        } else {
          // 전체 프로필 데이터 로드
          await loadAll(userInfo);
        }
        if (mounted && typeof onLoaded === "function") onLoaded(true);
      } catch {
        if (mounted && typeof onLoaded === "function") onLoaded(false);
      } finally {
        if (mounted) setIsBootLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsOnly]);

    if (isBootLoading || loading) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 0" }}>
        <div style={{
          padding: "24px", borderRadius: 16, border: "1px solid #fde68a",
          background: "#fffbeb", textAlign: "center", fontWeight: 600
        }}>
          {t.loading}
        </div>
      </div>
    );
  }

// ===== 내 정보 렌더 =====
  const renderInfo = () => (
    <div id="section-info">
      <Accordion title={t.sections.info}>
        {!me ? (
          <div style={styles.mutedBox}>{t.empty.info}</div>
        ) : (
          <>
            <div style={styles.row}>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>{t.labels.fullName}</label>
                <input style={styles.input} value={me.name || ""} onChange={(e) => setMe({ ...me, name: e.target.value })} placeholder={t.placeholders.fullName} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>{t.labels.emailReadOnly}</label>
                <input style={styles.inputDisabled} value={me.email || ""} disabled />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>{t.labels.newPassword}</label>
                <input style={styles.input} type="password" value={pwd.p1} onChange={(e) => setPwd({ ...pwd, p1: e.target.value })} placeholder={t.placeholders.newPassword} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>{t.labels.newPasswordConfirm}</label>
                <input style={styles.input} type="password" value={pwd.p2} onChange={(e) => setPwd({ ...pwd, p2: e.target.value })} placeholder={t.placeholders.newPasswordConfirm} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>{t.labels.birthDate}</label>
                <input style={styles.input} type="date" value={me.birth || ""} onChange={(e) => setMe({ ...me, birth: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>{t.labels.gender}</label>
                <select style={styles.input} value={Number(me.gender ?? 0)} onChange={(e) => setMe({ ...me, gender: Number(e.target.value) })}>
                  <option value={0}>{t.genderOptions.none}</option>
                  <option value={1}>{t.genderOptions.male}</option>
                  <option value={2}>{t.genderOptions.female}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>{t.labels.phone}</label>
                <input style={styles.input} value={me.phone || ""} onChange={(e) => setMe({ ...me, phone: e.target.value })} placeholder={t.placeholders.phone} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>{t.labels.postCode}</label>
                <input style={styles.input} value={me.postCode || ""} onChange={(e) => setMe({ ...me, postCode: e.target.value })} placeholder={t.placeholders.postCode} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>{t.labels.address}</label>
                <input style={styles.input} value={me.address || ""} onChange={(e) => setMe({ ...me, address: e.target.value })} placeholder={t.placeholders.address} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>{t.labels.addressDetail}</label>
                <input style={styles.input} value={me.addressDetail || ""} onChange={(e) => setMe({ ...me, addressDetail: e.target.value })} placeholder={t.placeholders.addressDetail} />
              </div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={saveInfo}>{t.buttons.save}</button>
            </div>
          </>
        )}
      </Accordion>
    </div>
  );

  // ===== 공통 리스트 렌더(폼을 카드 내부에 표시) =====
  const renderList = (title, list, emptyText, onAddClick, onEditClick, onDelete, formNode = null) => (
    <div>
      <Accordion title={title}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={onAddClick}>{t.buttons.add}</button>
        </div>
        {/* 폼을 섹션 카드 내부에 렌더링 */}
        {formNode}
        {(!list || list.length === 0) ? (
          <div style={styles.mutedBox}>{emptyText}</div>
        ) : (
          list.map((row) => (
            <div key={row.id} style={styles.itemCard}>
              <div style={{ marginBottom: 6, fontWeight: 700 }}>{row.title || row.company || row.name}</div>
              <div style={{ color: "#6b7280", fontSize: 14 }}>{row.role || row.position || row.organization || row.issuer || ""}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                {onEditClick && (
                  <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={() => onEditClick(row)}>
                    {t.buttons.edit}
                  </button>
                )}
                {onDelete && (
                  <button style={{ ...styles.button, ...styles.dangerBtn }} onClick={() => onDelete(row.id)}>
                    {t.buttons.delete}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </Accordion>
    </div>
  );

  // ===== CRUD 핸들러 =====
  // 경력
  const expSchema = [
    { key: "company", label: t.labels.company },
    { key: "position", label: t.labels.position },
    { key: "startDate", label: t.labels.startDate, type: "date" },
    { key: "endDate", label: t.labels.endDate, type: "date" },
    { key: "description", label: t.labels.description, as: "textarea" },
  ];
  const createExp = async (data) => { await post("/profile/experiences", data); await loadAll(); setOpenForm({ ...openForm, exp: false }); window.alert(t.alerts.added); };
  const updateExp = async (row, data) => { await put(`/profile/experiences/${row.id}`, data); await loadAll(); setEditRow({ type: null, data: null }); window.alert(t.alerts.updated); };
  const deleteExp = async (id) => { await del(`/profile/experiences/${id}`); await loadAll(); window.alert(t.alerts.deleted); };

  // 수상이력
  const awardSchema = [
    { key: "title", label: t.labels.title },
    { key: "organization", label: t.labels.organization },
    { key: "awardDate", label: t.labels.awardDate, type: "date" },
    { key: "description", label: t.labels.description, as: "textarea" },
  ];
  const createAward = async (d) => { await post("/profile/awards", d); await loadAll(); setOpenForm({ ...openForm, award: false }); window.alert(t.alerts.added); };
  const updateAward = async (row, d) => { await put(`/profile/awards/${row.id}`, d); await loadAll(); setEditRow({ type: null, data: null }); window.alert(t.alerts.updated); };
  const deleteAward = async (id) => { await del(`/profile/awards/${id}`); await loadAll(); window.alert(t.alerts.deleted); };

  // 자격증
  const certSchema = [
    { key: "name", label: t.labels.name },
    { key: "issuer", label: t.labels.issuer },
    { key: "issueDate", label: t.labels.issueDate, type: "date" },
    { key: "expiryDate", label: t.labels.expiryDate, type: "date" },
    { key: "certificationNumber", label: t.labels.certificationNumber },
  ];
  const createCert = async (d) => { await post("/profile/certifications", d); await loadAll(); setOpenForm({ ...openForm, cert: false }); window.alert(t.alerts.added); };
  const updateCert = async (row, d) => { await put(`/profile/certifications/${row.id}`, d); await loadAll(); setEditRow({ type: null, data: null }); window.alert(t.alerts.updated); };
  const deleteCert = async (id) => { await del(`/profile/certifications/${id}`); await loadAll(); window.alert(t.alerts.deleted); };

  // 프로젝트
  const projSchema = [
    { key: "title", label: t.labels.projectTitle },
    { key: "role", label: t.labels.role },
    { key: "startDate", label: t.labels.startDate, type: "date" },
    { key: "endDate", label: t.labels.endDate, type: "date" },
    { key: "technologies", label: t.labels.technologies, as: "textarea" },
    { key: "achievement", label: t.labels.achievement, as: "textarea" },
    { key: "url", label: t.labels.url },
    { key: "description", label: t.labels.description, as: "textarea" },
  ];
  const createProj = async (d) => { await post("/profile/projects", d); await loadAll(); setOpenForm({ ...openForm, proj: false }); window.alert(t.alerts.added); };
  const updateProj = async (row, d) => { await put(`/profile/projects/${row.id}`, d); await loadAll(); setEditRow({ type: null, data: null }); window.alert(t.alerts.updated); };
  const deleteProj = async (id) => { await del(`/profile/projects/${id}`); await loadAll(); window.alert(t.alerts.deleted); };

  // 강점
  const STRENGTH_CATEGORY_KEYS = [
    "tech",
    "leadership",
    "communication",
    "problemSolving",
    "projectManagement",
    "dataAnalysis",
    "cloudInfra",
    "other",
  ];
  const createStrength = async (d) => { await post("/profile/strengths", d); await loadAll(); setOpenForm({ ...openForm, strength: false }); window.alert(t.alerts.added); };
  const updateStrength = async (row, d) => { await put(`/profile/strengths/${row.id}`, d); await loadAll(); setEditRow({ type: null, data: null }); window.alert(t.alerts.updated); };
  const deleteStrength = async (id) => { await del(`/profile/strengths/${id}`); await loadAll(); window.alert(t.alerts.deleted); };

  // 평판 생성
  const createReputation = async (data) => {
    if (!data.target_user_id) {
      window.alert(t.reputation.userRequired);
      return;
    }
    if (!data.category) {
      window.alert(t.reputation.categoryRequired);
      return;
    }
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      window.alert(t.reputation.ratingRequired);
      return;
    }
    if (!data.comment || !data.comment.trim()) {
      window.alert(t.reputation.commentRequired);
      return;
    }

    try {
      await post("/profile/reputations", {
        target_user_id: data.target_user_id,
        category: data.category,
        rating: data.rating,
        comment: data.comment.trim(),
      });
      await loadAll();
      setOpenRepForm(false);
      window.alert(t.reputation.created);
    } catch (e) {
      window.alert(e?.message || t.reputation.error);
    }
  };

  // ===== 권한 관리 =====
  const handleGrantPermission = async () => {
    console.log("권한 부여 시작, me:", me);
    
    if (!permissionEmail.trim()) {
      window.alert(t.permissions.emailRequired);
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(permissionEmail)) {
      window.alert(t.permissions.emailInvalid);
      return;
    }

    if (!me?.email && !me?.id) {
      console.error("사용자 정보 없음:", me);
      window.alert(t.permissions.userInfoError);
      return;
    }

    // user_email 우선 사용 (me.id가 없어도 가능)
    const payload = {
      allowed_email: permissionEmail.trim(),
      note: permissionNote.trim() || null,
    };
    
    if (me.email) {
      payload.user_email = me.email;
    } else if (me.id) {
      payload.user_id = me.id;
    }

    console.log("권한 부여 요청:", payload);

    try {
      const result = await post("/grant-detail-permission", payload);
      console.log("권한 부여 성공:", result);
      window.alert(t.permissions.grantSuccess);
      setPermissionEmail("");
      setPermissionNote("");
      await loadAll();
    } catch (e) {
      console.error("권한 부여 실패:", e);
      window.alert(e.message || t.permissions.grantError);
    }
  };

  const handleRevokePermission = async (email) => {
    if (!window.confirm(`${email}${t.permissions.revokeConfirm}`)) {
      return;
    }

    if (!me?.email && !me?.id) {
      window.alert(t.permissions.userInfoError2);
      return;
    }

    const payload = { allowed_email: email };
    if (me.email) {
      payload.user_email = me.email;
    } else if (me.id) {
      payload.user_id = me.id;
    }

    try {
      await post("/revoke-detail-permission", payload);
      window.alert(t.permissions.revokeSuccess);
      await loadAll();
    } catch (e) {
      window.alert(e.message || t.permissions.revokeError);
    }
  };

  // 강점 전용 폼 컴포넌트
  const StrengthForm = React.memo(({ defaults, onSubmit, onCancel, language = 'ko' }) => {
    const [draft, setDraft] = useState({
      category: defaults?.category || "",
      strength: defaults?.strength || "",
      description: defaults?.description || "",
    });
    const t = TRANSLATIONS[language];

    // defaults가 변경되면 draft 업데이트 (편집 모드일 때만)
    useEffect(() => {
      if (defaults) {
        setDraft({
          category: defaults.category || "",
          strength: defaults.strength || "",
          description: defaults.description || "",
        });
      }
    }, [defaults]);

    return (
      <div className="inline-form" style={{ ...styles.card, background: "#faf5ff", border: "1px solid #e9d5ff", marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{t.labels.category}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STRENGTH_CATEGORY_KEYS.map((key) => {
              const categoryLabel = t.categories[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDraft({ ...draft, category: key })}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: draft.category === key ? "2px solid #9370DB" : "2px solid #e5e7eb",
                    background: draft.category === key ? "#e9d5ff" : "white",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all .15s",
                    fontSize: 13,
                  }}
                >
                  {categoryLabel}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ ...styles.row }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{t.labels.strength}</div>
            <input
              style={styles.input}
              value={draft.strength || ""}
              onChange={(e) => setDraft({ ...draft, strength: e.target.value })}
              placeholder={t.placeholders.strength}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{t.labels.description}</div>
            <textarea
              style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
              value={draft.description || ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder={t.placeholders.strengthDesc}
            />
          </div>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            style={{ ...styles.button, ...styles.primaryBtn }}
            onClick={() => onSubmit(draft)}
          >
            {t.buttons.save}
          </button>
          <button
            type="button"
            style={{ ...styles.button }}
            onClick={onCancel}
          >
            {t.buttons.cancel}
          </button>
        </div>
      </div>
    );
  });

  // 평판(조회만)
  // repList는 loadAll에서만 세팅

  // permissionsOnly가 true면 권한 관리 섹션만 렌더링
  if (permissionsOnly) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", paddingBottom: 80 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
            {t.permissions.title}
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            {t.permissions.description}
          </p>
        </div>

        {/* 권한 관리 섹션 */}
        <div id="section-permissions">
          <div style={{ marginBottom: 16, padding: 16, background: "#fffbeb", borderRadius: 12, border: "1px solid #fde68a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🛡️</span>
              <span style={{ fontWeight: 700, color: "#7c3aed" }}>{t.permissions.whatIs}</span>
            </div>
            <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, whiteSpace: "pre-line" }}>
              {t.permissions.whatIsDesc}
            </div>
          </div>

          {/* 권한 추가 폼 */}
          <div style={{ ...styles.card, background: "#fafafa", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: "#374151" }}>{t.permissions.addTitle}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{t.permissions.emailLabel}</div>
              <input
                type="email"
                style={styles.input}
                placeholder={t.permissions.emailPlaceholder}
                value={permissionEmail}
                onChange={(e) => setPermissionEmail(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{t.permissions.noteLabel}</div>
              <input
                type="text"
                style={styles.input}
                placeholder={t.permissions.notePlaceholder}
                value={permissionNote}
                onChange={(e) => setPermissionNote(e.target.value)}
                maxLength={100}
              />
            </div>
            <button
              style={{ ...styles.button, ...styles.primaryBtn }}
              onClick={handleGrantPermission}
              disabled={!permissionEmail.trim()}
            >
              {t.permissions.grant}
            </button>
          </div>

          {/* 권한 목록 */}
          <div style={{ marginBottom: 12, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: 8 }}>
            <span>{t.permissions.listTitle}</span>
            {permissionList.length > 0 && (
              <span style={{ 
                background: "#9370DB", 
                color: "white", 
                fontSize: 12, 
                fontWeight: 700, 
                padding: "2px 8px", 
                borderRadius: 10 
              }}>
                {permissionList.length}
              </span>
            )}
          </div>
          
          {(!permissionList || permissionList.length === 0) ? (
            <div style={styles.mutedBox}>{t.permissions.noPermissions}</div>
          ) : (
            permissionList.map((perm, idx) => (
              <div key={idx} style={styles.itemCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#111827", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>📧</span>
                      <span>{perm.allowedEmail}</span>
                    </div>
                    {perm.note && (
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                        {perm.note}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      {perm.createdAt} {t.permissions.added}
                    </div>
                  </div>
                  <button
                    style={{
                      ...styles.button,
                      padding: "6px 12px",
                      background: "#f3e8ff",
                      color: "#9370DB",
                      border: "1px solid #c084fc",
                      fontSize: 13,
                    }}
                    onClick={() => handleRevokePermission(perm.allowedEmail)}
                  >
                    {t.permissions.revoke}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 전체 프로필 렌더링
  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* 내 정보 */}
      {renderInfo()}

      {/* 경력 */}
      <div id="section-experience">
        {renderList(
          t.sections.experience,
          expList,
          t.empty.experience,
          () => setOpenForm({ ...openForm, exp: true }),
          (row) => setEditRow({ type: "exp", data: row }),
          deleteExp,
          openForm.exp ? (
            <InlineForm schema={expSchema} onSubmit={createExp} onCancel={() => setOpenForm({ ...openForm, exp: false })} language={language} />
          ) : editRow.type === "exp" ? (
            <InlineForm
              schema={expSchema}
              defaults={editRow.data}
              onSubmit={(d) => updateExp(editRow.data, d)}
              onCancel={() => setEditRow({ type: null, data: null })}
              language={language}
            />
          ) : null
        )}
      </div>

      {/* 수상이력 */}
      <div id="section-awards">
        {renderList(
          t.sections.awards,
          awardList,
          t.empty.awards,
          () => setOpenForm({ ...openForm, award: true }),
          (row) => setEditRow({ type: "award", data: row }),
          deleteAward,
          openForm.award ? (
            <InlineForm schema={awardSchema} onSubmit={createAward} onCancel={() => setOpenForm({ ...openForm, award: false })} language={language} />
          ) : editRow.type === "award" ? (
            <InlineForm
              schema={awardSchema}
              defaults={editRow.data}
              onSubmit={(d) => updateAward(editRow.data, d)}
              onCancel={() => setEditRow({ type: null, data: null })}
              language={language}
            />
          ) : null
        )}
      </div>

      {/* 자격증 */}
      <div id="section-certifications">
        {renderList(
          t.sections.certifications,
          certList,
          t.empty.certifications,
          () => setOpenForm({ ...openForm, cert: true }),
          (row) => setEditRow({ type: "cert", data: row }),
          deleteCert,
          openForm.cert ? (
            <InlineForm schema={certSchema} onSubmit={createCert} onCancel={() => setOpenForm({ ...openForm, cert: false })} language={language} />
          ) : editRow.type === "cert" ? (
            <InlineForm
              schema={certSchema}
              defaults={editRow.data}
              onSubmit={(d) => updateCert(editRow.data, d)}
              onCancel={() => setEditRow({ type: null, data: null })}
              language={language}
            />
          ) : null
        )}
      </div>

      {/* 프로젝트 */}
      <div id="section-projects">
        {renderList(
          t.sections.projects,
          projList,
          t.empty.projects,
          () => setOpenForm({ ...openForm, proj: true }),
          (row) => setEditRow({ type: "proj", data: row }),
          deleteProj,
          openForm.proj ? (
            <InlineForm schema={projSchema} onSubmit={createProj} onCancel={() => setOpenForm({ ...openForm, proj: false })} language={language} />
          ) : editRow.type === "proj" ? (
            <InlineForm
              schema={projSchema}
              defaults={editRow.data}
              onSubmit={(d) => updateProj(editRow.data, d)}
              onCancel={() => setEditRow({ type: null, data: null })}
              language={language}
            />
          ) : null
        )}
      </div>

      {/* 강점 */}
      <div id="section-strengths">
        <Accordion title={t.sections.strengths}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={() => setOpenForm({ ...openForm, strength: true })}>{t.buttons.add}</button>
          </div>
          {/* 폼을 섹션 카드 내부에 렌더링 */}
          {openForm.strength && !editRow.type && (
            <StrengthForm
              onSubmit={(d) => createStrength(d)}
              onCancel={() => setOpenForm({ ...openForm, strength: false })}
              language={language}
            />
          )}
          {editRow.type === "strength" && (
            <StrengthForm
              defaults={editRow.data}
              onSubmit={(d) => updateStrength(editRow.data, d)}
              onCancel={() => setEditRow({ type: null, data: null })}
              language={language}
            />
          )}
          {(!strengthList || strengthList.length === 0) ? (
            <div style={styles.mutedBox}>{t.empty.strengths}</div>
          ) : (
            strengthList.map((row) => (
              <div key={row.id} style={styles.itemCard}>
                <div style={{ marginBottom: 6, fontWeight: 700 }}>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 12,
                      background: "#fee2e2",
                      color: "#7c3aed",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      marginRight: 8,
                    }}
                  >
                    {t.categories[row.category] || row.category || t.labels.general}
                  </span>
                  {row.strength}
                </div>
                {row.description && (
                  <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>{row.description}</div>
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={() => setEditRow({ type: "strength", data: row })}>
                    {t.buttons.edit}
                  </button>
                  <button style={{ ...styles.button, ...styles.dangerBtn }} onClick={() => deleteStrength(row.id)}>
                    {t.buttons.delete}
                  </button>
                </div>
              </div>
            ))
          )}
        </Accordion>
      </div>

      {/* 평판(조회 및 작성) */}
      <div id="section-reputations">
        <Accordion title={t.sections.reputations} openByDefault={true}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={() => setOpenRepForm(true)}>{t.buttons.add}</button>
          </div>
          {/* 평판 작성 폼 */}
          {openRepForm && (
            <ReputationForm
              onSubmit={createReputation}
              onCancel={() => setOpenRepForm(false)}
              searchingUser={searchingUser}
              searchUserByEmail={searchUserByEmail}
              language={language}
            />
          )}
          {(!repList || repList.length === 0) ? (
            <div style={styles.mutedBox}>{t.empty.reputations}</div>
          ) : (
            repList.map((row) => (
              <div key={row.id} style={styles.itemCard}>
                <div style={{ marginBottom: 6, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 12,
                      background: "#fee2e2",
                      color: "#7c3aed",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {t.reputationCategories[row.category] || row.category || t.reputation.defaultCategory}
                  </span>
                  {row.fromName && (
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {t.reputation.fromName}: {row.fromName}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {row.rating && (
                    <div style={{ display: "flex", gap: 2 }}>
                      {[...Array(row.rating)].map((_, idx) => (
                        <span key={idx} style={{ color: "#9370DB", fontSize: 16 }}>★</span>
                      ))}
                      {[...Array(5 - row.rating)].map((_, idx) => (
                        <span key={idx} style={{ color: "#d1d5db", fontSize: 16 }}>★</span>
                      ))}
                    </div>
                  )}
                  {row.rating && (
                    <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: 600 }}>
                      {row.rating}{language === 'ko' ? '점' : ''}
                    </span>
                  )}
                </div>
                {row.comment && (
                  <div style={{ color: "#4b5563", fontSize: 14, marginTop: 4, lineHeight: 1.6 }}>
                    {row.comment}
                  </div>
                )}
                {row.createdAt && (
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 8 }}>
                    {t.reputation.createdAt}: {row.createdAt}
                  </div>
                )}
              </div>
            ))
          )}
        </Accordion>
      </div>

      <div id="profile-bottom-spacer" style={{ height: 300 }} aria-hidden />
    </div>
  );
}
