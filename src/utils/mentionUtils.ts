/**
 * Utility functions for handling mentions in text
 */

/**
 * Extracts all mentions from a text string
 * @param text The input text containing mentions
 * @returns Array of mentioned usernames
 */
export const extractMentions = (text: string): string[] => {
  if (!text) return [];
  
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

/**
 * Checks if text contains mentions
 * @param text The input text to check
 * @returns Boolean indicating if text contains any mentions
 */
export const hasMentions = (text: string): boolean => {
  if (!text) return false;
  return /@\w+/.test(text);
};

/**
 * Highlight mentions in text with HTML/React components
 * This is a simpler version of what TextWithMentions component does
 * @param text The input text containing mentions
 * @returns Text with mentions wrapped in special markup
 */
export const highlightMentions = (text: string): string => {
  if (!text) return '';
  return text.replace(/@(\w+)/g, '<span class="user-mention">@$1</span>');
}; 