import { useCharacter } from '../contexts/CharacterContext';

const meta = {
  baek:  { name: '빽AI',   img: '/images/baek.png' },
  seung: { name: '3스타AI', img: '/images/seung.png' },
  jang:  { name: '장금이',   img: '/images/jang.png' },
};

export default function CharacterProfile() {
  const { character } = useCharacter();
  if (!character) return null;

  const { name, img } = meta[character] || {};

  return (
    <div className="fixed top-4 left-4 flex items-center space-x-2
                    bg-white bg-opacity-80 backdrop-blur-sm p-2 rounded-full
                    shadow-lg ring-1 ring-gray-200">
      <img src={img} alt={name} style={{ width: 40, height: 40, borderRadius: '50%' }}/>
      <span className="text-sm font-medium text-gray-700">
        {name}
      </span>
    </div>
  );
}
