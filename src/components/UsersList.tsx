import React, { useState, useEffect } from 'react';
import { User, getUsers, cancelUser, voteToUncancelUser } from '../services/firebase';
import './UsersList.css';

interface UsersListProps {
  currentUsername: string;
}

const UsersList: React.FC<UsersListProps> = ({ currentUsername }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Subscribe to users
    getUsers(setUsers);
  }, []);

  const handleCancelUser = async (username: string) => {
    if (username === currentUsername) {
      setMessage("You can't cancel yourself!");
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (confirmCancel === username) {
      const success = await cancelUser(username, currentUsername);
      if (success) {
        setMessage(`${username} has been cancelled!`);
      } else {
        setMessage(`Failed to cancel ${username}. Perhaps you already cancelled them?`);
      }
      setTimeout(() => setMessage(''), 3000);
      setConfirmCancel(null);
    } else {
      setConfirmCancel(username);
    }
  };

  const handleUncancelVote = async (username: string) => {
    const success = await voteToUncancelUser(username, currentUsername);
    if (success) {
      setMessage(`You voted to uncancel ${username}`);
    } else {
      setMessage(`Failed to vote for uncancelling ${username}. Perhaps you already voted?`);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="users-list-container">
      <h3>
        <span className="emoji-icon">👥</span>
        <span>Community Members</span>
      </h3>

      {message && <p className="user-message">{message}</p>}

      <div className="users-list">
        {users.map((user) => (
          <div key={user.username} className={`user-item ${user.isCancelled ? 'cancelled' : ''}`}>
            <div className="user-info">
              <span className="username">{user.username}</span>
              {user.isCancelled && (
                <span className="cancelled-badge">
                  CANCELLED ({user.cancelVotes || 0})
                </span>
              )}
              {user.isCancelled && user.uncancelVotes && (
                <span className="uncancel-votes">
                  Uncancel votes: {user.uncancelVotes.length}/3
                </span>
              )}
            </div>

            <div className="user-actions">
              {user.username !== currentUsername && !user.isCancelled && (
                <button
                  className={`cancel-button ${confirmCancel === user.username ? 'confirm' : ''}`}
                  onClick={() => handleCancelUser(user.username)}
                >
                  {confirmCancel === user.username ? 'Confirm Cancel?' : 'Cancel'}
                </button>
              )}
              
              {user.isCancelled && (
                <button
                  className="uncancel-button"
                  onClick={() => handleUncancelVote(user.username)}
                >
                  Vote to Uncancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersList; 