import React from 'react';
import './MentionInput.css'; // Reusing styles from MentionInput

interface TextWithMentionsProps {
  text: string;
  onMentionClick?: (username: string) => void;
}

const TextWithMentions: React.FC<TextWithMentionsProps> = ({ text, onMentionClick }) => {
  if (!text) return null;

  // Parse text for mentions using regex
  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  
  let lastIndex = 0;
  let match;
  
  // Find all mentions and split text into parts
  while ((match = mentionRegex.exec(text)) !== null) {
    const beforeMention = text.substring(lastIndex, match.index);
    if (beforeMention) {
      parts.push(<React.Fragment key={`text-${lastIndex}`}>{beforeMention}</React.Fragment>);
    }
    
    const username = match[1];
    parts.push(
      <span 
        key={`mention-${match.index}`} 
        className="user-mention"
        onClick={() => onMentionClick && onMentionClick(username)}
      >
        @{username}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text after the last mention
  if (lastIndex < text.length) {
    parts.push(<React.Fragment key={`text-end`}>{text.substring(lastIndex)}</React.Fragment>);
  }
  
  return <div className="text-with-mentions">{parts}</div>;
};

export default TextWithMentions; 