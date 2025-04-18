import React, { useState, useEffect } from 'react';
import './App.css';
import PostingApp from './components/PostingApp';
import LoginForm from './components/LoginForm';
import DirectMessages from './components/DirectMessages';
import ApologyScreen from './components/ApologyScreen';
import UserProfile from './components/UserProfile';
import ProfilePicture from './components/ProfilePicture';
import { getUserStatus, getUserProfile } from './services/firebase';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'messages' | 'profile'>('posts');
  const [directMessageUser, setDirectMessageUser] = useState<string | null>(null);
  const [showApologyScreen, setShowApologyScreen] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    // Check if user is logged in from local storage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(storedUser);
      
      // Check if the user is cancelled
      checkUserCancellationStatus(storedUser);
      
      // Load user profile picture
      loadUserProfilePicture(storedUser);
    }
  }, []);
  
  const loadUserProfilePicture = async (username: string) => {
    const profile = await getUserProfile(username);
    if (profile && profile.profilePictureUrl) {
      setUserProfilePicture(profile.profilePictureUrl);
    }
  };
  
  const checkUserCancellationStatus = async (username: string) => {
    const userData = await getUserStatus(username);
    // Show apology screen if user is cancelled and hasn't apologized recently
    if (userData && userData.isCancelled) {
      // If no recent apology or more than 24 hours since last apology
      const shouldShowApology = !userData.lastApology || 
        (Date.now() - userData.lastApology > 24 * 60 * 60 * 1000);
      
      setShowApologyScreen(shouldShowApology);
    }
  };
  
  const handleLogin = async (username: string) => {
    setCurrentUser(username);
    localStorage.setItem('currentUser', username);
    
    // Check cancellation status after login
    await checkUserCancellationStatus(username);
    
    // Load profile picture
    await loadUserProfilePicture(username);
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setShowApologyScreen(false);
    setUserProfilePicture(undefined);
  };
  
  const handleStartDM = (username: string) => {
    setDirectMessageUser(username);
    setActiveTab('messages');
  };
  
  const handleApologyComplete = () => {
    setShowApologyScreen(false);
  };
  
  const handleProfileUpdate = (imageUrl: string) => {
    setUserProfilePicture(imageUrl);
  };
  
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">SOCIAl MEDIsA APP TO CUREa ALL MALsADIES</h1>
        {currentUser && (
          <div className="user-controls">
            <div className="user-info" onClick={() => setActiveTab('profile')}>
              <ProfilePicture
                imageUrl={userProfilePicture}
                username={currentUser}
                size="small"
                className="header-profile-picture"
              />
              <span className="welcome-message">Welcome, {currentUser}</span>
            </div>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        )}
      </header>
      
      {currentUser ? (
        <>
          {showApologyScreen ? (
            <ApologyScreen 
              username={currentUser} 
              onApologyComplete={handleApologyComplete} 
            />
          ) : (
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
                <button 
                  className={`app-tab ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  👤 Profile
                </button>
              </div>
              
              {activeTab === 'posts' ? (
                <PostingApp 
                  username={currentUser} 
                  startDMWithUser={handleStartDM}
                  userProfilePicture={userProfilePicture}
                />
              ) : activeTab === 'messages' ? (
                <DirectMessages 
                  username={currentUser} 
                  initialRecipient={directMessageUser}
                  userProfilePicture={userProfilePicture}
                />
              ) : (
                <UserProfile
                  username={currentUser}
                  isCurrentUser={true}
                  onProfileUpdate={handleProfileUpdate}
                />
              )}
            </div>
          )}
        </>
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
