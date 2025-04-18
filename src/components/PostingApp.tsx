import React, { useState, useEffect, useRef } from 'react';
import { 
  Post, 
  Comment, 
  User,
  addPost, 
  getPosts, 
  likePost, 
  deletePost, 
  uploadImage, 
  addComment, 
  deleteComment,
  cancelUser,
  voteToUncancelUser,
  getUsers,
  sendDirectMessage
} from '../services/firebase';
import './PostingApp.css';

interface PostingAppProps {
  username: string;
  startDMWithUser?: (username: string) => void;
}

interface MentionData {
  index: number;
  query: string;
  mentionCharIndex: number;
}

const PostingApp: React.FC<PostingAppProps> = ({ username, startDMWithUser }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<{[key: string]: User}>({});
  const [usersList, setUsersList] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [likeAnimation, setLikeAnimation] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionData, setMentionData] = useState<MentionData | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<string[]>([]);
  const [showCommentMentions, setShowCommentMentions] = useState(false);
  const [commentMentionData, setCommentMentionData] = useState<MentionData | null>(null);
  const [selectedMention, setSelectedMention] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);
  const commentMentionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to posts
    getPosts(setPosts);
    
    // Get all users with cancellation status
    getUsers((allUsers) => {
      const usersMap: {[key: string]: User} = {};
      const usernamesList: string[] = [];
      
      allUsers.forEach(user => {
        usersMap[user.username] = user;
        usernamesList.push(user.username);
      });
      
      setUsers(usersMap);
      setUsersList(usernamesList);
    });
  }, []);

  // Close mentions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionsRef.current && !mentionsRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
      if (commentMentionsRef.current && !commentMentionsRef.current.contains(e.target as Node)) {
        setShowCommentMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Check for @ mentions
    const lastAtSymbol = newContent.lastIndexOf('@');
    if (lastAtSymbol !== -1) {
      const textAfterAt = newContent.slice(lastAtSymbol + 1);
      const spaceAfterAt = textAfterAt.indexOf(' ');
      const mentionQuery = spaceAfterAt === -1 ? textAfterAt : textAfterAt.slice(0, spaceAfterAt);
      
      if (mentionQuery !== '' && lastAtSymbol === newContent.length - mentionQuery.length - 1) {
        // Filter users based on query
        const filtered = usersList.filter(
          user => user.toLowerCase().includes(mentionQuery.toLowerCase()) && user !== username
        );
        
        if (filtered.length > 0) {
          setShowMentions(true);
          setMentionData({
            index: lastAtSymbol,
            query: mentionQuery,
            mentionCharIndex: lastAtSymbol
          });
          setFilteredUsers(filtered);
          setSelectedMention(0);
          return;
        }
      }
    }
    
    setShowMentions(false);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newComment = e.target.value;
    setCommentText(newComment);
    
    // Check for @ mentions in comments
    const lastAtSymbol = newComment.lastIndexOf('@');
    if (lastAtSymbol !== -1) {
      const textAfterAt = newComment.slice(lastAtSymbol + 1);
      const spaceAfterAt = textAfterAt.indexOf(' ');
      const mentionQuery = spaceAfterAt === -1 ? textAfterAt : textAfterAt.slice(0, spaceAfterAt);
      
      if (mentionQuery !== '' && lastAtSymbol === newComment.length - mentionQuery.length - 1) {
        // Filter users based on query
        const filtered = usersList.filter(
          user => user.toLowerCase().includes(mentionQuery.toLowerCase()) && user !== username
        );
        
        if (filtered.length > 0) {
          setShowCommentMentions(true);
          setCommentMentionData({
            index: lastAtSymbol,
            query: mentionQuery,
            mentionCharIndex: lastAtSymbol
          });
          setFilteredUsers(filtered);
          setSelectedMention(0);
          return;
        }
      }
    }
    
    setShowCommentMentions(false);
  };

  const handleSelectMention = (selectedUser: string, isComment: boolean = false) => {
    if (isComment) {
      if (commentMentionData) {
        // Replace the @query with @username
        const beforeMention = commentText.slice(0, commentMentionData.mentionCharIndex);
        const afterMention = commentText.slice(
          commentMentionData.mentionCharIndex + commentMentionData.query.length + 1
        );
        const newText = `${beforeMention}@${selectedUser} ${afterMention}`;
        setCommentText(newText);
        
        // Focus back on input
        if (commentInputRef.current) {
          commentInputRef.current.focus();
        }
      }
      setShowCommentMentions(false);
    } else {
      if (mentionData) {
        // Replace the @query with @username
        const beforeMention = content.slice(0, mentionData.mentionCharIndex);
        const afterMention = content.slice(
          mentionData.mentionCharIndex + mentionData.query.length + 1
        );
        const newText = `${beforeMention}@${selectedUser} ${afterMention}`;
        setContent(newText);
        
        // Focus back on textarea
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
      setShowMentions(false);
    }
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent, isComment: boolean = false) => {
    // Only handle key events when mentions are shown
    if (!(isComment ? showCommentMentions : showMentions)) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedMention(prev => (prev + 1) % filteredUsers.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedMention(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredUsers.length > 0) {
          handleSelectMention(filteredUsers[selectedMention], isComment);
        }
        break;
      case 'Escape':
        e.preventDefault();
        isComment ? setShowCommentMentions(false) : setShowMentions(false);
        break;
    }
  };

  const formatTextWithMentions = (text: string) => {
    if (!text.includes('@')) return text;
    
    // Split text by space to find words starting with @
    const words = text.split(' ');
    return words.map((word, i) => {
      if (word.startsWith('@') && word.length > 1) {
        const username = word.slice(1);
        if (usersList.includes(username)) {
          const isGodlike = username.toLowerCase() === 'will';
          const isSophia = username === 'SophiaAnnabelle';
          let className = "mention";
          if (isGodlike) className += " godlike-username";
          if (isSophia) className += " sophia-username";
          
          return (
            <React.Fragment key={i}>
              <span className={className}>@{username}</span>
              {i < words.length - 1 ? ' ' : ''}
            </React.Fragment>
          );
        }
      }
      return i < words.length - 1 ? `${word} ` : word;
    });
  };

  const sendMentionNotifications = (text: string, sourceType: 'post' | 'comment', postContent?: string) => {
    if (!text.includes('@')) return;
    
    // Find all mentions in the text using a simpler approach
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    // Use exec in a loop instead of matchAll
    while ((match = mentionRegex.exec(text)) !== null) {
      if (match[1]) {
        mentions.push(match[1]);
      }
    }
    
    // Create a unique list without using Set
    const uniqueMentions: string[] = [];
    for (const mention of mentions) {
      if (
        !uniqueMentions.includes(mention) && 
        mention !== username && 
        usersList.includes(mention)
      ) {
        uniqueMentions.push(mention);
      }
    }
    
    uniqueMentions.forEach(async (mentionedUser) => {
      const notificationMessage = sourceType === 'post' 
        ? `${username} mentioned you in a post: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`
        : `${username} mentioned you in a comment: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}" on post: "${postContent?.substring(0, 100) || ''}${postContent && postContent.length > 100 ? '...' : ''}"`;
        
      await sendDirectMessage({
        sender: username,
        recipient: mentionedUser,
        content: notificationMessage,
        timestamp: Date.now()
      });
    });
  };

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

    setIsSubmitting(true);
    setMessage('');

    // Create the base post object
    const newPost: Omit<Post, 'id' | 'likes' | 'comments'> = {
      content: content.trim(),
      author: username,
      timestamp: Date.now()
    };

    // Upload image if one is selected and add to post object
    if (image) {
      const imageUrl = await uploadImage(image);
      if (!imageUrl) {
        setMessage('Failed to upload image. Your post was not published.');
        setIsSubmitting(false);
        return;
      }
      // Only add imageUrl if upload was successful
      newPost.imageUrl = imageUrl;
    }

    const postId = await addPost(newPost);
    
    if (postId) {
      // Send notifications to mentioned users
      sendMentionNotifications(content.trim(), 'post');
      
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

  const toggleComments = (postId: string) => {
    setShowComments(prevId => prevId === postId ? null : postId);
    // Focus on comment input when comments are opened
    if (showComments !== postId) {
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 100);
    }
  };

  const handleSubmitComment = async (postId: string, e: React.FormEvent, postContent: string) => {
    e.preventDefault();
    
    if (!commentText.trim()) return;
    
    const newComment = {
      author: username,
      content: commentText.trim(),
      timestamp: Date.now()
    };
    
    await addComment(postId, newComment);
    
    // Send notifications to mentioned users
    sendMentionNotifications(commentText.trim(), 'comment', postContent);
    
    setCommentText('');
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      await deleteComment(postId, commentId);
    }
  };
  
  const handleCancelUser = async (userToCancel: string) => {
    if (userToCancel === username) {
      setMessage("You can't cancel yourself!");
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (confirmCancel === userToCancel) {
      const success = await cancelUser(userToCancel, username);
      if (success) {
        const user = users[userToCancel];
        // Check if the user is now cancelled or just voted for cancellation
        if (user && user.cancelVotes && user.cancelVotes >= 3) {
          setMessage(`${userToCancel} has been cancelled! (3/3 votes reached)`);
        } else {
          setMessage(`You voted to cancel ${userToCancel}. ${user?.cancelVotes || 1}/3 votes so far.`);
        }
      } else {
        setMessage(`Failed to cancel ${userToCancel}. Perhaps you already voted?`);
      }
      setTimeout(() => setMessage(''), 3000);
      setConfirmCancel(null);
    } else {
      setConfirmCancel(userToCancel);
      setTimeout(() => setConfirmCancel(null), 3000); // Auto-clear confirmation after 3 seconds
    }
  };

  const handleUncancelVote = async (userToUncancel: string) => {
    const success = await voteToUncancelUser(userToUncancel, username);
    if (success) {
      setMessage(`You voted to uncancel ${userToUncancel}`);
    } else {
      setMessage(`Failed to vote for uncancelling ${userToUncancel}. Perhaps you already voted?`);
    }
    setTimeout(() => setMessage(''), 3000);
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

  const renderCancellationStatus = (author: string) => {
    const user = users[author];
    if (!user) return null;
    
    if (user.isCancelled) {
      return (
        <div className="user-cancelled">
          <span className="cancelled-badge">CANCELLED</span>
          <button
            className="uncancel-button small"
            onClick={(e) => {
              e.stopPropagation();
              handleUncancelVote(author);
            }}
          >
            Uncancel ({(user.uncancelVotes?.length || 0)}/3)
          </button>
        </div>
      );
    } else if (author !== username) {
      // Check if user has any cancel votes
      const hasCancelVotes = user.cancelVotes && user.cancelVotes > 0;
      
      return (
        <button
          className={`cancel-button small ${confirmCancel === author ? 'confirm' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleCancelUser(author);
          }}
        >
          {confirmCancel === author ? 'Confirm Cancel?' : hasCancelVotes ? `Cancel (${user.cancelVotes}/3)` : 'Cancel'}
        </button>
      );
    }
    
    return null;
  };

  // Add function to handle starting DM from user click
  const handleStartDM = (userToMessage: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (startDMWithUser && userToMessage !== username) {
      startDMWithUser(userToMessage);
    }
  };

  return (
    <div className="posting-app">
      <form ref={formRef} onSubmit={handleSubmit} className="post-form">
        <div className="form-group">
          <label htmlFor="content">
            <span>Your Message</span>
            <span className="emoji-icon">💬</span>
            <span className="mention-hint">Use @ to mention users</span>
          </label>
          <div className="textarea-container">
            <textarea
              id="content"
              value={content}
              onChange={handleContentChange}
              onKeyDown={(e) => handleMentionKeyDown(e)}
              required
              placeholder="What's on your mind today?"
              rows={4}
              ref={textareaRef}
            />
            
            {showMentions && (
              <div className="mentions-dropdown" ref={mentionsRef}>
                {filteredUsers.map((user, index) => (
                  <div 
                    key={user} 
                    className={`mention-item ${index === selectedMention ? 'selected' : ''}`}
                    onClick={() => handleSelectMention(user)}
                  >
                    <span className="mention-avatar">{user.charAt(0).toUpperCase()}</span>
                    <span className="mention-username">{user}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
              className="hidden-file-input"
            />
            <label htmlFor="image" className="custom-file-button">
              <span className="button-icon">➕</span>
              <span>Add Photo</span>
            </label>
            {!imagePreview && (
              <p className="file-helper">or drop an image here</p>
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
            <div key={post.id} className={`post ${post.isApology ? 'apology-post' : ''}`}>
              <div className="post-header">
                <div className="author-info">
                  <h4 
                    className={`post-author ${post.author !== username ? 'clickable' : ''} ${
                      post.author.toLowerCase() === 'will' ? 'godlike-username' : 
                      post.author === 'SophiaAnnabelle' ? 'sophia-username' : ''
                    }`}
                    onClick={(e) => post.author !== username && handleStartDM(post.author, e)}
                    title={post.author !== username ? `Message ${post.author}` : ''}
                  >
                    {post.author} 
                    {post.author !== username && <span className="dm-icon">✉️</span>}
                  </h4>
                  {!post.isApology && renderCancellationStatus(post.author)}
                </div>
                <span className="post-date">
                  {formatDate(post.timestamp)}
                </span>
              </div>
              
              <div className="post-content">
                {post.isApology ? (
                  <div className="apology-post-content">
                    <span className="apology-label">OFFICIAL APOLOGY</span>
                    {formatTextWithMentions(post.content)}
                  </div>
                ) : (
                  formatTextWithMentions(post.content)
                )}
              </div>
              
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
                  onClick={() => post.id && toggleComments(post.id)}
                  className="comment-button"
                  aria-label="Show comments"
                >
                  <span>💬</span>
                  <span>
                    {post.comments && post.comments.length > 0 
                      ? `${post.comments.length} comment${post.comments.length !== 1 ? 's' : ''}` 
                      : 'Comment'}
                  </span>
                </button>
                {post.author === username && !post.isApology && (
                  <button
                    onClick={() => post.id && handleDelete(post.id)}
                    className="delete-button"
                    aria-label="Delete post"
                  >
                    <span>🗑️ Delete</span>
                  </button>
                )}
              </div>

              {showComments === post.id && post.id && (
                <div className="comments-section">
                  <div className="comments-header">
                    <span className="emoji-icon">💬</span>
                    <span>Comments</span>
                  </div>

                  <div className="comment-form-container">
                    <form onSubmit={(e) => post.id && handleSubmitComment(post.id, e, post.content)} className="comment-form">
                      <div className="comment-input-container">
                        <input
                          type="text"
                          placeholder="Write a comment... (Use @ to mention users)"
                          className="comment-input"
                          value={commentText}
                          onChange={handleCommentChange}
                          onKeyDown={(e) => handleMentionKeyDown(e, true)}
                          ref={commentInputRef}
                        />
                        
                        {showCommentMentions && (
                          <div className="mentions-dropdown comment-mentions" ref={commentMentionsRef}>
                            {filteredUsers.map((user, index) => (
                              <div 
                                key={user} 
                                className={`mention-item ${index === selectedMention ? 'selected' : ''}`}
                                onClick={() => handleSelectMention(user, true)}
                              >
                                <span className="mention-avatar">{user.charAt(0).toUpperCase()}</span>
                                <span className="mention-username">{user}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="submit" className="comment-submit">
                        Post
                      </button>
                    </form>
                  </div>

                  <div className="comment-list">
                    {post.comments && post.comments.length > 0 ? (
                      post.comments.map(comment => (
                        <div key={comment.id} className="comment">
                          <div className="comment-header">
                            <div className="author-info">
                              <span 
                                className={`comment-author ${comment.author !== username ? 'clickable' : ''} ${
                                  comment.author.toLowerCase() === 'will' ? 'godlike-username' : 
                                  comment.author === 'SophiaAnnabelle' ? 'sophia-username' : ''
                                }`}
                                onClick={(e) => comment.author !== username && handleStartDM(comment.author, e)}
                                title={comment.author !== username ? `Message ${comment.author}` : ''}
                              >
                                {comment.author}
                                {comment.author !== username && <span className="dm-icon small">✉️</span>}
                              </span>
                              {renderCancellationStatus(comment.author)}
                            </div>
                            <span className="comment-time">{formatDate(comment.timestamp)}</span>
                          </div>
                          <div className="comment-content">
                            {formatTextWithMentions(comment.content)}
                          </div>
                          {comment.author === username && comment.id && (
                            <button 
                              className="delete-comment-btn" 
                              onClick={() => post.id && comment.id && handleDeleteComment(post.id, comment.id)}
                              aria-label="Delete comment"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="no-comments">No comments yet. Be the first to add one!</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <footer className="app-footer">
        <p>Made with <span className="heart-icon">❤️</span> © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default PostingApp; 