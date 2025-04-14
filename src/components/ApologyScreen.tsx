import React, { useState } from 'react';
import { makeApology } from '../services/firebase';
import './ApologyScreen.css';

interface ApologyScreenProps {
  username: string;
  onApologyComplete: () => void;
}

const ApologyScreen: React.FC<ApologyScreenProps> = ({ username, onApologyComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApology = async () => {
    setIsSubmitting(true);
    
    // Post the apology
    await makeApology(username);
    
    // Let the parent component know the apology is complete
    onApologyComplete();
    
    setIsSubmitting(false);
  };

  return (
    <div className="apology-screen">
      <div className="apology-container">
        <h2 className="apology-title">😔 You've Been Cancelled</h2>
        <p className="apology-text">
          Your account has been cancelled by the community. To regain access, you must publicly apologize.
        </p>
        
        <div className="apology-message-preview">
          <p>"{username} is sooo so sorry! {username} did a bad thing! {username} will be better! {username} is sorry!"</p>
        </div>
        
        <button 
          className="apology-button"
          onClick={handleApology}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="apology-button-content">
              <span className="loader"></span>
              <span>Apologizing...</span>
            </span>
          ) : (
            <span className="apology-button-content">
              I'm sooo so sorry I'm so sorry I did a bad thing I'll be better I'm sorry
            </span>
          )}
        </button>
        
        <p className="apology-note">This apology will be visible to all users.</p>
      </div>
    </div>
  );
};

export default ApologyScreen; 