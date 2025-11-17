import React, { useEffect, useState, useCallback } from "react";

/** API base */
const API_BASE = (import.meta?.env?.VITE_API_BASE ?? "http://localhost:8000").replace(/\/+$/, "");

/** 스타일 */
const styles = {
  card: { background: "white", borderRadius: 16, boxShadow: "0 4px 6px rgba(0,0,0,.07)", padding: 20, marginBottom: 60 },
  sectionTitle: { fontSize: "1.25rem", fontWeight: 800, marginBottom: 12, background: "linear-gradient(to right, #ef4444, #dc2626)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  input: { width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 14 },
  inputDisabled: { width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 14, background: "#f3f4f6", color: "#9ca3af", cursor: "not-allowed" },
  button: { padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700 },
  dangerBtn: { background: "linear-gradient(to right, #fee2e2, #fecaca)", color: "#b91c1c", border: "1px solid #fecaca" },
  primaryBtn: { background: "linear-gradient(to right, #ef4444, #dc2626)", color: "white" },
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
function InlineForm({ schema, onSubmit, onCancel, defaults = {} }) {
  const [draft, setDraft] = useState(schema.reduce((o, f) => ({ ...o, [f.key]: defaults[f.key] ?? "" }), {}));
  return (
    <div className="inline-form" style={{ ...styles.card, background: "#fff7f7", border: "1px solid #ffe4e6" }}>
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
          저장
        </button>
        <button type="button" style={{ ...styles.button }} onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
}

// 강점 카테고리 상수
const STRENGTH_CATEGORIES = [
  "기술",
  "리더십",
  "커뮤니케이션",
  "문제해결",
  "프로젝트관리",
  "데이터분석",
  "클라우드/인프라",
  "기타",
];

// 강점 전용 폼 컴포넌트 - Profile 외부로 이동하여 리렌더링 시 재생성 방지
const StrengthForm = React.memo(({ defaults, onSubmit, onCancel }) => {
  // InlineForm처럼 내부에서 상태 관리
  const [draft, setDraft] = useState({
    category: defaults?.category || "",
    strength: defaults?.strength || "",
    description: defaults?.description || "",
  });

  // defaults가 변경되면 draft 업데이트 (편집 모드일 때만)
  // 새로 추가할 때는 defaults가 undefined이므로 초기값 유지 (작성 중인 내용 보존)
  useEffect(() => {
    if (defaults) {
      setDraft({
        category: defaults.category || "",
        strength: defaults.strength || "",
        description: defaults.description || "",
      });
    }
    // defaults가 없으면 (새로 추가 모드) 아무것도 하지 않음 - 사용자가 작성 중인 내용 유지
  }, [defaults]);

  return (
    <div className="inline-form" style={{ ...styles.card, background: "#fff7f7", border: "1px solid #ffe4e6", marginBottom: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>카테고리</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STRENGTH_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDraft({ ...draft, category: c })}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: draft.category === c ? "2px solid #fb7185" : "2px solid #e5e7eb",
                background: draft.category === c ? "#ffe4e6" : "white",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all .15s",
                fontSize: 13,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div style={{ ...styles.row }}>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>강점</div>
          <input
            style={styles.input}
            value={draft.strength || ""}
            onChange={(e) => setDraft({ ...draft, strength: e.target.value })}
            placeholder="카테고리를 구체화한 나의 강점"
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>설명</div>
          <textarea
            style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
            value={draft.description || ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="강점으로 달성한 것, 구체적인 경험/성과"
          />
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          style={{ ...styles.button, ...styles.primaryBtn }}
          onClick={() => onSubmit(draft)}
        >
          저장
        </button>
        <button
          type="button"
          style={{ ...styles.button }}
          onClick={onCancel}
        >
          취소
        </button>
      </div>
    </div>
  );
});

// 평판 작성 폼 컴포넌트 - Profile 외부로 이동하여 리렌더링 시 재생성 방지
const ReputationForm = React.memo(({ onSubmit, onCancel, searchingUser, searchUserByEmail, REPUTATION_CATEGORIES }) => {
  // InlineForm처럼 내부에서 상태 관리
  const [draft, setDraft] = useState({
    userEmail: "",
    category: "",
    rating: 0,
    comment: "",
  });
  const [localSearchedUser, setLocalSearchedUser] = useState(null);

  return (
    <div className="inline-form" style={{ ...styles.card, background: "#fff7f7", border: "1px solid #ffe4e6", marginBottom: 16 }}>
      {/* 사용자 검색 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>평판을 작성할 사용자 이메일</div>
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
            {searchingUser ? "검색 중..." : "검색"}
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
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>평판 카테고리</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {REPUTATION_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDraft({ ...draft, category: c })}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: draft.category === c ? "2px solid #fb7185" : "2px solid #e5e7eb",
                background: draft.category === c ? "#ffe4e6" : "white",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all .15s",
                fontSize: 13,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 별점 선택 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>별점 (1-5점)</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setDraft({ ...draft, rating: star })}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 24,
                color: draft.rating >= star ? "#ef4444" : "#d1d5db",
                transition: "all .15s",
                padding: 4,
              }}
              title={`${star}점`}
            >
              ★
            </button>
          ))}
          {draft.rating > 0 && (
            <span style={{ fontSize: 14, fontWeight: 600, color: "#6b7280", marginLeft: 8 }}>
              {draft.rating}점
            </span>
          )}
        </div>
      </div>

      {/* 코멘트 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>코멘트</div>
        <textarea
          style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
          value={draft.comment || ""}
          onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
          placeholder="평판 코멘트를 작성해주세요..."
        />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          style={{ ...styles.button, ...styles.primaryBtn }}
          onClick={() => {
            // 검색된 사용자가 있는지 확인
            if (!localSearchedUser) {
              window.alert("먼저 사용자를 검색해주세요.");
              return;
            }
            onSubmit({
              ...draft,
              target_user_id: localSearchedUser.id,
            });
          }}
        >
          저장
        </button>
        <button
          type="button"
          style={{ ...styles.button }}
          onClick={() => {
            onCancel();
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
});

export default function Profile({ initialSection: _initialSection, onLoaded, loading }) {
  const { get, post, put, del } = useApi();

  // ===== 내 정보 =====
  const [me, setMe] = useState(null);
  const [pwd, setPwd] = useState({ p1: "", p2: "" });
  const [isBootLoading, setIsBootLoading] = useState(true);

  const loadInfo = async () => {
    const info = await get("/profile/info");
    setMe(info);
  };

  const saveInfo = async () => {
    // ✅ 검증 순서: 재입력 누락 → 불일치 → 길이(6자 이상)
    if (pwd.p1 && !pwd.p2) {
      window.alert("새 비밀번호를 다시 입력해 확인해주세요.");
      return;
    }
    if (pwd.p1 && pwd.p2 && pwd.p1 !== pwd.p2) {
      window.alert("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }
    if ((pwd.p1 || pwd.p2) && (pwd.p1.length < 6 || pwd.p2.length < 6)) {
      window.alert("비밀번호는 6자 이상으로 작성해주세요.");
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
      window.alert("수정했습니다.");
      // ✅ 성공 시 비밀번호 입력칸 초기화
      setPwd({ p1: "", p2: "" });
    } catch (e) {
      window.alert(e?.message || "수정 중 오류가 발생했습니다.");
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

  // 평판 작성 관련 상태
  const REPUTATION_CATEGORIES = [
    "협업능력",
    "전문성",
    "책임감",
    "리더십",
    "커뮤니케이션",
    "문제해결",
    "창의성",
    "시간관리",
    "기타",
  ];
  const [openRepForm, setOpenRepForm] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);

  // 사용자 검색 (이메일로) - 콜백 함수 지원 - useCallback으로 메모이제이션하여 안정적인 참조 유지
  // early return 전에 정의해야 함
  const searchUserByEmail = useCallback(async (email, setSearchedUserCallback = null) => {
    if (!email || !email.trim()) {
      window.alert("이메일을 입력해주세요.");
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
      if (!response.ok) throw new Error(data.detail || "사용자를 찾을 수 없습니다.");
      
      if (data.exists && data.users && data.users.length > 0) {
        const user = data.users.find(u => u.email === email) || data.users[0];
        if (setSearchedUserCallback) {
          setSearchedUserCallback(user);
        }
        window.alert(`사용자를 찾았습니다: ${user.name || user.nickname} (${user.email})`);
        return user;
      } else {
        window.alert("해당 이메일의 사용자를 찾을 수 없습니다.");
        if (setSearchedUserCallback) {
          setSearchedUserCallback(null);
        }
        return null;
      }
    } catch (e) {
      window.alert(e?.message || "사용자 검색 중 오류가 발생했습니다.");
      if (setSearchedUserCallback) {
        setSearchedUserCallback(null);
      }
      return null;
    } finally {
      setSearchingUser(false);
    }
  }, []);

  const loadAll = async () => {
    try {
      const [exps, awards, certs, projs, strengths, reps] = await Promise.allSettled([
        get("/profile/experiences"),
        get("/profile/awards"),
        get("/profile/certifications"),
        get("/profile/projects"),
        get("/profile/strengths"),
        get("/profile/reputations"),
      ]);
      setExpList(exps.status === "fulfilled" ? (exps.value.items || []) : []);
      setAwardList(awards.status === "fulfilled" ? (awards.value.items || []) : []);
      setCertList(certs.status === "fulfilled" ? (certs.value.items || []) : []);
      setProjList(projs.status === "fulfilled" ? (projs.value.items || []) : []);
      setStrengthList(strengths.status === "fulfilled" ? (strengths.value.items || []) : []);
      setRepList(reps.status === "fulfilled" ? (reps.value.items || []) : []);
    } catch (e) {
      console.error("loadAll error:", e);
      // 에러가 발생해도 빈 배열로 설정하여 다른 섹션은 정상 작동하도록
      setExpList([]);
      setAwardList([]);
      setCertList([]);
      setProjList([]);
      setStrengthList([]);
      setRepList([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Promise.all([loadInfo(), loadAll()]);
        if (mounted && typeof onLoaded === "function") onLoaded(true);
      } catch {
        if (mounted && typeof onLoaded === "function") onLoaded(false);
      } finally {
        if (mounted) setIsBootLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

    if (isBootLoading || loading) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 0" }}>
        <div style={{
          padding: "24px", borderRadius: 16, border: "1px solid #fde68a",
          background: "#fffbeb", textAlign: "center", fontWeight: 600
        }}>
          정보 불러오는 중…
        </div>
      </div>
    );
  }

// ===== 내 정보 렌더 =====
  const renderInfo = () => (
    <div id="section-info">
      <Accordion title="내 정보">
        {!me ? (
          <div style={styles.mutedBox}>정보가 존재하지 않습니다.</div>
        ) : (
          <>
            <div style={styles.row}>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>이름</label>
                <input style={styles.input} value={me.name || ""} onChange={(e) => setMe({ ...me, name: e.target.value })} placeholder="이름" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>이메일(수정 불가)</label>
                <input style={styles.inputDisabled} value={me.email || ""} disabled />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>새 비밀번호</label>
                <input style={styles.input} type="password" value={pwd.p1} onChange={(e) => setPwd({ ...pwd, p1: e.target.value })} placeholder="새 비밀번호 (6자 이상)" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>새 비밀번호 확인</label>
                <input style={styles.input} type="password" value={pwd.p2} onChange={(e) => setPwd({ ...pwd, p2: e.target.value })} placeholder="새 비밀번호 확인" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>생년월일</label>
                <input style={styles.input} type="date" value={me.birth || ""} onChange={(e) => setMe({ ...me, birth: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>성별</label>
                <select style={styles.input} value={Number(me.gender ?? 0)} onChange={(e) => setMe({ ...me, gender: Number(e.target.value) })}>
                  <option value={0}>선택 안 함</option>
                  <option value={1}>남성</option>
                  <option value={2}>여성</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>휴대전화번호</label>
                <input style={styles.input} value={me.phone || ""} onChange={(e) => setMe({ ...me, phone: e.target.value })} placeholder="010-0000-0000" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>우편번호</label>
                <input style={styles.input} value={me.postCode || ""} onChange={(e) => setMe({ ...me, postCode: e.target.value })} placeholder="우편번호" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>주소</label>
                <input style={styles.input} value={me.address || ""} onChange={(e) => setMe({ ...me, address: e.target.value })} placeholder="주소" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>상세주소</label>
                <input style={styles.input} value={me.addressDetail || ""} onChange={(e) => setMe({ ...me, addressDetail: e.target.value })} placeholder="상세주소" />
              </div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={saveInfo}>저장</button>
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
          <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={onAddClick}>추가</button>
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
                    수정
                  </button>
                )}
                {onDelete && (
                  <button style={{ ...styles.button, ...styles.dangerBtn }} onClick={() => onDelete(row.id)}>
                    삭제
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
    { key: "company", label: "회사명" },
    { key: "position", label: "직책/직위" },
    { key: "startDate", label: "시작일", type: "date" },
    { key: "endDate", label: "종료일", type: "date" },
    { key: "description", label: "업무 내용", as: "textarea" },
  ];
  const createExp = async (data) => { await post("/profile/experiences", data); await loadAll(); setOpenForm({ ...openForm, exp: false }); window.alert("추가했습니다."); };
  const updateExp = async (row, data) => { await put(`/profile/experiences/${row.id}`, data); await loadAll(); setEditRow({ type: null, data: null }); window.alert("수정했습니다."); };
  const deleteExp = async (id) => { await del(`/profile/experiences/${id}`); await loadAll(); window.alert("삭제했습니다."); };

  // 수상이력
  const awardSchema = [
    { key: "title", label: "수상명" },
    { key: "organization", label: "수여기관" },
    { key: "awardDate", label: "수상일", type: "date" },
    { key: "description", label: "설명", as: "textarea" },
  ];
  const createAward = async (d) => { await post("/profile/awards", d); await loadAll(); setOpenForm({ ...openForm, award: false }); window.alert("추가했습니다."); };
  const updateAward = async (row, d) => { await put(`/profile/awards/${row.id}`, d); await loadAll(); setEditRow({ type: null, data: null }); window.alert("수정했습니다."); };
  const deleteAward = async (id) => { await del(`/profile/awards/${id}`); await loadAll(); window.alert("삭제했습니다."); };

  // 자격증
  const certSchema = [
    { key: "name", label: "자격증명" },
    { key: "issuer", label: "발급기관" },
    { key: "issueDate", label: "발급일", type: "date" },
    { key: "expiryDate", label: "만료일", type: "date" },
    { key: "certificationNumber", label: "자격증 번호" },
  ];
  const createCert = async (d) => { await post("/profile/certifications", d); await loadAll(); setOpenForm({ ...openForm, cert: false }); window.alert("추가했습니다."); };
  const updateCert = async (row, d) => { await put(`/profile/certifications/${row.id}`, d); await loadAll(); setEditRow({ type: null, data: null }); window.alert("수정했습니다."); };
  const deleteCert = async (id) => { await del(`/profile/certifications/${id}`); await loadAll(); window.alert("삭제했습니다."); };

  // 프로젝트
  const projSchema = [
    { key: "title", label: "프로젝트명" },
    { key: "role", label: "역할" },
    { key: "startDate", label: "시작일", type: "date" },
    { key: "endDate", label: "종료일", type: "date" },
    { key: "technologies", label: "사용 기술", as: "textarea" },
    { key: "achievement", label: "성과", as: "textarea" },
    { key: "url", label: "URL" },
    { key: "description", label: "설명", as: "textarea" },
  ];
  const createProj = async (d) => { await post("/profile/projects", d); await loadAll(); setOpenForm({ ...openForm, proj: false }); window.alert("추가했습니다."); };
  const updateProj = async (row, d) => { await put(`/profile/projects/${row.id}`, d); await loadAll(); setEditRow({ type: null, data: null }); window.alert("수정했습니다."); };
  const deleteProj = async (id) => { await del(`/profile/projects/${id}`); await loadAll(); window.alert("삭제했습니다."); };

  // 강점
  const createStrength = async (d) => { await post("/profile/strengths", d); await loadAll(); setOpenForm({ ...openForm, strength: false }); window.alert("추가했습니다."); };
  const updateStrength = async (row, d) => { await put(`/profile/strengths/${row.id}`, d); await loadAll(); setEditRow({ type: null, data: null }); window.alert("수정했습니다."); };
  const deleteStrength = async (id) => { await del(`/profile/strengths/${id}`); await loadAll(); window.alert("삭제했습니다."); };


  // 평판 생성
  const createReputation = async (data) => {
    if (!data.target_user_id) {
      window.alert("먼저 사용자를 검색해주세요.");
      return;
    }
    if (!data.category) {
      window.alert("카테고리를 선택해주세요.");
      return;
    }
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      window.alert("별점을 선택해주세요 (1-5점).");
      return;
    }
    if (!data.comment || !data.comment.trim()) {
      window.alert("코멘트를 입력해주세요.");
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
      window.alert("평판을 작성했습니다.");
    } catch (e) {
      window.alert(e?.message || "평판 작성 중 오류가 발생했습니다.");
    }
  };


  // 평판(조회 및 작성)
  // repList는 loadAll에서만 세팅

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* 내 정보 */}
      {renderInfo()}

      {/* 경력 */}
      <div id="section-experience">
        {renderList(
          "경력",
          expList,
          "경력 정보가 존재하지 않습니다.",
          () => setOpenForm({ ...openForm, exp: true }),
          (row) => setEditRow({ type: "exp", data: row }),
          deleteExp,
          openForm.exp ? (
            <InlineForm schema={expSchema} onSubmit={createExp} onCancel={() => setOpenForm({ ...openForm, exp: false })} />
          ) : editRow.type === "exp" ? (
            <InlineForm
              schema={expSchema}
              defaults={editRow.data}
              onSubmit={(d) => updateExp(editRow.data, d)}
              onCancel={() => setEditRow({ type: null, data: null })}
            />
          ) : null
        )}
      </div>

      {/* 수상이력 */}
      <div id="section-awards">
        {renderList(
          "수상이력",
          awardList,
          "수상이력 정보가 존재하지 않습니다.",
          () => setOpenForm({ ...openForm, award: true }),
          (row) => setEditRow({ type: "award", data: row }),
          deleteAward,
          openForm.award ? (
            <InlineForm schema={awardSchema} onSubmit={createAward} onCancel={() => setOpenForm({ ...openForm, award: false })} />
          ) : editRow.type === "award" ? (
            <InlineForm
              schema={awardSchema}
              defaults={editRow.data}
              onSubmit={(d) => updateAward(editRow.data, d)}
              onCancel={() => setEditRow({ type: null, data: null })}
            />
          ) : null
        )}
      </div>

      {/* 자격증 */}
      <div id="section-certifications">
        {renderList(
          "자격증",
          certList,
          "자격증 정보가 존재하지 않습니다.",
          () => setOpenForm({ ...openForm, cert: true }),
          (row) => setEditRow({ type: "cert", data: row }),
          deleteCert,
          openForm.cert ? (
            <InlineForm schema={certSchema} onSubmit={createCert} onCancel={() => setOpenForm({ ...openForm, cert: false })} />
          ) : editRow.type === "cert" ? (
            <InlineForm
              schema={certSchema}
              defaults={editRow.data}
              onSubmit={(d) => updateCert(editRow.data, d)}
              onCancel={() => setEditRow({ type: null, data: null })}
            />
          ) : null
        )}
      </div>

      {/* 프로젝트 */}
      <div id="section-projects">
        {renderList(
          "프로젝트",
          projList,
          "프로젝트 정보가 존재하지 않습니다.",
          () => setOpenForm({ ...openForm, proj: true }),
          (row) => setEditRow({ type: "proj", data: row }),
          deleteProj,
          openForm.proj ? (
            <InlineForm schema={projSchema} onSubmit={createProj} onCancel={() => setOpenForm({ ...openForm, proj: false })} />
          ) : editRow.type === "proj" ? (
            <InlineForm
              schema={projSchema}
              defaults={editRow.data}
              onSubmit={(d) => updateProj(editRow.data, d)}
              onCancel={() => setEditRow({ type: null, data: null })}
            />
          ) : null
        )}
      </div>

      {/* 강점 */}
      <div id="section-strengths">
        <Accordion title="강점">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={() => setOpenForm({ ...openForm, strength: true })}>추가</button>
          </div>
          {/* 폼을 섹션 카드 내부에 렌더링 */}
          {openForm.strength && !editRow.type && (
            <StrengthForm
              onSubmit={(d) => {
                createStrength(d);
                setOpenForm({ ...openForm, strength: false });
              }}
              onCancel={() => setOpenForm({ ...openForm, strength: false })}
            />
          )}
          {editRow.type === "strength" && (
            <StrengthForm
              defaults={editRow.data}
              onSubmit={(d) => {
                updateStrength(editRow.data, d);
                setEditRow({ type: null, data: null });
              }}
              onCancel={() => setEditRow({ type: null, data: null })}
            />
          )}
          {(!strengthList || strengthList.length === 0) ? (
            <div style={styles.mutedBox}>강점 정보가 존재하지 않습니다.</div>
          ) : (
            strengthList.map((row) => (
              <div key={row.id} style={styles.itemCard}>
                <div style={{ marginBottom: 6, fontWeight: 700 }}>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 12,
                      background: "#fee2e2",
                      color: "#991b1b",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      marginRight: 8,
                    }}
                  >
                    {row.category || "일반"}
                  </span>
                  {row.strength}
                </div>
                {row.description && (
                  <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>{row.description}</div>
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={() => setEditRow({ type: "strength", data: row })}>
                    수정
                  </button>
                  <button style={{ ...styles.button, ...styles.dangerBtn }} onClick={() => deleteStrength(row.id)}>
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </Accordion>
      </div>

      {/* 평판(조회 및 작성) */}
      <div id="section-reputations">
        <Accordion title="평판">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={() => setOpenRepForm(true)}>추가</button>
          </div>
          {/* 평판 작성 폼 */}
          {openRepForm && (
            <ReputationForm
              onSubmit={createReputation}
              onCancel={() => setOpenRepForm(false)}
              searchingUser={searchingUser}
              searchUserByEmail={searchUserByEmail}
              REPUTATION_CATEGORIES={REPUTATION_CATEGORIES}
            />
          )}
          {(!repList || repList.length === 0) ? (
            <div style={styles.mutedBox}>평판 정보가 존재하지 않습니다.</div>
          ) : (
            repList.map((row) => (
              <div key={row.id} style={styles.itemCard}>
                <div style={{ marginBottom: 6, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 12,
                      background: "#fee2e2",
                      color: "#991b1b",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {row.category || "평판"}
                  </span>
                  {row.fromName && (
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      작성자: {row.fromName}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {row.rating && (
                    <div style={{ display: "flex", gap: 2 }}>
                      {[...Array(row.rating)].map((_, idx) => (
                        <span key={idx} style={{ color: "#ef4444", fontSize: 16 }}>★</span>
                      ))}
                      {[...Array(5 - row.rating)].map((_, idx) => (
                        <span key={idx} style={{ color: "#d1d5db", fontSize: 16 }}>★</span>
                      ))}
                    </div>
                  )}
                  {row.rating && (
                    <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: 600 }}>
                      {row.rating}점
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
                    작성일: {row.createdAt}
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
