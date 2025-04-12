import React, { useState, useEffect } from 'react';
import { Post, addPost, getPosts, likePost, deletePost } from '../services/firebase';
import './PostingApp.css';

const PostingApp: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Subscribe to posts
    getPosts(setPosts);
  }, []);

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

    const newPost = {
      content: content.trim(),
      author: author.trim(),
      timestamp: Date.now()
    };

    const postId = await addPost(newPost);
    
    if (postId) {
      setContent('');
      setMessage('Your post has been published!');
    } else {
      setMessage('There was an error publishing your post. Please try again.');
    }

    setIsSubmitting(false);
  };

  const handleLike = async (postId: string) => {
    await likePost(postId);
  };

  const handleDelete = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      await deletePost(postId);
    }
  };

  return (
    <div className="posting-app">
      <h2>Tralelero Tralala</h2>
      <p className="app-description">Share your thoughts with the world!</p>
      
      <form onSubmit={handleSubmit} className="post-form">
        <div className="form-group">
          <label htmlFor="author">Your Name</label>
          <input
            type="text"
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            placeholder="Enter your name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Your Message</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="What's on your mind?"
            rows={4}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="post-button">
          {isSubmitting ? 'Posting...' : 'Post Message'}
        </button>

        {message && <p className="message">{message}</p>}
      </form>

      <div className="posts-container">
        <h3>Recent Posts</h3>
        
        {posts.length === 0 ? (
          <p className="no-posts">No posts yet. Be the first to post!</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post">
              <div className="post-header">
                <h4 className="post-author">{post.author}</h4>
                <span className="post-date">
                  {new Date(post.timestamp).toLocaleString()}
                </span>
              </div>
              
              <p className="post-content">{post.content}</p>
              
              <div className="post-actions">
                <button 
                  onClick={() => post.id && handleLike(post.id)}
                  className="like-button"
                >
                  ❤️ {post.likes || 0}
                </button>
                <button
                  onClick={() => post.id && handleDelete(post.id)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PostingApp; 