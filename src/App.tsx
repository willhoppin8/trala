import React, { useState, useEffect } from 'react';
import './App.css';
import PostingApp from './components/PostingApp';
import LoginForm from './components/LoginForm';
import DirectMessages from './components/DirectMessages';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'messages'>('posts');
  const [directMessageUser, setDirectMessageUser] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if user is logged in from local storage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(storedUser);
    }
  }, []);
  
  const handleLogin = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem('currentUser', username);
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };
  
  const handleStartDM = (username: string) => {
    setDirectMessageUser(username);
    setActiveTab('messages');
  };
  
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">SOCIAl MEDIsA APP TO CUREa ALL MALsADIES</h1>
        {currentUser && (
          <div className="user-controls">
            <span className="welcome-message">Welcome, {currentUser}</span>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        )}
      </header>
      
      {currentUser ? (
        <div className="app-content">
          <div className="app-tabs">
            <button 
              className={`app-tab ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              📝 Posts
            </button>
            <button 
              className={`app-tab ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              💬 Messages
            </button>
          </div>
          
          {activeTab === 'posts' ? (
            <PostingApp 
              username={currentUser} 
              startDMWithUser={handleStartDM}
            />
          ) : (
            <DirectMessages 
              username={currentUser} 
              initialRecipient={directMessageUser}
            />
          )}
        </div>
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
