import React, { useState, useRef, useEffect } from 'react';
import { useCharacter } from '../contexts/CharacterContext';

// 캐릭터 ID에 따른 이미지 경로 매핑
const IMG_MAP = {
  baek: '/images/baek.png',
  seung: '/images/seung.png',
  jang: '/images/jang.png',
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
    maxWidth: '300px',         // 최대 너비 제한 설정
    padding: '12px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    whiteSpace: 'normal',      // 텍스트 줄바꿈 허용
    wordBreak: 'break-word',   // 단어 단위 줄바꿈
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
  const avatarSrc = IMG_MAP[character] || '/character.png';

  const [messages, setMessages] = useState([
    { isUser: false, text: '안녕하세유~ 빽AI예유. 궁금한게 뭐유?' },
  ]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const userMsg = { isUser: true, text: inputText.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // TODO: 실제 API 호출로 교체
    setTimeout(() => {
      const aiReply = { isUser: false, text: `🤖 ${userMsg.text}` };
      setMessages(prev => [...prev, aiReply]);
    }, 500);
  };

  const handleSubmit = e => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              ...styles.row,
              ...(msg.isUser ? styles.right : styles.left),
            }}
          >
            {!msg.isUser && (
              <img
                src={avatarSrc}
                alt={character || 'AI'}
                style={styles.character}
              />
            )}
            <div
              style={{
                ...styles.bubble,
                ...(msg.isUser ? styles.user : styles.ai),
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
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
