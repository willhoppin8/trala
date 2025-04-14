import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, update, increment, remove, query, orderByChild, get, child } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCKE2myj5Cdpme0BMvpeJSbeKKmEN51Vsw",
  authDomain: "puzzler-23312.firebaseapp.com",
  projectId: "puzzler-23312",
  storageBucket: "puzzler-23312.firebasestorage.app",
  messagingSenderId: "662163993487",
  appId: "1:662163993487:web:238adfcd87fb112e8091fa",
  measurementId: "G-01ZC0J2GK6",
  databaseURL: "https://puzzler-23312-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

// Reference to the posts collection
const postsRef = ref(database, 'TRALA');
// Reference to the users collection
const usersRef = ref(database, 'users');
// Reference to the direct messages collection
const dmsRef = ref(database, 'directMessages');

// Post interface
export interface Post {
  id?: string;
  content: string;
  author: string;
  timestamp: number;
  likes?: number;
  imageUrl?: string;
  comments?: Comment[];
  isApology?: boolean;
}

// Comment interface
export interface Comment {
  id?: string;
  author: string;
  content: string;
  timestamp: number;
}

// User interface
export interface User {
  username: string;
  password: string; // Note: In a real app, never store plaintext passwords!
  isCancelled?: boolean;
  cancelVotes?: number;
  cancelledBy?: string[];
  uncancelVotes?: string[]; // Users who voted to uncancel
  lastApology?: number; // Timestamp of the last apology
}

// Direct Message interface
export interface DirectMessage {
  id?: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  read: boolean;
}

// Register a new user
export const registerUser = async (username: string, password: string): Promise<boolean> => {
  try {
    // Check if username already exists
    const snapshot = await get(child(ref(database), `users/${username}`));
    if (snapshot.exists()) {
      console.error('Username already exists');
      return false;
    }
    
    // Create a new user
    await set(ref(database, `users/${username}`), {
      username,
      password, // In a real app, use proper password hashing!
    });
    
    return true;
  } catch (error) {
    console.error('Error registering user:', error);
    return false;
  }
};

// Login a user
export const loginUser = async (username: string, password: string): Promise<boolean> => {
  try {
    const snapshot = await get(child(ref(database), `users/${username}`));
    
    if (!snapshot.exists()) {
      console.error('User not found');
      return false;
    }
    
    const userData = snapshot.val();
    if (userData.password === password) {
      return true;
    } else {
      console.error('Incorrect password');
      return false;
    }
  } catch (error) {
    console.error('Error logging in:', error);
    return false;
  }
};

// Upload image to Firebase Storage
export const uploadImage = async (file: File): Promise<string | null> => {
  try {
    const fileRef = storageRef(storage, `images/${Date.now()}_${file.name}`);
    
    await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(fileRef);
    
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

// Add a new post
export const addPost = async (post: Omit<Post, 'id' | 'likes' | 'comments'>) => {
  try {
    // Create post data with required fields, omitting undefined values
    const postData = {
      content: post.content,
      author: post.author,
      timestamp: post.timestamp,
      likes: 0,
      comments: {}
    };

    // Only add imageUrl if it exists and is not undefined
    if (post.imageUrl) {
      Object.assign(postData, { imageUrl: post.imageUrl });
    }

    const newPostRef = push(postsRef);
    await set(newPostRef, postData);
    return newPostRef.key;
  } catch (error) {
    console.error('Error adding post:', error);
    return null;
  }
};

// Get all posts with realtime updates
export const getPosts = (callback: (posts: Post[]) => void) => {
  const postsQuery = query(postsRef, orderByChild('timestamp'));
  
  onValue(postsQuery, (snapshot) => {
    const posts: Post[] = [];
    snapshot.forEach((childSnapshot) => {
      const post = childSnapshot.val();
      // Convert comments object to array if it exists
      let comments: Comment[] = [];
      if (post.comments) {
        comments = Object.entries(post.comments).map(([id, data]) => ({
          id,
          ...data as Omit<Comment, 'id'>
        }));
        // Sort comments by timestamp, newest first
        comments.sort((a, b) => b.timestamp - a.timestamp);
      }
      
      posts.push({
        id: childSnapshot.key,
        ...post,
        comments
      });
    });
    // Reverse to show newest first
    callback(posts.reverse());
  });
};

// Like a post
export const likePost = async (postId: string) => {
  try {
    const postRef = ref(database, `TRALA/${postId}`);
    await update(postRef, {
      likes: increment(1)
    });
    return true;
  } catch (error) {
    console.error('Error liking post:', error);
    return false;
  }
};

// Add a comment to a post
export const addComment = async (postId: string, comment: Omit<Comment, 'id'>) => {
  try {
    const commentsRef = ref(database, `TRALA/${postId}/comments`);
    const newCommentRef = push(commentsRef);
    await set(newCommentRef, comment);
    return newCommentRef.key;
  } catch (error) {
    console.error('Error adding comment:', error);
    return null;
  }
};

// Delete a comment
export const deleteComment = async (postId: string, commentId: string) => {
  try {
    const commentRef = ref(database, `TRALA/${postId}/comments/${commentId}`);
    await remove(commentRef);
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
};

// Delete a post
export const deletePost = async (postId: string) => {
  try {
    const postRef = ref(database, `TRALA/${postId}`);
    await remove(postRef);
    return true;
  } catch (error) {
    console.error('Error deleting post:', error);
    return false;
  }
};

// Cancel a user
export const cancelUser = async (username: string, cancelledBy: string): Promise<boolean> => {
  try {
    const userRef = ref(database, `users/${username}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      console.error('User not found');
      return false;
    }
    
    const userData = snapshot.val();
    const cancelledBy_arr = userData.cancelledBy || [];
    
    // Check if this user already cancelled the target
    if (cancelledBy_arr.includes(cancelledBy)) {
      return false;
    }
    
    const newCancelledBy = [...cancelledBy_arr, cancelledBy];
    const newCancelVotes = (userData.cancelVotes || 0) + 1;
    
    // If 3 or more people vote to cancel, activate the cancellation
    if (newCancelledBy.length >= 3) {
      await update(userRef, {
        isCancelled: true,
        cancelledBy: newCancelledBy,
        cancelVotes: newCancelVotes,
        uncancelVotes: []
      });
    } else {
      // Otherwise just record the vote
      await update(userRef, {
        cancelledBy: newCancelledBy,
        cancelVotes: newCancelVotes
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error cancelling user:', error);
    return false;
  }
};

// Vote to uncancel a user
export const voteToUncancelUser = async (username: string, voterUsername: string): Promise<boolean> => {
  try {
    const userRef = ref(database, `users/${username}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      console.error('User not found');
      return false;
    }
    
    const userData = snapshot.val();
    
    // User must be cancelled to vote for uncancellation
    if (!userData.isCancelled) {
      return false;
    }
    
    const uncancelVotes = userData.uncancelVotes || [];
    
    // Check if this user already voted
    if (uncancelVotes.includes(voterUsername)) {
      return false;
    }
    
    const newUncancelVotes = [...uncancelVotes, voterUsername];
    
    // If 3 or more people vote to uncancel, remove the cancellation
    if (newUncancelVotes.length >= 3) {
      await update(userRef, {
        isCancelled: false,
        uncancelVotes: [],
        cancelVotes: 0,
        cancelledBy: []
      });
    } else {
      await update(userRef, {
        uncancelVotes: newUncancelVotes
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error voting to uncancel user:', error);
    return false;
  }
};

// Get all users with cancellation status
export const getUsers = (callback: (users: User[]) => void) => {
  onValue(usersRef, (snapshot) => {
    const users: User[] = [];
    snapshot.forEach((childSnapshot) => {
      const userData = childSnapshot.val();
      users.push({
        ...userData,
        uncancelVotes: userData.uncancelVotes ? Object.values(userData.uncancelVotes) : []
      });
    });
    callback(users);
  });
};

// Send a direct message
export const sendDirectMessage = async (message: Omit<DirectMessage, 'id' | 'read'>) => {
  try {
    const conversationId = getConversationId(message.sender, message.recipient);
    const messagesRef = ref(database, `directMessages/${conversationId}/messages`);
    const newMessageRef = push(messagesRef);
    
    await set(newMessageRef, {
      ...message,
      read: false
    });
    
    // Update conversation metadata
    const conversationRef = ref(database, `directMessages/${conversationId}`);
    await update(conversationRef, {
      lastMessage: message.content,
      lastMessageTime: message.timestamp,
      participants: [message.sender, message.recipient]
    });
    
    return newMessageRef.key;
  } catch (error) {
    console.error('Error sending direct message:', error);
    return null;
  }
};

// Get a conversation ID (always same for any two users regardless of who sends)
export const getConversationId = (user1: string, user2: string) => {
  return [user1, user2].sort().join('_');
};

// Get messages for a specific conversation
export const getConversationMessages = (user1: string, user2: string, callback: (messages: DirectMessage[]) => void) => {
  const conversationId = getConversationId(user1, user2);
  const messagesRef = ref(database, `directMessages/${conversationId}/messages`);
  
  onValue(messagesRef, (snapshot) => {
    const messages: DirectMessage[] = [];
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      messages.push({
        id: childSnapshot.key,
        ...message
      });
    });
    
    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);
    callback(messages);
  });
};

// Get all conversations for a user
export const getUserConversations = (username: string, callback: (conversations: any[]) => void) => {
  const conversationsRef = ref(database, 'directMessages');
  
  onValue(conversationsRef, (snapshot) => {
    const conversations: any[] = [];
    snapshot.forEach((childSnapshot) => {
      const convo = childSnapshot.val();
      // Only include conversations where the user is a participant
      if (convo.participants && convo.participants.includes(username)) {
        const otherUser = convo.participants.find((p: string) => p !== username);
        conversations.push({
          id: childSnapshot.key,
          otherUser,
          lastMessage: convo.lastMessage,
          lastMessageTime: convo.lastMessageTime
        });
      }
    });
    
    // Sort by most recent message
    conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    callback(conversations);
  });
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId: string, username: string) => {
  try {
    const messagesRef = ref(database, `directMessages/${conversationId}/messages`);
    const snapshot = await get(messagesRef);
    
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      // Only mark messages from the other user as read
      if (message.sender !== username && !message.read) {
        update(child(messagesRef, childSnapshot.key!), { read: true });
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
};

// Make an apology post
export const makeApology = async (username: string): Promise<boolean> => {
  try {
    // Create an apology post
    const apologyPost: Omit<Post, 'id' | 'likes' | 'comments'> = {
      content: `${username} is sooo so sorry! ${username} did a bad thing! ${username} will be better! ${username} is sorry!`,
      author: username,
      timestamp: Date.now(),
      isApology: true
    };
    
    // Add the apology post
    await addPost(apologyPost);
    
    // Update user's cancellation status (forgiven but still flagged)
    await updateUserCancellationStatus(username);
    
    return true;
  } catch (error) {
    console.error('Error posting apology:', error);
    return false;
  }
};

// Update user's cancellation status after apology
export const updateUserCancellationStatus = async (username: string): Promise<void> => {
  try {
    const userRef = ref(database, `users/${username}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      await update(userRef, {
        lastApology: Date.now()
      });
    }
  } catch (error) {
    console.error('Error updating user status:', error);
  }
};

// Get user status (for checking cancellation)
export const getUserStatus = async (username: string): Promise<User | null> => {
  try {
    const userRef = ref(database, `users/${username}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as User;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user status:', error);
    return null;
  }
}; 