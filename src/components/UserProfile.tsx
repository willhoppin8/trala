import React, { useState, useEffect, useRef } from 'react';
import { getUserProfile, uploadProfilePicture, updateUserProfile } from '../services/firebase';
import './UserProfile.css';
import ProfilePicture from './ProfilePicture';

interface UserProfileProps {
  username: string;
  onProfilePictureUpdate: (url: string) => void;
}

// Define interface for user profile update data that matches Firebase service
interface UserProfileUpdate {
  profilePictureUrl?: string | undefined;
  phoneNumber?: string | undefined;
  receiveNotifications?: boolean | undefined;
}

const UserProfile: React.FC<UserProfileProps> = ({ username, onProfilePictureUpdate }) => {
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [receiveNotifications, setReceiveNotifications] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const loadUserProfile = async () => {
      setIsLoading(true);
      const profile = await getUserProfile(username);
      if (profile) {
        setProfilePictureUrl(profile.profilePictureUrl);
        // We're not displaying phone fields, so we don't set these states
        // Code removed to fix TypeScript errors
      }
      setIsLoading(false);
    };
    
    loadUserProfile();
  }, [username]);
  
  const handleEditClick = () => {
    setIsEditing(true);
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      setIsLoading(true);
      const downloadUrl = await uploadProfilePicture(username, file);
      
      if (downloadUrl) {
        setProfilePictureUrl(downloadUrl);
        onProfilePictureUpdate(downloadUrl);
      }
      setIsLoading(false);
      setIsEditing(false);
    }
  };
  
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };
  
  const handleNotificationToggle = () => {
    setReceiveNotifications(!receiveNotifications);
  };
  
  const formatPhoneNumber = (phone: string): string => {
    // Format phone number to E.164 format for Twilio
    let formattedNumber = phone.replace(/\D/g, '');
    if (formattedNumber && !formattedNumber.startsWith('+')) {
      // Add US country code if not present
      if (formattedNumber.startsWith('1')) {
        formattedNumber = '+' + formattedNumber;
      } else {
        formattedNumber = '+1' + formattedNumber;
      }
    }
    return formattedNumber;
  };
  
  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const updateData: UserProfileUpdate = {
        profilePictureUrl: profilePictureUrl,
        // Don't update these fields, but keep the properties in the object
        // Just set to undefined instead of null to satisfy TypeScript
        phoneNumber: undefined,
        receiveNotifications: undefined
      };
      
      await updateUserProfile(username, updateData);
      setIsEditing(false);
      setSaveMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage('Failed to update profile. Please try again.');
    }
    setIsLoading(false);
  };
  
  return (
    <div className="user-profile">
      <h2 className="profile-title">Your Profile</h2>
      
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-picture-container">
            {isLoading ? (
              <div className="profile-picture-placeholder loading">
                <div className="loader"></div>
              </div>
            ) : (
              <>
                <ProfilePicture 
                  imageUrl={profilePictureUrl} 
                  username={username} 
                  size="large"
                />
                {isEditing ? (
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="file-input"
                    accept="image/*"
                  />
                ) : (
                  <button 
                    className="edit-profile-btn"
                    onClick={handleEditClick}
                  >
                    Edit Picture
                  </button>
                )}
              </>
            )}
          </div>
          
          <div className="profile-info">
            <h3 className="username">{username}</h3>
          </div>
        </div>
        
        <div className="profile-details">
          {/* Phone number input and notification toggle are hidden for now */}
          {false && (
            <>
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number (for notifications)</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  placeholder="(555) 123-4567"
                  className="profile-input"
                />
                <p className="input-hint">Enter your number to receive text notifications</p>
              </div>
              
              <div className="form-group notification-toggle">
                <label htmlFor="notifications" className="checkbox-label">
                  <span>Receive notifications</span>
                  <input
                    type="checkbox"
                    id="notifications"
                    checked={receiveNotifications}
                    onChange={handleNotificationToggle}
                    className="notification-checkbox"
                  />
                  <span className="custom-checkbox"></span>
                </label>
                <p className="input-hint">
                  You'll get SMS updates when people post
                </p>
              </div>
            </>
          )}
          
          <button 
            className="save-profile-btn"
            onClick={handleSaveProfile}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Update Profile'}
          </button>
          
          {saveMessage && <p className="profile-message">{saveMessage}</p>}
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 