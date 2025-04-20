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

  // Array of emojis to use for the floating elements - expanded list with MORE FIRES AND BUNNIES
  const easterEmojis = [
    '🐰', '🐰', '🐰', '🔥', '🔥', '🔥', '🐇', '🐇', '🐇',  // Extra bunnies and fire
    '🥚', '🐣', '🌷', '🌱', '🌿', '🔥', '🔥', '🐰', '🐰',  // More bunnies and fire
    '☘️', '🍃', '🌼', '🐥', '🐇', '🥕', '🔥', '🔥', '🐰',  // More bunnies and fire
    '🌸', '🌻', '🍀', '🔥', '🔥', '🐰', '🐰', '🐇', '🐇',  // Extra bunnies and fire
    '🥚', '🐣', '🌿', '☘️', '🍃', '🔥', '🐰', '🔥', '🐰',  // More bunnies and fire
    '🌼', '🐥', '🐇', '🌱', '💨', '🔥', '🔥', '🔥', '🐇',  // More fire and bunnies
    '🌳', '🧠', '💚', '🔥', '🐰', '🔥', '🐰', '🔥', '🐰',  // Extra bunnies and fire
    '💐', '🌞', '🌈', '🌊', '🔥', '🔥', '🐇', '🐇', '🔥',  // More fire and bunnies
    '🌴', '🌵', '🌱', '🌲', '🔥', '🔥', '🐰', '🔥', '🐰',  // Extra bunnies and fire
    '🍄', '🐇', '🐣', '🥬', '🐰', '🔥', '🐰', '🔥', '🐰'   // Extra bunnies and fire
  ];

  // Create 80 elements (increased from 45)
  return (
    <div className="animated-elements">
      {Array.from({ length: 80 }).map((_, index) => {
        // Generate a random position
        const leftPos = Math.random() * 100;
        
        // Generate faster animation durations (between 5-12s)
        const duration = 5 + Math.random() * 7;
        
        // Generate shorter delays (0-2s)
        const delay = Math.random() * 2;
        
        // Select a random emoji from the array
        const emoji = easterEmojis[Math.floor(Math.random() * easterEmojis.length)];
        
        return (
          <span 
            key={index} 
            style={{ 
              left: `${leftPos}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              fontSize: `${Math.random() * 24 + 24}px` // Random size between 24-48px (BIGGER!)
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