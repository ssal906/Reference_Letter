import { useEffect, useState } from "react";

/**
 * Box.jsx (보관함 화면)
 * - 탭 기능으로 작성한 추천서와 작성한 평판을 전환
 * - 요청자/대상자 검색 및 삭제 기능 포함
 */

// API Base URL (환경 변수 지원)
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
    title: "보관함",
    home: "홈으로",
    tabs: {
      recommendations: "작성한 추천서",
      reputations: "작성한 평판",
    },
    recommendations: {
      title: "작성한 추천서",
      searchPlaceholder: "요청자 이름으로 검색...",
      description: "로그인한 계정으로 작성한 추천서 목록입니다. 각 항목을 클릭하면 내용이 펼쳐집니다.",
      noResults: "검색 결과가 없습니다.",
      empty: "작성한 추천서가 없습니다.",
      requester: "요청자",
      target: "대상자",
      deleteConfirm: "정말 이 추천서를 삭제하시겠습니까?",
      deleteFailed: "삭제에 실패했습니다.",
      deleting: "삭제 중...",
      delete: "삭제",
      deleted: "추천서가 삭제되었습니다.",
    },
    reputations: {
      title: "작성한 평판",
      searchPlaceholder: "대상자 이름 또는 이메일로 검색...",
      description: "로그인한 계정으로 작성한 평판 목록입니다. 각 항목을 클릭하면 내용이 펼쳐집니다.",
      noResults: "검색 결과가 없습니다.",
      empty: "작성한 평판이 없습니다.",
      target: "대상자",
      unknown: "알 수 없음",
      category: "평판",
      rating: "점",
      created: "작성일",
      deleteConfirm: "정말 이 평판을 삭제하시겠습니까?",
      deleteFailed: "삭제에 실패했습니다.",
      deleting: "삭제 중...",
      delete: "삭제",
      deleted: "평판이 삭제되었습니다.",
      categories: {
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
    },
    loading: "불러오는 중...",
    error: "보관함 데이터를 불러오지 못했습니다.",
  },
  en: {
    title: "Archive",
    home: "Home",
    tabs: {
      recommendations: "Recommendations",
      reputations: "Reputations",
    },
    recommendations: {
      title: "Recommendations",
      searchPlaceholder: "Search by requester name...",
      description: "List of recommendations written with your account. Click each item to expand the content.",
      noResults: "No search results.",
      empty: "No recommendations written.",
      requester: "Requester",
      target: "Target",
      deleteConfirm: "Are you sure you want to delete this recommendation?",
      deleteFailed: "Failed to delete.",
      deleting: "Deleting...",
      delete: "Delete",
      deleted: "Recommendation deleted.",
    },
    reputations: {
      title: "Reputations",
      searchPlaceholder: "Search by target name or email...",
      description: "List of reputations written with your account. Click each item to expand the content.",
      noResults: "No search results.",
      empty: "No reputations written.",
      target: "Target",
      unknown: "Unknown",
      category: "Reputation",
      rating: "points",
      created: "Created",
      deleteConfirm: "Are you sure you want to delete this reputation?",
      deleteFailed: "Failed to delete.",
      deleting: "Deleting...",
      delete: "Delete",
      deleted: "Reputation deleted.",
      categories: {
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
    },
    loading: "Loading...",
    error: "Failed to load archive data.",
  },
};

const styles = {
  page: { width: "100%" },
  card: {
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.07)",
    padding: "1.25rem",
    marginBottom: "1rem",
  },
  sectionTitle: {
    fontSize: "1.25rem",
    fontWeight: 800,
    marginBottom: "0.75rem",
    background: "linear-gradient(to right, #9370DB, #6A5ACD)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  muted: { color: "#6b7280" },
  button: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
  },
  primaryBtn: {
    background: "linear-gradient(to right, #9370DB, #6A5ACD)",
    color: "white",
  },
  accordionHeader: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    marginBottom: "0.75rem",
  },
  listItem: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px",
    marginBottom: "8px",
    background: "#ffffff",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
  tag: {
    padding: "4px 10px",
    borderRadius: "999px",
    background: "#e6d9f7",
    color: "#9370DB",
    fontSize: "12px",
    fontWeight: 700,
  },
  searchInput: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    fontSize: "14px",
    marginBottom: "1rem",
  },
  deleteButton: {
    padding: "6px 12px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    background: "#e6d9f7",
    color: "#6A5ACD",
    fontSize: "12px",
    fontWeight: 600,
    marginLeft: "8px",
  },
  tabContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "1.5rem",
    borderBottom: "2px solid #e5e7eb",
  },
  tabButton: {
    padding: "12px 24px",
    background: "transparent",
    border: "none",
    borderBottom: "3px solid transparent",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "16px",
    color: "#6b7280",
    transition: "all 0.2s",
  },
  tabButtonActive: {
    color: "#9370DB",
    borderBottomColor: "#9370DB",
  },
};

function Accordion({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={styles.card}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={styles.accordionHeader}
      >
        <span style={styles.sectionTitle}>{title}</span>
        <span style={{ color: "#9ca3af", fontWeight: 700 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function RecommendationItem({ compactTitle, meta, content, onDelete, itemId, t }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(t.deleteConfirm)) return;
    setDeleting(true);
    try {
      await onDelete(itemId);
    } catch {
      alert(t.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={styles.listItem}>
      <div style={styles.listHeader} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span style={styles.tag}>{meta}</span>
          <strong style={{ fontSize: 14 }}>{compactTitle}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              ...styles.deleteButton,
              opacity: deleting ? 0.5 : 1,
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? t.deleting : t.delete}
          </button>
          <span style={{ color: "#9ca3af", fontWeight: 700 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#1f2937" }}>
          {content}
        </div>
      )}
    </div>
  );
}

// 한국어 카테고리 문자열을 키로 변환하는 역방향 매핑
const CATEGORY_REVERSE_MAP = {
  "협업능력": "collaboration",
  "전문성": "expertise",
  "책임감": "responsibility",
  "리더십": "leadership",
  "커뮤니케이션": "communication",
  "문제해결": "problemSolving",
  "창의성": "creativity",
  "시간관리": "timeManagement",
  "기타": "other",
};

// 카테고리를 번역된 텍스트로 변환하는 헬퍼 함수
const getCategoryLabel = (category, t) => {
  if (!category) return t.category;
  // 먼저 키인지 확인
  if (t.categories[category]) {
    return t.categories[category];
  }
  // 한국어 문자열인 경우 키로 변환 후 번역
  const key = CATEGORY_REVERSE_MAP[category];
  if (key && t.categories[key]) {
    return t.categories[key];
  }
  // 둘 다 아닌 경우 원본 반환
  return category;
};

function ReputationItem({ item, onDelete, t }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(t.deleteConfirm)) return;
    setDeleting(true);
    try {
      await onDelete(item.id);
    } catch {
      alert(t.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={styles.listItem}>
      <div style={styles.listHeader} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" }}>
          <span style={styles.tag}>{getCategoryLabel(item.category, t)}</span>
          <strong style={{ fontSize: 14 }}>
            {t.target}: {item.target_name || item.target_email || t.unknown}
          </strong>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[...Array(item.rating || 0)].map((_, idx) => (
              <span key={idx} style={{ color: "#9370DB", fontSize: 14 }}>★</span>
            ))}
            {item.rating && (
              <span style={{ fontSize: "0.875rem", color: "#6b7280", marginLeft: 4 }}>
                {item.rating}{t.rating}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              ...styles.deleteButton,
              opacity: deleting ? 0.5 : 1,
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? t.deleting : t.delete}
          </button>
          <span style={{ color: "#9ca3af", fontWeight: 700 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          {item.comment && (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#1f2937", marginBottom: 8 }}>
              {item.comment}
            </div>
          )}
          {item.created_at && (
            <div style={{ fontSize: "0.75rem", color: "#6A5ACD", marginTop: 8 }}>
              {t.created}: {new Date(item.created_at).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Box({ user, token, onBackHome, initialTab = "recommendations", onTabChange, language = 'ko' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // "recommendations" or "reputations"
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState([]);
  const [reputations, setReputations] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const t = TRANSLATIONS[language];

  // 추천서 데이터 로드
  useEffect(() => {
    if (!token || !user?.email) return;
    const fetchSent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/my-recommendations/sent`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setSent(json?.items || []);
      } catch {
        setError(t.error);
      } finally {
        setLoading(false);
      }
    };
    fetchSent();
  }, [token, user?.email, t.error]);

  // 평판 데이터 로드
  useEffect(() => {
    if (!token || !user?.email) return;
    const fetchReputations = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/my-reputations/sent`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setReputations(json?.items || []);
      } catch {
        setError(t.error);
      } finally {
        setLoading(false);
      }
    };
    fetchReputations();
  }, [token, user?.email, t.error]);

  // 추천서 삭제 핸들러
  const handleDeleteRecommendation = async (itemId) => {
    const res = await fetch(`${API_BASE}/delete-history/${itemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || t.recommendations.deleteFailed);
    }
    // 삭제 후 목록에서 제거
    setSent((prev) => prev.filter((item) => item.id !== itemId));
    alert(t.recommendations.deleted);
  };

  // 평판 삭제 핸들러
  const handleDeleteReputation = async (repId) => {
    const res = await fetch(`${API_BASE}/profile/reputations/${repId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || t.reputations.deleteFailed);
    }
    // 삭제 후 목록에서 제거
    setReputations((prev) => prev.filter((item) => item.id !== repId));
    alert(t.reputations.deleted);
  };

  // 추천서 검색 필터링
  const filteredSent = sent.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const requesterName = (item.requester_name || item.to || "").toLowerCase();
    return requesterName.includes(query);
  });

  // 평판 검색 필터링
  const filteredReputations = reputations.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const targetName = (item.target_name || "").toLowerCase();
    const targetEmail = (item.target_email || "").toLowerCase();
    return targetName.includes(query) || targetEmail.includes(query);
  });

  // 탭 전환 시 검색어 초기화 및 상위 컴포넌트에 알림
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery("");
    // 상위 컴포넌트(App.jsx)에 탭 변경 알림
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // initialTab prop이 변경되면 탭 업데이트
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
      setSearchQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(to right,#9370DB,#6A5ACD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {t.title}
        </h1>
        <button
          onClick={() => onBackHome && onBackHome()}
          style={{ ...styles.button, background: "white", border: "2px solid #e5e7eb", borderRadius: 10 }}
        >
          {t.home}
        </button>
      </div>

      {/* 탭 버튼 */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => handleTabChange("recommendations")}
          style={{
            ...styles.tabButton,
            ...(activeTab === "recommendations" ? styles.tabButtonActive : { borderBottom: "none" }),
          }}
        >
          {t.tabs.recommendations}
        </button>
        <button
          onClick={() => handleTabChange("reputations")}
          style={{
            ...styles.tabButton,
            ...(activeTab === "reputations" ? styles.tabButtonActive : { borderBottom: "none" }),
          }}
        >
          {t.tabs.reputations}
        </button>
      </div>

      {loading && <div style={{ ...styles.card }}>{t.loading}</div>}
      {error && <div style={{ ...styles.card, color: "#9370DB" }}>{error}</div>}

      {/* 작성한 추천서 탭 */}
      {activeTab === "recommendations" && (
        <div id="archive-sent">
          <Accordion title={t.recommendations.title} defaultOpen={true}>
            {/* 검색 입력 */}
            <input
              type="text"
              placeholder={t.recommendations.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />

            <div style={{ marginBottom: 8, color: "#6b7280" }}>
              {t.recommendations.description}
            </div>
            {filteredSent.length === 0 && (
              <div style={{ ...styles.card }}>
                {searchQuery ? t.recommendations.noResults : t.recommendations.empty}
              </div>
            )}
            {filteredSent.map((it) => (
              <RecommendationItem
                key={it.id}
                itemId={it.id}
                meta={new Date(it.created_at).toLocaleString()}
                compactTitle={`${t.recommendations.requester}: ${it.requester_name || it.to || t.recommendations.target}`}
                content={it.content || it.recommendation || ""}
                onDelete={handleDeleteRecommendation}
                t={t.recommendations}
              />
            ))}
          </Accordion>
        </div>
      )}

      {/* 작성한 평판 탭 */}
      {activeTab === "reputations" && (
        <div id="archive-reputations">
          <Accordion title={t.reputations.title} defaultOpen={true}>
            {/* 검색 입력 */}
            <input
              type="text"
              placeholder={t.reputations.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />

            <div style={{ marginBottom: 8, color: "#6b7280" }}>
              {t.reputations.description}
            </div>
            {filteredReputations.length === 0 && (
              <div style={{ ...styles.card }}>
                {searchQuery ? t.reputations.noResults : t.reputations.empty}
              </div>
            )}
            {filteredReputations.map((item) => (
              <ReputationItem
                key={item.id}
                item={item}
                onDelete={handleDeleteReputation}
                t={t.reputations}
              />
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}
