import React, { useState, useEffect } from "react";
import "../styles.css";

const CircularTimer = ({ initialTime, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (timeLeft > 0 && isRunning) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      onComplete(); // ⏳ 타이머 종료 후 이벤트 실행 (예: 알림음 재생)
    }
  }, [timeLeft, isRunning, onComplete]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => setTimeLeft(initialTime);

  // ⏳ 원형 타이머 게이지 계산
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / initialTime) * circumference;

  return (
    <div className="timer-container">
      <svg width="150" height="150" viewBox="0 0 120 120">
        {/* ⭕ 원형 타이머 배경 */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#222"
          strokeWidth="8"
          fill="none"
        />
        {/* ⏳ 진행 게이지 */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#FFA500"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          transform="rotate(-90 60 60)" // ⏳ 시작 위치 조정
        />
        {/* ⏰ 남은 시간 표시 */}
        <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="24px" fill="#fff">
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </text>
      </svg>

      {/* 🔘 버튼들 */}
      <div className="timer-buttons">
        <button onClick={toggleTimer} className="btn">
          {isRunning ? "⏸️ 일시정지" : "▶️ 재개"}
        </button>
        <button onClick={resetTimer} className="btn">🔄 초기화</button>
      </div>
    </div>
  );
};

export default CircularTimer;