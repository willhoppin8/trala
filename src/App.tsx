import React, { useState, useEffect } from 'react';
import './App.css';
import PostingApp from './components/PostingApp';
import LoginForm from './components/LoginForm';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
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
        <PostingApp username={currentUser} />
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
