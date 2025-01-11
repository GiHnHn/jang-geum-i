import React, { useState } from "react";
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


function App() {
    const [imageUrl, setImageUrl] = useState(null); // 업로드된 이미지 URL
    const [result, setResult] = useState(null); // OpenAI API 결과
    const [status, setStatus] = useState("idle"); // 현재 상태: idle, uploading, extracting, complete
    const [error, setError] = useState(null); // 에러 메시지

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 파일 크기 제한: 5MB
    const SUPPORTED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif"]; // 지원되는 파일 형식

    // Firebase Storage에 파일 업로드 후 URL 반환
    const uploadFileToFirebase = async (file) => {
        const storageRef = ref(storage, `images/${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    // 백엔드에 이미지 전송 후 결과 반환
    const fetchRecipeFromBackend = async (file) => {
        setStatus("extracting"); // OpenAI 결과 추출 중
        const formData = new FormData();
        formData.append("file", file);
    
        const response = await fetch(`${BACKEND_API_URL}/upload`, { // 백엔드 URL 변경
            method: "POST",
            body: formData,
        });
    
        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`HTTP Error ${response.status}: ${responseText}`);
        }
    
        return await response.json();
    };

    // 파일 업로드 및 분석 처리
    const handleUpload = async (file) => {
        if (!file) return;

        // 파일 크기 제한 확인
        if (file.size > MAX_FILE_SIZE) {
            setError("파일 크기는 5MB를 초과할 수 없습니다.");
            return;
        }

        // 파일 형식 확인
        if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
            setError("지원되지 않는 파일 형식입니다. (지원: JPEG, PNG, GIF)");
            return;
        }

        setError(null);
        setResult(null);
        setImageUrl(null);
        setStatus("uploading"); // 업로드 중 상태

        try {
            // Firebase 업로드 및 URL 가져오기
            const uploadedImageUrl = await uploadFileToFirebase(file);
            setImageUrl(uploadedImageUrl);
            setStatus("extracting"); // 업로드 후 추출 상태

            // 백엔드로 전송 후 결과 받아오기
            const data = await fetchRecipeFromBackend(file);
            setResult(data);
            setStatus("complete"); // 추출 완료 상태
        } catch (err) {
            console.error("Error:", err.message || err);
            setError(`오류 발생: ${err.message || "알 수 없는 오류"}`);
            setStatus("idle"); // 초기 상태로 복귀
        }
    };

    // 드래그 앤 드롭 이벤트 처리
    const handleDrop = (event) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files && files[0]) {
            handleUpload(files[0]);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault(); // 드래그 중 기본 이벤트 방지
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
            <h1 style={{ fontSize: "3rem", color: "#4CAF50", marginBottom: "20px" }}>장금이</h1>
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
                {status === "uploading" && <p style={{ color: "blue" }}>이미지를 업로드 중입니다...</p>}
                {status === "extracting" && <p style={{ color: "blue" }}>레시피를 추출 중입니다...</p>}
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
                    <h2 style={{ color: "#4CAF50", fontSize: "1.5rem", marginBottom: "20px" }}>
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
                        <h3 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>조리법:</h3>
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
                </div>
            )}
        </div>
    );
}

export default App;
