// components/MainApp.js
import React, { useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import axios from "axios";
import RecipeDisplay from "./RecipeDisplay";
import { useCharacter } from "../contexts/CharacterContext";
import { useNavigate } from 'react-router-dom';


const NAME_MAP = {
  baek:  "빽AI",
  seung: "3스타AI",
  jang:  "장금이",
};

// id ↔ 이미지 경로 매핑
const IMG_MAP = {
  baek:  "/images/baek.png",
  seung: "/images/seung.png",
  jang:  "/images/jang.png",
};

const BACKEND_API_URL = "https://jang-geum-i-backend.onrender.com";

function MainApp({ setUser }) {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [searchResult, setSearchResult] = useState(null);

  const { character } = useCharacter();
  const displayName = NAME_MAP[character] || "";
  const avatarSrc = IMG_MAP[character] || "";

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
  }, [setUser]);


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
        gap: "8px",  // 이미지↔텍스트↔검색창 간격을 16px로 통일
        padding: "20px",
      }}
    >
      {/* 1. 아바타(이미지) */}
      {avatarSrc && (
        <img
          src={avatarSrc}
          alt={displayName}
          style={{
            width: "250px",
            height: "250px",
            borderRadius: "20px",
            margin: 0,  // 개별 마진 제거
          }}
        />
      )}
  
      {/* 2. 제목(텍스트) */}
      <h1
        style={{
          fontSize: "3rem",
          color: "#4CAF50",
          margin: 0,  // 기본 h1 마진 제거
        }}
      >
        {displayName}
      </h1>
  
      {/* 3. 검색창 */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "15px",
          backgroundColor: "#fff",
          borderRadius: "10px",
          textAlign: "center",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          border: "1px solid #ddd",
          margin: 0,  // 개별 마진 제거
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`${displayName}에게 물어보세요!`}
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
