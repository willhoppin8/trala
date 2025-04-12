import React, { useState, useRef, useEffect } from 'react';
import './MentionInput.css';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  isTextArea?: boolean;
  rows?: number;
  availableUsers?: string[];
}

interface SuggestionPosition {
  top: number;
  left: number;
}

const MentionInput: React.FC<MentionInputProps> = ({ 
  value, 
  onChange, 
  onSubmit,
  placeholder = '',
  isTextArea = false,
  rows = 4,
  availableUsers = []
}) => {
  const [userSuggestions, setUserSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState<SuggestionPosition>({ top: 0, left: 0 });
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [currentMention, setCurrentMention] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Check for mention pattern and show suggestions
  useEffect(() => {
    const checkForMention = () => {
      // Get cursor position
      if (!inputRef.current) return;
      
      const text = value;
      
      // Find the last potential mention before cursor
      const lastAtSymbol = text.lastIndexOf('@');
      if (lastAtSymbol === -1) {
        setShowSuggestions(false);
        return;
      }
      
      // Check if we're in the middle of typing a mention
      const textAfterAt = text.substring(lastAtSymbol + 1);
      const mentionRegex = /^(\w*)$/;
      const match = textAfterAt.match(mentionRegex);
      
      if (match) {
        const query = match[0].toLowerCase();
        setCurrentMention(query);
        
        // Filter users based on query
        const filteredUsers = availableUsers.filter(user => 
          user.toLowerCase().startsWith(query)
        ).slice(0, 5); // Limit to 5 suggestions
        
        if (filteredUsers.length > 0) {
          setUserSuggestions(filteredUsers);
          setShowSuggestions(true);
          setSelectedSuggestion(0);
          
          // Calculate position for suggestions dropdown
          if (inputRef.current) {
            const { offsetTop, offsetHeight, offsetLeft } = inputRef.current;
            setSuggestionPosition({
              top: offsetTop + offsetHeight + 5,
              left: offsetLeft
            });
          }
        } else {
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    };
    
    checkForMention();
  }, [value, availableUsers]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => (prev + 1) % userSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => (prev - 1 + userSuggestions.length) % userSuggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectSuggestion(userSuggestions[selectedSuggestion]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter' && !isTextArea) {
      e.preventDefault();
      onSubmit();
    }
  };

  const selectSuggestion = (username: string) => {
    // Replace the current mention with the selected username
    const text = value;
    const lastAtSymbol = text.lastIndexOf('@');
    
    const newText = text.substring(0, lastAtSymbol) + '@' + username + ' ';
    onChange(newText);
    setShowSuggestions(false);
  };

  const renderInput = () => {
    const commonProps = {
      ref: inputRef as any,
      value: value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
      onKeyDown: handleKeyDown,
      placeholder: placeholder,
      className: "mention-input"
    };
    
    return isTextArea ? (
      <textarea 
        {...commonProps}
        rows={rows}
      />
    ) : (
      <input
        type="text"
        {...commonProps}
      />
    );
  };

  return (
    <div className="mention-input-container">
      {renderInput()}
      
      {showSuggestions && (
        <div 
          className="mention-suggestions"
          style={{ top: suggestionPosition.top, left: suggestionPosition.left }}
        >
          {userSuggestions.map((user, index) => (
            <div 
              key={user} 
              className={`suggestion-item ${index === selectedSuggestion ? 'selected' : ''}`}
              onClick={() => selectSuggestion(user)}
            >
              @{user}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput; 