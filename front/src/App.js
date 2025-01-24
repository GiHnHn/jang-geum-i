import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp } from "firebase/app";


const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const BACKEND_API_URL = process.env.REACT_APP_BACKEND_API_URL;

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
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${responseText}`);
    }

    return await response.json();
  };

  // 파일 업로드 및 텍스트/이미지 처리
  const handleUpload = async (file) => {
    setError(null);
    setResult(null);
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
          onClick={() => handleUpload(null)}
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

          <div style={{ textAlign: "center", marginTop: "30px" }}>
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



function CookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipe = location.state?.recipe;
  const [currentStep, setCurrentStep] = useState(0);

  const audioRef = useRef(null); // 현재 오디오 객체 참조
  const abortControllerRef = useRef(null); // AbortController 참조

  // base64 → Blob 변환 함수
  const b64toBlob = (b64Data, contentType) => {
    const byteChars = atob(b64Data);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNums);
    return new Blob([byteArray], { type: contentType });
  };

  // TTS 호출 및 오디오 재생
  const playCloudTTS = useCallback(
    async (text) => {
      try {
        // 기존 재생 중인 오디오 중단
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current = null;
        }

        // 이전 TTS 요청 중단
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // TTS 요청
        const response = await fetch(`${BACKEND_API_URL}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: abortController.signal, // AbortController 사용
        });

        if (!response.ok) {
          throw new Error(`TTS API Error: ${response.status}`);
        }

        const data = await response.json();
        if (data.audioBase64) {
          const audioBlob = b64toBlob(data.audioBase64, "audio/mp3");
          const audioUrl = URL.createObjectURL(audioBlob);

          const audio = new Audio(audioUrl);
          audioRef.current = audio; // Audio 객체 참조 저장

          await audio.play();
        }
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("TTS 요청이 중단되었습니다.");
        } else {
          console.error("TTS 재생 오류:", err.message || err);
        }
      }
    },
    [] // 의존성 없음
  );

  // 단계 변경 시 음성 재생
  useEffect(() => {
    if (!recipe || !recipe.instructions) return;

    const currentText = recipe.instructions[currentStep];
    if (currentText) {
      playCloudTTS(currentText);
    }
  }, [currentStep, recipe, playCloudTTS]);

  // Cleanup: 컴포넌트 언마운트 시 모든 요청 및 재생 중단
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 레시피가 없으면 홈으로 돌아가기
  if (!recipe) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>레시피 정보가 없습니다. 홈으로 돌아갑니다.</h2>
        <button onClick={() => navigate("/")}>홈으로</button>
      </div>
    );
  }

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
    <div
      style={{
        textAlign: "center",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f9f9f9",
        minHeight: "100vh",
        paddingTop: "50px",
      }}
    >
      <h1 style={{ color: "#4CAF50", marginBottom: "20px" }}>{recipe.dish}</h1>

      {recipe.instructions && (
        <div style={{ marginBottom: "20px" }}>
          <h3>
            단계 {currentStep + 1} / {recipe.instructions.length}
          </h3>
          <p style={{ marginTop: "10px" }}>{recipe.instructions[currentStep]}</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        <button
          onClick={handlePreviousStep}
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
          이전 단계
        </button>

        <button
          onClick={handleNextStep}
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
          다음 단계
        </button>
      </div>
    </div>
  );
}




function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/cooking" element={<CookingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
