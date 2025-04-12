import React, { useState, useEffect, useRef } from 'react';
import { 
  DirectMessage, 
  sendDirectMessage, 
  getConversationMessages, 
  getUserConversations,
  markMessagesAsRead,
  getConversationId,
  getUsers,
  User
} from '../services/firebase';
import './DirectMessages.css';

interface DirectMessagesProps {
  username: string;
  initialRecipient?: string | null;
}

const DirectMessages: React.FC<DirectMessagesProps> = ({ username, initialRecipient }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessageRecipient, setNewMessageRecipient] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get all users
    getUsers(setUsers);
    
    // Get all conversations for this user
    getUserConversations(username, setConversations);
  }, [username]);

  useEffect(() => {
    // When a chat is selected, get the messages
    if (currentChat) {
      getConversationMessages(username, currentChat, setMessages);
      // Mark messages as read
      const conversationId = getConversationId(username, currentChat);
      markMessagesAsRead(conversationId, username);
    }
  }, [currentChat, username]);

  useEffect(() => {
    // Scroll to bottom of messages
    scrollToBottom();
  }, [messages]);

  // Set initial recipient if provided
  useEffect(() => {
    if (initialRecipient) {
      setCurrentChat(initialRecipient);
      setDirectMessageUser(initialRecipient);
    }
  }, [initialRecipient]);
  
  // Clear initialRecipient after it's been used
  const setDirectMessageUser = (recipient: string) => {
    // Check if this user already exists in conversations
    const existingConvo = conversations.find(c => c.otherUser === recipient);
    if (!existingConvo && recipient !== username) {
      // If not found and valid recipient, create a new conversation structure
      const newConvo = {
        id: getConversationId(username, recipient),
        otherUser: recipient,
        lastMessage: "",
        lastMessageTime: Date.now()
      };
      
      setConversations(prev => [...prev, newConvo]);
    }
    
    setCurrentChat(recipient);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !currentChat) return;
    
    const newMessage = {
      sender: username,
      recipient: currentChat,
      content: messageText,
      timestamp: Date.now()
    };
    
    sendDirectMessage(newMessage).then(() => {
      setMessageText('');
      scrollToBottom();
    });
  };

  const handleStartNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessageRecipient || newMessageRecipient === username) return;
    
    setCurrentChat(newMessageRecipient);
    setShowNewMessage(false);
    setNewMessageRecipient('');
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="dm-container">
      <div className="dm-sidebar">
        <div className="dm-header">
          <h3>Messages</h3>
          <button 
            className="new-message-btn"
            onClick={() => setShowNewMessage(true)}
          >
            New Message
          </button>
        </div>
        
        {showNewMessage && (
          <form onSubmit={handleStartNewChat} className="new-message-form">
            <select
              value={newMessageRecipient}
              onChange={(e) => setNewMessageRecipient(e.target.value)}
              required
            >
              <option value="">Select a user</option>
              {users
                .filter(user => user.username !== username)
                .map(user => (
                  <option key={user.username} value={user.username}>
                    {user.username}
                  </option>
                ))
              }
            </select>
            <button type="submit">Start Chat</button>
          </form>
        )}
        
        <div className="conversation-list">
          {conversations.length === 0 ? (
            <p className="no-conversations">No conversations yet</p>
          ) : (
            conversations.map(convo => (
              <div 
                key={convo.id} 
                className={`conversation-item ${currentChat === convo.otherUser ? 'active' : ''}`}
                onClick={() => setCurrentChat(convo.otherUser)}
              >
                <div className="conversation-avatar">
                  {convo.otherUser.charAt(0).toUpperCase()}
                </div>
                <div className="conversation-info">
                  <div className="conversation-name">
                    {convo.otherUser}
                  </div>
                  <div className="conversation-preview">
                    {convo.lastMessage}
                  </div>
                </div>
                <div className="conversation-time">
                  {formatDate(convo.lastMessageTime)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="dm-main">
        {currentChat ? (
          <>
            <div className="dm-chat-header">
              <div className="dm-chat-avatar">
                {currentChat.charAt(0).toUpperCase()}
              </div>
              <div className="dm-chat-name">{currentChat}</div>
            </div>
            
            <div className="dm-messages">
              {messages.map((message, index) => (
                <div 
                  key={message.id || index} 
                  className={`dm-message ${message.sender === username ? 'sent' : 'received'}`}
                >
                  <div className="dm-message-content">
                    {message.content}
                  </div>
                  <div className="dm-message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} className="dm-input">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <div className="dm-empty-state">
            <div className="dm-empty-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose an existing conversation or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectMessages; 