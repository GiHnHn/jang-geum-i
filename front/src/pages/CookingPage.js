// pages/CookingPage.js
import React, { useState} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CookingAssistant from "../components/CookingAssistant";

const BACKEND_API_URL = "https://jang-geum-i-backend.onrender.com";

function CookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipe = location.state?.recipe;
  const [currentStep, setCurrentStep] = useState(0);
  const [isCookingComplete, setIsCookingComplete] = useState(false);
  const [evaluation, setEvaluation] = useState({
    user_id: "",
    sweet: "",
    spicy: "",
    salty: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setEvaluation((prev) => ({ ...prev, [name]: value }));
  };

  const convertTasteScore = (text) => {
    const mapping = {
      "너무 부족하다": 5,
      "조금 부족하다": 4,
      "적절하다": 3,
      "조금 과하다": 2,
      "너무 과하다": 1,
    };
    return mapping[text] || 3;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!evaluation.user_id) return alert("사용자 ID를 입력해주세요.");

    const data = {
      user_id: evaluation.user_id,
      sweet: convertTasteScore(evaluation.sweet),
      spicy: convertTasteScore(evaluation.spicy),
      salty: convertTasteScore(evaluation.salty),
    };

    try {
      const response = await fetch(`${BACKEND_API_URL}/taste-evaluation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("서버 오류");
      alert("입맛 평가가 저장되었습니다.");
      navigate("/");
    } catch (error) {
      console.error("서버 오류:", error);
    }
  };

  const handleNextStep = () => {
    if (currentStep < recipe.instructions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      alert("요리가 완료되었습니다!");
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      alert("더 이상 이전 단계가 없습니다!");
    }
  };

  if (!recipe) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>레시피 정보가 없습니다. 홈으로 돌아갑니다.</h2>
        <button onClick={() => navigate("/")}>홈으로</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", fontFamily: "Arial, sans-serif", backgroundColor: "#f9f9f9", minHeight: "100vh", paddingTop: "50px" }}>
      <h1 style={{ color: "#4CAF50", marginBottom: "20px" }}>{recipe.dish}</h1>
  
      {/* 요리가 완료되면 맛 평가 폼 표시 */}
      {isCookingComplete ? (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <h2>음식 맛 평가</h2>
          <form onSubmit={handleSubmit}>
            <label>사용자 ID를 입력해주세요:</label>
            <input type="text" name="user_id" value={evaluation.user_id} onChange={handleChange} required />
  
            <label>단맛 강도를 평가해주세요:</label>
            <select name="sweet" value={evaluation.sweet} onChange={handleChange} required>
              <option value="">선택하세요</option>
              <option value="너무 부족하다">너무 부족하다</option>
              <option value="조금 부족하다">조금 부족하다</option>
              <option value="적절하다">적절하다</option>
              <option value="조금 과하다">조금 과하다</option>
              <option value="너무 과하다">너무 과하다</option>
            </select>
  
            <label>매운맛 강도를 평가해주세요:</label>
            <select name="spicy" value={evaluation.spicy} onChange={handleChange} required>
              <option value="">선택하세요</option>
              <option value="너무 부족하다">너무 부족하다</option>
              <option value="조금 부족하다">조금 부족하다</option>
              <option value="적절하다">적절하다</option>
              <option value="조금 과하다">조금 과하다</option>
              <option value="너무 과하다">너무 과하다</option>
            </select>
  
            <label>짠맛 강도를 평가해주세요:</label>
            <select name="salty" value={evaluation.salty} onChange={handleChange} required>
              <option value="">선택하세요</option>
              <option value="너무 부족하다">너무 부족하다</option>
              <option value="조금 부족하다">조금 부족하다</option>
              <option value="적절하다">적절하다</option>
              <option value="조금 과하다">조금 과하다</option>
              <option value="너무 과하다">너무 과하다</option>
            </select>
  
            <button type="submit">제출</button>
          </form>
        </div>
      ) : (
        <>
          {/* 요리 진행 UI */}
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
  
          {/* 마지막 단계에서 "요리 완료" 버튼 표시 */}
          {currentStep === recipe.instructions.length - 1 && (
            <button onClick={() => setIsCookingComplete(true)} style={{ marginTop: "20px", padding: "10px 15px", fontSize: "1rem", backgroundColor: "#FF5733", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
              요리 완료
            </button>
          )}
        
          <CookingAssistant
            recipe={recipe}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
          />
        </>
      )}
    </div>
  );
}

export default CookingPage;
