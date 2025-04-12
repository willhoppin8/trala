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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Subscribe to posts
    getPosts(setPosts);
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
      <h2>TRALA</h2>
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

        <div className="form-group">
          <label htmlFor="image">Image (Optional)</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            ref={fileInputRef}
          />
          
          {imagePreview && (
            <div className="image-preview-container">
              <img src={imagePreview} alt="Preview" className="image-preview" />
              <button 
                type="button" 
                className="clear-image-btn" 
                onClick={handleClearImage}
              >
                Remove Image
              </button>
            </div>
          )}
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
              
              {post.imageUrl && (
                <div className="post-image-container">
                  <img src={post.imageUrl} alt="Post" className="post-image" />
                </div>
              )}
              
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