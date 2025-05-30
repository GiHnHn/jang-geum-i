import React, { useState, useRef, useEffect } from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { sendTestCommand } from "../api";
import { useLocation } from "react-router-dom";

// 캐릭터 ID에 따른 이미지 경로 매핑
const IMG_MAP = {
  baek: '/images/baek.png',
  seung: '/images/seung.png',
  jang: '/images/jang.png',
};

// 캐릭터별 시작 멘트 매핑
const GREETING_MAP = {
  baek: '안녕하세유~ 빽AI예유. 필요한게 뭐유?',
  seung: '안녕하세요. 3스타AI입니다. 필요한게 있으면 편하게 말씀하세요.',
  jang: '안녕하십니까. 장금이이옵니다. 필요한 것이 있으면 도움을 드리겠사옵니다.',
};

const styles = {
  container: {
    backgroundColor: '#ebf8ff',
    padding: '16px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '16px',
  },
  row: {
    display: 'flex',
    marginBottom: '12px',
  },
  left: {
    justifyContent: 'flex-start',
  },
  right: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '300px',
    padding: '12px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    backgroundClip: 'padding-box',
  },
  ai: {
    backgroundColor: 'white',
  },
  user: {
    backgroundColor: '#fef08a',
  },
  character: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    marginRight: '8px',
  },
  inputContainer: {
    display: 'flex',
    padding: '8px',
    borderTop: '1px solid #ccc',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    marginRight: '8px',
    outline: 'none',
  },
  button: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: '#fff',
    cursor: 'pointer',
  },
};


  
export default function ChatUI() {
  const { character } = useCharacter();
  const location = useLocation();
  const sessionId = location.state?.sessionId;
  const avatarSrc = IMG_MAP[character] || '/character.png';

  // 캐릭터별 시작 멘트 가져오기
  const initialGreeting = GREETING_MAP[character] || '안녕하세요! 무엇을 도와드릴까요?';

  const [messages, setMessages] = useState([
    { isUser: false, text: initialGreeting },
  ]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const formatHtml = (text) =>
  text
    // 1) 이미지 마크다운 ![alt](url) → <img>
    .replace(
      /!\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      (_, alt, url) =>
        `<img src="${url}" alt="${alt}" style="max-width:100%; margin:8px 0;" />`
    )
    // 2) 레이블 링크 [label](url) → <a>label</a>
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      (_, label, url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
    )
    // 3) 괄호 없이 그냥 남은 (https://…) → (<a>…</a>)
    .replace(
      /\((https?:\/\/[^)\s]+)\)/g,
      (_, url) => `(<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>)`
    )
    // 4) 나머지 줄바꿈 → <br>
    .replace(/\n/g, '<br>');

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const userMsg = { isUser: true, text: inputText.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // n8n API 호출
    try {
      const response = await sendTestCommand(sessionId, character, userMsg.text); // ✅ 서버 → n8n 호출
      const aiReply = { isUser: false, text: response.data?.message || "응답 없음" };
      setMessages(prev => [...prev, aiReply]);
    } catch (error) {
      console.error("n8n 호출 실패:", error);
      const errorMsg = { isUser: false, text: "⚠️ 오류가 발생했어요. 다시 시도해 주세요." };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    handleSend();
  };
  

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {messages.map((msg, idx) => {
          const rowStyle = {
            ...styles.row,
            ...(msg.isUser ? styles.right : styles.left),
          };
          const bubbleStyle = {
            ...styles.bubble,
            ...(msg.isUser ? styles.user : styles.ai),
          };

          // ─── AI 메시지일 때 ────────────────────────────────
          if (!msg.isUser) {
            return (
              <div key={idx} style={rowStyle}>
                <img src={avatarSrc} alt={character} style={styles.character} />
                <div
                  style={bubbleStyle}
                  dangerouslySetInnerHTML={{ __html: formatHtml(msg.text) }}
                />
              </div>
            );
          }

          // ─── 사용자 메시지일 때 ───────────────────────────
          return (
            <div key={idx} style={rowStyle}>
              <div style={bubbleStyle}>{msg.text}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form style={styles.inputContainer} onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="메시지를 입력하세요..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          전송
        </button>
      </form>
    </div>
  );
}
