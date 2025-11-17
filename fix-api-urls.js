#!/usr/bin/env node

/**
 * API URL 일괄 변경 스크립트
 * 모든 파일에서 http://localhost:8000을 API_BASE 변수로 변경
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'my-recommendation-app', 'src');
const FILES_TO_CHECK = [
  'App.jsx',
  'App_mk2.jsx',
  'Box.jsx',
  'VoiceInputButton.jsx',
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // API_BASE 상수가 없으면 추가
  if (!content.includes('const API_BASE') && !content.includes('API_BASE =')) {
    const importMatch = content.match(/^(import[\s\S]*?from[\s\S]*?;[\s\S]*?\n)/);
    if (importMatch) {
      const apiBaseConst = '\n// API Base URL (환경 변수 지원)\nconst API_BASE = (import.meta?.env?.VITE_API_BASE ?? "http://localhost:8000").replace(/\\/+$/, "");\n\n';
      content = content.replace(importMatch[0], importMatch[0] + apiBaseConst);
      modified = true;
    }
  }

  // http://localhost:8000을 ${API_BASE}로 변경
  const patterns = [
    { from: /fetch\("http:\/\/localhost:8000\//g, to: 'fetch(`${API_BASE}/' },
    { from: /fetch\('http:\/\/localhost:8000\//g, to: "fetch(`${API_BASE}/" },
    { from: /`http:\/\/localhost:8000\//g, to: '`${API_BASE}/' },
    { from: /"http:\/\/localhost:8000\//g, to: '"${API_BASE}/' },
    { from: /'http:\/\/localhost:8000\//g, to: "'${API_BASE}/" },
  ];

  patterns.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 수정됨: ${path.relative(__dirname, filePath)}`);
    return true;
  }
  return false;
}

console.log('🔍 API URL 변경 중...\n');

let totalFixed = 0;
FILES_TO_CHECK.forEach(file => {
  const filePath = path.join(SRC_DIR, file);
  if (fs.existsSync(filePath)) {
    if (fixFile(filePath)) {
      totalFixed++;
    }
  } else {
    console.log(`⚠️  파일 없음: ${file}`);
  }
});

console.log(`\n✅ 완료: ${totalFixed}개 파일 수정됨`);
console.log('\n📝 다음 단계:');
console.log('1. 수정된 파일들을 확인하세요');
console.log('2. .env 파일에 VITE_API_BASE를 설정하세요');
console.log('3. npm run build로 빌드 테스트를 하세요');

