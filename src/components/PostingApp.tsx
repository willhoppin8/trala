import React, { useState, useEffect, useRef } from 'react';
import { Post, addPost, getPosts, likePost, deletePost, uploadImage } from '../services/firebase';
import './PostingApp.css';

const PostingApp: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [likeAnimation, setLikeAnimation] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Subscribe to posts
    getPosts(setPosts);
    
    // Get stored username if available
    const storedAuthor = localStorage.getItem('tralaAuthor');
    if (storedAuthor) {
      setAuthor(storedAuthor);
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setImage(selectedFile);
      
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
    
    if (!content.trim()) {
      setMessage('Post content cannot be empty');
      return;
    }

    if (!author.trim()) {
      setMessage('Author name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    // Remember author name for future use
    localStorage.setItem('tralaAuthor', author.trim());

    // Upload image if one is selected
    let imageUrl = null;
    if (image) {
      imageUrl = await uploadImage(image);
      if (!imageUrl) {
        setMessage('Failed to upload image. Your post was not published.');
        setIsSubmitting(false);
        return;
      }
    }

    const newPost = {
      content: content.trim(),
      author: author.trim(),
      timestamp: Date.now(),
      imageUrl: imageUrl || undefined
    };

    const postId = await addPost(newPost);
    
    if (postId) {
      setContent('');
      setImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setMessage('Your post has been published!');
      
      // Scroll to the top of the posts container
      const postsContainer = document.querySelector('.posts-container');
      if (postsContainer) {
        setTimeout(() => {
          postsContainer.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      }
    } else {
      setMessage('There was an error publishing your post. Please try again.');
    }

    setIsSubmitting(false);
  };

  const handleLike = async (postId: string) => {
    setLikeAnimation(postId);
    await likePost(postId);
    setTimeout(() => setLikeAnimation(null), 1000);
  };

  const handleDelete = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      await deletePost(postId);
    }
  };

  // Format the date more nicely
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  return (
    <div className="posting-app">
      <h2>TRALA</h2>
      <p className="app-description">Share your thoughts and images with the world!</p>
      
      <form ref={formRef} onSubmit={handleSubmit} className="post-form">
        <div className="form-group">
          <label htmlFor="author">
            <span>Your Name</span>
            <span className="emoji-icon">👤</span>
          </label>
          <input
            type="text"
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            placeholder="What should we call you?"
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">
            <span>Your Message</span>
            <span className="emoji-icon">💬</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="What's on your mind today?"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">
            <span>Add an Image</span>
            <span className="emoji-icon">🖼️</span>
            <span className="optional-label">optional</span>
          </label>
          <div className="file-input-container">
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
            />
            {!imagePreview && (
              <p className="file-helper">Drop an image here or click to browse</p>
            )}
          </div>
          
          {imagePreview && (
            <div className="image-preview-container">
              <img src={imagePreview} alt="Preview" className="image-preview" />
              <button 
                type="button" 
                className="clear-image-btn" 
                onClick={handleClearImage}
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className="post-button">
          {isSubmitting ? (
            <span className="button-content">
              <span className="loader"></span>
              <span>Posting...</span>
            </span>
          ) : (
            <span className="button-content">
              <span className="emoji-icon">✨</span>
              <span>Share with the World</span>
            </span>
          )}
        </button>

        {message && <p className="message">{message}</p>}
      </form>

      <div className="posts-container">
        <h3>
          <span className="emoji-icon">📝</span>
          <span>Community Posts</span>
        </h3>
        
        {posts.length === 0 ? (
          <div className="no-posts-container">
            <p className="no-posts">No posts yet. Be the first to post!</p>
            <div className="arrow-down">↓</div>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post">
              <div className="post-header">
                <h4 className="post-author">{post.author}</h4>
                <span className="post-date">
                  {formatDate(post.timestamp)}
                </span>
              </div>
              
              <p className="post-content">{post.content}</p>
              
              {post.imageUrl && (
                <div className="post-image-container">
                  <img src={post.imageUrl} alt="Post" className="post-image" />
                </div>
              )}
              
              <div className="post-actions">
                <button 
                  onClick={() => post.id && handleLike(post.id)}
                  className={`like-button ${likeAnimation === post.id ? 'like-animation' : ''}`}
                  aria-label="Like post"
                >
                  <span className="heart-icon">❤️</span> 
                  <span className="like-count">{post.likes || 0}</span>
                </button>
                <button
                  onClick={() => post.id && handleDelete(post.id)}
                  className="delete-button"
                  aria-label="Delete post"
                >
                  <span>🗑️ Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <footer className="app-footer">
        <p>Made with <span className="heart-icon">❤️</span> TRALA © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default PostingApp; 