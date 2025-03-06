import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Link
} from "react-router-dom";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp } from "firebase/app";
import axios from 'axios';


const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const BACKEND_API_URL = 'https://jang-geum-i-backend.onrender.com';


// Firebase 초기화
const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

//--------------------------//
// 1) 기존 App을 MainApp으로 //
//--------------------------//
function MainApp() {
  const [imageUrl, setImageUrl] = useState(null); // 업로드된 이미지 URL
  const [inputText, setInputText] = useState(""); // 텍스트 입력 상태 추가
  const [result, setResult] = useState(null); // OpenAI API 결과
  const [status, setStatus] = useState("idle"); // 현재 상태: idle, uploading, extracting, complete
  const [error, setError] = useState(null); // 에러 메시지
  const [user, setUser] = useState(null); // 사용자 로그인 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // ✅ 사이드바 상태 추가
  const [searchHistory, setSearchHistory] = useState([]); // 🔥 이전 검색 기록 저장
  const [searchResult, setSearchResult] = useState(null); // 🔥 검색된 레시피 결과
  const navigate = useNavigate();

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 파일 크기 제한: 5MB
  const SUPPORTED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif"]; // 지원되는 파일 형식

  // Firebase Storage에 파일 업로드 후 URL 반환
  const uploadFileToFirebase = async (file) => {
    const storageRef = ref(storage, `images/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // OpenAI 연동: Firebase Storage에 업로드된 이미지 URL or 텍스트를 백엔드로 전달
  const fetchRecipeFromBackend = async (payload) => {
    setStatus("extracting");

    const response = await fetch(`${BACKEND_API_URL}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include" // 🔥 쿠키가 백엔드로 전달되도록 설정
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${responseText}`);
    }

    return await response.json();
  };

  useEffect(() => {
    // 🔥 localStorage에서 로그인 정보 불러오기
    const storedUser = localStorage.getItem("username");
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  // 파일 업로드 및 텍스트/이미지 처리
  const handleUpload = async (file) => {
    setError(null);
    setResult(null);
    setSearchResult(null); // 🔥 기존 검색 결과 삭제
    setImageUrl(null); // ✅ 기존 이미지 삭제
    setStatus("processing");

    try {
      let payload;

      if (inputText.trim()) {
        payload = { query: inputText };
      }

      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error("파일 크기는 5MB를 초과할 수 없습니다.");
        }
        if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
          throw new Error("지원되지 않는 파일 형식입니다. (지원: JPEG, PNG, GIF)");
        }

        const uploadedImageUrl = await uploadFileToFirebase(file);
        setImageUrl(uploadedImageUrl);
        payload = { imageUrl: uploadedImageUrl };
      }

      if (!payload) {
        throw new Error("텍스트를 입력하거나 이미지를 업로드해주세요.");
      }

      setStatus("extracting"); // 🔥 "레시피를 추출 중입니다..." 메시지 표시

      // 백엔드로 데이터 전송 -> OpenAI 응답(요리 정보) 수신
      const data = await fetchRecipeFromBackend(payload);
      setResult(data);
      setStatus("complete");
    } catch (err) {
      console.error("Error:", err.message || err);
      setError(`오류 발생: ${err.message || "알 수 없는 오류"}`);
      setStatus("idle");
    }
  };

  // 드래그 앤 드롭
  const handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files[0]) {
      handleUpload(files[0]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // "요리 시작" 버튼
  const handleStartCooking = () => {
    if (!result || !result.dish) {
      alert("레시피가 없습니다! 먼저 검색을 진행해주세요.");
      return;
    }
    navigate("/cooking", { state: { recipe: result } });
  };

  const handleNavigateToPurchase = () => {
    if (!result) {
        alert("레시피를 먼저 검색해주세요.");
        return;
    }
    navigate("/purchase", { state: { recipe: result } }); // 📌 3번 화면(구매 페이지)으로 이동할 때 recipe 데이터 전달
  };

  // ✅ 로그아웃 기능
  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_API_URL}/api/users/logout`, {}, { withCredentials: true });
      localStorage.removeItem("username");
      setUser(null);
      setIsSidebarOpen(false); // 사이드바 닫기
      alert("✅ 로그아웃 되었습니다.");
      navigate("/");
    } catch (error) {
      console.error("🚨 로그아웃 실패:", error);
    }
  };

  // ✅ 🔥 새로운 레시피 검색
  const fetchNewRecipe = async () => {
    if (!inputText.trim()) return alert("검색어를 입력해주세요!");

    setError(null);
    setResult(null);
    setSearchResult(null); // 🔥 기존 검색 결과 삭제
    setImageUrl(null); // ✅ 기존 이미지 삭제
    setStatus("extracting"); // 🔥 "레시피를 추출 중입니다..." 메시지 표시
    setInputText(""); // 🔥 검색 후 입력창 자동 삭제

    try {
      const response = await axios.post(`${BACKEND_API_URL}/upload`, { query: inputText }, { withCredentials: true });
      setSearchResult(response.data); // 🔥 새로운 검색 결과 저장
      setStatus("complete"); // ✅ 검색 완료 후 상태 업데이트 (파란색 문구 사라짐)
    } catch (error) {
      console.error("🚨 레시피 검색 오류:", error);
      alert("검색 중 오류가 발생했습니다.");
      setStatus("idle"); // ✅ 오류 발생 시 상태 초기화
    }
  };

  // ✅ 🔥 이전 검색 기록 가져오기
  const fetchSearchHistory = async () => {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/api/recipes/search-history`, { withCredentials: true });
      if (response.data && response.data.history) {
        setSearchHistory(response.data.history);
      }
    } catch (error) {
      console.error("🚨 검색 기록 불러오기 실패:", error);
    }
  };

  // ✅ 검색 기록 버튼 클릭 시 조회
  const handleShowSearchHistory = () => {
    fetchSearchHistory();
  };

  // ✅ 레시피 클릭 시 상세 정보 보기
  const handleRecipeClick = (recipe) => {
    setSearchResult(recipe);
  };
  
  
  // ✅ 버튼 스타일 추가
const styles = {
  authButton: {
    padding: "8px 15px",
    fontSize: "0.9rem",
    backgroundColor: "#4CAF50",
    color: "white",
    borderRadius: "5px",
    textDecoration: "none",
    cursor: "pointer",
  },
};

  return (
    
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f9f9f9",
        color: "#333",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <h1 style={{ fontSize: "3rem", color: "#4CAF50", marginBottom: "20px" }}>
        장금이
      </h1>
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "15px",
          backgroundColor: "#f9f9f9",
          borderRadius: "10px",
          textAlign: "center",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          marginBottom: "20px",
          border: "1px solid #ddd",
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="장금이에게 물어보세요!"
          style={{
            width: "80%",
            maxWidth: "250px",
            fontSize: "0.9rem",
            border: "1px solid #ccc",
            borderRadius: "5px",
            marginBottom: "15px",
            outline: "none",
          }}
        />
        <button
          onClick={fetchNewRecipe}
          style={{
            padding: "10px 15px",
            fontSize: "0.9rem",
            backgroundColor: "#4CAF50",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#45a049")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#4CAF50")}
        >
          검색
        </button>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "30px",
          backgroundColor: "#fff",
          borderRadius: "10px",
          textAlign: "center",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          border: "2px dashed #ccc",
        }}
      >
        <p style={{ color: "#666", marginBottom: "20px", fontSize: "1rem" }}>
          여기로 이미지를 드래그하거나 <br />
          <label
            htmlFor="fileInput"
            style={{
              color: "#4CAF50",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            파일을 업로드
          </label>
          하세요.
        </p>
        <input
          type="file"
          id="fileInput"
          style={{ display: "none" }}
          onChange={(e) => handleUpload(e.target.files[0])}
        />
        {status === "uploading" && (
          <p style={{ color: "blue" }}>이미지를 업로드 중입니다...</p>
        )}
        {status === "extracting" && (
          <p style={{ color: "blue" }}>레시피를 추출 중입니다...</p>
        )}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Uploaded"
            style={{
              marginTop: "20px",
              maxWidth: "100%",
              height: "auto",
              borderRadius: "10px",
              border: "1px solid #ccc",
            }}
          />
        )}
      </div>

      {/* ✅ 사용자명이 있으면 우측 상단에 표시 */}
      <div style={{ position: "absolute", top: "10px", right: "20px" }}>
        {user ? (
          <>
            <span
            style={{ fontWeight: "bold", color: "#4CAF50", cursor: "pointer" }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} // 🔥 클릭하면 사이드바 토글
          >
            {user}님
          </span>
            <button onClick={handleLogout} style={styles.logoutButton}>로그아웃</button>
          </>
        ) : (
          <div>
            <Link to="/login" style={styles.authButton}>로그인</Link>
            <Link to="/register" style={styles.authButton}>회원가입</Link>
          </div>
        )}
      </div>

      {/* ✅ 사이드바 (우측에서 슬라이드) */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: isSidebarOpen ? "0px" : "-300px", // 🔥 열릴 때 0px, 닫힐 때 -300px
          width: "250px",
          height: "100vh",
          backgroundColor: "#fff",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          transition: "right 0.3s ease-in-out",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* ❌ 사이드바 닫기 버튼 */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "absolute",
            top: "10px",
            left: "15px",
            fontSize: "1.5rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#888",
          }}
        >
          ❌
        </button>

        <h2 style={{ color: "#4CAF50" }}>👤 사용자 정보</h2>
        <p style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{user}</p>

        <button
          onClick={handleShowSearchHistory}
          style={{
            marginTop: "20px",
            padding: "10px",
            backgroundColor: "#007BFF",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          📜 이전 레시피 조회
        </button>

        {/* 🔥 🔥 🔥 검색 기록 리스트 (스크롤 추가됨) */}
        <div
          style={{
            flex: 1, 
            overflowY: "auto",  // ✅ 스크롤 가능하도록 설정
            overflowX: "hidden",
            maxHeight: "60vh",  // ✅ 검색 기록이 많으면 70% 높이까지만 표시
            width: "100%", 
            paddingRight: "5px", // ✅ 스크롤 바와 내용이 겹치지 않도록 여백 추가
            marginTop: "10px",
          }}
        >
          <ul style={{ width: "100%", padding: "10px", listStyle: "none" }}>
            {searchHistory.length > 0 ? (
              searchHistory.map((entry, index) => (
                <li
                  key={index}
                  style={{
                    padding: "10px",
                    borderBottom: "1px solid #ddd",
                    cursor: "pointer",
                    color: "#333",
                    whiteSpace: "nowrap", // ✅ 한 줄로 유지
                    overflow: "hidden",
                    textOverflow: "ellipsis", // ✅ 너무 길면 ...으로 표시
                  }}
                  onClick={() => handleRecipeClick(entry.recipe)}
                >
                  {entry.query} - {entry.recipe.dish}
                </li>
              ))
            ) : (
              <p style={{ color: "#666", marginTop: "10px" }}>이전 검색 기록이 없습니다.</p>
            )}
          </ul>
        </div>

        <button
          onClick={handleLogout}
          style={{
            marginTop: "20px",
            padding: "10px 15px",
            backgroundColor: "red",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          로그아웃
        </button>
      </div>

      {searchResult && (
        <RecipeDisplay recipe={searchResult} navigate={navigate} />
      )}
    


       {/* 여기부터 수정사항 */}
       {/* 여기부터 수정사항 */}
       {/* 여기부터 수정사항 */}
      {status === "complete" && result && (
        <div
          style={{
            marginTop: "30px",
            textAlign: "left",
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "10px",
            color: "#333",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            width: "100%",
            maxWidth: "800px",
          }}
        >
          <h2
            style={{ color: "#4CAF50", fontSize: "1.5rem", marginBottom: "20px" }}
          >
            요리 이름: {result.dish}
          </h2>

          <div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>재료:</h3>
            {result.ingredients && result.ingredients.length > 0 ? (
              <ul>
                {result.ingredients.map((ingredient, index) => (
                  <li key={index} style={{ marginBottom: "5px" }}>
                    {ingredient.name}: {ingredient.quantity}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#666" }}>재료 정보가 없습니다.</p>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>
              조리법:
            </h3>
            {result.instructions ? (
              Array.isArray(result.instructions) ? (
                <ul style={{ paddingLeft: "20px", listStyleType: "decimal" }}>
                  {result.instructions.map((step, index) => (
                    <li key={index} style={{ marginBottom: "5px" }}>
                      {step}
                    </li>
                  ))}
                </ul>
              ) : (
                <pre
                  style={{
                    backgroundColor: "#f9f9f9",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1px solid #ccc",
                  }}
                >
                  {result.instructions}
                </pre>
              )
            ) : (
              <p style={{ color: "#666" }}>조리법 정보가 없습니다.</p>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
            <button
              onClick={handleNavigateToPurchase}
              style={{
                padding: "10px 15px",
                fontSize: "1rem",
                backgroundColor: "#ccc",
                color: "#333",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              구매하기
            </button>
            <button
              onClick={handleStartCooking}
              style={{
                padding: "10px 15px",
                fontSize: "1rem",
                backgroundColor: "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              요리 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate(); // ✅ 페이지 이동을 위한 useNavigate 추가

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await axios.post(`${BACKEND_API_URL}/api/users/register`, formData, { withCredentials: true });

      if (response.status === 201) {
        alert("✅ 회원가입이 완료되었습니다!");
        navigate("/"); // ✅ 회원가입 후 초기 화면으로 이동
      } else {
        console.error("🚨 서버 응답 오류:", response.data);
        setMessage(response.data.error || "❌ 회원가입 실패");
      }
    } catch (error) {
      console.error("🚨 회원가입 요청 실패:", error.response?.data || error.message);
      setMessage(error.response?.data?.error || "❌ 서버 오류로 회원가입 실패");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>회원가입</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          name="username"
          placeholder="사용자명"
          value={formData.username}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="email"
          name="email"
          placeholder="이메일"
          value={formData.email}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          value={formData.password}
          onChange={handleChange}
          required
          style={styles.input}
        />

        {/* ✅ 버튼 영역을 두 개로 나눔 */}
        <div style={styles.buttonContainer}>
          <button type="button" onClick={() => navigate("/")} style={styles.backButton}>
            뒤로 가기
          </button>
          <button type="submit" style={styles.submitButton}>
            회원가입 완료
          </button>
        </div>
      </form>
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
}

// ✅ 추가된 스타일
const styles = {
  container: {
    textAlign: "center",
    maxWidth: "400px",
    margin: "50px auto",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    backgroundColor: "#fff",
  },
  title: {
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  input: {
    padding: "10px",
    fontSize: "1rem",
    border: "1px solid #ccc",
    borderRadius: "5px",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "10px",
  },
  backButton: {
    padding: "10px",
    fontSize: "1rem",
    backgroundColor: "#888",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    flex: "1",
    marginRight: "5px",
  },
  submitButton: {
    padding: "10px",
    fontSize: "1rem",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    flex: "1",
    marginLeft: "5px",
  },
  message: {
    marginTop: "10px",
    color: "red",
  },
};

function LoginPage({ setUser }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await axios.post(`${BACKEND_API_URL}/api/users/login`, formData, { withCredentials: true });

      if (response.status === 200) {
        const { username } = response.data;
        setUser(username);
        localStorage.setItem("username", username);
        alert("✅ 로그인 성공!");
        navigate("/"); // ✅ 로그인 후 메인 화면으로 이동
      } else {
        setMessage(response.data.error || "❌ 로그인 실패");
      }
    } catch (error) {
      console.error("🚨 로그인 요청 실패:", error.response?.data || error.message);
      setMessage(error.response?.data?.error || "❌ 이메일 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>로그인</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          name="email"
          placeholder="이메일"
          value={formData.email}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          value={formData.password}
          onChange={handleChange}
          required
          style={styles.input}
        />

        {/* ✅ 버튼 영역 */}
        <div style={styles.buttonContainer}>
          <button type="button" onClick={() => navigate("/")} style={styles.backButton}>
            뒤로 가기
          </button>
          <button type="submit" style={styles.submitButton}>
            로그인
          </button>
        </div>
      </form>
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
}

function PurchasePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const recipe = location.state?.recipe;
    
    const [selectedIngredients, setSelectedIngredients] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!recipe) {
        return <div>레시피 정보가 없습니다. 홈으로 이동하세요.</div>;
    }

    // ✅ 체크박스 변경 핸들러
    const handleRadioChange = (event) => {
      setSelectedIngredients(event.target.value);
  };

    // ✅ 네이버 쇼핑 API 요청 (수정)
    const handleSearch = async () => {
      if (!selectedIngredients) {
          alert("구매할 재료를 선택해주세요.");
          return;
      }

        setLoading(true);
        setError(null);
        setSearchResults([]);

        try {
            const query = selectedIngredients; 
            console.log(`🔍 검색 쿼리: ${query}`);

            const response = await axios.get(`${BACKEND_API_URL}/api/search?query=${query}`);

            if (response.data && response.data.items.length > 0) {
                setSearchResults(response.data.items);
            } else {
                setSearchResults([]);
                setError("검색된 상품이 없습니다. 다른 재료를 선택해 주세요.");
            }
        } catch (error) {
            console.error("검색 오류:", error);
            setError("검색 결과를 가져오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // ✅ "뒤로 가기" 버튼 기능 추가
    const handleGoBack = () => {
      navigate("/", { state: { recipe } }); // 📌 2번 화면(레시피 상세)으로 돌아가도록 수정
  };

    // ✅ 요리 시작 버튼
    const handleStartCooking = () => {
        navigate("/cooking", { state: { recipe } });
    };

    return (
      <div style={{ padding: "20px" }}>
          <h2>🛒 구매할 재료 선택</h2>
          <p style={{ fontSize: "14px", color: "#555" }}>재료 하나씩 선택하여 검색 버튼을 눌러주세요.</p> {/* ✅ 추가된 문구 */}
          <ul>
              {recipe.ingredients.map((ingredient, index) => (
                  <li key={index}>
                      <label>
                          <input
                              type="radio" // ✅ 체크박스에서 라디오 버튼으로 변경
                              name="ingredient"
                              value={ingredient.name}
                              checked={selectedIngredients === ingredient.name}
                              onChange={handleRadioChange}
                          />
                          {ingredient.name} ({ingredient.quantity})
                      </label>
                  </li>
              ))}
          </ul>
  
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              {/* ✅ 구매 링크 검색 버튼 */}
              <button onClick={handleSearch} style={{ padding: "10px 15px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
                  구매 링크 검색
              </button>
  
              {/* ✅ 뒤로 가기 버튼 */}
              <button onClick={handleGoBack} style={{ padding: "10px 15px", backgroundColor: "#888", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
                  🔙 뒤로 가기
              </button>
          </div>
  
          {loading && <p>🔄 검색 중...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
  
          {searchResults.length > 0 && (
              <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#fff", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
                  <h2 style={{ fontSize: "1.5rem", marginBottom: "10px", borderBottom: "2px solid #4CAF50", paddingBottom: "5px" }}>🔗 검색 결과</h2>
                  <ul style={{ listStyle: "none", padding: "0" }}>
                      {searchResults.map((item, index) => (
                          <li key={index} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderBottom: "1px solid #ddd" }}>
                              {/* ✅ 이미지 스타일 조정 */}
                              <img src={item.image} alt={item.title} style={{ width: "80px", height: "80px", borderRadius: "5px", objectFit: "cover", border: "1px solid #ddd" }} />
  
                              <div style={{ flex: "1" }}>
                                  {/* ✅ <b>태그 제거 */}
                                  <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#333", textDecoration: "none" }}>
                                      {item.title.replace(/<\/?b>/g, '')}
                                  </a>
                                  <p style={{ margin: "5px 0", fontSize: "1rem", color: "#FF5733", fontWeight: "bold" }}>💰 {Number(item.price).toLocaleString()}원</p>
                              </div>
                          </li>
                      ))}
                  </ul>
                  <button onClick={handleStartCooking} style={{ marginTop: "20px", padding: "10px 15px", backgroundColor: "#FF5733", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
                      🍳 요리 시작
                  </button>
              </div>
          )}
      </div>
  );
} 

/* 여기까지 수정사항 */
/* 여기까지 수정사항 */
/* 여기까지 수정사항 */

// ✅ 레시피 출력 컴포넌트, 유지보수 용이하도록 컴포넌트로 분리
function RecipeDisplay({ recipe, navigate }) {
  return (
    <div style={{
      marginTop: "30px", textAlign: "left", backgroundColor: "#fff",
      padding: "20px", borderRadius: "10px", color: "#333",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", width: "100%", maxWidth: "800px",
    }}>
      <h2 style={{ color: "#4CAF50" }}>요리 이름: {recipe.dish}</h2>
      <h3>재료:</h3>
      <ul>{recipe.ingredients.map((ingredient, index) => (
        <li key={index}>{ingredient.name}: {ingredient.quantity}</li>
      ))}</ul>
      <h3>조리법:</h3>
      <ul>{recipe.instructions.map((step, index) => (
        <li key={index}>{step}</li>
      ))}</ul>
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
        <button onClick={() => navigate("/purchase", { state: { recipe } })} style={{ padding: "10px", backgroundColor: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          구매하기
        </button>
        <button onClick={() => navigate("/cooking", { state: { recipe } })} style={{ padding: "10px", backgroundColor: "#4CAF50", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          요리 시작
        </button>
      </div>
    </div>
  );
}


function CookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipe = location.state?.recipe;
  const [currentStep, setCurrentStep] = useState(0);
  const [isAssistantOn, setIsAssistantOn] = useState(false); // AI 어시스턴트 ON/OFF 상태
  const [userQuestion, setUserQuestion] = useState("");

  const audioRef = useRef(null);
  const recognitionRef = useRef(null);

  // Base64 → Blob 변환 함수
  const b64toBlob = (b64Data, contentType) => {
    const byteChars = atob(b64Data);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNums);
    return new Blob([byteArray], { type: contentType });
  };

  // AI 어시스턴트 TTS 음성 출력
  const playCloudTTS = useCallback(async (text) => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error(`TTS API Error: ${response.status}`);

      const data = await response.json();
      if (data.audioBase64) {
        const audioBlob = b64toBlob(data.audioBase64, "audio/mp3");
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        await audio.play();
      }
    } catch (err) {
      console.error("TTS 오류:", err);
    }
  }, []);

  // AI 어시스턴트 응답 요청
  const startListening = () => {
    if (!recognitionRef.current) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = "ko-KR"; // 한국어 설정
        recognitionRef.current.interimResults = false;
        recognitionRef.current.continuous = true; // 🎯 계속 듣기 모드 활성화
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event) => {
            const voiceText = event.results[0][0].transcript.trim();
            console.log("🎤 음성 입력:", voiceText); // 인식된 텍스트 확인용

            if (voiceText.includes("다음 단계")) {
                handleNextStep();
            } else if (voiceText.includes("이전 단계")) {
                handlePreviousStep();
            } else {
                setUserQuestion(voiceText);
                fetchAIResponse();
            }
        };

        recognitionRef.current.onerror = (event) => {
            console.error("🚨 음성 인식 오류:", event.error);
        };

        // 🎯 음성 인식이 끝났을 때 자동으로 다시 시작
        recognitionRef.current.onend = () => {
            console.log("🔄 음성 인식이 종료됨, 다시 시작합니다...");
            if (isAssistantOn) {
                recognitionRef.current.start();
            }
        };
    }

    recognitionRef.current.start();
  };

  const fetchAIResponse = async () => {
    if (!userQuestion.trim()) return;

    console.log("AI에게 보낸 질문:", userQuestion);

    try {
        const response = await fetch(`${BACKEND_API_URL}/assistant`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ question: userQuestion }),
        });

        const data = await response.json();
        console.log("🗣 AI 응답:", data.answer);

        playCloudTTS(data.answer).then(() => {
            console.log("🎤 AI 응답 후 음성 인식 다시 시작...");
            if (isAssistantOn) {
                recognitionRef.current.start(); // 🎯 AI 응답 후 다시 마이크 활성화
            }
        });

    } catch (error) {
        console.error("🚨 AI 응답 오류:", error);
        playCloudTTS("AI 응답을 가져올 수 없습니다.").then(() => {
            if (isAssistantOn) {
                recognitionRef.current.start();
            }
        });
    }
  };



  // AI 어시스턴트 버튼 클릭 시 ON/OFF
  const toggleAssistant = () => {
    if (isAssistantOn) {
        console.log("🛑 AI 어시스턴트 OFF: 음성 인식 중단");
        recognitionRef.current?.stop();
    } else {
        console.log("✅ AI 어시스턴트 ON: 음성 인식 시작");
        startListening();
    }
    setIsAssistantOn((prev) => !prev);
  };


  // 단계 변경 시 음성 안내
  useEffect(() => {
    if (!recipe || !recipe.instructions) return;
    const currentText = recipe.instructions[currentStep];
    if (currentText) playCloudTTS(currentText);
  }, [currentStep, recipe, playCloudTTS]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  // 레시피가 없으면 홈으로 이동
  if (!recipe) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>레시피 정보가 없습니다. 홈으로 돌아갑니다.</h2>
        <button onClick={() => navigate("/")}>홈으로</button>
      </div>
    );
  }

  // 단계 이동 핸들러
  const handleNextStep = () => {
    if (!recipe.instructions) return;
    if (currentStep < recipe.instructions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      alert("요리가 완료되었습니다!");
      navigate("/");
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      alert("더 이상 이전 단계가 없습니다!");
    }
  };

  return (
    <div style={{ textAlign: "center", fontFamily: "Arial, sans-serif", backgroundColor: "#f9f9f9", minHeight: "100vh", paddingTop: "50px" }}>
      <h1 style={{ color: "#4CAF50", marginBottom: "20px" }}>{recipe.dish}</h1>

      {recipe.instructions && (
        <div style={{ marginBottom: "20px" }}>
          <h3>단계 {currentStep + 1} / {recipe.instructions.length}</h3>
          <p style={{ marginTop: "10px" }}>{recipe.instructions[currentStep]}</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        <button onClick={handlePreviousStep} style={{ padding: "10px 15px", fontSize: "1rem", backgroundColor: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" }}>이전 단계</button>
        <button onClick={handleNextStep} style={{ padding: "10px 15px", fontSize: "1rem", backgroundColor: "#4CAF50", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>다음 단계</button>
      </div>

      {/* AI 어시스턴트 토글 버튼 */}
      <button onClick={toggleAssistant} style={{ marginTop: "20px", padding: "10px 15px", fontSize: "1rem", backgroundColor: isAssistantOn ? "red" : "#4CAF50", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
        {isAssistantOn ? "AI 어시스턴트 끄기" : "AI 어시스턴트 켜기"}
      </button>
    </div>
  );
}




function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp user={user} />} />
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/purchase" element={<PurchasePage />} />
        <Route path="/cooking" element={<CookingPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </Router>
  );
}

export default App;
