import React from 'react';
import './ProfilePicture.css';

interface ProfilePictureProps {
  imageUrl?: string;
  username: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  imageUrl,
  username,
  size = 'medium',
  onClick,
  className = ''
}) => {
  // Generate initials from username
  const getInitials = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  // Determine if name gets special styling
  const getSpecialClass = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName === 'will') return 'godlike-profile';
    if (name === 'SophiaAnnabelle') return 'sophia-profile';
    if (lowerName === 'kikiwiki') return 'kiki-profile';
    return '';
  };

  const specialClass = getSpecialClass(username);
  
  return (
    <div 
      className={`profile-picture ${size} ${className} ${specialClass} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={`${username}'s profile`} />
      ) : (
        <div className={`profile-initial ${specialClass}`}>
          {getInitials(username)}
        </div>
      )}
    </div>
  );
};

export default ProfilePicture; 