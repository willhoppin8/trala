import React, { useEffect, useState } from 'react';

interface EasterThemeElementsProps {
  active: boolean;
}

const EasterThemeElements: React.FC<EasterThemeElementsProps> = ({ active }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Add or remove the class on the body based on active state
    if (active) {
      document.body.classList.add('easter-420-theme');
    } else {
      document.body.classList.remove('easter-420-theme');
    }

    return () => {
      document.body.classList.remove('easter-420-theme');
    };
  }, [active]);

  // Only render on client-side
  if (!mounted) return null;

  // Don't render anything if not active
  if (!active) return null;

  // Array of emojis to use for the floating elements - expanded list
  const easterEmojis = [
    '🐰', '🥚', '🐣', '🌷', '🌱', '🌿', '☘️', '🍃', '🌼', '🐥', '🐇', '🥕', '🌸', '🌻', '🍀',
    '🐰', '🥚', '🐣', '🌿', '☘️', '🍃', '🌼', '🐥', '🐇', '🌱', '💨', '🔥', '🌳', '🧠', '💚',
    '💐', '🌞', '🌈', '🌊', '🌴', '🌵', '🌱', '🌲', '🍄', '🐇', '🐣', '🥬', '🌺', '🌹', '🌿'
  ];

  // Create 45 elements (increased from 15)
  return (
    <div className="animated-elements">
      {Array.from({ length: 45 }).map((_, index) => {
        // Generate a random position
        const leftPos = Math.random() * 100;
        
        // Generate faster animation durations (between 8-15s instead of 15-25s)
        const duration = 8 + Math.random() * 7;
        
        // Generate shorter delays (0-3s instead of 0-5s)
        const delay = Math.random() * 3;
        
        // Select a random emoji from the array
        const emoji = easterEmojis[Math.floor(Math.random() * easterEmojis.length)];
        
        return (
          <span 
            key={index} 
            style={{ 
              left: `${leftPos}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              fontSize: `${Math.random() * 16 + 16}px` // Random size between 16-32px
            }}
          >
            {emoji}
          </span>
        );
      })}
    </div>
  );
};

export default EasterThemeElements; 