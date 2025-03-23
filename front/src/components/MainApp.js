// components/MainApp.js
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import axios from "axios";
import RecipeDisplay from "./RecipeDisplay";

const BACKEND_API_URL = "https://jang-geum-i-backend.onrender.com";

function MainApp({ user, setUser }) {
  const [inputText, setInputText] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchResult, setSearchResult] = useState(null);
  const navigate = useNavigate();

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const SUPPORTED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif"];

  const uploadFileToFirebase = async (file) => {
    const storageRef = ref(storage, `images/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const fetchRecipeFromBackend = async (payload) => {
    setStatus("extracting");
    const response = await fetch(`${BACKEND_API_URL}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${responseText}`);
    }
    return await response.json();
  };

  useEffect(() => {
    setUser(localStorage.getItem("username") || null);
  }, []);

  const handleUpload = async (file) => {
    setError(null);
    setResult(null);
    setSearchResult(null);
    setImageUrl(null);
    setStatus("processing");

    try {
      let payload;
      if (inputText.trim()) payload = { query: inputText };

      if (file) {
        if (file.size > MAX_FILE_SIZE) throw new Error("파일 크기는 5MB를 초과할 수 없습니다.");
        if (!SUPPORTED_FILE_TYPES.includes(file.type)) throw new Error("지원되지 않는 파일 형식입니다.");
        const uploadedImageUrl = await uploadFileToFirebase(file);
        setImageUrl(uploadedImageUrl);
        payload = { imageUrl: uploadedImageUrl };
      }

      if (!payload) throw new Error("텍스트를 입력하거나 이미지를 업로드해주세요.");

      const data = await fetchRecipeFromBackend(payload);
      setResult(data);
      setStatus("complete");
    } catch (err) {
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
    if (!result || !result.dish) return alert("레시피가 없습니다! 먼저 검색을 진행해주세요.");
    navigate("/cooking", { state: { recipe: result } });
  };

  const handleNavigateToPurchase = () => {
    if (!result) return alert("레시피를 먼저 검색해주세요.");
    navigate("/purchase", { state: { recipe: result } });
  };

  //로그아웃 기능
  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_API_URL}/api/users/logout`, {}, { withCredentials: true });
      localStorage.removeItem("username");
      setUser?.(null);
      setIsSidebarOpen(false);
      alert("✅ 로그아웃 되었습니다.");
      navigate("/");
    } catch (error) {
      console.error("🚨 로그아웃 실패:", error);
    }
  };

  const fetchNewRecipe = async () => {
    if (!inputText.trim()) return alert("검색어를 입력해주세요!");
    setError(null);
    setResult(null);
    setSearchResult(null);
    setImageUrl(null);
    setStatus("extracting");
    setInputText("");

    try {
      const response = await axios.post(`${BACKEND_API_URL}/upload`, { query: inputText }, { withCredentials: true });
      setSearchResult(response.data);
      setStatus("complete");
    } catch (error) {
      setStatus("idle");
    }
  };

  const fetchSearchHistory = async () => {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/api/recipes/search-history`, { withCredentials: true });
      if (response.data?.history) setSearchHistory(response.data.history);
    } catch (error) {
      console.error("🚨 검색 기록 불러오기 실패:", error);
    }
  };

   // ✅ 검색 기록 버튼 클릭 시 조회
   const handleShowSearchHistory = () => {
    fetchSearchHistory();
  };

  const handleRecipeClick = (recipe) => setSearchResult(recipe);

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
                {/* ✅ 이미지가 있을 경우 썸네일처럼 표시 */}
                {entry.imageUrl && (
                  <img
                    src={entry.imageUrl}
                    alt="thumbnail"
                    style={{
                      width: "40px",
                      height: "40px",
                      objectFit: "cover",
                      borderRadius: "5px",
                      marginRight: "10px"
                    }}
                  />
                )}
                
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

export default MainApp;
