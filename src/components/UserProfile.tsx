import React, { useState, useEffect } from 'react';
import { getUserProfile } from '../services/firebase';
import ProfilePicture from './ProfilePicture';
import ProfileEditor from './ProfileEditor';
import './UserProfile.css';

interface UserProfileProps {
  username: string;
  isCurrentUser?: boolean;
  onProfileUpdate?: (imageUrl: string) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ username, isCurrentUser = false, onProfileUpdate }) => {
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      const profile = await getUserProfile(username);
      
      if (profile) {
        setProfileImageUrl(profile.profilePictureUrl);
      }
      
      setLoading(false);
    };
    
    fetchUserProfile();
  }, [username]);
  
  const handleEditProfile = () => {
    setShowEditor(true);
  };
  
  const handleUpdateComplete = (newImageUrl: string) => {
    setProfileImageUrl(newImageUrl);
    setShowEditor(false);
    
    if (onProfileUpdate) {
      onProfileUpdate(newImageUrl);
    }
  };
  
  const handleCancelEdit = () => {
    setShowEditor(false);
  };
  
  return (
    <div className="user-profile">
      {loading ? (
        <div className="profile-loading">Loading profile...</div>
      ) : (
        <div className="profile-content">
          <div className="profile-image-container">
            <ProfilePicture 
              imageUrl={profileImageUrl}
              username={username}
              size="large"
            />
            
            {isCurrentUser && (
              <button 
                className="edit-profile-button"
                onClick={handleEditProfile}
              >
                <span className="edit-icon">✏️</span>
                <span>Edit</span>
              </button>
            )}
          </div>
          
          <div className="profile-info">
            <h2 className="profile-username">{username}</h2>
            {/* Additional profile info can be added here */}
          </div>
        </div>
      )}
      
      {showEditor && (
        <ProfileEditor 
          username={username}
          currentImageUrl={profileImageUrl}
          onUpdateComplete={handleUpdateComplete}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
};

export default UserProfile; 