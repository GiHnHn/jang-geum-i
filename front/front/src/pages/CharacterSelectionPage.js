// src/pages/CharacterSelectionPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacter } from '../contexts/CharacterContext';

const characters = [
    { id: 'baek',  name: '빽AI',   img: '/images/baek.png' },
    { id: 'seung', name: '3스타AI', img: '/images/seung.png' },
    { id: 'jang',  name: '장금이',   img: '/images/jang.png' },
];


export default function CharacterSelectionPage() {
  const { setCharacter } = useCharacter();
  const navigate = useNavigate();

  const handleClick = (id) => {
    setCharacter(id);
    navigate('/select-role');
  };

  return (
    <div className="relative min-h-screen bg-black px-4">
      {/* 안내 문구 */}
      <h1 style={{marginTop: '6rem', fontSize: '2rem', color: '#28a745', textAlign: 'center'}}>
        나만의 요리 선생님을 선택해보세요
      </h1>

      {/* ─── 프로필 그리드 ─── */}
      <div className="profile-container">
        {characters.map((c) => (
          <div key={c.id} className="profile-card">
            <button
              onClick={() => handleClick(c.id)}
              className="avatar-button"
            >
              <img
                src={c.img}
                alt={c.name}
                className="avatar-small"
              />
            </button>
            <span className="profile-name">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
