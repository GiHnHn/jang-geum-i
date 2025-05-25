import React, { useEffect } from "react";
import "../styles.css";

const CircularTimer = ({ timeLeft, initialTime, isRunning, onStop }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / initialTime) * circumference;

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
    }
  }, [timeLeft, isRunning]);

  return (
    <div className="timer-container">
      <svg width="150" height="150" viewBox="0 0 120 120">
        {/* 원형 배경 */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#222"
          strokeWidth="8"
          fill="none"
        />
        {/* 진행 게이지 */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#FFA500"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
        {/* 남은 시간 텍스트 */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          fontSize="24px"
          fill="#fff"
        >
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </text>
      </svg>

      <div className="timer-buttons">
        <button onClick={onStop} className="btn">
          취소
        </button>
      </div>
    </div>
  );
};

export default CircularTimer;
