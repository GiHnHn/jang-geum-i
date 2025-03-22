// pages/LoginPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api";

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
        const response = await loginUser(formData);

      if (response.status === 200) {
        const { username } = response.data;
        setUser(username);
        localStorage.setItem("username", username);
        alert("✅ 로그인 성공!");
        navigate("/");
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

export default LoginPage;
