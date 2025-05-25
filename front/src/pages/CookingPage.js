// pages/CookingPage.js
import React, { useState} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CookingAssistant from "../components/CookingAssistant";
import { useEffect } from "react";


function CookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipe = location.state?.recipe;
  const [currentStep, setCurrentStep] = useState(0);
  const [isCookingComplete, setIsCookingComplete] = useState(false);


  useEffect(() => {
    if (isCookingComplete) {
      const timeout = setTimeout(() => {
        // 초기화 및 페이지 이동
        navigate("/home", { replace: true });
      }, 2000);
  
      return () => clearTimeout(timeout);
    }
  }, [isCookingComplete, navigate]);



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
  
      {isCookingComplete ? (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <h2>요리가 완료되었습니다!</h2>
          <p>잠시 후 홈으로 이동합니다...</p>
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
