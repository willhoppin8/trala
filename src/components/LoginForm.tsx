import React, { useState } from 'react';
import { registerUser, loginUser } from '../services/firebase';
import './LoginForm.css';

interface LoginFormProps {
  onLogin: (username: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    setIsLoading(true);
    
    try {
      let success;
      
      if (isRegistering) {
        success = await registerUser(username, password);
        if (success) {
          // Automatically log in after registration
          success = await loginUser(username, password);
        } else {
          setError('Username already exists');
        }
      } else {
        success = await loginUser(username, password);
        if (!success) {
          setError('Invalid username or password');
        }
      }

      if (success) {
        onLogin(username);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>{isRegistering ? 'Create Account' : 'Login'}</h2>
        
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        {error && <p className="error-message">{error}</p>}
        
        <button 
          type="submit" 
          className="login-button"
          disabled={isLoading}
        >
          {isLoading 
            ? 'Processing...' 
            : isRegistering 
              ? 'Register' 
              : 'Login'
          }
        </button>
        
        <p className="toggle-form">
          {isRegistering 
            ? 'Already have an account? ' 
            : 'Need an account? '
          }
          <button
            type="button"
            className="toggle-button"
            onClick={() => setIsRegistering(!isRegistering)}
            disabled={isLoading}
          >
            {isRegistering ? 'Login' : 'Register'}
          </button>
        </p>
      </form>
    </div>
  );
};

export default LoginForm; 