// components/CookingAssistant.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import { AIResponse } from "../api";
import { fetchTTS } from "../api";
import CircularTimer from "./CircularTimer";

function CookingAssistant({ recipe, currentStep, setCurrentStep }) {
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [isAssistantOn, setIsAssistantOn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [timer, setTimer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const alarmAudioRef = useRef(null);
  const [alarmPlaying, setAlarmPlaying] = useState(false);

  const playCloudTTS = useCallback(async (text) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      if (abortControllerRef.current) abortControllerRef.current.abort();

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetchTTS(text, abortControllerRef.current);
      const data = await response.json();
      
      if (data.audioBase64) {
        const blob = new Blob([Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], { type: "audio/mp3" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        await audio.play();
      }
    } catch (err) {
      if (err.name !== "AbortError") console.error("TTS 오류:", err);
    }
  }, []);

  const handleAssistantAction = (data) => {
    if (!data || !data.action) return;

    switch (data.action) {
      case "next_step":
        setCurrentStep((prev) => Math.min(prev + 1, recipe.instructions.length - 1));
        break;
      case "prev_step":
        setCurrentStep((prev) => Math.max(prev - 1, 0));
        break;
      case "repeat_step":
        playCloudTTS(recipe.instructions[currentStep]);
        break;
      case "set_timer":
        if (data.time) {
          let seconds = parseInt(data.time, 10);
          if (data.unit === "분") seconds *= 60;
          setCookingTimer(seconds);
        }
        break;
      case "cancel_timer":
        setTimer(null);
        setTimeLeft(0);
        setTimerActive(false);
        stopAlarm();
        break;
      case "response":
        if (data.answer) playCloudTTS(data.answer);
        break;
      default:
        console.warn("알 수 없는 명령:", data.action);
    }
  };

  const fetchAIResponse = async (question) => {
    try {
      const response = await AIResponse(question, recipe);
      const data = await response.json();
      handleAssistantAction(data);
    } catch (error) {
      console.error("AI 응답 오류:", error);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current && !isListening) {
      // iOS Safari 지원을 위한 webkitSpeechRecognition 사용
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error("음성 인식을 지원하지 않는 브라우저입니다.");
        return;
      }
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "ko-KR";
      recognitionRef.current.continuous = true; // 지속적인 음성 감지
      recognitionRef.current.interimResults = false; // 중간 결과 미출력

      recognitionRef.current.onstart = () => {
        console.log("🎙️ 음성 인식 시작됨...");
        setIsAssistantOn(true);
      };
      
      recognitionRef.current.onresult = (event) => {
        const voiceText = event.results[event.results.length - 1][0].transcript.trim();
        console.log("음성 입력:", voiceText);
        fetchAIResponse(voiceText);
      };
      

      recognitionRef.current.onerror = (event) => {
        console.error("음성 인식 오류:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        console.log("음성 인식 종료됨");
        setIsListening(false);
        if (isAssistantOn) setTimeout(() => recognitionRef.current.start(), 1000);
      };
    }

    recognitionRef.current.start();
  };

  // AI 어시스턴트 버튼 클릭 시 ON/OFF
  const toggleAssistant = () => {
    if (isAssistantOn) {
      recognitionRef.current?.stop();
      setIsAssistantOn(false);
      setIsListening(false);
    } else {
      startListening();
      setIsAssistantOn(true);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsAssistantOn(false);
  };

  const setCookingTimer = (seconds) => {
    setTimeLeft(seconds);
    setTimer(seconds);
    setTimerActive(true);
    playCloudTTS(`${seconds}초 타이머를 설정했습니다.`);
  };

  const stopAlarm = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
      setAlarmPlaying(false);
    }
    setTimer(null);
    setTimeLeft(0);
    setTimerActive(false);
  };

  const playAlarm = () => {
    const audio = new Audio('/alarm.mp3'); // 혹은 public 경로에 있는 사운드 파일 경로
    audio.play();
  }
  


  useEffect(() => {
    if (timeLeft > 0) {
      const id = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(id);
    } else if (timeLeft === 0 && timer !== null && !alarmPlaying) {
      alarmAudioRef.current = new Audio("/alarm.mp3");
      alarmAudioRef.current.loop = true;
      alarmAudioRef.current.play();
      setAlarmPlaying(true);
    }
  }, [timeLeft, timer, alarmPlaying]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (recipe && recipe.instructions[currentStep]) {
      playCloudTTS(recipe.instructions[currentStep]);
    }
  }, [currentStep, recipe, playCloudTTS]);


  return (
    <div style={{ marginTop: "30px" }}>
      <button
        onClick={toggleAssistant ? stopListening : startListening}
        style={{ marginTop: "20px", padding: "10px 15px", fontSize: "1rem", backgroundColor: isAssistantOn ? "red" : "#4CAF50", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}
      >
        {isAssistantOn ? "AI 어시스턴트 끄기" : "AI 어시스턴트 켜기"}
      </button>
      
      <CircularTimer initialTime={timeLeft} onComplete={() => playAlarm()} />
    </div>
  );
}

export default CookingAssistant;
