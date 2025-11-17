import React, { useState, useRef } from 'react';

/**
 * 음성 입력 버튼 컴포넌트
 * 사용자의 음성을 녹음하고, 서버에서 텍스트로 변환 후 필드별로 분류
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

function VoiceInputButton({ onFieldsReceived }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  /**
   * 녹음 시작
   */
  const startRecording = async () => {
    try {
      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 음성 데이터 수집
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // 녹음 종료 시 서버로 전송
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAudio(audioBlob);
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('녹음 시작');
    } catch (error) {
      console.error('마이크 접근 오류:', error);
      alert('마이크 접근 권한이 필요합니다.\n브라우저 설정에서 마이크 권한을 허용해주세요.');
    }
  };

  /**
   * 녹음 중지
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('녹음 중지');
    }
  };

  /**
   * 음성 파일을 서버로 전송하고 텍스트 변환 + 필드 분류
   */
  const uploadAudio = async (audioBlob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');

      console.log('음성 파일 전송 중...');
      const response = await fetch(`${API_BASE}/parse-voice-input`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '음성 처리 실패');
      }

      const data = await response.json();
      console.log('✅ 변환된 텍스트:', data.transcribed_text);
      console.log('✅ 분류된 필드:', data.fields);

      // 부모 컴포넌트로 데이터 전달
      if (onFieldsReceived) {
        onFieldsReceived(data.fields, data.transcribed_text);
      }

      alert('✅ 음성 입력이 완료되었습니다!\n\n각 항목을 확인하고 필요시 수정해주세요.');
    } catch (error) {
      console.error('❌ 음성 업로드 오류:', error);
      alert(`음성 처리 중 오류가 발생했습니다.\n\n${error.message}\n\n서버 상태를 확인해주세요.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'inline-block' }}>
      {!isRecording ? (
        <button
          onClick={startRecording}
          disabled={isProcessing}
          style={{
            padding: '10px 20px',
            backgroundColor: isProcessing ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: isProcessing ? 'none' : '0 2px 5px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            if (!isProcessing) e.target.style.backgroundColor = '#45a049';
          }}
          onMouseOut={(e) => {
            if (!isProcessing) e.target.style.backgroundColor = '#4CAF50';
          }}
        >
          <span>{isProcessing ? '처리 중...' : '음성 입력'}</span>
        </button>
      ) : (
        <button
          onClick={stopRecording}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            animation: 'pulse 1.5s infinite'
          }}
        >
          <span style={{ 
            width: '10px', 
            height: '10px', 
            backgroundColor: 'white', 
            borderRadius: '50%',
            animation: 'blink 1s infinite'
          }}></span>
          <span>녹음 중지</span>
        </button>
      )}

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}

export default VoiceInputButton;

