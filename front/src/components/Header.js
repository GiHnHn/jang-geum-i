// src/components/Header.js
import React from 'react';
import { useCharacter } from '../contexts/CharacterContext';

const meta = {
  baek:  { name: '빽AI',   img: '/images/baek.png'   },
  seung: { name: '3스타AI', img: '/images/seung.png' },
  jang:  { name: '장금이',   img: '/images/jang.png'  },
};

export default function Header() {
  const { character } = useCharacter();
  if (!character) return null;

  const { name, img } = meta[character];

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-black bg-opacity-80 backdrop-blur-sm flex items-center px-6 z-50">

      {/* 우측: 선택된 캐릭터 프로필 */}
      <div className="ml-auto flex items-center space-x-2 cursor-pointer">
      <img
        src={img}
        alt={name}
        style={{ width: 40, height: 40, borderRadius: '50%' }}
        />
        <span className="text-white font-medium">{name}</span>
      </div>
    </header>
  );
}
