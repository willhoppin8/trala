import React, { useState, useEffect, useRef } from 'react';
import { 
  Post, 
  Comment, 
  User,
  PollOption,
  addPost, 
  getPosts, 
  likePost, 
  dislikePost,
  deletePost, 
  uploadImage, 
  addComment, 
  deleteComment,
  cancelUser,
  voteToUncancelUser,
  getUsers,
  sendDirectMessage,
  votePollOption,
  isPollEnded
} from '../services/firebase';
import { sendNotificationToSubscribers } from '../services/twilio';
import './PostingApp.css';
import ProfilePicture from './ProfilePicture';

interface PostingAppProps {
  username: string;
  startDMWithUser?: (username: string) => void;
  userProfilePicture?: string;
}

interface MentionData {
  index: number;
  query: string;
  mentionCharIndex: number;
}

const PostingApp: React.FC<PostingAppProps> = ({ username, startDMWithUser, userProfilePicture }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<{[key: string]: User}>({});
  const [usersList, setUsersList] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [likeAnimation, setLikeAnimation] = useState<string | null>(null);
  const [dislikeAnimation, setDislikeAnimation] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionData, setMentionData] = useState<MentionData | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<string[]>([]);
  const [showCommentMentions, setShowCommentMentions] = useState(false);
  const [commentMentionData, setCommentMentionData] = useState<MentionData | null>(null);
  const [selectedMention, setSelectedMention] = useState<number>(0);
  const [isGif, setIsGif] = useState<boolean>(false);
  
  // Poll state
  const [isPollPost, setIsPollPost] = useState<boolean>(false);
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDuration, setPollDuration] = useState<string>('1d'); // Default: 1 day
  
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
          const isKiki = username.toLowerCase() === 'kikiwiki';
          const isWillImpersonator = username.toLowerCase().includes('will') && username.toLowerCase() !== 'will';
          
          let className = "mention";
          if (isGodlike) className += " godlike-username";
          if (isSophia) className += " sophia-username";
          if (isKiki) className += " kiki-username";
          
          return (
            <React.Fragment key={i}>
              <span className={className}>@{username}</span>
              {isWillImpersonator && <span className="fact-check-badge" onClick={() => window.open('https://www.nyc.gov/site/nypd/index.page', '_blank')}>⚠️ Fact check: Not the real Will - Report</span>}
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
      
      // Check if it's a GIF
      const isFileGif = selectedFile.type === 'image/gif' || selectedFile.name.toLowerCase().endsWith('.gif');
      setIsGif(isFileGif);
      
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
    setIsGif(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };
  
  const addPollOption = () => {
    if (pollOptions.length < 6) { // Limit to 6 options
      setPollOptions([...pollOptions, '']);
    } else {
      setMessage('Maximum 6 options allowed');
      setTimeout(() => setMessage(''), 3000);
    }
  };
  
  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) { // Minimum 2 options
      const newOptions = [...pollOptions];
      newOptions.splice(index, 1);
      setPollOptions(newOptions);
    }
  };
  
  const resetPollState = () => {
    setIsPollPost(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollDuration('1d');
  };
  
  const calculatePollEndTime = (): number => {
    const now = Date.now();
    switch(pollDuration) {
      case '1h': return now + 60 * 60 * 1000; // 1 hour
      case '1d': return now + 24 * 60 * 60 * 1000; // 1 day
      case '3d': return now + 3 * 24 * 60 * 60 * 1000; // 3 days
      case '7d': return now + 7 * 24 * 60 * 60 * 1000; // 7 days
      default: return now + 24 * 60 * 60 * 1000; // Default: 1 day
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !isPollPost) {
      setMessage('Post content cannot be empty');
      return;
    }
    
    if (isPollPost) {
      // Validate poll data
      if (!pollQuestion.trim()) {
        setMessage('Poll question cannot be empty');
        return;
      }
      
      // Ensure at least 2 valid options
      const validOptions = pollOptions.filter(option => option.trim() !== '');
      if (validOptions.length < 2) {
        setMessage('Please provide at least 2 poll options');
        return;
      }
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
      // Add isGif flag if the image is a GIF
      if (isGif) {
        newPost.isGif = true;
      }
    }
    
    // Add poll data if this is a poll post
    if (isPollPost) {
      const validOptions = pollOptions.filter(option => option.trim() !== '');
      const pollOptionsObject: { [key: string]: PollOption } = {};
      
      validOptions.forEach((option, index) => {
        const optionId = `option_${index}`;
        pollOptionsObject[optionId] = {
          id: optionId,
          text: option.trim(),
          votes: 0,
          voters: []
        };
      });
      
      newPost.isPoll = true;
      newPost.pollQuestion = pollQuestion.trim();
      newPost.pollOptions = pollOptionsObject as any;
      newPost.pollEndTime = calculatePollEndTime();
    }

    const postId = await addPost(newPost);
    
    if (postId) {
      // Send notifications to mentioned users
      sendMentionNotifications(content.trim(), 'post');
      
      // Send SMS notifications to subscribers
      sendNotificationToSubscribers(username).catch(err => 
        console.log('SMS notification log:', err)
      );
      
      setContent('');
      setImage(null);
      setImagePreview(null);
      resetPollState();
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
    await likePost(postId);
    setLikeAnimation(postId);
    setTimeout(() => setLikeAnimation(null), 1000);
  };

  const handleDislike = async (postId: string) => {
    await dislikePost(postId);
    setDislikeAnimation(postId);
    setTimeout(() => setDislikeAnimation(null), 1000);
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

  // Update the handleStartDM function to be more generic
  const handleStartDM = (userToMessage: string, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (startDMWithUser && userToMessage !== username) {
      startDMWithUser(userToMessage);
    }
  };

  // Function to check if a URL is a GIF
  const isGifUrl = (url: string): boolean => {
    return url.toLowerCase().includes('.gif') || url.toLowerCase().includes('image/gif');
  };

  const handleVotePoll = async (postId: string, optionId: string) => {
    const success = await votePollOption(postId, optionId, username);
    if (success) {
      // No need to show message - the real-time update will reflect the change
    } else {
      setMessage('Failed to vote on poll. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };
  
  const calculatePollPercentage = (votes: number, totalVotes: number): number => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };
  
  const formatRemainingTime = (endTime: number): string => {
    const now = Date.now();
    const diff = endTime - now;
    
    if (diff <= 0) return 'Poll ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };
  
  const hasUserVoted = (pollOptions: { [key: string]: PollOption }): boolean => {
    if (!pollOptions) return false;
    
    return Object.values(pollOptions).some(option => 
      option.voters && option.voters.includes(username)
    );
  };
  
  const getUserVote = (pollOptions: { [key: string]: PollOption }): string | null => {
    if (!pollOptions) return null;
    
    const userVote = Object.entries(pollOptions).find(([_, option]) => 
      option.voters && option.voters.includes(username)
    );
    
    return userVote ? userVote[0] : null;
  };

  // Handle poll option tab key navigation
  const handlePollOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Tab' && index === pollOptions.length - 1 && !e.shiftKey) {
      // If tabbing from the last poll option, add a new one if possible
      e.preventDefault();
      if (pollOptions.length < 6) {
        addPollOption();
      }
    }
  };

  return (
    <div className="posting-app">
      <h2 className="app-description">Share your thoughts with the community</h2>
      
      <form ref={formRef} className="post-form" onSubmit={handleSubmit}>
        <div className="post-type-selector">
          <button 
            type="button" 
            className={`post-type-btn ${!isPollPost ? 'active' : ''}`}
            onClick={() => setIsPollPost(false)}
          >
            <span className="emoji-icon">📝</span> Regular Post
          </button>
          <button 
            type="button" 
            className={`post-type-btn ${isPollPost ? 'active' : ''}`}
            onClick={() => setIsPollPost(true)}
          >
            <span className="emoji-icon">📊</span> Create Poll
          </button>
        </div>
        
        {isPollPost ? (
          <div className="poll-creation">
            <div className="form-group">
              <label htmlFor="pollQuestion">
                <span>Poll Question</span>
                <span className="emoji-icon">❓</span>
              </label>
              <input
                type="text"
                id="pollQuestion"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                required={isPollPost}
              />
            </div>
            
            <div className="form-group">
              <label>
                <span>Poll Options</span>
                <span className="emoji-icon">🔤</span>
              </label>
              {pollOptions.map((option, index) => (
                <div key={index} className="poll-option-input">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handlePollOption(index, e.target.value)}
                    onKeyDown={(e) => handlePollOptionKeyDown(e, index)}
                    placeholder={`Option ${index + 1}`}
                    required={isPollPost}
                    className="poll-option-field"
                  />
                  {index > 1 && (
                    <button 
                      type="button" 
                      className="remove-option-btn"
                      onClick={() => removePollOption(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              
              {pollOptions.length < 6 && (
                <button 
                  type="button" 
                  className="add-option-btn"
                  onClick={addPollOption}
                >
                  <span className="button-icon">➕</span> Add Option
                </button>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="pollDuration">
                <span>Poll Duration</span>
                <span className="emoji-icon">⏱️</span>
              </label>
              <select
                id="pollDuration"
                value={pollDuration}
                onChange={(e) => setPollDuration(e.target.value)}
                className="poll-duration-select"
              >
                <option value="1h">1 hour</option>
                <option value="1d">1 day</option>
                <option value="3d">3 days</option>
                <option value="7d">7 days</option>
              </select>
            </div>
          </div>
        ) : (
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
                required={!isPollPost}
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
                      onClick={(e) => handleSelectMention(user)}
                    >
                      <span className="mention-avatar">{user.charAt(0).toUpperCase()}</span>
                      <span className="mention-username">{user}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="image">
            <span>Add an Image or GIF</span>
            <span className="emoji-icon">🖼️</span>
            <span className="optional-label">optional</span>
          </label>
          <div className="file-input-container">
            <input
              type="file"
              id="image"
              accept="image/*,.gif"
              onChange={handleImageChange}
              ref={fileInputRef}
              className="hidden-file-input"
            />
            <label htmlFor="image" className="custom-file-button">
              <span className="button-icon">➕</span>
              <span>Add Photo or GIF</span>
            </label>
            {!imagePreview && (
              <p className="file-helper">or drop an image/GIF here</p>
            )}
          </div>
          
          {imagePreview && (
            <div className={`image-preview-container ${isGif ? 'is-gif' : ''}`}>
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
              <span className="emoji-icon">{isPollPost ? '📊' : '✨'}</span>
              <span>{isPollPost ? 'Create Poll' : 'Share with the World'}</span>
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
            <div key={post.id} className={`post ${post.isApology ? 'apology-post' : ''} ${post.isPoll ? 'poll-post' : ''}`}>
              <div className="post-header">
                <div className="author-info">
                  <ProfilePicture 
                    imageUrl={post.author === username ? userProfilePicture : users[post.author]?.profilePictureUrl}
                    username={post.author}
                    size="small"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => post.author !== username && handleStartDM(post.author, e)}
                    className={post.author !== username ? 'clickable' : ''}
                  />
                  <h4 
                    className={`post-author ${post.author !== username ? 'clickable' : ''} ${
                      post.author.toLowerCase() === 'will' ? 'godlike-username' : 
                      post.author === 'SophiaAnnabelle' ? 'sophia-username' : 
                      post.author.toLowerCase() === 'kikiwiki' ? 'kiki-username' : ''
                    }`}
                    onClick={(e) => post.author !== username && handleStartDM(post.author, e)}
                    title={post.author !== username ? `Message ${post.author}` : ''}
                  >
                    {post.author} 
                    {post.author !== username && <span className="dm-icon">✉️</span>}
                  </h4>
                  {post.author.toLowerCase().includes('will') && post.author.toLowerCase() !== 'will' && (
                    <span className="fact-check-badge" onClick={() => window.open('https://www.nyc.gov/site/nypd/index.page', '_blank')}>
                      ⚠️ Fact check: Not the real Will - Report
                    </span>
                  )}
                  {!post.isApology && renderCancellationStatus(post.author)}
                </div>
                <span className="post-date">
                  {formatDate(post.timestamp)}
                </span>
              </div>
              
              {/* Poll Content */}
              {post.isPoll && post.pollOptions && post.pollQuestion && (
                <div className="poll-container">
                  <div className="poll-header">
                    <span className="poll-indicator">POLL</span>
                    {post.pollEndTime && (
                      <span className="poll-timer">
                        {isPollEnded(post.pollEndTime) ? 'Poll Ended' : formatRemainingTime(post.pollEndTime)}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="poll-question">{post.pollQuestion}</h4>
                  
                  <div className="poll-options">
                    {Object.entries(post.pollOptions).map(([optionId, option]) => {
                      // Calculate total votes for percentage
                      const totalVotes = Object.values(post.pollOptions || {}).reduce((sum, opt) => sum + (opt.votes || 0), 0);
                      const percentage = calculatePollPercentage(option.votes || 0, totalVotes);
                      const userVotedFor = option.voters && option.voters.includes(username);
                      const pollEnded = post.pollEndTime ? isPollEnded(post.pollEndTime) : false;
                      const anyVote = totalVotes > 0;
                      
                      return (
                        <div key={optionId} className={`poll-option ${userVotedFor ? 'user-voted' : ''}`}>
                          <button 
                            className="poll-vote-btn"
                            onClick={() => !pollEnded && handleVotePoll(post.id!, optionId)} 
                            disabled={pollEnded}
                          >
                            {/* Vote button with percentage fill */}
                            <div className="poll-option-content">
                              <span className="poll-option-text">{option.text}</span>
                              <span className="poll-votes-count">
                                {option.votes || 0} vote{(option.votes !== 1) ? 's' : ''}
                              </span>
                            </div>
                            
                            {/* Progress bar for votes */}
                            {(anyVote || pollEnded) && (
                              <div className="poll-progress-bar-container">
                                <div 
                                  className="poll-progress-bar" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                                <span className="poll-percentage">{percentage}%</span>
                              </div>
                            )}
                            
                            {/* Show checkmark for user's vote */}
                            {userVotedFor && (
                              <span className="user-vote-indicator">✓</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="poll-footer">
                    <span className="poll-total-votes">
                      {Object.values(post.pollOptions).reduce((sum, opt) => sum + (opt.votes || 0), 0)} total votes
                    </span>
                    {!post.content?.trim() ? <span className="poll-text-indicator">Poll only</span> : null}
                  </div>
                </div>
              )}
              
              {/* Regular post content */}
              {(!post.isPoll || post.content?.trim()) && (
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
              )}
              
              {post.imageUrl && (
                <div className="post-image-container">
                  <img 
                    src={post.imageUrl} 
                    alt="Post" 
                    className={`post-image ${isGifUrl(post.imageUrl) ? 'is-gif' : ''}`}
                  />
                </div>
              )}
              
              <div className="post-actions">
                <button 
                  className={`like-button ${likeAnimation === post.id ? 'animate' : ''}`}
                  onClick={() => handleLike(post.id!)}
                >
                  👍 {post.likes || 0}
                </button>
                
                <button 
                  className={`dislike-button ${dislikeAnimation === post.id ? 'animate' : ''}`}
                  onClick={() => handleDislike(post.id!)}
                >
                  👎 {post.dislikes || 0}
                </button>
                
                <button 
                  className="comment-button"
                  onClick={() => toggleComments(post.id!)}
                >
                  💬 {post.comments?.length || 0}
                </button>
                
                {post.author === username && !post.isApology && (
                  <button 
                    className="delete-button"
                    onClick={() => handleDelete(post.id!)}
                  >
                    🗑️ Delete
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
                                onClick={(e) => handleSelectMention(user, true)}
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
                              <ProfilePicture 
                                imageUrl={comment.author === username ? userProfilePicture : users[comment.author]?.profilePictureUrl}
                                username={comment.author}
                                size="small"
                                onClick={(e: React.MouseEvent<HTMLDivElement>) => comment.author !== username && handleStartDM(comment.author, e)}
                                className={comment.author !== username ? 'clickable' : ''}
                              />
                              <span 
                                className={`comment-author ${comment.author !== username ? 'clickable' : ''} ${
                                  comment.author.toLowerCase() === 'will' ? 'godlike-username' : 
                                  comment.author === 'SophiaAnnabelle' ? 'sophia-username' : 
                                  comment.author.toLowerCase() === 'kikiwiki' ? 'kiki-username' : ''
                                }`}
                                onClick={(e) => comment.author !== username && handleStartDM(comment.author, e)}
                                title={comment.author !== username ? `Message ${comment.author}` : ''}
                              >
                                {comment.author}
                                {comment.author !== username && <span className="dm-icon small">✉️</span>}
                              </span>
                              {comment.author.toLowerCase().includes('will') && comment.author.toLowerCase() !== 'will' && (
                                <span className="fact-check-badge small" onClick={() => window.open('https://www.nyc.gov/site/nypd/index.page', '_blank')}>
                                  ⚠️ Not the real Will - Report
                                </span>
                              )}
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