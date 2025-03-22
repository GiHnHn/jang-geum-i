// components/RecipeDisplay.js
import React from "react";
import { useNavigate } from "react-router-dom";

function RecipeDisplay({ recipe }) {
  const navigate = useNavigate();

  return (
    <div style={{
      marginTop: "30px", textAlign: "left", backgroundColor: "#fff",
      padding: "20px", borderRadius: "10px", color: "#333",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", width: "100%", maxWidth: "800px",
    }}>
      <h2 style={{ color: "#4CAF50" }}>요리 이름: {recipe.dish}</h2>

      <h3>재료:</h3>
      <ul>
        {recipe.ingredients.map((ingredient, index) => (
          <li key={index}>{ingredient.name}: {ingredient.quantity}</li>
        ))}
      </ul>

      <h3>조리법:</h3>
      <ul>
        {recipe.instructions.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ul>

      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
        <button
          onClick={() => navigate("/purchase", { state: { recipe } })}
          style={{ padding: "10px", backgroundColor: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          구매하기
        </button>
        <button
          onClick={() => navigate("/cooking", { state: { recipe } })}
          style={{ padding: "10px", backgroundColor: "#4CAF50", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          요리 시작
        </button>
      </div>
    </div>
  );
}

export default RecipeDisplay;