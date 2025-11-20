// App.jsx
import React, { useState, useEffect, useRef } from "react";
import SignUp from "./SignUp.jsx";
import Profile from "./Profile.jsx";
import Box from "./Box.jsx"; // ✅ Profile 연결
import VoiceInputButton from "./VoiceInputButton.jsx"; // 🎤 음성 입력
import DocumentUploadButton from "./DocumentUploadButton.jsx"; // 📄 문서 업로드
import LandingPage from "./LandingPage.jsx"; // 🏠 랜딩 페이지
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { apiPost, apiGet, apiFetch, getAuthHeader } from "./api.js";

// -----------------------------
// 스타일 객체 (다크모드 지원)
// -----------------------------
const getStyles = (darkMode) => ({
  // 공통 - 달빛 테마 (보라+노랑)
  gradient: { background: "linear-gradient(135deg, #9370DB 0%, #6A5ACD 50%, #FFD700 100%)" },
  gradientRed: { background: "linear-gradient(to right, #9370DB, #6A5ACD)" }, // 보라색 그라데이션
  gradientPink: { background: "linear-gradient(to right, #6A5ACD, #FFD700)" },
  gradientEmerald: { background: "linear-gradient(to right, #9370DB, #FFD700)" },

  // 컨테이너 - 달빛 배경 (더 진하게)
  pageContainer: {
    minHeight: "100vh",
    background: darkMode 
      ? "linear-gradient(135deg, #0f0f0f 0%, #1a1a2a 50%, #0a0a0a 100%)"
      : "linear-gradient(135deg, #e8e5ff 0%, #f5e6ff 50%, #fff9e6 100%)",
  },

  // 로그인/회원가입 카드
  authCard: {
    maxWidth: "450px",
    width: "100%",
    background: darkMode ? "#1a1a1a" : "white",
    borderRadius: "20px",
    boxShadow: darkMode
      ? "0 25px 50px -12px rgba(147, 112, 219, 0.3), 0 12px 20px -8px rgba(147, 112, 219, 0.2)"
      : "0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 12px 20px -8px rgba(0, 0, 0, 0.25)",
    padding: "2rem",
    border: darkMode ? "1px solid #9370DB" : "1px solid #d1d5db",
    color: darkMode ? "#e0e0e0" : "#1f2937",
  },

  // 네비게이션
  nav: {
    background: darkMode ? "rgba(15, 15, 15, 0.95)" : "rgba(255, 255, 255, 0.98)",
    backdropFilter: "blur(10px)",
    boxShadow: darkMode 
      ? "0 4px 6px rgba(147, 112, 219, 0.25)"
      : "0 4px 6px rgba(0, 0, 0, 0.25)",
    position: "fixed",
    width: "100%",
    top: 0,
    zIndex: 1000,
    borderBottom: darkMode ? "2px solid #9370DB" : "3px solid #9ca3af",
  },

  // 입력 필드
  input: {
    width: "100%",
    padding: "12px 16px",
    border: darkMode ? "1px solid #9370DB" : "1px solid #d1d5db",
    borderRadius: "12px",
    fontSize: "14px",
    transition: "all 0.2s",
    backgroundColor: darkMode ? "#1a1a1a" : "white",
    boxShadow: darkMode 
      ? "0 2px 8px rgba(147, 112, 219, 0.15)"
      : "0 2px 4px rgba(0, 0, 0, 0.08)",
    color: darkMode ? "#e0e0e0" : "#1f2937",
  },

  // 버튼
  button: {
    width: "100%",
    padding: "12px 24px",
    borderRadius: "12px",
    fontWeight: "600",
    fontSize: "16px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  // 카드 - 달빛 그림자
  card: {
    background: darkMode ? "#1a1a1a" : "white",
    borderRadius: "16px",
    boxShadow: darkMode
      ? "0 8px 24px rgba(147, 112, 219, 0.25), 0 4px 12px rgba(147, 112, 219, 0.15)"
      : "0 8px 16px rgba(0, 0, 0, 0.3)",
    padding: "2rem",
    marginBottom: "2rem",
    border: darkMode ? "1px solid #9370DB" : "1px solid #d1d5db",
    color: darkMode ? "#e0e0e0" : "#1f2937",
  },
  
  // 텍스트 색상 헬퍼
  textPrimary: darkMode ? "#e0e0e0" : "#1f2937",
  textSecondary: darkMode ? "#a0a0a0" : "#6b7280",
  textMuted: darkMode ? "#888888" : "#9ca3af",
});

// -----------------------------
// 상수
// -----------------------------
const TONE_LABELS = {
  Formal: "공식적",
  Friendly: "친근한",
  Concise: "간결한",
  Persuasive: "설득형",
};

// ----- 다국어 지원 -----
const TRANSLATIONS = {
  ko: {
    tones: {
      Formal: "공식적",
      Friendly: "친근한",
      Concise: "간결한",
      Persuasive: "설득형",
    },
    login: {
      title: "AI 추천서",
      subtitle: "전문적인 추천서를 손쉽게 작성하세요",
      email: "이메일",
      password: "비밀번호",
      loginButton: "로그인",
      loggingIn: "로그인 중...",
      noAccount: "계정이 없으신가요?",
      signup: "회원가입",
    },
    register: {
      title: "회원가입",
      subtitle: "AI 추천서와 함께 시작하세요",
      email: "이메일",
      password: "비밀번호",
      name: "이름",
      nickname: "닉네임 (선택)",
      registerButton: "회원가입",
      registering: "가입 중...",
      haveAccount: "이미 계정이 있으신가요?",
      login: "로그인",
    },
    nav: {
      home: "홈",
      lookup: "조회",
      generate: "생성",
      logout: "로그아웃",
    },
    sidebar: {
      home: "홈",
      permissions: "권한 관리",
      profile: "프로필",
      info: "내 정보",
      experience: "경력",
      awards: "수상이력",
      certifications: "자격증",
      projects: "프로젝트",
      strengths: "강점",
      reputations: "평판",
      archive: "보관함",
      sentRecommendations: "작성한 추천서",
      sentReputations: "작성한 평판",
      logout: "로그아웃",
      expand: "펼치기",
      collapse: "접기",
      lightMode: "라이트 모드",
      darkMode: "다크 모드",
      light: "라이트",
      dark: "다크",
    },
    main: {
      title: "AI 추천서 생성기",
      subtitle: "전문적이고 설득력 있는 추천서를 AI가 자동으로 작성해드립니다",
    },
    lookup: {
      title: "사용자 조회",
      subtitle: "이메일로 DB 존재 여부를 확인하세요",
      placeholder: "이메일 입력...",
      search: "확인",
      searching: "조회 중...",
      notFound: "DB에 없는 데이터입니다.",
      searchResults: "검색 결과",
      workspace: "워크스페이스",
      role: "역할",
      viewDetails: "📋 상세 정보 보기",
      loading: "로딩 중...",
      userDetails: "사용자 상세 정보",
      close: "닫기",
      noDetails: "등록된 상세 정보가 없습니다.",
      references: "추천서 히스토리",
      totalReferences: "개의 추천서",
      viewAll: "전체 보기",
      allReferences: "전체 추천서 목록",
    },
    form: {
      title: "추천서 작성",
      subtitle: "모든 필드를 정확히 입력해주세요",
      recommenderName: "작성자 이름",
      requesterName: "요청자 이름",
      requesterEmail: "요청자 이메일",
      majorField: "전공 분야 (선택)",
      majorFieldPlaceholder: "예: 컴퓨터공학, 경영학 등",
      relationship: "요청자와의 관계",
      relationshipPlaceholder: "예: 3년간 함께 근무한 동료, 2년간 지도한 학생 등",
      strengths: "장점",
      strengthsPlaceholder: "요청자의 주요 강점과 역량을 구체적으로 작성하세요",
      memorable: "특별히 기억나는 내용",
      memorablePlaceholder: "함께한 프로젝트, 특별한 성과, 인상 깊었던 순간 등",
      additionalInfo: "추가 내용",
      additionalInfoPlaceholder: "추가로 전달하고 싶은 내용이나 특이사항을 자유롭게 작성하세요",
      tone: "작성 톤",
      score: "평가 점수",
      wordCount: "목표 글자 수 (선택)",
      wordCountPlaceholder: "예: 1000 (비워두면 자동)",
      template: "참고 양식 (선택)",
      templateNone: "양식 없음",
      signaturePreview: "등록된 서명 (미리보기 및 PDF에서 \"서명:\" 란에 자동 표시됩니다)",
      includeDetails: "요청자의 상세 정보를 AI 추천서에 포함",
      includeDetailsDesc: "체크하면 요청자의 경력, 수상, 자격증, 강점, 프로젝트 등의 정보가 AI 추천서 생성 시 자동으로 반영됩니다.",
      generateButton: "추천서 생성하기",
      generating: "생성 중...",
      generatedTitle: "생성된 추천서",
      preview: "📄 미리보기",
      edit: "✏️ 편집",
      copy: "복사하기",
      save: "저장하기",
      saving: "저장 중...",
      downloadPdf: "📥 PDF 다운로드",
      downloading: "다운로드 중...",
      share: "🔗 공유하기",
      sharing: "공유 중...",
      read: "🔊 읽기",
      reading: "⏹ 중지",
      editNote: "* 생성된 추천서를 자유롭게 수정하신 후 \"저장하기\" 버튼을 클릭하세요.",
      improvementNotes: "AI에게 고칠점 / 개선사항 (선택)",
      improvementNotesPlaceholder: "추천서에서 고치고 싶은 부분이나 개선하고 싶은 사항을 자유롭게 작성하세요. 비워두면 AI가 전체적으로 다듬어줍니다. 예: 더 구체적인 예시 추가, 톤 조정, 특정 부분 강조 등",
      finalizeButton: "최종 완성",
      finalizing: "최종 완성 중...",
      documentUpload: "📄 문서 업로드",
      documentProcessing: "분석 중...",
      voiceInput: "🎤 음성 입력",
      voiceProcessing: "처리 중...",
      voiceRecording: "⏹️ 녹음 중지",
    },
  },
  en: {
    tones: {
      Formal: "Formal",
      Friendly: "Friendly",
      Concise: "Concise",
      Persuasive: "Persuasive",
    },
    login: {
      title: "AI Recommendation",
      subtitle: "Create professional recommendation letters with ease",
      email: "Email",
      password: "Password",
      loginButton: "Login",
      loggingIn: "Logging in...",
      noAccount: "Don't have an account?",
      signup: "Sign Up",
    },
    register: {
      title: "Sign Up",
      subtitle: "Get started with AI Recommendation",
      email: "Email",
      password: "Password",
      name: "Name",
      nickname: "Nickname (Optional)",
      registerButton: "Sign Up",
      registering: "Signing up...",
      haveAccount: "Already have an account?",
      login: "Login",
    },
    nav: {
      home: "Home",
      lookup: "Lookup",
      generate: "Generate",
      logout: "Logout",
    },
    sidebar: {
      home: "Home",
      permissions: "Permissions",
      profile: "Profile",
      info: "My Info",
      experience: "Experience",
      awards: "Awards",
      certifications: "Certifications",
      projects: "Projects",
      strengths: "Strengths",
      reputations: "Received Reputations",
      archive: "Archive",
      sentRecommendations: "Sent Recommendations",
      sentReputations: "Sent Reputations",
      logout: "Logout",
      expand: "Expand",
      collapse: "Collapse",
      lightMode: "Light Mode",
      darkMode: "Dark Mode",
      light: "Light",
      dark: "Dark",
    },
    main: {
      title: "AI Recommendation Generator",
      subtitle: "AI automatically creates professional and persuasive recommendation letters for you",
    },
    lookup: {
      title: "User Lookup",
      subtitle: "Check if a user exists in the database by email",
      placeholder: "Enter email...",
      search: "Search",
      searching: "Searching...",
      notFound: "User not found in database.",
      searchResults: "Search Results",
      workspace: "Workspace",
      role: "Role",
      viewDetails: "📋 View Details",
      loading: "Loading...",
      userDetails: "User Details",
      close: "Close",
      noDetails: "No detailed information registered.",
      references: "Recommendation History",
      totalReferences: "recommendations",
      viewAll: "View All",
      allReferences: "All Recommendations",
    },
    form: {
      title: "Write Recommendation",
      subtitle: "Please fill in all fields accurately",
      recommenderName: "Recommender Name",
      requesterName: "Requester Name",
      requesterEmail: "Requester Email",
      majorField: "Major Field (Optional)",
      majorFieldPlaceholder: "e.g., Computer Science, Business Administration, etc.",
      relationship: "Relationship with Requester",
      relationshipPlaceholder: "e.g., Colleague for 3 years, Student mentored for 2 years, etc.",
      strengths: "Strengths",
      strengthsPlaceholder: "Describe the requester's key strengths and capabilities in detail",
      memorable: "Memorable Content",
      memorablePlaceholder: "Projects together, special achievements, impressive moments, etc.",
      additionalInfo: "Additional Information",
      additionalInfoPlaceholder: "Feel free to add any additional information or special notes",
      tone: "Writing Tone",
      score: "Evaluation Score",
      wordCount: "Target Word Count (Optional)",
      wordCountPlaceholder: "e.g., 1000 (leave blank for auto)",
      template: "Reference Template (Optional)",
      templateNone: "No Template",
      signaturePreview: "Registered signature (automatically displayed in preview and PDF at \"Signature:\" section)",
      includeDetails: "📋 Include requester's detailed information in AI recommendation",
      includeDetailsDesc: "If checked, the requester's career, awards, certifications, strengths, projects, etc. will be automatically included in the AI recommendation.",
      generateButton: "Generate Recommendation",
      generating: "Generating...",
      generatedTitle: "Generated Recommendation",
      preview: "📄 Preview",
      edit: "✏️ Edit",
      copy: "Copy",
      save: "Save",
      saving: "Saving...",
      downloadPdf: "📥 Download PDF",
      downloading: "Downloading...",
      share: "🔗 Share",
      sharing: "Sharing...",
      read: "🔊 Read",
      reading: "⏹ Stop",
      editNote: "* Feel free to edit the generated recommendation and click the \"Save\" button.",
      improvementNotes: "Improvement Notes for AI (Optional)",
      improvementNotesPlaceholder: "Describe what you'd like to improve in the recommendation. Leave blank for general refinement. e.g., Add more specific examples, adjust tone, emphasize certain aspects, etc.",
      finalizeButton: "Finalize",
      finalizing: "Finalizing...",
      documentUpload: "📄 Upload Document",
      documentProcessing: "Processing...",
      voiceInput: "🎤 Voice Input",
      voiceProcessing: "Processing...",
      voiceRecording: "⏹️ Stop Recording",
    },
  },
};

const INITIAL_FORM = {
  recommender_name: "",
  requester_name: "",
  requester_email: "",
  major_field: "",
  relationship: "",
  strengths: "",
  memorable: "",
  additional_info: "",
  tone: "Formal",
  selected_score: "5",
  workspace_id: "",
  include_user_details: false,
  word_count: "",
  template_id: "",
};

// -----------------------------
// 로그인 폼 (하단 토글로 회원가입 전환)
// -----------------------------
function LoginForm({ onLogin, onToggleMode, language, onLanguageChange, darkMode, onBack }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const t = TRANSLATIONS[language];
  const styles = getStyles(darkMode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiPost("/login", form);
      if (!response.ok) throw new Error(data.detail || "로그인 실패");
      onLogin(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        ...styles.pageContainer,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        position: "relative",
      }}
    >
      {/* 뒤로가기 버튼 */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '2rem',
            left: '2rem',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#9370DB',
            background: darkMode ? '#1a1a1a' : 'white',
            border: '2px solid #9370DB',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(147, 112, 219, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#9370DB';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = darkMode ? '#1a1a1a' : 'white';
            e.currentTarget.style.color = '#9370DB';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          ← 뒤로가기
        </button>
      )}
      
      {/* 다국어 버튼 */}
      {onLanguageChange && (
        <button
          onClick={() => onLanguageChange(language === 'ko' ? 'en' : 'ko')}
          style={{
            position: 'absolute',
            top: '2rem',
            right: '2rem',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#9370DB',
            background: 'white',
            border: '2px solid #9370DB',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#9370DB';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'white';
            e.target.style.color = '#9370DB';
          }}
        >
          🌐 {language === 'ko' ? 'EN' : '한'}
        </button>
      )}
      <div style={styles.authCard}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              ...styles.gradientRed,
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              margin: "0 auto 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              style={{ width: "32px", height: "32px", color: "white" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              background: "linear-gradient(to right, #9370DB, #6A5ACD)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "8px",
            }}
          >
            {t.login.title}
          </h2>
          <p style={{ color: "#9370DB", fontSize: "14px", fontWeight: "500" }}>
            {t.login.subtitle}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
                color: "#9370DB",
              }}
            >
              {t.login.email}
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={styles.input}
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
                color: "#9370DB",
              }}
            >
              {t.login.password}
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={styles.input}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...styles.gradientRed,
              color: "white",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? t.login.loggingIn : t.login.loginButton}
          </button>
        </form>

        {/* 하단 토글 → 회원가입 화면으로 전환 */}
        <div
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <button
            onClick={onToggleMode}
            style={{
              background: "none",
              border: "none",
              color: "#9370DB",
              fontSize: "14px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            {t.login.noAccount} <span style={{ textDecoration: "underline" }}>{t.login.signup}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// 사이드바 (접고/펼치기)
// -----------------------------
function Sidebar({
  collapsed,
  setCollapsed,
  user,
  onLogout,
  onGoHome,
  onGoProfile,
  onGoPermissions,
  onGoArchive,
  activeMain = "home",   // "home" | "profile" | "archive" | "permissions"
  activeSub = null,      // 하위 탭
  archiveSub = "recommendations", // 보관함 하위 탭
  language = "ko",
  onLanguageChange,
  darkMode = false,
  onDarkModeToggle
}) {
  const width = collapsed ? 72 : 260;
  const styles = getStyles(darkMode);
  const t = TRANSLATIONS[language];

  // 색상/타이포 (다크모드 지원) - 달빛 테마
  const cText = darkMode ? "#d0d0d0" : "#374151";
  const cIcon = darkMode ? "#9370DB" : "#374151";
  const cMuted = darkMode ? "#888888" : "#9ca3af";
  const cActive = darkMode ? "#9370DB" : "#9370DB";
  const cBg = darkMode ? "rgba(15, 15, 15, 0.95)" : "rgba(255,255,255,0.9)";
  const cBorder = darkMode ? "#9370DB" : "#f3f4f6";
  const fontTop = collapsed ? 12 : 16; // 홈/프로필/보관함
  const fontSub = collapsed ? 12 : 13; // 하위 메뉴(더 작게)

  // ---- Icons (inline SVG) ----
  const iconBase = { width: 20, height: 20, flex: "0 0 auto" };
  const HomeIcon = ({ active }) => (
    <svg style={{ ...iconBase, color: collapsed ? (active ? cActive : cIcon) : cIcon }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 10.5l9-7 9 7V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4H9v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5z" />
    </svg>
  );
  const UserIcon = ({ active }) => (
    <svg style={{ ...iconBase, color: collapsed ? (active ? cActive : cIcon) : cIcon }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9 9 0 1 1 18.88 6.196 7 7 0 0 0 12 19a7 7 0 0 0-6.879-1.196z" />
    </svg>
  );
  const KeyIcon = ({ active }) => (
    <svg style={{ ...iconBase, color: collapsed ? (active ? cActive : cIcon) : cIcon }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 3L5 7.5v4.5c0 4.5 3 8.5 7 10.5 4-2 7-6 7-10.5V7.5L12 3zM9.5 12l1.5 1.5 3-3" />
    </svg>
  );
  const DrawerIcon = ({ active }) => (
    <svg style={{ ...iconBase, color: collapsed ? (active ? cActive : cIcon) : cIcon }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="6" width="18" height="12" rx="2" ry="2" strokeWidth="2" />
      <path d="M3 10h18" strokeWidth="2" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
    </svg>
  );
  const LogoutIcon = () => (
    <svg style={{ ...iconBase, color: cIcon }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 17l5-5-5-5M20 12H9" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 19a2 2 0 0 0 2 2h5v-2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5V3H6a2 2 0 0 0-2 2v14z" />
    </svg>
  );

  const Item = ({ label, onClick, indent = 0, Icon, active = false, top = false }) => (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        gap: 10,
        padding: `10px ${12 + indent}px`,
        background: "transparent",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        borderRadius: 8,
        color: collapsed ? cText : (active ? cActive : cText),
        fontWeight: active && !collapsed ? 800 : 500,
        fontSize: top ? fontTop : fontSub,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }}
      title={label}
    >
      {Icon && <Icon active={active} />}
      {!collapsed && <span>{label}</span>}
    </button>
  );

  return (
    <aside
      style={{
        width,
        transition: "width .2s ease",
        background: cBg,
        backdropFilter: "blur(10px)",
        borderRight: `1px solid ${cBorder}`,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        left: 0,
        top: 0,
        height: "100vh",
        zIndex: 10,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 12px",
          borderBottom: `1px solid ${cBorder}`,
        }}
      >
        <div
          style={{
            background: "linear-gradient(to right, #9370DB, #6A5ACD)",
            width: 36,
            height: 36,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
            fontSize: 16,
            flex: "0 0 auto",
          }}
        >
          🌙
        </div>
        {!collapsed && (
          <div style={{ fontSize: 18, fontWeight: 800, background: "linear-gradient(to right, #9370DB, #FFD700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Moonlight Letter
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label="toggle-sidebar"
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 6,
            borderRadius: 8,
            color: cMuted,
            fontSize: 14
          }}
          title={collapsed ? t.sidebar.expand : t.sidebar.collapse}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {/* 메뉴 */}
      <div style={{ padding: "8px 6px", overflowY: "auto", flex: 1 }}>
        {/* 홈 (상위) */}
        <Item label={t.sidebar.home} Icon={HomeIcon} onClick={onGoHome} active={activeMain === "home"} top />

        {/* 상세정보 권한 관리 (독립 메뉴) */}
        <Item label={t.sidebar.permissions} Icon={KeyIcon} onClick={onGoPermissions} active={activeMain === "permissions"} top />

        {/* 프로필 (상위 + 하위) */}
        <Item label={t.sidebar.profile} Icon={UserIcon} onClick={() => onGoProfile(null)} active={activeMain === "profile"} top />
        {!collapsed && (
          <div style={{ marginTop: 2, marginBottom: 8 }}>
            <Item label={t.sidebar.info}        indent={16} onClick={() => onGoProfile("info")}            active={activeMain === "profile" && activeSub === "info"} />
            <Item label={t.sidebar.experience}          indent={16} onClick={() => onGoProfile("experience")}      active={activeMain === "profile" && activeSub === "experience"} />
            <Item label={t.sidebar.awards}       indent={16} onClick={() => onGoProfile("awards")}          active={activeMain === "profile" && activeSub === "awards"} />
            <Item label={t.sidebar.certifications}         indent={16} onClick={() => onGoProfile("certifications")}  active={activeMain === "profile" && activeSub === "certifications"} />
            <Item label={t.sidebar.projects}       indent={16} onClick={() => onGoProfile("projects")}        active={activeMain === "profile" && activeSub === "projects"} />
            <Item label={t.sidebar.strengths}          indent={16} onClick={() => onGoProfile("strengths")}        active={activeMain === "profile" && activeSub === "strengths"} />
            <Item label={t.sidebar.reputations}      indent={16} onClick={() => onGoProfile("reputations")}     active={activeMain === "profile" && activeSub === "reputations"} />
          </div>
        )}

        {/* 보관함 (상위 + 하위) */}
        <Item label={t.sidebar.archive} Icon={DrawerIcon} onClick={() => onGoArchive("recommendations")} active={activeMain === "archive"} top />
        {!collapsed && (
          <div style={{ marginTop: 2, marginBottom: 8 }}>
            <Item label={t.sidebar.sentRecommendations} indent={16} onClick={() => onGoArchive("recommendations")} active={activeMain === "archive" && archiveSub === "recommendations"} />
            <Item label={t.sidebar.sentReputations} indent={16} onClick={() => onGoArchive("reputations")} active={activeMain === "archive" && archiveSub === "reputations"} />
          </div>
        )}
      </div>

      {/* 하단 유저 정보 & 다국어 버튼 & 로그아웃 */}
      <div style={{ borderTop: "1px solid #f3f4f6", padding: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              background: "linear-gradient(to right, #9370DB, #6A5ACD)",
              width: 32,
              height: 32,
              borderRadius: 8,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              flex: "0 0 auto",
              fontSize: 14
            }}
          >
            {(user?.name?.[0] || user?.nickname?.[0] || "U").toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: darkMode ? "#e0e0e0" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.name || user?.nickname || "-"}
              </div>
              <div style={{ fontSize: 12, color: darkMode ? "#a0a0a0" : "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email || "-"}
              </div>
            </div>
          )}
        </div>
        
        {/* 다국어 & 다크모드 버튼 (나란히) */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {onLanguageChange && (
            <button
              onClick={() => onLanguageChange(language === 'ko' ? 'en' : 'ko')}
              style={{
                flex: 1,
                padding: collapsed ? "8px 4px" : "10px 12px",
                borderRadius: 10,
                border: `2px solid ${darkMode ? '#9370DB' : '#9370DB'}`,
                background: darkMode ? "#1a1a1a" : "white",
                color: "#9370DB",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: collapsed ? 11 : 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: collapsed ? 0 : 6,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#9370DB";
                e.target.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = darkMode ? "#1a1a1a" : "white";
                e.target.style.color = "#9370DB";
              }}
              title={collapsed ? (language === 'ko' ? 'EN' : '한') : (language === 'ko' ? 'English' : '한국어')}
            >
              <span style={{ fontSize: collapsed ? 14 : 16 }}>🌐</span>
              {!collapsed && <span>{language === 'ko' ? 'EN' : '한'}</span>}
            </button>
          )}

          <button
            onClick={onDarkModeToggle}
            style={{
              flex: 1,
              padding: collapsed ? "8px 4px" : "10px 12px",
              borderRadius: 10,
              border: `2px solid ${darkMode ? '#888888' : '#6b7280'}`,
              background: darkMode ? "#1a1a1a" : "white",
              color: darkMode ? "#d0d0d0" : "#6b7280",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: collapsed ? 11 : 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: collapsed ? 0 : 6,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = darkMode ? "#888888" : "#6b7280";
              e.target.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = darkMode ? "#1a1a1a" : "white";
              e.target.style.color = darkMode ? "#d0d0d0" : "#6b7280";
            }}
            title={collapsed ? (darkMode ? '☀️' : '🌙') : (darkMode ? t.sidebar.lightMode : t.sidebar.darkMode)}
          >
            <span style={{ fontSize: collapsed ? 14 : 16 }}>{darkMode ? '☀️' : '🌙'}</span>
            {!collapsed && <span>{darkMode ? t.sidebar.light : t.sidebar.dark}</span>}
          </button>
        </div>
        
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            padding: collapsed ? "8px 8px" : "10px 12px",
            borderRadius: 10,
            border: darkMode ? "1px solid #9370DB" : "1px solid #9370DB",
            background: darkMode 
              ? "linear-gradient(135deg, #9370DB 0%, #6A5ACD 50%, #FFD700 100%)" 
              : "linear-gradient(135deg, #f3e8ff 0%, #fef3c7 100%)",
            color: darkMode ? "#FFD700" : "#9370DB",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: collapsed ? 11 : 14,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = darkMode
              ? "linear-gradient(135deg, #FFD700 0%, #9370DB 100%)"
              : "linear-gradient(135deg, #9370DB 0%, #FFD700 100%)";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(147, 112, 219, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = darkMode
              ? "linear-gradient(135deg, #9370DB 0%, #6A5ACD 50%, #FFD700 100%)"
              : "linear-gradient(135deg, #f3e8ff 0%, #fef3c7 100%)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <LogoutIcon />
          {!collapsed && <span>{t.sidebar.logout}</span>}
        </button>
      </div>
    </aside>
  );
}



// -----------------------------
// 네비게이션
// -----------------------------
function Navigation({ user, onLogout, language, onLanguageChange, darkMode }) {
  const t = TRANSLATIONS[language];
  const styles = getStyles(darkMode);
  return (
    <nav style={styles.nav}>
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              background: "linear-gradient(to right, #9370DB, #6A5ACD)",
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              style={{ width: "24px", height: "24px", color: "white" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              background: "linear-gradient(to right, #9370DB, #6A5ACD)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {t.login.title}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <a href="#" style={{ color: "#6b7280", textDecoration: "none", fontWeight: "500" }}>
            {t.nav.home}
          </a>
          <a href="#lookup" style={{ color: "#6b7280", textDecoration: "none", fontWeight: "500" }}>
            {t.nav.lookup}
          </a>
          <a href="#generate" style={{ color: "#6b7280", textDecoration: "none", fontWeight: "500" }}>
            {t.nav.generate}
          </a>
          
          {/* 다국어 버튼 */}
          {onLanguageChange && (
            <button
              onClick={() => onLanguageChange(language === 'ko' ? 'en' : 'ko')}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#9370DB',
                background: 'white',
                border: '2px solid #9370DB',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#9370DB';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.color = '#9370DB';
              }}
            >
              🌐 {language === 'ko' ? 'EN' : '한'}
            </button>
          )}

          {user && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  background: "linear-gradient(to right, #fee2e2, #fecaca)",
                  borderRadius: "8px",
                  border: "1px solid #fca5a5",
                }}
              >
                <div
                  style={{
                    ...styles.gradientRed,
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  {user.name?.[0] || user.nickname?.[0] || "U"}
                </div>
                <span style={{ fontSize: "14px", fontWeight: "500", color: "#6b7280" }}>
                  {user.name || user.nickname}
                </span>
              </div>
              <button
                onClick={onLogout}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#9370DB",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "8px",
                }}
              >
                {t.nav.logout}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// -----------------------------
// 메인 App
// -----------------------------
export default function App() {
  const [authMode, setAuthMode] = useState("landing"); // "landing" | "login" | "signup"
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // 추천서 생성/조회용 상태
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [nickname, setNickname] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookup, setLookup] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editedRecommendation, setEditedRecommendation] = useState("");
  const [currentRecommendationId, setCurrentRecommendationId] = useState(null);
  const [_isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [improvementNotes, setImprovementNotes] = useState("");
  const [refining, setRefining] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [signatureData, setSignatureData] = useState(null);
  const [signatureType, setSignatureType] = useState(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [writingStyleAnalysis, setWritingStyleAnalysis] = useState(null);
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'ko';
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  
  // 평가 관련 상태
  const [evaluationScores, setEvaluationScores] = useState(null);
  const [evaluationImprovements, setEvaluationImprovements] = useState([]);
  const [evaluating, setEvaluating] = useState(false);
  
  // 버전 관리 (되돌리기용)
  const [previousVersion, setPreviousVersion] = useState(null);
  
  // TTS 관련 상태
  const [isReading, setIsReading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioRef = useRef(null);
  const [changedSections, setChangedSections] = useState([]); // 줄 인덱스 배열 (레거시)
  const [changedSentences, setChangedSentences] = useState(new Set()); // 변경된 문장의 해시 Set
  
  const t = TRANSLATIONS[language];

  // 사이드바 접힘 상태
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ✅ 뷰 전환 상태 (홈 / 프로필 / 보관함)
  const [currentView, setCurrentView] = useState("home");
  const [profileSection, setProfileSection] = useState(null);
  const [pendingProfileTarget, setPendingProfileTarget] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [archiveSub, setArchiveSub] = useState("recommendations"); // "recommendations" | "reputations"

  // ----- 섹션 스크롤 헬퍼 -----
  function scrollToProfileSection(section) {
    const idMap = {
      info: "section-info",
      experience: "section-experience",
      awards: "section-awards",
      certifications: "section-certifications",
      projects: "section-projects",
      strengths: "section-strengths",
      reputations: "section-reputations",
    };
    const el = document.getElementById(idMap[section]);
    if (!el) return;
    const doScroll = () => {
      const top = el.getBoundingClientRect().top + window.scrollY - anchorOffset + SCROLL_FINE_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
    };
    requestAnimationFrame(() => requestAnimationFrame(doScroll));
  }


  // 섹션 DOM이 렌더 완료될 때까지 대기 후 스크롤 (최대 ~12프레임)
  function scrollToProfileSectionWhenReady(section, retries = 12) {
    const idMap = {
      info: "section-info",
      experience: "section-experience",
      awards: "section-awards",
      certifications: "section-certifications",
      projects: "section-projects",
      strengths: "section-strengths",
      reputations: "section-reputations",
    };
    const el = document.getElementById(idMap[section]);
    if (el && el.getBoundingClientRect().height > 0) {
      programmaticScrollUntilSettled(() => {
        setTimeout(() => scrollToProfileSection(section), 0);
      });
      return;
    }
    if (retries > 0) {
      requestAnimationFrame(() => scrollToProfileSectionWhenReady(section, retries - 1));
    }
  }
    function scrollToArchiveSection() {
    const el = document.getElementById("archive-sent");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }



  // ----- 스크롤 포지션 기반 스파이 (더 안정적) -----
  const anchorOffset = 350; // 고정 헤더/상단 패딩 보정
  const SCROLL_FINE_OFFSET = 30; // 섹션 클릭 시 살짝 더 내려오게

  const isProgrammaticScroll = useRef(false);
  const scrollRaf = useRef(null);
  const profileLoadStartAt = useRef(0);

  function pickActiveByTop(sections, currentKey, setter) {
    let bestKey = currentKey;
    let bestTop = -Infinity;
    let any = false;
    sections.forEach(({ key, id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const topAdj = rect.top - anchorOffset;
      // 기준선(anchorOffset)을 지나간 섹션 중 "가장 아래(가장 큰 topAdj<=0)"를 활성으로
      if (topAdj <= 0 && topAdj > bestTop) {
        bestTop = topAdj;
        bestKey = key;
        any = true;
      }
    });
    // 아직 어떤 섹션도 기준선을 넘지 않았다면 첫번째 섹션을 활성으로
    if (!any && sections.length) bestKey = sections[0].key;
    if (bestKey !== currentKey) setter(bestKey);
  }

  useEffect(() => {
    const onScroll = () => {
      if (isProgrammaticScroll.current) return;
      if (profileLoading) return; // 로딩 중엔 하이라이트 갱신 금지
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = requestAnimationFrame(() => {
        if (currentView === "profile") {
          const profileSections = [
            { key: "info",          id: "section-info" },
            { key: "experience",    id: "section-experience" },
            { key: "awards",        id: "section-awards" },
            { key: "certifications",id: "section-certifications" },
            { key: "projects",      id: "section-projects" },
            { key: "strengths",     id: "section-strengths" },
            { key: "reputations",   id: "section-reputations" },
          ];
          pickActiveByTop(profileSections, profileSection, setProfileSection);
        } else if (currentView === "archive") {
          // 보관함은 작성한 추천서만 표시하므로 스크롤 스파이 불필요
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    };
  }, [currentView, profileSection]);

  // 클릭 이동 시 스파이 일시 비활성화 (플리커 방지)
  function programmaticScrollGuard(run) {
    isProgrammaticScroll.current = true
    try { run && run(); } finally {
      setTimeout(() => { isProgrammaticScroll.current = false; }, 600);
    }
  }

  // 스무스 스크롤이 "완전히 멈출 때"까지 스파이를 비활성화하여 하이라이트 깜빡임 방지
  function programmaticScrollUntilSettled(scrollRunner, maxMs = 1200) {
    isProgrammaticScroll.current = true;
    let done = false;
    let stableCount = 0;
    let lastY = window.scrollY;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener("scroll", onScroll, { passive: true });
      window.removeEventListener("scrollend", onScrollEnd, { passive: true });
      isProgrammaticScroll.current = false;
    };
    const onScroll = () => {
      const y = Math.round(window.scrollY);
      if (Math.abs(y - lastY) <= 1) {
        stableCount++;
        if (stableCount >= 3) finish(); // 3프레임 연속 정지로 판단
      } else {
        stableCount = 0;
      }
      lastY = y;
    };
    const onScrollEnd = () => finish();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd, { passive: true });
    try { scrollRunner && scrollRunner(); } finally {
      setTimeout(finish, maxMs); // 안전망
    }
  }


  const resetAllUiStates = () => {
    setForm({ ...INITIAL_FORM });
    setRecommendation("");
    setNickname("");
    setLookup(null);
    setLookupLoading(false);
    setSelectedUser(null);
    setEditedRecommendation("");
    setCurrentRecommendationId(null);
    setIsEditing(false);
    setUserDetails(null);
    setShowUserDetails(false);
    setImprovementNotes("");
    setRefining(false);
    setShowPreview(false);
    setWritingStyleAnalysis(null);
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleDarkModeToggle = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  // 다크모드 적용
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // 토큰 자동 로그인 및 초기 다크모드 적용
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchUserData(savedToken);
    }
    // 양식 목록 로드
    fetchTemplates();
    
    // 초기 다크모드 적용
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
      document.body.classList.add('dark');
    }
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await apiGet("/templates");
      console.log("양식 목록 로드 성공:", data);
      if (data && data.templates) {
        setTemplates(data.templates);
        console.log("양식 개수:", data.templates.length);
      } else {
        console.warn("양식 데이터 형식이 올바르지 않습니다:", data);
        setTemplates([]);
      }
    } catch (error) {
      console.error("양식 목록 로드 실패:", error);
      setTemplates([]);
    }
  };

  // 🎤 음성 입력 핸들러
  const handleVoiceInput = (fields, transcribedText) => {
    console.log('✅ 음성 입력 받음:', fields);
    console.log('📝 원본 텍스트:', transcribedText);
    
    // 기존 값에 추가 (있으면 줄바꿈 후 추가, 없으면 새로 입력)
    setForm(prev => ({
      ...prev,
      relationship: prev.relationship 
        ? (fields.relationship ? `${prev.relationship}\n${fields.relationship}` : prev.relationship)
        : (fields.relationship || ''),
      strengths: prev.strengths 
        ? (fields.strengths ? `${prev.strengths}\n${fields.strengths}` : prev.strengths)
        : (fields.strengths || ''),
      memorable: prev.memorable 
        ? (fields.memorable ? `${prev.memorable}\n${fields.memorable}` : prev.memorable)
        : (fields.memorable || ''),
      additional_info: prev.additional_info 
        ? (fields.additional_info ? `${prev.additional_info}\n${fields.additional_info}` : prev.additional_info)
        : (fields.additional_info || '')
    }));
  };

  // 📄 문서 업로드로 받은 필드 처리 (음성 입력과 동일한 방식)
  const handleDocumentUpload = (fields, extractedText) => {
    console.log('✅ 문서 업로드 받음:', fields);
    console.log('📄 추출된 텍스트:', extractedText);
    
    // 기존 값에 추가 (있으면 줄바꿈 후 추가, 없으면 새로 입력)
    setForm(prev => ({
      ...prev,
      relationship: prev.relationship 
        ? (fields.relationship ? `${prev.relationship}\n${fields.relationship}` : prev.relationship)
        : (fields.relationship || ''),
      strengths: prev.strengths 
        ? (fields.strengths ? `${prev.strengths}\n${fields.strengths}` : prev.strengths)
        : (fields.strengths || ''),
      memorable: prev.memorable 
        ? (fields.memorable ? `${prev.memorable}\n${fields.memorable}` : prev.memorable)
        : (fields.memorable || ''),
      additional_info: prev.additional_info 
        ? (fields.additional_info ? `${prev.additional_info}\n${fields.additional_info}` : prev.additional_info)
        : (fields.additional_info || '')
    }));
  };

  // 사용자 변경 시 UI 초기화
  useEffect(() => {
    if (user?.email) resetAllUiStates();
  }, [user?.email]);

  // 내 정보 조회
  const fetchUserData = async (currentToken) => {
    try {
      const data = await apiFetch("/me", {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      setUser(data.user);
      // 사용자 서명 불러오기
      fetchUserSignature(data.user.id, currentToken);
    } catch {
      handleLogout();
    }
  };

  const fetchUserSignature = async (userId, currentToken) => {
    try {
      const data = await apiFetch(`/user-signature/${userId}`, {
        headers: { Authorization: `Bearer ${currentToken || token}` },
      });
      if (data.exists) {
        setSignatureData(data.signature_data);
        setSignatureType(data.signature_type);
      }
    } catch (e) {
      console.error("서명 불러오기 실패:", e);
    }
  };

  // 로그인 성공 콜백
  const handleLogin = (data) => {
    resetAllUiStates();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem("token", data.access_token);
    // 로그인 시 폼 초기화하고 작성자 이름 설정
    setForm({ ...INITIAL_FORM, recommender_name: data.user.nickname || data.user.name || "" });
    // 사용자 서명 불러오기
    fetchUserSignature(data.user.id, data.access_token);
  
    setCurrentView("home");
    setProfileSection(null);
};

  // 로그아웃
  const handleLogout = () => {
    resetAllUiStates();
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    setAuthMode("login");
  
    setCurrentView("home");
    setProfileSection(null);
};

  // ✅ 라우팅 콜백
  const goHome = () => {
    setCurrentView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goProfile = (section = null) => {
    const target = section || "info";
    setPendingProfileTarget(target);
    if (currentView !== "profile") {
      setProfileSection(null);
      setCurrentView("profile");
      setProfileLoading(true);
      profileLoadStartAt.current = Date.now();
    } else {
      // 이미 프로필 화면인 경우: 로딩 표시 없이 바로 해당 섹션으로 이동
      setProfileSection(target);
      programmaticScrollUntilSettled(() => {
        setTimeout(() => scrollToProfileSection(target), 0);
      });
    }
  };
  const goPermissions = () => {
    setCurrentView("permissions");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goArchive = (sub = "recommendations") => {
    setArchiveSub(sub);
    setCurrentView("archive");
    programmaticScrollGuard(() => {
      setTimeout(() => {
        const el = document.getElementById(sub === "recommendations" ? "archive-sent" : "archive-reputations");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    });
  };
  // ----- 스크롤 스파이 (프로필/보관함) -----
  // (replaced with scroll-position based spy below)

  
  // 뷰 전환시 최초 동기화
  useEffect(() => {
    if (isProgrammaticScroll.current || profileLoading || (currentView === "profile" && profileSection)) return;
    setTimeout(() => {
      if (currentView === "profile") {
        const profileSections = [
          { key: "info",          id: "section-info" },
          { key: "experience",    id: "section-experience" },
          { key: "awards",        id: "section-awards" },
          { key: "certifications",id: "section-certifications" },
          { key: "projects",      id: "section-projects" },
          { key: "strengths",     id: "section-strengths" },
          { key: "reputations",   id: "section-reputations" },
        ];
        pickActiveByTop(profileSections, profileSection, setProfileSection);
        } else if (currentView === "archive") {
          // 보관함은 작성한 추천서만 표시하므로 스크롤 스파이 불필요
        }
    }, 50);
  }, [currentView]);

  // ---- 조회/상세/추천서 생성 로직 ----
  const doLookup = async () => {
    setLookupLoading(true);
    setLookup(null);
    setSelectedUser(null);
    setUserDetails(null);
    setShowUserDetails(false);
    try {
      const data = await apiPost("/lookup", { search: nickname });
      setLookup(data);

      if (data?.exists && data?.users?.length > 0) {
        const firstUser = data.users[0];
        setSelectedUser(firstUser);
        setForm((f) => ({
          ...f,
          requester_name: firstUser.nickname || firstUser.name || "",
          requester_email: firstUser.email || "",
        }));
      }
    } catch {
      setLookup({ exists: false, message: "서버 연결 오류" });
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    setLoadingUserDetails(true);
    try {
      // 권한 확인을 위해 현재 사용자 이메일 추가
      const requesterEmail = user?.email || '';
      const data = await apiGet(`/user-details/${userId}?requester_email=${encodeURIComponent(requesterEmail)}`);
      console.log("사용자 상세정보:", data);
      setUserDetails(data);
      setShowUserDetails(true);
    } catch (error) {
      console.error("사용자 상세 정보 불러오기 오류:", error);
      // 403 에러인 경우 특별 처리
      if (error.message && error.message.includes("403")) {
        setLookup({ 
          exists: false, 
          message: "상세정보를 볼 권한이 없습니다.\n추천받는 분께 권한을 요청하세요." 
        });
      } else {
        setLookup({ 
          exists: false, 
          message: error.message || "사용자 상세 정보를 불러오는데 실패했습니다." 
        });
      }
      setUserDetails(null);
      setShowUserDetails(false);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // 추천서 평가 함수
  const evaluateRecommendation = async (recommendationText) => {
    setEvaluating(true);
    setEvaluationScores(null);
    setEvaluationImprovements([]);
    try {
      const data = await apiPost("/evaluate-recommendation", {
        recommendation_text: recommendationText
      });
      setEvaluationScores(data.scores);
      setEvaluationImprovements(data.improvements || []);
      console.log("평가 완료:", data);
    } catch (err) {
      console.error("추천서 평가 에러:", err);
      // 평가 실패는 alert하지 않고 조용히 실패
    } finally {
      setEvaluating(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setRecommendation("");
    setEditedRecommendation("");
    setCurrentRecommendationId(null);
    setIsEditing(false);
    setImprovementNotes("");
    setShowPreview(false);
    setEvaluationScores(null);
    setEvaluationImprovements([]);
    setPreviousVersion(null);
    setChangedSections([]);
    try {
      const data = await apiPost("/generate-recommendation", {
        recommender_name: form.recommender_name || user?.nickname || user?.name || "",
        requester_name: form.requester_name,
        requester_email: form.requester_email,
        major_field: form.major_field || null,
        relationship: form.relationship,
        strengths: form.strengths,
        memorable: form.memorable,
        additional_info: form.additional_info || null,
        tone: form.tone,
        selected_score: form.selected_score,
        workspace_id: form.workspace_id || null,
        include_user_details: form.include_user_details || false,
        word_count: form.word_count ? parseInt(form.word_count) : null,
        template_id: form.template_id ? parseInt(form.template_id) : null,
        signature_data: signatureData || null,
        signature_type: signatureType || null,
      });
      setRecommendation(data.recommendation);
      setEditedRecommendation(data.recommendation);
      setCurrentRecommendationId(data.id);
      setIsEditing(true);
      setShowPreview(true);
    } catch (err) {
      console.error("추천서 생성 에러:", err);
      alert("추천서 생성 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecommendation = async () => {
    if (!currentRecommendationId) {
      alert("저장할 추천서가 없습니다.");
      return;
    }
    setSaveLoading(true);
    try {
      const data = await apiFetch(
        `/update-recommendation/${currentRecommendationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: editedRecommendation }),
        }
      );
      alert("추천서가 저장되었습니다.");
      setRecommendation(editedRecommendation);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRefineRecommendation = async () => {
    if (!editedRecommendation.trim()) {
      alert("추천서 내용이 없습니다.");
      return;
    }
    
    const notes = improvementNotes.trim() || 
      "사용자가 수정한 내용을 바탕으로 문법, 표현, 흐름을 자연스럽게 다듬어주세요. 사용자가 수정한 내용은 최대한 보존하면서 전체적인 완성도를 높여주세요.";
    
    setRefining(true);
    try {
      // 현재 버전을 이전 버전으로 저장
      setPreviousVersion({
        content: editedRecommendation,
        scores: evaluationScores,
        improvements: evaluationImprovements
      });
      
      const data = await apiPost("/refine-recommendation", {
        current_content: editedRecommendation,
        improvement_notes: notes,
        tone: form.tone,
        selected_score: form.selected_score,
      });
      
      // 변경 사항 감지 (문장 단위 diff)
      // 문장 분리 함수 (마침표, 느낌표, 물음표로 분리)
      const splitIntoSentences = (text) => {
        if (!text) return [];
        // 줄바꿈을 공백으로 변환 후 문장 분리
        const normalized = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        // 문장 종결 기호로 분리 (한국어: . ! ? / 영어: . ! ?)
        // 정규식: 문장 종결 기호 뒤에 공백이나 줄바꿈이 오는 경우
        const sentenceEndings = /([.!?。！？])\s+/g;
        const sentences = [];
        let lastIndex = 0;
        let match;
        
        while ((match = sentenceEndings.exec(normalized)) !== null) {
          const sentence = normalized.substring(lastIndex, match.index + 1).trim();
          if (sentence) {
            sentences.push(sentence);
          }
          lastIndex = match.index + match[0].length;
        }
        
        // 마지막 문장 추가
        const lastSentence = normalized.substring(lastIndex).trim();
        if (lastSentence) {
          sentences.push(lastSentence);
        }
        
        return sentences;
      };
      
      const oldSentences = splitIntoSentences(editedRecommendation);
      const newSentences = splitIntoSentences(data.refined_content);
      
      // 변경된 문장 찾기: 새 문장 중 이전에 없던 것들
      const changedSentenceSet = new Set();
      
      // 새 문장들을 정규화하여 비교 (공백 제거, 소문자 변환)
      const normalizeSentence = (s) => s.replace(/\s+/g, '').toLowerCase();
      
      // 새 문장 중 이전에 없던 것들을 변경된 것으로 표시
      newSentences.forEach((newSentence) => {
        const normalizedNew = normalizeSentence(newSentence);
        const found = oldSentences.some(oldSentence => {
          const normalizedOld = normalizeSentence(oldSentence);
          return normalizedOld === normalizedNew;
        });
        if (!found) {
          changedSentenceSet.add(newSentence);
        }
      });
      
      setChangedSentences(changedSentenceSet);
      // 레거시 호환성을 위해 빈 배열로 설정
      setChangedSections([]);
      
      setEditedRecommendation(data.refined_content);
      setRecommendation(data.refined_content);
      setImprovementNotes("");
      setShowPreview(true);
      
      // 개선 후 자동으로 재평가
      await evaluateRecommendation(data.refined_content);
      
      alert("추천서가 개선되었습니다! 새로운 품질 평가를 확인하세요.");
    } catch (err) {
      alert(err.message);
    } finally {
      setRefining(false);
    }
  };
  
  // 되돌리기 함수
  const handleRevertToPrevious = () => {
    if (!previousVersion) {
      alert("되돌릴 이전 버전이 없습니다.");
      return;
    }
    
    setEditedRecommendation(previousVersion.content);
    setRecommendation(previousVersion.content);
    setEvaluationScores(previousVersion.scores);
    setEvaluationImprovements(previousVersion.improvements);
    setChangedSections([]);
    setPreviousVersion(null);
    alert("이전 버전으로 되돌렸습니다.");
  };

  const handleDownloadPdf = async () => {
    if (!currentRecommendationId) {
      alert("다운로드할 추천서가 없습니다.");
      return;
    }
    
    setDownloadingPdf(true);
    try {
      // PDF는 blob이므로 직접 fetch 사용
      const API_BASE = import.meta?.env?.VITE_API_BASE || (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : "http://localhost:8000");
      const response = await fetch(`${API_BASE}/download-pdf/${currentRecommendationId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "PDF 다운로드 실패");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recommendation_${currentRecommendationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert("PDF가 다운로드되었습니다.");
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleReadRecommendation = async () => {
    if (isReading) {
      // 재생 중이면 중지
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setIsReading(false);
      return;
    }

    if (!editedRecommendation || !editedRecommendation.trim()) {
      alert("읽을 추천서 내용이 없습니다.");
      return;
    }

    setIsGeneratingAudio(true);
    try {
      // HTML 태그 제거 및 텍스트 정리
      const textToRead = editedRecommendation
        .replace(/<[^>]*>/g, '') // HTML 태그 제거
        .replace(/\s+/g, ' ')     // 여러 공백을 하나로
        .trim();
      
      console.log('📖 TTS 요청 시작 (텍스트 길이:', textToRead.length, ')');
      const startTime = Date.now();
      
      // TTS는 blob 응답이므로 직접 fetch 사용
      const API_BASE = import.meta?.env?.VITE_API_BASE || (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : "http://localhost:8000");
      const response = await fetch(`${API_BASE}/read-recommendation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: textToRead }),
      });

      if (!response.ok) {
        let errorMsg = "음성 생성 실패";
        try {
          const data = await response.json();
          errorMsg = data.detail || errorMsg;
        } catch (e) {
          errorMsg = `서버 오류 (${response.status})`;
        }
        throw new Error(errorMsg);
      }

      const audioBlob = await response.blob();
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ 음성 생성 완료 (${elapsedTime}초, ${audioBlob.size} bytes)`);
      
      setIsGeneratingAudio(false);
      setIsReading(true);
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onloadeddata = () => {
        console.log('✅ 오디오 로드 완료, 재생 시작');
      };

      audio.onended = () => {
        console.log('✅ 재생 완료');
        setIsReading(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error('❌ 오디오 재생 오류:', e);
        setIsReading(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        alert("음성 재생 중 오류가 발생했습니다.\n브라우저 콘솔을 확인해주세요.");
      };

      await audio.play();
      console.log('🔊 재생 중...');
      
    } catch (err) {
      console.error('❌ TTS 오류:', err);
      setIsGeneratingAudio(false);
      setIsReading(false);
      alert(`음성 생성 실패:\n${err.message}\n\n서버 로그를 확인해주세요.`);
    }
  };

  const handleShareRecommendation = async () => {
    if (!currentRecommendationId) {
      alert("공유할 추천서가 없습니다.");
      return;
    }
    
    setSharingLink(true);
    try {
      const data = await apiGet(`/share-recommendation/${currentRecommendationId}`);
      
      navigator.clipboard.writeText(data.share_url);
      alert("공유 링크가 클립보드에 복사되었습니다!");
    } catch (err) {
      alert(err.message);
    } finally {
      setSharingLink(false);
    }
  };

  // 문장 분리 헬퍼 함수 (formatRecommendation 내부에서 사용)
  const splitIntoSentencesForDisplay = (text) => {
    if (!text) return [];
    // 문장 종결 기호로 분리 (한국어: . ! ? / 영어: . ! ?)
    // 정규식: 문장 종결 기호 뒤에 공백이 오는 경우
    const sentenceEndings = /([.!?。！？])\s+/g;
    const sentences = [];
    let lastIndex = 0;
    let match;
    
    while ((match = sentenceEndings.exec(text)) !== null) {
      const sentence = text.substring(lastIndex, match.index + 1).trim();
      if (sentence) {
        sentences.push(sentence);
      }
      lastIndex = match.index + match[0].length;
    }
    
    // 마지막 문장 추가
    const lastSentence = text.substring(lastIndex).trim();
    if (lastSentence) {
      sentences.push(lastSentence);
    }
    
    return sentences.filter(s => s.length > 0);
  };
  
  // 추천서 내용을 파싱하여 정렬된 JSX로 변환 (문장 단위 하이라이트)
  const formatRecommendation = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 특수 줄 처리 (제목, 날짜, 서명 등) - 하이라이트 없음
      if (i === 0 && line === '추천서') {
        result.push(<div key={i} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '1rem' }}>{line}</div>);
        continue;
      }
      
      if (!line) {
        result.push(<div key={i} style={{ height: '0.5rem' }}></div>);
        continue;
      }
      
      if (/^\d{4}년\s+\d{1,2}월\s+\d{1,2}일$/.test(line)) {
        result.push(<div key={i} style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '0.5rem' }}>{line}</div>);
        continue;
      }
      
      if (line.startsWith('서명:')) {
        result.push(
          <div key={i} style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            <span>서명:</span>
            {signatureData ? (
              <img 
                src={signatureData} 
                alt="서명" 
                style={{ 
                  maxWidth: '150px', 
                  height: 'auto',
                  maxHeight: '60px'
                }} 
              />
            ) : (
              <span>___________________</span>
            )}
          </div>
        );
        continue;
      }
      
      if (line.startsWith('작성자:') || line.startsWith('소속/직위:') || 
          line.startsWith('연락처:')) {
        result.push(<div key={i} style={{ textAlign: 'center' }}>{line}</div>);
        continue;
      }
      
      // 일반 텍스트 줄: 문장 단위로 분리하여 하이라이트 적용
      if (line.length > 0) {
        const sentences = splitIntoSentencesForDisplay(line);
        
        if (sentences.length === 0) {
          // 문장 분리 실패 시 전체 줄을 하나의 문장으로 처리
          const isChanged = changedSentences.has(line);
          const highlightStyle = isChanged ? { 
            background: 'linear-gradient(to right, #fef3c7, #fde68a)', 
            padding: '2px 4px', 
            borderRadius: '4px',
            borderLeft: '3px solid #f59e0b',
            animation: 'highlight-fade 2s ease-in-out',
            display: 'inline'
          } : {};
          result.push(
            <div key={i} style={{ textAlign: 'left', marginBottom: '0.5rem' }}>
              <span style={highlightStyle}>{line}</span>
            </div>
          );
        } else {
          // 문장별로 분리하여 각각 하이라이트 적용
          const sentenceElements = [];
          sentences.forEach((sentence, idx) => {
            const isChanged = changedSentences.has(sentence);
            const highlightStyle = isChanged ? { 
              background: 'linear-gradient(to right, #fef3c7, #fde68a)', 
              padding: '2px 4px', 
              borderRadius: '4px',
              borderLeft: '3px solid #f59e0b',
              animation: 'highlight-fade 2s ease-in-out',
              display: 'inline'
            } : {};
            
            sentenceElements.push(
              <span key={`${i}-${idx}`} style={highlightStyle}>
                {sentence}{idx < sentences.length - 1 ? ' ' : ''}
              </span>
            );
          });
          
          result.push(
            <div key={i} style={{ textAlign: 'left', marginBottom: '0.5rem' }}>
              {sentenceElements}
            </div>
          );
        }
      }
    }
    
    return result;
  };

  const canGenerate =
    (form.recommender_name.trim() || user?.nickname || user?.name) &&
    form.requester_name.trim() &&
    form.requester_email.trim() &&
    form.relationship.trim() &&
    form.strengths.trim() &&
    form.tone.trim() &&
    form.selected_score.trim();

  // -----------------------------
  // 인증 전/후 렌더링 분기
  // -----------------------------
  const styles = getStyles(darkMode);
  
  if (!token || !user) {
    // 랜딩 페이지 (첫 화면)
    if (authMode === "landing") {
      return (
        <LandingPage 
          onNavigateToLogin={() => setAuthMode("login")}
          onNavigateToSignup={() => setAuthMode("signup")}
          darkMode={darkMode}
        />
      );
    }
    
    // 로그인 화면
    if (authMode === "login") {
      return (
        <LoginForm
          onLogin={handleLogin}
          onToggleMode={() => setAuthMode("signup")}
          onBack={() => setAuthMode("landing")}
          language={language}
          onLanguageChange={handleLanguageChange}
          darkMode={darkMode}
        />
      );
    }
    
    // 회원가입 화면
    return (
      <div style={{ ...styles.pageContainer, paddingTop: "32px", position: "relative" }}>
        {/* 다국어 버튼 (화면 기준 오른쪽 상단) */}
        <button
          onClick={() => handleLanguageChange(language === 'ko' ? 'en' : 'ko')}
          style={{
            position: 'absolute',
            top: '2rem',
            right: '2rem',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#9370DB',
            background: 'white',
            border: '2px solid #9370DB',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#9370DB';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'white';
            e.target.style.color = '#9370DB';
          }}
        >
          🌐 {language === 'ko' ? 'EN' : '한'}
        </button>
        
        <div style={{ textAlign: "center", paddingTop: "16px" }}>
          <button
            onClick={() => setAuthMode("login")}
            style={{
            background: "none",
            border: "none",
            color: "#9370DB",
              fontSize: "14px",
              cursor: "pointer",
              fontWeight: "600",
              textDecoration: "underline",
            }}
            title="로그인으로 돌아가기"
          >
            이미 계정이 있으신가요? 로그인
          </button>
        </div>
        <SignUp language={language} onLanguageChange={handleLanguageChange} />
      </div>
    );
  }

  // -----------------------------
  // 로그인 이후 메인 화면
  // -----------------------------
  return (
    <div style={styles.pageContainer}>
      <div style={{ display: "flex" }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          user={user}
          onLogout={handleLogout}
          onGoHome={goHome}
          onGoProfile={goProfile}
          onGoPermissions={goPermissions}
          onGoArchive={goArchive}
          activeMain={currentView}
          activeSub={currentView === "profile" ? profileSection : null}
          archiveSub={archiveSub}
          language={language}
          onLanguageChange={handleLanguageChange}
          darkMode={darkMode}
          onDarkModeToggle={handleDarkModeToggle}
        />

        <div
          style={{
            paddingTop: "100px",
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "100px 1rem 2rem",
            width: "100%"
          }}
        >
          {currentView === "permissions" ? (
            <Profile user={user} token={token} initialSection="permissions" loading={false} onLoaded={() => {}} permissionsOnly={true} language={language} />
          ) : currentView === "profile" ? (
            <Profile user={user} token={token} initialSection={pendingProfileTarget} loading={profileLoading} language={language}
              onLoaded={(ok) => {
                const finish = () => {
                  setProfileLoading(false);
                  if (ok && pendingProfileTarget) {
                    const target = pendingProfileTarget;
                    setProfileSection(target);
                    scrollToProfileSectionWhenReady(target);
                  }
                  setPendingProfileTarget(null);
                };
                const MIN_MS = 1000;
                const elapsed = Date.now() - (profileLoadStartAt.current || 0);
                if (profileLoading && elapsed < MIN_MS) {
                  setTimeout(finish, MIN_MS - elapsed);
                } else {
                  finish();
                }
              }}
            />
          ) : currentView === "archive" ? (
            <Box 
              user={user} 
              token={token} 
              onBackHome={goHome} 
              initialTab={archiveSub}
              onTabChange={setArchiveSub}
              language={language}
            />
          ) : (
            <>
              {/* 헤더 */}
              <div style={{ textAlign: "center", marginBottom: "3rem" }} className="animate-fade-in">
                <h1
                  style={{
                    fontSize: "3rem",
                    fontWeight: "bold",
                    marginBottom: "1rem",
                    background: "linear-gradient(135deg, #6A5ACD 0%, #8B5CF6 45%, #FFD700 75%, #FFA500 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: "drop-shadow(0 2px 8px rgba(106, 90, 205, 0.5))",
                  }}
                >
                  {t.main.title}
                </h1>
                <p
                  style={{
                    fontSize: "1.25rem",
                    color: styles.textSecondary,
                    maxWidth: "600px",
                    margin: "0 auto",
                  }}
                >
                  {t.main.subtitle}
                </p>
              </div>

              {/* 조회 섹션 */}
              <div id="lookup" style={{ maxWidth: "900px", margin: "0 auto 2rem" }}>
                <div style={styles.card}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem", color: styles.textPrimary }}>
                    {t.lookup.title}
                  </h2>
                  <p style={{ fontSize: "0.875rem", color: styles.textSecondary, marginBottom: "1rem" }}>
                    {t.lookup.subtitle}
                  </p>

                  <div style={{ display: "flex", gap: "12px", marginBottom: "1rem" }}>
                    <input
                      type="email"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder={t.lookup.placeholder}
                      style={{ ...styles.input, flex: 1 }}
                    />
                    <button
                      onClick={doLookup}
                      disabled={lookupLoading || !nickname.trim()}
                      style={{
                        ...styles.button,
                        ...styles.gradientRed,
                        width: "auto",
                        padding: "12px 32px",
                        color: "white",
                        opacity: lookupLoading || !nickname.trim() ? 0.5 : 1,
                      }}
                    >
                      {lookupLoading ? t.lookup.searching : t.lookup.search}
                    </button>
                  </div>

                  {lookup && lookup.exists === false && (
                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: "12px",
                        background: "#f3e8ff",
                        border: "2px solid #9370DB",
                        color: "#6A5ACD",
                      }}
                    >
                      {lookup.message || "DB에 없는 데이터입니다."}
                    </div>
                  )}

                  {lookup && lookup.exists && lookup.users?.length > 0 && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <div
                        style={{
                          padding: "1.5rem",
                          borderRadius: "12px",
                          background: "#faf5ff",
                          border: "2px solid #e9d5ff",
                        }}
                      >
                        <h3 style={{ 
                          fontSize: "1.125rem", 
                          fontWeight: "bold", 
                          marginBottom: "1rem",
                          color: "#6b7280"
                        }}>
                          검색 결과
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {lookup.users.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedUser(c);
                                setForm((f) => ({
                                  ...f,
                                  requester_name: c.nickname || c.name,
                                  requester_email: c.email,
                                }));
                              }}
                              style={{
                                padding: "12px 16px",
                                background: "white",
                                borderRadius: "8px",
                                border: selectedUser?.id === c.id ? "2px solid #9370DB" : "1px solid #e5e7eb",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              <div
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "8px",
                                  background: "#e5e7eb",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#6b7280",
                                  fontWeight: "700",
                                  fontSize: "16px",
                                  flexShrink: 0,
                                }}
                              >
                                👤
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "0.95rem" }}>
                                  {c.name || c.nickname}
                                </div>
                                <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "2px" }}>
                                  {c.email}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedUser && selectedUser.workspaces?.length > 0 && (
                    <div
                      style={{
                        marginTop: "1.5rem",
                        padding: "1.5rem",
                        borderRadius: "12px",
                        background: "#faf5ff",
                        border: "2px solid #e9d5ff",
                      }}
                    >
                      <h3 style={{ 
                        fontSize: "1.125rem", 
                        fontWeight: "bold", 
                        marginBottom: "1rem",
                        color: "#6b7280"
                      }}>
                        🏢 소속 회사
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {selectedUser.workspaces.map((w, i) => (
                          <div
                            key={i}
                            style={{
                              padding: "12px 16px",
                              background: "white",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                background: "#e5e7eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#6b7280",
                                fontWeight: "700",
                                fontSize: "16px",
                                flexShrink: 0,
                              }}
                            >
                              🏢
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "0.95rem" }}>
                                {w.name || "-"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedUser && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <button
                        onClick={() => fetchUserDetails(selectedUser.id)}
                        disabled={loadingUserDetails}
                        style={{
                          width: "100%",
                          ...styles.button,
                          ...styles.gradientRed,
                          color: "white",
                          opacity: loadingUserDetails ? 0.7 : 1,
                        }}
                      >
                        {loadingUserDetails ? "로딩 중..." : "📋 상세 정보 보기"}
                      </button>
                    </div>
                  )}

                  {showUserDetails && userDetails && (
                    <div
                      style={{
                        marginTop: "1.5rem",
                        padding: "1.5rem",
                        borderRadius: "12px",
                        background: "white",
                        border: "2px solid #e5e7eb",
                      }}
                    >
                      <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                    paddingBottom: "1rem",
                    borderBottom: "2px solid #e5e7eb",
                  }}
                >
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>사용자 상세 정보</h3>
                  <button
                    onClick={() => setShowUserDetails(false)}
                    style={{
                      padding: "8px 16px",
                      fontSize: "0.875rem",
                      background: "white",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    닫기
                  </button>
                </div>

                {/* 경력 */}
                {userDetails.experiences?.length > 0 && (
                  <div style={{ marginBottom: "2rem" }}>
                    <h4
                      style={{
                        fontSize: "1rem",
                        fontWeight: "bold",
                        marginBottom: "0.75rem",
                        color: "#9370DB",
                      }}
                    >
                      💼 경력
                    </h4>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}
                      >
                        <thead>
                          <tr style={{ background: "#f3f4f6" }}>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              회사명
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              직책
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              기간
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              업무 내용
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {userDetails.experiences.map((exp, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                              <td style={{ padding: "10px" }}>{exp.company}</td>
                              <td style={{ padding: "10px" }}>{exp.position}</td>
                              <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                                {exp.startDate} ~ {exp.endDate}
                              </td>
                              <td style={{ padding: "10px" }}>{exp.description || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 수상 이력 */}
                {userDetails.awards?.length > 0 && (
                  <div style={{ marginBottom: "2rem" }}>
                    <h4
                      style={{
                        fontSize: "1rem",
                        fontWeight: "bold",
                        marginBottom: "0.75rem",
                        color: "#9370DB",
                      }}
                    >
                      🏆 수상 이력
                    </h4>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}
                      >
                        <thead>
                          <tr style={{ background: "#f3f4f6" }}>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              수상명
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              수여 기관
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              수상일
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              설명
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {userDetails.awards.map((award, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                              <td style={{ padding: "10px" }}>{award.title}</td>
                              <td style={{ padding: "10px" }}>{award.organization || "-"}</td>
                              <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                                {award.awardDate || "-"}
                              </td>
                              <td style={{ padding: "10px" }}>{award.description || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 자격증 */}
                {userDetails.certifications?.length > 0 && (
                  <div style={{ marginBottom: "2rem" }}>
                    <h4
                      style={{
                        fontSize: "1rem",
                        fontWeight: "bold",
                        marginBottom: "0.75rem",
                        color: "#9370DB",
                      }}
                    >
                      📜 자격증
                    </h4>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}
                      >
                        <thead>
                          <tr style={{ background: "#f3f4f6" }}>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              자격증명
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              발급 기관
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              발급일
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              만료일
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              번호
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {userDetails.certifications.map((cert, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                              <td style={{ padding: "10px" }}>{cert.name}</td>
                              <td style={{ padding: "10px" }}>{cert.issuer || "-"}</td>
                              <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                                {cert.issueDate || "-"}
                              </td>
                              <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                                {cert.expiryDate || "-"}
                              </td>
                              <td style={{ padding: "10px" }}>{cert.certificationNumber || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 프로젝트 */}
                {userDetails.projects?.length > 0 && (
                  <div style={{ marginBottom: "2rem" }}>
                    <h4
                      style={{
                        fontSize: "1rem",
                        fontWeight: "bold",
                        marginBottom: "0.75rem",
                        color: "#9370DB",
                      }}
                    >
                      🚀 프로젝트
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {userDetails.projects.map((proj, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "1rem",
                            background: "#f9fafb",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <h5 style={{ fontWeight: "600", fontSize: "0.95rem" }}>{proj.title}</h5>
                            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                              {proj.startDate} ~ {proj.endDate}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                            <strong>역할:</strong> {proj.role || "-"}
                          </div>
                          {proj.description && (
                            <p
                              style={{
                                fontSize: "0.875rem",
                                color: "#4b5563",
                                marginBottom: "0.5rem",
                              }}
                            >
                              {proj.description}
                            </p>
                          )}
                          {proj.technologies && (
                            <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                              <strong>기술:</strong>{" "}
                              <span style={{ color: "#6b7280" }}>{proj.technologies}</span>
                            </div>
                          )}
                          {proj.achievement && (
                            <div
                              style={{
                                fontSize: "0.875rem",
                                marginBottom: "0.5rem",
                                padding: "8px",
                                background: "#fee2e2",
                                borderRadius: "6px",
                              }}
                            >
                              <strong style={{ color: "#7c3aed" }}>성과:</strong>{" "}
                              <span style={{ color: "#7c3aed" }}>{proj.achievement}</span>
                            </div>
                          )}
                          {proj.url && (
                            <a
                              href={proj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: "0.75rem",
                                color: "#9370DB",
                                textDecoration: "underline",
                              }}
                            >
                              프로젝트 링크 →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 강점 */}
                {userDetails.strengths?.length > 0 && (
                  <div style={{ marginBottom: "2rem" }}>
                    <h4
                      style={{
                        fontSize: "1rem",
                        fontWeight: "bold",
                        marginBottom: "0.75rem",
                        color: "#9370DB",
                      }}
                    >
                      ⭐ 강점
                    </h4>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}
                      >
                        <thead>
                          <tr style={{ background: "#f3f4f6" }}>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              카테고리
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              강점
                            </th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: "600" }}>
                              설명
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {userDetails.strengths.map((strength, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                              <td style={{ padding: "10px" }}>
                                <span
                                  style={{
                                    padding: "4px 12px",
                                    borderRadius: "12px",
                                    background: "#fee2e2",
                                    color: "#7c3aed",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {strength.category || "일반"}
                                </span>
                              </td>
                              <td style={{ padding: "10px", fontWeight: "600" }}>
                                {strength.strength}
                              </td>
                              <td style={{ padding: "10px" }}>
                                {strength.description || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 평판 */}
                {userDetails.reputations?.length > 0 && (
                  <div style={{ marginBottom: "2rem" }}>
                    <h4
                      style={{
                        fontSize: "1rem",
                        fontWeight: "bold",
                        marginBottom: "0.75rem",
                        color: "#9370DB",
                      }}
                    >
                      💬 평판
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {userDetails.reputations.map((rep, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "1rem",
                            background: "#f9fafb",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span style={{ fontWeight: "600", fontSize: "0.875rem" }}>
                                {rep.fromName}
                              </span>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: "8px",
                                  background: "#fee2e2",
                                  color: "#7c3aed",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                }}
                              >
                                {rep.category || "일반"}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              {[...Array(rep.rating)].map((_, idx) => (
                                <span key={idx} style={{ color: "#9370DB" }}>
                                  ★
                                </span>
                              ))}
                              {[...Array(5 - rep.rating)].map((_, idx) => (
                                <span key={idx} style={{ color: "#d1d5db" }}>
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          <p
                            style={{
                              fontSize: "0.875rem",
                              color: "#4b5563",
                              marginBottom: "0.5rem",
                            }}
                          >
                            {rep.comment}
                          </p>
                          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                            {rep.createdAt}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 데이터 없음 */}
                {!userDetails?.experiences?.length &&
                  !userDetails?.awards?.length &&
                  !userDetails?.certifications?.length &&
                  !userDetails?.projects?.length &&
                  !userDetails?.strengths?.length &&
                  !userDetails?.reputations?.length && (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                      {t.lookup.noDetails}
                    </div>
                  )}
              </div>
            )}
                </div>
              </div>

              {/* 추천서 작성 섹션 */}
              <div id="generate" style={{ maxWidth: "900px", margin: "0 auto" }}>
                <div style={styles.card}>
                  {/* 제목과 음성 입력 버튼 */}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start", 
                    marginBottom: "1rem",
                    flexWrap: "wrap",
                    gap: "16px"
                  }}>
                    <div style={{ flex: "1", minWidth: "250px" }}>
                      <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem", color: styles.textPrimary }}>
                        {t.form.title}
                      </h2>
                      <p style={{ fontSize: "0.875rem", color: styles.textSecondary }}>
                        {t.form.subtitle}
                      </p>
                    </div>
                    
                    {/* 🎤 음성 입력 & 📄 문서 업로드 버튼 */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <VoiceInputButton onFieldsReceived={handleVoiceInput} language={language} />
                      <DocumentUploadButton onFieldsReceived={handleDocumentUpload} language={language} />
                    </div>
                  </div>

                  <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1.5rem",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                  {t.form.recommenderName} * ({language === 'ko' ? '로그인한 사용자' : 'Logged in user'})
                </label>
                <input
                  style={{...styles.input, backgroundColor: "#f3f4f6", cursor: "not-allowed"}}
                  placeholder={t.form.recommenderName}
                  value={form.recommender_name || user?.nickname || user?.name || ""}
                  readOnly
                  disabled
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                  {t.form.requesterName} *
                </label>
                <input
                  style={styles.input}
                  placeholder={t.form.requesterName}
                  value={form.requester_name}
                  onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                {t.form.requesterEmail} *
              </label>
              <input
                type="email"
                style={styles.input}
                placeholder="requester@email.com"
                value={form.requester_email}
                onChange={(e) => setForm({ ...form, requester_email: e.target.value })}
              />
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                {t.form.majorField}
              </label>
              <input
                style={styles.input}
                placeholder={t.form.majorFieldPlaceholder}
                value={form.major_field}
                onChange={(e) => setForm({ ...form, major_field: e.target.value })}
              />
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                {t.form.relationship} *
              </label>
              <textarea
                rows="3"
                style={{ ...styles.input, resize: "vertical" }}
                placeholder={t.form.relationshipPlaceholder}
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              />
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                {t.form.strengths} *
              </label>
              <textarea
                rows="3"
                style={{ ...styles.input, resize: "vertical" }}
                placeholder={t.form.strengthsPlaceholder}
                value={form.strengths}
                onChange={(e) => setForm({ ...form, strengths: e.target.value })}
              />
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                {t.form.memorable} ({language === 'ko' ? '선택' : 'Optional'})
              </label>
              <textarea
                rows="3"
                style={{ ...styles.input, resize: "vertical" }}
                placeholder={t.form.memorablePlaceholder}
                value={form.memorable}
                onChange={(e) => setForm({ ...form, memorable: e.target.value })}
              />
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                {t.form.additionalInfo}
              </label>
              <textarea
                rows="3"
                style={{ ...styles.input, resize: "vertical" }}
                placeholder={t.form.additionalInfoPlaceholder}
                value={form.additional_info}
                onChange={(e) => setForm({ ...form, additional_info: e.target.value })}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.5rem",
                marginTop: "1.5rem",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                  {t.form.tone} *
                </label>
                <select
                  style={{ ...styles.input, cursor: "pointer" }}
                  value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                >
                  {Object.entries(t.tones).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                  {t.form.score} *
                </label>
                <select
                  style={{ ...styles.input, cursor: "pointer" }}
                  value={form.selected_score}
                  onChange={(e) => setForm({ ...form, selected_score: e.target.value })}
                >
                  <option value="5">{language === 'ko' ? '최우선 추천' : 'Highest Priority'}</option>
                  <option value="4">{language === 'ko' ? '강력히 추천' : 'Strongly Recommend'}</option>
                  <option value="3">{language === 'ko' ? '추천함' : 'Recommend'}</option>
                  <option value="2">{language === 'ko' ? '약하게 추천' : 'Weakly Recommend'}</option>
                  <option value="1">{language === 'ko' ? '매우 약하게 추천' : 'Very Weakly Recommend'}</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                  {t.form.wordCount}
                </label>
                <input
                  type="number"
                  style={styles.input}
                  placeholder={t.form.wordCountPlaceholder}
                  value={form.word_count}
                  onChange={(e) => setForm({ ...form, word_count: e.target.value })}
                  min="0"
                  step="100"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                  {t.form.template}
                </label>
                <select
                  style={{ ...styles.input, cursor: "pointer" }}
                  value={form.template_id}
                  onChange={(e) => setForm({ ...form, template_id: e.target.value })}
                >
                  <option value="">{t.form.templateNone}</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 상세정보 포함 여부 체크박스 */}
            {selectedUser && (
              <div style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "12px", background: "linear-gradient(to right, #fef3c7, #fde68a)", border: "2px solid #fbbf24" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.include_user_details}
                    onChange={(e) => setForm({ ...form, include_user_details: e.target.checked })}
                    style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "#9370DB" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "#92400e", marginBottom: "4px" }}>
                      📋 {t.form.includeDetails}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#78350f" }}>
                      {t.form.includeDetailsDesc}
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* 문체 학습 섹션 */}
            <div style={{ marginTop: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "8px" }}>
                📝 문체 학습 (선택)
              </label>
              <input
                type="file"
                accept=".txt,.docx,.pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const formData = new FormData();
                  formData.append('file', file);
                  
                  try {
                    // FormData는 직접 fetch 사용
                    const API_BASE = import.meta?.env?.VITE_API_BASE || (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : "http://localhost:8000");
                    const response = await fetch(`${API_BASE}/upload-writing-sample`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`
                      },
                      body: formData
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      setWritingStyleAnalysis(data.style_analysis);
                    } else {
                      const error = await response.json();
                      alert(`❌ 오류: ${error.detail}`);
                    }
                  } catch (error) {
                    console.error('문체 업로드 오류:', error);
                    alert('❌ 업로드 실패');
                  }
                }}
                style={{
                  ...styles.input,
                  cursor: "pointer",
                  padding: "8px"
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "4px" }}>
                작성자의 글(문서, 일기, 블로그 등)을 업로드하면 AI가 문체를 학습해서 자연스러운 추천서를 생성합니다
              </p>
              
              {/* 문체 분석 결과 표시 */}
              {writingStyleAnalysis && (
                <div style={{
                  marginTop: "1rem",
                  padding: "1.5rem",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "12px",
                  color: "white",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>
                      ✅ 문체 분석 완료
                    </h4>
                    <button
                      onClick={() => setWritingStyleAnalysis(null)}
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        border: "none",
                        color: "white",
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        cursor: "pointer",
                        fontSize: "1rem"
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div style={{ display: "grid", gap: "0.75rem", fontSize: "0.875rem" }}>
                    <div style={{ background: "rgba(255,255,255,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                      <strong>🎭 어조:</strong> {writingStyleAnalysis.tone}
                    </div>
                    
                    <div style={{ background: "rgba(255,255,255,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                      <strong>📏 문장 길이:</strong> {writingStyleAnalysis.sentence_length}
                    </div>
                    
                    <div style={{ background: "rgba(255,255,255,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                      <strong>📚 어휘 수준:</strong> {writingStyleAnalysis.vocabulary_level}
                    </div>
                    
                    {writingStyleAnalysis.sentence_endings && (
                      <div style={{ background: "rgba(255,255,255,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                        <strong>✍️ 문장 끝맺음:</strong>
                        <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                          {writingStyleAnalysis.sentence_endings.map((ending, idx) => (
                            <span key={idx} style={{ 
                              background: "rgba(255,255,255,0.2)", 
                              padding: "0.25rem 0.5rem", 
                              borderRadius: "4px",
                              fontSize: "0.8rem"
                            }}>
                              {ending}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {writingStyleAnalysis.connectors && (
                      <div style={{ background: "rgba(255,255,255,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                        <strong>🔗 연결어:</strong>
                        <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                          {writingStyleAnalysis.connectors.map((connector, idx) => (
                            <span key={idx} style={{ 
                              background: "rgba(255,255,255,0.2)", 
                              padding: "0.25rem 0.5rem", 
                              borderRadius: "4px",
                              fontSize: "0.8rem"
                            }}>
                              {connector}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {writingStyleAnalysis.common_phrases && (
                      <div style={{ background: "rgba(255,255,255,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                        <strong>💬 특징적 표현:</strong>
                        <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                          {writingStyleAnalysis.common_phrases.map((phrase, idx) => (
                            <span key={idx} style={{ 
                              background: "rgba(255,255,255,0.2)", 
                              padding: "0.25rem 0.5rem", 
                              borderRadius: "4px",
                              fontSize: "0.8rem"
                            }}>
                              {phrase}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {writingStyleAnalysis.paragraph_style && (
                      <div style={{ background: "rgba(255,255,255,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                        <strong>📝 문단 스타일:</strong> {writingStyleAnalysis.paragraph_style}
                      </div>
                    )}
                    
                    {writingStyleAnalysis.characteristics && (
                      <div style={{ background: "rgba(255,255,255,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                        <strong>⭐ 문체 특징:</strong>
                        <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.5rem" }}>
                          {writingStyleAnalysis.characteristics.map((char, idx) => (
                            <li key={idx} style={{ marginTop: "0.25rem" }}>{char}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <p style={{ marginTop: "1rem", fontSize: "0.75rem", opacity: 0.9, marginBottom: 0 }}>
                    💡 이 문체 분석 결과가 추천서 생성에 자동으로 반영됩니다!
                  </p>
                </div>
              )}
            </div>

            {/* 서명 패드 */}
            <div style={{ marginTop: "1.5rem", padding: "1.5rem", borderRadius: "12px", background: "#f9fafb", border: "2px dashed #d1d5db" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#6b7280" }}>
                  ✍️ 서명 {signatureData ? "✅" : "(선택사항)"}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSignaturePad(!showSignaturePad)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#9370DB",
                    background: "white",
                    border: "2px solid #9370DB",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
                  {showSignaturePad ? "숨기기" : (signatureData ? "서명 변경" : "서명 추가")}
                </button>
              </div>
              
              {showSignaturePad && (
                <div>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "1rem" }}>
                    마우스나 터치로 서명을 그려주세요. 한 번 저장하면 다음부터는 자동으로 포함됩니다.
                  </p>
                  <canvas
                    ref={(canvas) => {
                      if (!canvas) return;
                      const ctx = canvas.getContext('2d');
                      let isDrawing = false;
                      let lastX = 0, lastY = 0;
                      
                      canvas.onmousedown = (e) => {
                        isDrawing = true;
                        const rect = canvas.getBoundingClientRect();
                        lastX = e.clientX - rect.left;
                        lastY = e.clientY - rect.top;
                      };
                      
                      canvas.onmousemove = (e) => {
                        if (!isDrawing) return;
                        const rect = canvas.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 2;
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(lastX, lastY);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                        lastX = x;
                        lastY = y;
                      };
                      
                      canvas.onmouseup = () => isDrawing = false;
                      canvas.onmouseleave = () => isDrawing = false;
                      
                      canvas.ontouchstart = (e) => {
                        e.preventDefault();
                        isDrawing = true;
                        const rect = canvas.getBoundingClientRect();
                        const touch = e.touches[0];
                        lastX = touch.clientX - rect.left;
                        lastY = touch.clientY - rect.top;
                      };
                      
                      canvas.ontouchmove = (e) => {
                        e.preventDefault();
                        if (!isDrawing) return;
                        const rect = canvas.getBoundingClientRect();
                        const touch = e.touches[0];
                        const x = touch.clientX - rect.left;
                        const y = touch.clientY - rect.top;
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 2;
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(lastX, lastY);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                        lastX = x;
                        lastY = y;
                      };
                      
                      canvas.ontouchend = () => isDrawing = false;
                      
                      window.signatureCanvas = canvas;
                    }}
                    width={500}
                    height={150}
                    style={{
                      width: "100%",
                      maxWidth: "500px",
                      border: "2px solid #d1d5db",
                      borderRadius: "8px",
                      background: "white",
                      cursor: "crosshair",
                      touchAction: "none"
                    }}
                  />
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const canvas = window.signatureCanvas;
                        if (canvas) {
                          const ctx = canvas.getContext('2d');
                          ctx.clearRect(0, 0, canvas.width, canvas.height);
                          setSignatureData(null);
                          setSignatureType(null);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "10px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "white",
                        background: "#9370DB",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    >
                      🗑️ 지우기
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const canvas = window.signatureCanvas;
                        if (canvas) {
                          const dataUrl = canvas.toDataURL('image/png');
                          setSignatureData(dataUrl);
                          setSignatureType('draw');
                          setShowSignaturePad(false);
                          alert('서명이 저장되었습니다! 추천서 생성 시 자동으로 포함됩니다.');
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "10px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "white",
                        background: "linear-gradient(to right, #667eea, #764ba2)",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    >
                      💾 저장
                    </button>
                  </div>
                </div>
              )}
              
              {signatureData && !showSignaturePad && (
                <div style={{ textAlign: "center", padding: "1rem", background: "white", borderRadius: "8px" }}>
                  <p style={{ fontSize: "0.875rem", color: "#059669", fontWeight: "600", marginBottom: "0.5rem" }}>
                    ✅ 서명이 등록되었습니다
                  </p>
                  <img 
                    src={signatureData} 
                    alt="Signature" 
                    style={{ maxWidth: "300px", border: "1px solid #d1d5db", borderRadius: "4px", background: "white" }} 
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !canGenerate}
              style={{
                ...styles.button,
                ...styles.gradientRed,
                color: "white",
                fontSize: "1.125rem",
                padding: "16px 32px",
                marginTop: "2rem",
                opacity: loading || !canGenerate ? 0.5 : 1,
                cursor: loading || !canGenerate ? "not-allowed" : "pointer",
              }}
            >
              {loading ? t.form.generating : t.form.generateButton}
            </button>

            {recommendation && (
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #f3e8ff, #e9d5ff)",
                  border: "2px solid #c084fc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#9370DB" }}>
                    {t.form.generatedTitle} ({form.selected_score}{language === 'ko' ? '점' : ''} · {t.tones[form.tone]})
                  </h3>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      style={{ 
                        padding: "8px 16px", 
                        fontSize: "0.875rem", 
                        fontWeight: "600", 
                        color: showPreview ? "white" : "#9370DB", 
                        background: showPreview ? "linear-gradient(to right, #9370DB, #FFD700)" : "white", 
                        border: "2px solid #c084fc", 
                        borderRadius: "8px", 
                        cursor: "pointer" 
                      }}
                    >
                      {showPreview ? t.form.edit : t.form.preview}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(editedRecommendation.replace(/<[^>]*>/g, ''));
                        alert("추천서가 클립보드에 복사되었습니다.");
                      }}
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#9370DB",
                        background: "white",
                        border: "2px solid #9370DB",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    >
                      {t.form.copy}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#1f2937",
                        background: "white",
                        border: "2px solid #1f2937",
                        borderRadius: "8px",
                        cursor: downloadingPdf ? "not-allowed" : "pointer",
                        opacity: downloadingPdf ? 0.7 : 1
                      }}
                    >
                      {downloadingPdf ? t.form.downloading : t.form.downloadPdf}
                    </button>
                    {previousVersion && (
                      <button
                        type="button"
                        onClick={handleRevertToPrevious}
                        style={{
                          padding: "8px 16px",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#f59e0b",
                          background: "white",
                          border: "2px solid #f59e0b",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        ↶ 이전 버전으로 되돌리기
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleShareRecommendation}
                      disabled={sharingLink}
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#3b82f6",
                        background: "white",
                        border: "2px solid #3b82f6",
                        borderRadius: "8px",
                        cursor: sharingLink ? "not-allowed" : "pointer",
                        opacity: sharingLink ? 0.7 : 1
                      }}
                    >
                      {sharingLink ? t.form.sharing : t.form.share}
                    </button>
                    <button
                      type="button"
                      onClick={handleReadRecommendation}
                      disabled={isGeneratingAudio}
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: isGeneratingAudio ? "#9ca3af" : (isReading ? "#9370DB" : "#8b5cf6"),
                        background: "white",
                        border: `2px solid ${isGeneratingAudio ? "#9ca3af" : (isReading ? "#9370DB" : "#8b5cf6")}`,
                        borderRadius: "8px",
                        cursor: isGeneratingAudio ? "not-allowed" : "pointer",
                        opacity: isGeneratingAudio ? 0.7 : 1,
                      }}
                    >
                      {isGeneratingAudio ? "⏳ 생성 중..." : (isReading ? t.form.reading : t.form.read)}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRecommendation}
                      disabled={saveLoading}
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "white",
                        ...styles.gradientRed,
                        border: "none",
                        borderRadius: "8px",
                        cursor: saveLoading ? "not-allowed" : "pointer",
                        opacity: saveLoading ? 0.7 : 1,
                      }}
                    >
                      {saveLoading ? t.form.saving : t.form.save}
                    </button>
                  </div>
                </div>

                {/* 미리보기 모드 */}
                {showPreview ? (
                  <div style={{
                    background: "white",
                    padding: "3rem 2.5rem",
                    borderRadius: "12px",
                    border: "2px solid #e5e7eb",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    minHeight: "400px",
                    fontFamily: "serif",
                  }}>
                    <div style={{
                      lineHeight: "2",
                      color: "#1f2937",
                      fontSize: "15px",
                      letterSpacing: "0.3px"
                    }}>
                      {formatRecommendation(editedRecommendation.replace(/<[^>]*>/g, ''))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280", fontStyle: "italic", marginBottom: "0.5rem" }}>
                      {t.form.editNote}
                    </p>
                    <textarea
                      value={editedRecommendation.replace(/<[^>]*>/g, '')}
                      onChange={(e) => setEditedRecommendation(e.target.value)}
                      style={{
                        width: "100%",
                        minHeight: "400px",
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.7",
                        color: "#1f2937",
                        background: "white",
                        padding: "1.5rem",
                        borderRadius: "12px",
                        border: "2px solid #e5e7eb",
                        fontFamily: "inherit",
                        fontSize: "14px",
                        resize: "vertical",
                        textAlign: "left"
                      }}
                    />
                    
                    {/* 편집 모드에서도 서명 미리보기 */}
                    {signatureData && (
                      <div style={{ marginTop: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                        <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                          📝 {t.form.signaturePreview}
                        </p>
                        <img 
                          src={signatureData} 
                          alt="서명" 
                          style={{ 
                            maxWidth: "150px", 
                            height: "auto",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            background: "white",
                            padding: "0.5rem"
                          }} 
                        />
                        <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#6b7280" }}>
                          {form.recommender_name || user?.nickname || user?.name}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 품질 평가 버튼 */}
                {recommendation && !evaluating && (
                  <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => evaluateRecommendation(editedRecommendation)}
                      style={{
                        padding: "12px 32px",
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "white",
                        background: "linear-gradient(to right, #9370DB, #7c3aed)",
                        border: "none",
                        borderRadius: "12px",
                        cursor: "pointer",
                        boxShadow: "0 4px 6px rgba(147, 112, 219, 0.3)",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
                      onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
                    >
                      📊 품질 평가하기
                    </button>
                  </div>
                )}
                
                {/* 평가 중 표시 */}
                {evaluating && (
                  <div style={{ marginTop: "1.5rem", textAlign: "center", padding: "1rem", background: "linear-gradient(135deg, #ddd6fe, #c4b5fd)", borderRadius: "12px", border: "2px solid #8b5cf6" }}>
                    <div style={{ fontSize: "1rem", color: "#5b21b6", fontWeight: 600 }}>
                      ⏳ 품질 평가 중...
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.5rem" }}>
                      AI가 5가지 지표로 추천서를 분석하고 있습니다.
                    </div>
                  </div>
                )}
                
                {/* 변경 사항 알림 */}
                {changedSections.length > 0 && (
                  <div style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "12px", background: "linear-gradient(to right, #fef3c7, #fde68a)", border: "2px solid #f59e0b" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>✨</span>
                      <span style={{ fontWeight: "600", color: "#92400e" }}>
                        AI 개선 완료: {changedSections.length}개 섹션이 수정되었습니다
                      </span>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#78350f" }}>
                      노란색으로 표시된 부분이 개선된 영역입니다. 아래 품질 평가에서 개선 효과를 확인하세요.
                    </div>
                  </div>
                )}
                
                {/* 품질 평가 결과 섹션 */}
                {evaluationScores && (
                  <div style={{ marginTop: "2rem", padding: "2rem", borderRadius: "16px", background: "linear-gradient(135deg, #ddd6fe, #c4b5fd)", border: "2px solid #a78bfa" }}>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#7c3aed", marginBottom: "1.5rem", textAlign: "center" }}>
                      추천서 품질 평가
                    </h3>
                    
                    {evaluating ? (
                      <div style={{ textAlign: "center", padding: "2rem" }}>
                        <div style={{ fontSize: "1rem", color: "#6b7280" }}>평가 중...</div>
                      </div>
                    ) : (
                      <>
                        {/* 레이더 차트 */}
                        <div style={{ marginBottom: "2rem", background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={Object.entries(evaluationScores).map(([key, value]) => ({ metric: key, score: value }))}>
                              <defs>
                                <linearGradient id="radarEvalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#9370DB" stopOpacity="0.8" />
                                  <stop offset="50%" stopColor="#6A5ACD" stopOpacity="0.7" />
                                  <stop offset="100%" stopColor="#FFD700" stopOpacity="0.6" />
                                </linearGradient>
                              </defs>
                              <PolarGrid stroke="#d1d5db" />
                              <PolarAngleAxis dataKey="metric" tick={{ fill: '#374151', fontSize: 13, fontWeight: 600 }} />
                              <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: '#6b7280', fontSize: 11 }} />
                              <Radar name="점수" dataKey="score" stroke="#9370DB" fill="url(#radarEvalGradient)" fillOpacity={1} strokeWidth={3} />
                            </RadarChart>
                          </ResponsiveContainer>
                          
                          {/* 점수 요약 */}
                          <div style={{ marginTop: "1rem" }}>
                            {/* 첫 번째 줄 - 3개 */}
                            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
                              {Object.entries(evaluationScores).slice(0, 3).map(([metric, score]) => (
                                <div key={metric} style={{ textAlign: "center", padding: "1rem 1.25rem", background: "#f9fafb", borderRadius: "12px", minWidth: "140px", border: "1px solid #e5e7eb" }}>
                                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px", fontWeight: "500" }}>{metric}</div>
                                  <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: score <= 3 ? "#c084fc" : score <= 4 ? "#9370DB" : "#7c3aed" }}>
                                    {score}/5
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* 두 번째 줄 - 2개 */}
                            <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
                              {Object.entries(evaluationScores).slice(3, 5).map(([metric, score]) => (
                                <div key={metric} style={{ textAlign: "center", padding: "1rem 1.25rem", background: "#f9fafb", borderRadius: "12px", minWidth: "140px", border: "1px solid #e5e7eb" }}>
                                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px", fontWeight: "500" }}>{metric}</div>
                                  <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: score <= 3 ? "#c084fc" : score <= 4 ? "#9370DB" : "#7c3aed" }}>
                                    {score}/5
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* 평균 점수 */}
                          <div style={{ marginTop: "1.5rem", textAlign: "center", padding: "1.25rem", background: "linear-gradient(to right, #f3e8ff, #e9d5ff)", borderRadius: "12px", border: "2px solid #c084fc" }}>
                            <div style={{ fontSize: "1.25rem", color: "#7c3aed", fontWeight: 600 }}>
                              평균 점수: {(Object.values(evaluationScores).reduce((a, b) => a + b, 0) / Object.values(evaluationScores).length).toFixed(1)}/5
                            </div>
                          </div>
                        </div>
                        
                        {/* 개선사항 제안 */}
                        {evaluationImprovements.length > 0 && (
                          <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                            <h4 style={{ fontSize: "1rem", fontWeight: "bold", color: "#92400e", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              💡 개선 제안 ({evaluationImprovements.length}개)
                            </h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                              {evaluationImprovements.map((item, idx) => (
                                <div key={idx} style={{ padding: "1rem", background: "linear-gradient(135deg, #fef3c7, #fde68a)", border: "2px solid #f59e0b", borderRadius: "10px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                    <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#92400e" }}>
                                      {item.metric}
                                    </span>
                                    <span style={{ fontSize: "1rem", fontWeight: "bold", color: "#b45309" }}>
                                      {item.score}/5
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.8rem", color: "#78350f", marginBottom: "0.5rem" }}>
                                    {item.reason}
                                  </div>
                                  <div style={{ fontSize: "0.875rem", color: "#78350f", padding: "0.75rem", background: "white", borderRadius: "6px", borderLeft: "3px solid #f59e0b" }}>
                                    {item.improvement}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: "1rem", padding: "0.75rem", background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderRadius: "8px", fontSize: "0.8rem", color: "#92400e" }}>
                              💡 <strong>TIP:</strong> 위 제안 내용을 아래 AI 개선사항 입력란에 반영하여 추천서를 더욱 향상시킬 수 있습니다.
                            </div>
                          </div>
                        )}
                        
                        {evaluationImprovements.length === 0 && (
                          <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎉</div>
                            <div style={{ fontSize: "1.25rem", color: "#7c3aed", fontWeight: 600 }}>
                              모든 지표가 우수합니다!
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
                              추천서 품질이 매우 높습니다.
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                {/* AI 개선사항 입력란 */}
                <div style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "12px", background: "linear-gradient(to right, #e0e7ff, #c7d2fe)", border: "2px solid #a5b4fc" }}>
                  <label style={{ display: "block", fontSize: "0.95rem", fontWeight: "600", color: "#6366f1", marginBottom: "8px" }}>
                    💡 {t.form.improvementNotes}
                  </label>
                  <textarea
                    value={improvementNotes}
                    onChange={(e) => setImprovementNotes(e.target.value)}
                    placeholder={t.form.improvementNotesPlaceholder}
                    rows="4"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "2px solid #a5b4fc",
                      fontSize: "14px",
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRefineRecommendation}
                    disabled={refining}
                    style={{
                      marginTop: "12px",
                      width: "100%",
                      padding: "12px 24px",
                      borderRadius: "8px",
                      fontWeight: "600",
                      fontSize: "16px",
                      border: "none",
                      cursor: refining ? "not-allowed" : "pointer",
                      background: "linear-gradient(to right, #6366f1, #818cf8)",
                      color: "white",
                      opacity: refining ? 0.5 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {refining ? t.form.finalizing : t.form.finalizeButton}
                  </button>
                </div>
              </div>
            )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
