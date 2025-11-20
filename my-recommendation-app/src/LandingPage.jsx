// LandingPage.jsx
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

// Moonlight Letter 로고 컴포넌트
const MoonlightLogo = ({ size = 40, showText = true, darkMode = false }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* 달과 별 아이콘 */}
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* 달 */}
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 12px rgba(147, 112, 219, 0.3))' }}>
          <defs>
            <linearGradient id="moonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#9370DB', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#6A5ACD', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          {/* 달 모양 (초승달) */}
          <circle cx="50" cy="50" r="35" fill="url(#moonGradient)" />
          <circle cx="60" cy="45" r="28" fill={darkMode ? '#0f0f0f' : '#ffffff'} />
          {/* 달 표면 디테일 */}
          <circle cx="42" cy="45" r="4" fill={darkMode ? 'rgba(15, 15, 15, 0.3)' : 'rgba(255, 255, 255, 0.4)'} opacity="0.6" />
          <circle cx="38" cy="58" r="3" fill={darkMode ? 'rgba(15, 15, 15, 0.3)' : 'rgba(255, 255, 255, 0.4)'} opacity="0.5" />
        </svg>
        {/* 반짝이는 별들 */}
        <div style={{ position: 'absolute', top: '5px', right: '-5px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" 
                  fill="#FFD700" 
                  style={{ filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))' }} />
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: '8px', right: '2px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" 
                  fill="#F0E68C" 
                  style={{ filter: 'drop-shadow(0 0 3px rgba(240, 230, 140, 0.6))' }} />
          </svg>
        </div>
      </div>
      
      {/* 텍스트 로고 */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #9370DB 0%, #6A5ACD 50%, #FFD700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.5px',
          }}>
            Moonlight Letter
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: darkMode ? '#a0a0a0' : '#6b7280',
            letterSpacing: '0.5px',
          }}>
            문라이트 AI 추천서
          </div>
        </div>
      )}
    </div>
  );
};

const LandingPage = ({ onNavigateToLogin, onNavigateToSignup, darkMode = false }) => {
  const styles = {
    container: {
      minHeight: '100vh',
      background: darkMode 
        ? 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2a 50%, #0a0a0a 100%)'
        : 'linear-gradient(135deg, #e8e5ff 0%, #f5e6ff 50%, #fff9e6 100%)',
      color: darkMode ? '#e0e0e0' : '#1f2937',
    },
    header: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: darkMode ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(10px)',
      boxShadow: darkMode 
        ? '0 4px 6px rgba(147, 112, 219, 0.25)'
        : '0 4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      borderBottom: darkMode ? '2px solid #9370DB' : '2px solid #e5e7eb',
    },
    headerContent: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    logo: {
      cursor: 'pointer',
    },
    loginButton: {
      padding: '0.75rem 2rem',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #9370DB 0%, #6A5ACD 100%)',
      color: 'white',
      border: 'none',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 4px 12px rgba(147, 112, 219, 0.3)',
    },
    main: {
      paddingTop: '100px',
      paddingBottom: '80px',
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '100px 2rem 80px',
    },
    hero: {
      textAlign: 'center',
      marginBottom: '4rem',
    },
    title: {
      fontSize: '3.5rem',
      fontWeight: 'bold',
      marginBottom: '1.5rem',
      background: 'linear-gradient(135deg, #9370DB 0%, #6A5ACD 50%, #FFD700 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      lineHeight: '1.2',
    },
    subtitle: {
      fontSize: '1.5rem',
      color: darkMode ? '#a0a0a0' : '#6b7280',
      marginBottom: '2rem',
      lineHeight: '1.6',
    },
    description: {
      fontSize: '1.125rem',
      color: darkMode ? '#c0c0c0' : '#374151',
      maxWidth: '800px',
      margin: '0 auto 3rem',
      lineHeight: '1.8',
    },
    qualitySection: {
      marginTop: '5rem',
    },
    sectionTitle: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: '1rem',
      color: darkMode ? '#e0e0e0' : '#1f2937',
    },
    sectionSubtitle: {
      fontSize: '1.125rem',
      textAlign: 'center',
      color: darkMode ? '#a0a0a0' : '#6b7280',
      marginBottom: '3rem',
      maxWidth: '700px',
      margin: '0 auto 3rem',
    },
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '2rem',
      marginTop: '3rem',
    },
    metricCard: {
      background: darkMode ? '#1a1a1a' : 'white',
      borderRadius: '20px',
      padding: '2rem',
      boxShadow: darkMode
        ? '0 8px 24px rgba(147, 112, 219, 0.25)'
        : '0 8px 16px rgba(0, 0, 0, 0.1)',
      border: darkMode ? '2px solid #9370DB' : '2px solid #f3f4f6',
      transition: 'all 0.3s',
      cursor: 'default',
    },
    metricIcon: {
      fontSize: '2rem',
      marginBottom: '1.5rem',
      width: '80px',
      height: '80px',
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1.5rem',
      background: 'linear-gradient(135deg, #9370DB 0%, #6A5ACD 100%)',
      color: 'white',
      fontWeight: 'bold',
      boxShadow: '0 4px 12px rgba(147, 112, 219, 0.3)',
    },
    metricTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
      color: darkMode ? '#e0e0e0' : '#1f2937',
    },
    metricDescription: {
      fontSize: '1rem',
      lineHeight: '1.6',
      color: darkMode ? '#a0a0a0' : '#6b7280',
    },
    ctaSection: {
      marginTop: '5rem',
      textAlign: 'center',
      padding: '4rem 2rem',
      background: darkMode
        ? 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f8f7ff 100%)',
      borderRadius: '24px',
      boxShadow: darkMode
        ? '0 12px 32px rgba(147, 112, 219, 0.3)'
        : '0 12px 32px rgba(0, 0, 0, 0.1)',
    },
    ctaTitle: {
      fontSize: '2rem',
      fontWeight: 'bold',
      marginBottom: '1.5rem',
      color: darkMode ? '#e0e0e0' : '#1f2937',
    },
    ctaText: {
      fontSize: '1.125rem',
      color: darkMode ? '#a0a0a0' : '#6b7280',
      marginBottom: '2rem',
      maxWidth: '600px',
      margin: '0 auto 2rem',
    },
    ctaButton: {
      padding: '1rem 3rem',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #9370DB 0%, #6A5ACD 100%)',
      color: 'white',
      border: 'none',
      fontSize: '1.25rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 8px 20px rgba(147, 112, 219, 0.4)',
    },
    radarContainer: {
      background: darkMode ? '#1a1a1a' : 'white',
      borderRadius: '24px',
      padding: '3rem 2rem',
      marginBottom: '3rem',
      boxShadow: darkMode
        ? '0 12px 32px rgba(147, 112, 219, 0.3)'
        : '0 12px 32px rgba(0, 0, 0, 0.1)',
      border: darkMode ? '2px solid #9370DB' : '2px solid #f3f4f6',
    },
    radarTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: '2rem',
      color: darkMode ? '#e0e0e0' : '#1f2937',
    },
  };

  // 레이더 차트 데이터 (예시: 우수한 품질 점수)
  const radarData = [
    { metric: '정확성', score: 4.8, fullMark: 5 },
    { metric: '전문성', score: 4.5, fullMark: 5 },
    { metric: '논리성', score: 4.7, fullMark: 5 },
    { metric: '개인화', score: 5.0, fullMark: 5 },
    { metric: '설득력', score: 4.6, fullMark: 5 },
  ];

  const metrics = [
    {
      icon: '01',
      title: '정확성 (Accuracy)',
      description: '사실과 일치하며 과장 없이 객관적으로 표현',
      details: [
        '✓ 검증 가능한 내용으로 구성',
        '✓ 허위 정보 및 과장 진술 배제',
        '✓ 실제 사례 기반 작성'
      ]
    },
    {
      icon: '02',
      title: '전문성 (Professionalism)',
      description: '문법적으로 안정적이고 전문적인 어투',
      details: [
        '✓ 자연스러운 문장 구성',
        '✓ 적절한 문체 유지',
        '✓ 맞춤법과 띄어쓰기 완벽'
      ]
    },
    {
      icon: '03',
      title: '논리성/구조 (Coherence)',
      description: '논리적 흐름과 체계적 구조',
      details: [
        '✓ 추천 이유 → 사례 → 결론 흐름',
        '✓ 문단 간 자연스러운 연결',
        '✓ 도입-본론-결론 명확'
      ]
    },
    {
      icon: '04',
      title: '개인화 (Personalization)',
      description: '지원자만의 고유한 사례와 구체적 성과',
      details: [
        '✓ 맞춤형 콘텐츠 작성',
        '✓ 실제 경험 기반',
        '✓ 구체적 수치와 성과 포함'
      ]
    },
    {
      icon: '05',
      title: '설득력 (Persuasiveness)',
      description: '명확한 추천 의사와 효과적 어필',
      details: [
        '✓ 구체적 근거 제시',
        '✓ 인상적인 사례 활용',
        '✓ 신뢰할 수 있는 정보 전달'
      ]
    },
  ];

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <MoonlightLogo size={40} showText={true} darkMode={darkMode} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                background: 'transparent',
                color: '#9370DB',
                border: '2px solid #9370DB',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onClick={onNavigateToLogin}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#9370DB';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#9370DB';
              }}
            >
              로그인
            </button>
            <button
              style={styles.loginButton}
              onClick={onNavigateToSignup}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(147, 112, 219, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(147, 112, 219, 0.3)';
              }}
            >
              회원가입
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main style={styles.main}>
        {/* 히어로 섹션 */}
        <section style={styles.hero}>
          {/* 로고 애니메이션 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <MoonlightLogo size={80} showText={false} darkMode={darkMode} />
          </div>
          
          <h1 style={styles.title}>
            어둠 속 숨은 강점을<br />
            달빛처럼 비춰드립니다
          </h1>
          <p style={styles.subtitle}>
            🌙 AI가 당신의 잠재력을 발견하고 조명합니다
          </p>
          <p style={styles.description}>
            달빛이 어둠 속 길을 비추듯, Moonlight Letter는 
            정확성, 전문성, 논리성, 개인화, 설득력을 갖춘 
            최고 수준의 추천서로 당신의 숨겨진 강점을 세상에 드러냅니다. 
            AI가 당신만의 별을 찾아 빛내드립니다.
          </p>
        </section>

        {/* 품질 지표 섹션 */}
        <section style={styles.qualitySection}>
          <h2 style={styles.sectionTitle}>
            5가지 품질 지표
          </h2>
          <p style={styles.sectionSubtitle}>
            모든 추천서는 아래 5가지 지표로 자동 평가되어<br />
            최고 품질을 보장합니다
          </p>

          {/* 레이더 차트 */}
          <div style={styles.radarContainer}>
            <h3 style={styles.radarTitle}>
              AI 품질 평가 시각화
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <defs>
                  <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9370DB" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#6A5ACD" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#FFD700" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <PolarGrid stroke={darkMode ? '#444' : '#d1d5db'} />
                <PolarAngleAxis 
                  dataKey="metric" 
                  tick={{ 
                    fill: darkMode ? '#e0e0e0' : '#374151', 
                    fontSize: 14, 
                    fontWeight: 600 
                  }} 
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 5]} 
                  tick={{ 
                    fill: darkMode ? '#a0a0a0' : '#6b7280', 
                    fontSize: 12 
                  }} 
                />
                <Radar 
                  name="점수" 
                  dataKey="score" 
                  stroke="#9370DB" 
                  fill="url(#radarGradient)" 
                  fillOpacity={1} 
                  strokeWidth={3}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ 
              textAlign: 'center', 
              marginTop: '1.5rem',
              padding: '1rem',
              background: darkMode ? '#2a2a2a' : '#f9fafb',
              borderRadius: '12px'
            }}>
              <div style={{ 
                fontSize: '1.125rem', 
                fontWeight: 'bold', 
                color: darkMode ? '#e0e0e0' : '#1f2937',
                marginBottom: '0.5rem'
              }}>
                평균 품질 점수
              </div>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold', 
                background: 'linear-gradient(135deg, #9370DB 0%, #6A5ACD 50%, #FFD700 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                4.72 / 5.0
              </div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: darkMode ? '#a0a0a0' : '#6b7280',
                marginTop: '0.5rem'
              }}>
                ⭐ 최상위 품질 수준
              </div>
            </div>
          </div>

          <div style={styles.metricsGrid}>
            {metrics.map((metric, index) => (
              <div
                key={index}
                style={styles.metricCard}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = darkMode
                    ? '0 12px 32px rgba(147, 112, 219, 0.35)'
                    : '0 12px 24px rgba(0, 0, 0, 0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = darkMode
                    ? '0 8px 24px rgba(147, 112, 219, 0.25)'
                    : '0 8px 16px rgba(0, 0, 0, 0.1)';
                }}
              >
                <div style={styles.metricIcon}>{metric.icon}</div>
                <h3 style={styles.metricTitle}>{metric.title}</h3>
                <p style={{
                  ...styles.metricDescription,
                  marginBottom: '1rem',
                  fontWeight: '600',
                  fontSize: '1.05rem'
                }}>
                  {metric.description}
                </p>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}>
                  {metric.details.map((detail, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        fontSize: '0.9rem', 
                        color: darkMode ? '#c0c0c0' : '#4b5563',
                        lineHeight: '1.5'
                      }}
                    >
                      {detail}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA 섹션 */}
        <section style={styles.ctaSection}>
          <h2 style={styles.ctaTitle}>
            지금 바로 시작하세요
          </h2>
          <p style={styles.ctaText}>
            몇 분 안에 전문가 수준의 추천서를 받아보세요.<br />
            회원가입 후 즉시 이용 가능합니다.
          </p>
          <button
            style={styles.ctaButton}
            onClick={onNavigateToLogin}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(147, 112, 219, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(147, 112, 219, 0.4)';
            }}
          >
            무료로 시작하기
          </button>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;

