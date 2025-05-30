// api.js
import axios from "axios";


const BACKEND_API_URL = "https://jang-geum-i-backend.onrender.com"; // 백엔드 URL

// 사용자 로그인 요청
export const loginUser = async (formData) => {
  return await axios.post(`${BACKEND_API_URL}/api/users/login`, formData, {
    withCredentials: true,
  });
};

// 사용자 회원가입 요청
export const registerUser = async (formData) => {
  return await axios.post(`${BACKEND_API_URL}/api/users/register`, formData, {
    withCredentials: true,
  });
};

// 로그아웃 요청
export const logoutUser = async () => {
  return await axios.post(`${BACKEND_API_URL}/api/users/logout`, {}, { withCredentials: true });
};

// 레시피 검색 요청
export const fetchRecipe = async (query) => {
  return await axios.post(`${BACKEND_API_URL}/upload`, { query }, { withCredentials: true });
};

// 검색 기록 가져오기
export const fetchSearchHistory = async () => {
  return await axios.get(`${BACKEND_API_URL}/api/recipes/search-history`, { withCredentials: true });
};

// 재료 검색 (네이버 쇼핑 API)
export const searchIngredient = async (query) => {
  return await axios.get(`${BACKEND_API_URL}/api/search?query=${query}`);
};

// 맛 평가 제출
export const submitTasteEvaluation = async (evaluationData) => {
  return await axios.post(`${BACKEND_API_URL}/taste-evaluation`, evaluationData, {
    headers: { "Content-Type": "application/json" },
  });
};

// AI 어시스턴트 요청
/**
 * AI 어시스턴트 요청
 * @param {string} question  – 유저 질문
 * @param {object} recipe    – 현재 레시피 데이터
 * @param {string} character – 선택된 캐릭터 ID
 */
export const AIResponse = async (question, recipe, character) => {
  const base = BACKEND_API_URL;
  return fetch(`${base}/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ question, recipe }),
  });
};

/**
 * TTS 요청
 * @param {string} text         – TTS로 변환할 텍스트
 * @param {string} character    – 선택된 캐릭터 ID
 * @param {AbortController} abortController
 */

export const fetchTTS = async (text, abortController, character, format = "mp3") => {
  const base = BACKEND_API_URL;
  return fetch(`${base}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    signal: abortController?.signal,
    body: JSON.stringify({ text, format, character }),  // ← format 필드 추가
  });
};

// n8n webhook 전송
export const sendTestCommand = async (sessionId, character, command) => {
  return await axios.post(
    `${BACKEND_API_URL}/api/test-command`,
    { 
       sessionId: sessionId, 
       character: character, 
       command: command 
      },
    {
      withCredentials: true, // ✅ 쿠키 포함 요청
    }
  );
};