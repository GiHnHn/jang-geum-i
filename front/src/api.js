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
export const AIResponse = async (question, recipe) => {
  return fetch(`${BACKEND_API_URL}/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, recipe }),
  });
};

export const fetchTTS = async (text, abortController) => {
  return await fetch(`${BACKEND_API_URL}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: abortController?.signal, // ✅ AbortController 지원 추가
  });
};