// pages/PurchasePage.js
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { searchIngredient } from "../api";

function PurchasePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipe = location.state?.recipe;
  const [selectedIngredients, setSelectedIngredients] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!recipe) {
    return <div>레시피 정보가 없습니다. 홈으로 이동하세요.</div>;
  }

  const handleRadioChange = (event) => {
    setSelectedIngredients(event.target.value);
  };

  const handleSearch = async () => {
    if (!selectedIngredients) {
      alert("구매할 재료를 선택해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults([]);

    try {
        const response = await searchIngredient(selectedIngredients);
      if (response.data && response.data.items.length > 0) {
        setSearchResults(response.data.items);
      } else {
        setError("검색된 상품이 없습니다. 다른 재료를 선택해 주세요.");
      }
    } catch (error) {
      console.error("검색 오류:", error);
      setError("검색 결과를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate("/", { state: { recipe } });
  };

  const handleStartCooking = () => {
    navigate("/cooking", { state: { recipe } });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>🛒 구매할 재료 선택</h2>
      <p style={{ fontSize: "14px", color: "#555" }}>재료 하나씩 선택하여 검색 버튼을 눌러주세요.</p>
      <ul>
        {recipe.ingredients.map((ingredient, index) => (
          <li key={index}>
            <label>
              <input
                type="radio"
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
        <button
          onClick={handleSearch}
          style={{ padding: "10px 15px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
        >
          구매 링크 검색
        </button>
        <button
          onClick={handleGoBack}
          style={{ padding: "10px 15px", backgroundColor: "#888", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
        >
          🔙 뒤로 가기
        </button>
      </div>

      {loading && <p>🔄 검색 중...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {searchResults.length > 0 && (
        <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#fff", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "10px", borderBottom: "2px solid #4CAF50", paddingBottom: "5px" }}>
            🔗 검색 결과
          </h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {searchResults.map((item, index) => (
              <li
                key={index}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderBottom: "1px solid #ddd" }}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  style={{ width: "80px", height: "80px", borderRadius: "5px", objectFit: "cover", border: "1px solid #ddd" }}
                />
                <div style={{ flex: 1 }}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#333", textDecoration: "none" }}
                  >
                    {item.title.replace(/<\/?b>/g, "")}
                  </a>
                  <p style={{ margin: "5px 0", fontSize: "1rem", color: "#FF5733", fontWeight: "bold" }}>
                    💰 {Number(item.price).toLocaleString()}원
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={handleStartCooking}
            style={{ marginTop: "20px", padding: "10px 15px", backgroundColor: "#FF5733", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
          >
            요리 시작
          </button>
        </div>
      )}
    </div>
  );
}

export default PurchasePage;