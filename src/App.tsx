import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import PostingApp from './components/PostingApp';
import LoginForm from './components/LoginForm';
import DirectMessages from './components/DirectMessages';
import ApologyScreen from './components/ApologyScreen';
import UserProfile from './components/UserProfile';
import ProfilePicture from './components/ProfilePicture';
import EasterThemeElements from './components/EasterThemeElements';
import {
  getUserStatus,
  User,
  updateUserCancellationStatus,
  getUnreadMessageCount,
  getUserProfile
} from './services/firebase';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'messages' | 'profile'>('posts');
  const [directMessageUser, setDirectMessageUser] = useState<string | null>(null);
  const [initialGroupId, setInitialGroupId] = useState<string | null>(null);
  const [showApologyScreen, setShowApologyScreen] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState<string | undefined>(undefined);
  
  // Add state to track if we're in mobile chat view
  const [isInMobileChatView, setIsInMobileChatView] = useState(false);
  
  // Track unread message count
  interface UnreadCounts {
    direct: number;
    group: number;
  }
  const [unreadCount, setUnreadCount] = useState<UnreadCounts>({ direct: 0, group: 0 });
  
  // Special theme for Easter/420 (2025)
  const [isSpecialDay, setIsSpecialDay] = useState(false);
  
  useEffect(() => {
    const today = new Date();
    // Easter and 4/20 fall on the same day in 2025
    const isEaster420 = today.getMonth() === 3 && today.getDate() === 20 && today.getFullYear() === 2025;
    
    // For testing purposes, you can enable this for development
    // Comment out the line below in production
    // const isEaster420 = true;
    
    setIsSpecialDay(isEaster420);
  }, []);
  
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
  
  useEffect(() => {
    // Since we're not using Firebase Authentication (no auth import)
    // We'll just use localStorage for user login state
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(storedUser);
      checkUserCancellationStatus(storedUser);
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
  
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setShowApologyScreen(false);
    setUserProfilePicture(undefined);
  };
  
  const handleStartDM = (username: string) => {
    setDirectMessageUser(username);
    setInitialGroupId(null);
    setActiveTab('messages');
  };
  
  const handleSwitchToGroup = (groupId: string) => {
    setInitialGroupId(groupId);
    setDirectMessageUser(null);
    setActiveTab('messages');
  };
  
  const handleApologyComplete = () => {
    setShowApologyScreen(false);
  };
  
  const handleProfileUpdate = (imageUrl: string) => {
    setUserProfilePicture(imageUrl);
  };
  
  // Update unread count at regular intervals
  useEffect(() => {
    if (!currentUser) return;
    
    const updateUnreadCount = async () => {
      const count = await getUnreadMessageCount(currentUser);
      setUnreadCount(count);
    };
    
    updateUnreadCount();
    const interval = setInterval(updateUnreadCount, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [currentUser]);
  
  // Handle keyboard visibility on iOS
  useEffect(() => {
    // These event listeners are for iOS to detect keyboard visibility
    const handleKeyboardShow = () => {
      document.body.classList.add('keyboard-visible');
    };
    
    const handleKeyboardHide = () => {
      document.body.classList.remove('keyboard-visible');
    };
    
    window.addEventListener('keyboardWillShow', handleKeyboardShow);
    window.addEventListener('keyboardDidShow', handleKeyboardShow);
    window.addEventListener('keyboardWillHide', handleKeyboardHide);
    window.addEventListener('keyboardDidHide', handleKeyboardHide);
    
    return () => {
      window.removeEventListener('keyboardWillShow', handleKeyboardShow);
      window.removeEventListener('keyboardDidShow', handleKeyboardShow);
      window.removeEventListener('keyboardWillHide', handleKeyboardHide);
      window.removeEventListener('keyboardDidHide', handleKeyboardHide);
    };
  }, []);
  
  // Determine if we're using mobile view
  const isMobile = window.innerWidth <= 768;
  
  return (
    <div className={`app ${isInMobileChatView ? 'in-mobile-chat' : ''}`}>
      {/* Add the Easter Theme Elements */}
      <EasterThemeElements active={isSpecialDay} />
      
      {/* Only hide header when in mobile chat view */}
      {!isInMobileChatView && (
        <header className="app-header">
          <h1 className="app-title">🦈 TRALA 🦈</h1>
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
      )}
      
      {currentUser ? (
        <>
          {showApologyScreen ? (
            <ApologyScreen 
              username={currentUser} 
              onApologyComplete={handleApologyComplete} 
            />
          ) : (
            <div className={`app-content ${isInMobileChatView ? 'in-mobile-chat' : ''}`}>
              {/* Only show desktop tabs when not on mobile */}
              {!isMobile && (
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
              )}
              
              {/* Bottom Navigation for Mobile - show when not in active chat view */}
              {isMobile && !isInMobileChatView && (
                <div className="bottom-nav">
                  <div 
                    className={`bottom-nav-item ${activeTab === 'posts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('posts')}
                  >
                    <span role="img" aria-label="posts">📝</span>
                    <span>Posts</span>
                  </div>
                  <div 
                    className={`bottom-nav-item ${activeTab === 'messages' ? 'active' : ''}`}
                    onClick={() => setActiveTab('messages')}
                  >
                    <span role="img" aria-label="messages">💬</span>
                    <span>Messages</span>
                    {(unreadCount.direct + unreadCount.group) > 0 && 
                      <span className="badge">{unreadCount.direct + unreadCount.group}</span>
                    }
                  </div>
                  <div 
                    className={`bottom-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                  >
                    <span role="img" aria-label="profile">👤</span>
                    <span>Profile</span>
                  </div>
                </div>
              )}
              
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
                  initialGroupId={initialGroupId}
                  userProfilePicture={userProfilePicture}
                  setInMobileChatView={setIsInMobileChatView}
                  navigateBack={() => setActiveTab('posts')}
                  switchToGroups={handleSwitchToGroup}
                />
              ) : (
                <UserProfile
                  username={currentUser}
                  onProfilePictureUpdate={handleProfileUpdate}
                />
              )}
            </div>
          )}
        </>
      ) : (
        <LoginForm onLogin={setCurrentUser} />
      )}
    </div>
  );
};

export default App;
