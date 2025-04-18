import React, { useState, useRef } from 'react';
import { uploadProfilePicture } from '../services/firebase';
import ProfilePicture from './ProfilePicture';
import './ProfileEditor.css';

interface ProfileEditorProps {
  username: string;
  currentImageUrl?: string;
  onUpdateComplete: (newImageUrl: string) => void;
  onCancel: () => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({
  username,
  currentImageUrl,
  onUpdateComplete,
  onCancel
}) => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file size - limit to 5MB
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      setImage(selectedFile);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };
  
  const handleClearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!image) {
      setError('Please select an image');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const downloadUrl = await uploadProfilePicture(username, image);
      
      if (downloadUrl) {
        onUpdateComplete(downloadUrl);
      } else {
        setError('Failed to upload profile picture');
      }
    } catch (err) {
      setError('An error occurred while uploading');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="profile-editor-overlay">
      <div className="profile-editor">
        <h2>Update Profile Picture</h2>
        
        <div className="profile-preview">
          <ProfilePicture 
            imageUrl={imagePreview || currentImageUrl}
            username={username}
            size="large"
          />
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="file-input-container">
            <input
              type="file"
              id="profile-image"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
              className="hidden-file-input"
            />
            <label htmlFor="profile-image" className="custom-file-button">
              <span className="button-icon">📷</span>
              <span>Choose Photo</span>
            </label>
            
            {!imagePreview && !image && (
              <p className="file-helper">JPG, PNG, or GIF (max 5MB)</p>
            )}
          </div>
          
          {imagePreview && (
            <button 
              type="button" 
              className="clear-image-button" 
              onClick={handleClearImage}
            >
              Clear Selection
            </button>
          )}
          
          {error && <p className="error-message">{error}</p>}
          
          <div className="profile-editor-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="save-button"
              disabled={isUploading || !image}
            >
              {isUploading ? (
                <>
                  <span className="loader"></span>
                  <span>Uploading...</span>
                </>
              ) : (
                'Save Profile Picture'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditor; 