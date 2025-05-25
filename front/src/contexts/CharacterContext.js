// src/contexts/CharacterContext.js
import { useEffect, createContext, useContext, useState } from 'react';

const CharacterContext = createContext();

/** App 최상위에서 감싸주세요 */
export function CharacterProvider({ children }) {
  const [character, setCharacter] = useState(() => {
    return localStorage.getItem('character') || 'jang';
  });

  useEffect(() => {
    localStorage.setItem('character', character);
  }, [character]);

  return (
    <CharacterContext.Provider value={{ character, setCharacter }}>
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter() {
  return useContext(CharacterContext);
}
