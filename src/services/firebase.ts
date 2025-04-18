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
// Reference to the group chats collection
const groupChatsRef = ref(database, 'groupChats');

// Poll option interface
export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[]; // Track who voted for this option
}

// Post interface
export interface Post {
  id?: string;
  content: string;
  author: string;
  timestamp: number;
  likes?: number;
  dislikes?: number;
  imageUrl?: string;
  isGif?: boolean;
  comments?: Comment[];
  isApology?: boolean;
  isPoll?: boolean;
  pollOptions?: {[key: string]: PollOption}; // Changed from PollOption[] to object map
  pollQuestion?: string;
  pollEndTime?: number; // Optional end time for the poll
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
  profilePictureUrl?: string; // URL to the user's profile picture
  phoneNumber?: string; // Phone number for SMS notifications
  receiveNotifications?: boolean; // Whether user wants to receive notifications
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

// Group Chat interface
export interface GroupChat {
  id?: string;
  name: string;
  creator: string;
  members: string[];
  createdAt: number;
  lastMessage?: string;
  lastMessageTime?: number;
  messages?: {[messageId: string]: GroupMessage};
}

// Group Message interface
export interface GroupMessage {
  id?: string;
  sender: string;
  content: string;
  timestamp: number;
  read: {[userId: string]: boolean};
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
export const addPost = async (post: Omit<Post, 'id' | 'likes' | 'dislikes' | 'comments'>) => {
  try {
    // Create post data with required fields, omitting undefined values
    const postData = {
      content: post.content,
      author: post.author,
      timestamp: post.timestamp,
      likes: 0,
      dislikes: 0,
      comments: {}
    };

    // Only add imageUrl if it exists and is not undefined
    if (post.imageUrl) {
      Object.assign(postData, { 
        imageUrl: post.imageUrl,
        isGif: post.isGif || false 
      });
    }
    
    // Add poll data if this is a poll
    if (post.isPoll) {
      Object.assign(postData, {
        isPoll: true,
        pollQuestion: post.pollQuestion,
        pollOptions: post.pollOptions,
        pollEndTime: post.pollEndTime
      });
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

// Dislike a post
export const dislikePost = async (postId: string) => {
  try {
    const postRef = ref(database, `TRALA/${postId}`);
    await update(postRef, {
      dislikes: increment(1)
    });
    return true;
  } catch (error) {
    console.error('Error disliking post:', error);
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

// Upload a profile picture
export const uploadProfilePicture = async (username: string, file: File): Promise<string | null> => {
  try {
    // Create a reference to the file location
    const fileRef = storageRef(storage, `profilePictures/${username}_${Date.now()}`);
    
    // Upload the file
    await uploadBytes(fileRef, file);
    
    // Get the download URL
    const downloadUrl = await getDownloadURL(fileRef);
    
    // Update the user's profile in the database
    await updateUserProfile(username, { profilePictureUrl: downloadUrl });
    
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (username: string, updateData: Partial<User>): Promise<boolean> => {
  try {
    const userRef = ref(database, `users/${username}`);
    await update(userRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};

// Get user profile
export const getUserProfile = async (username: string): Promise<User | null> => {
  try {
    const userRef = ref(database, `users/${username}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as User;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Vote on a poll option
export const votePollOption = async (postId: string, optionId: string, username: string) => {
  try {
    // Get current poll data
    const postRef = ref(database, `TRALA/${postId}`);
    const snapshot = await get(postRef);
    
    if (!snapshot.exists()) {
      console.error('Post not found');
      return false;
    }
    
    const post = snapshot.val();
    
    if (!post.isPoll || !post.pollOptions) {
      console.error('Post is not a poll or has no options');
      return false;
    }
    
    // Find user's previous vote and remove it if exists
    let updatedOptions = {...post.pollOptions};
    
    // Check each option to see if the user has already voted
    let userPreviousVote = null;
    Object.keys(updatedOptions).forEach(key => {
      if (updatedOptions[key].voters && updatedOptions[key].voters.includes(username)) {
        userPreviousVote = key;
      }
    });
    
    // If the user already voted for this option, remove their vote
    if (userPreviousVote === optionId) {
      // Remove user from voters list
      updatedOptions[optionId].voters = updatedOptions[optionId].voters.filter((voter: string) => voter !== username);
      // Decrease vote count
      updatedOptions[optionId].votes = Math.max(0, (updatedOptions[optionId].votes || 0) - 1);
      
      // Update the poll options
      await update(ref(database, `TRALA/${postId}/pollOptions`), updatedOptions);
      return true;
    }
    
    // If the user voted for a different option, remove that vote first
    if (userPreviousVote) {
      // Remove user from voters list
      updatedOptions[userPreviousVote].voters = updatedOptions[userPreviousVote].voters.filter((voter: string) => voter !== username);
      // Decrease vote count
      updatedOptions[userPreviousVote].votes = Math.max(0, (updatedOptions[userPreviousVote].votes || 0) - 1);
    }
    
    // Add the new vote
    if (!updatedOptions[optionId].voters) {
      updatedOptions[optionId].voters = [];
    }
    updatedOptions[optionId].voters.push(username);
    updatedOptions[optionId].votes = (updatedOptions[optionId].votes || 0) + 1;
    
    // Update the poll options
    await update(ref(database, `TRALA/${postId}/pollOptions`), updatedOptions);
    return true;
  } catch (error) {
    console.error('Error voting on poll:', error);
    return false;
  }
};

// Check if a poll has ended
export const isPollEnded = (pollEndTime?: number): boolean => {
  if (!pollEndTime) return false;
  return Date.now() > pollEndTime;
};

// Create a new group chat
export const createGroupChat = async (
  name: string, 
  creator: string, 
  members: string[]
): Promise<string | null> => {
  try {
    // Ensure the creator is included in members
    if (!members.includes(creator)) {
      members.push(creator);
    }
    
    const newGroupChatRef = push(groupChatsRef);
    const groupChat: GroupChat = {
      name,
      creator,
      members,
      createdAt: Date.now()
    };
    
    await set(newGroupChatRef, groupChat);
    return newGroupChatRef.key;
  } catch (error) {
    console.error('Error creating group chat:', error);
    return null;
  }
};

// Send a message to a group chat
export const sendGroupMessage = async (
  groupId: string, 
  message: Omit<GroupMessage, 'id' | 'read'>
): Promise<string | null> => {
  try {
    // Get group members to initialize read status
    const groupRef = ref(database, `groupChats/${groupId}`);
    const groupSnapshot = await get(groupRef);
    
    if (!groupSnapshot.exists()) {
      console.error('Group chat not found');
      return null;
    }
    
    const group = groupSnapshot.val() as GroupChat;
    const readStatus: {[userId: string]: boolean} = {};
    
    // Initialize read status (sender has read their own message)
    group.members.forEach(member => {
      readStatus[member] = member === message.sender;
    });
    
    // Add the message
    const messagesRef = ref(database, `groupChats/${groupId}/messages`);
    const newMessageRef = push(messagesRef);
    
    await set(newMessageRef, {
      ...message,
      read: readStatus
    });
    
    // Update group chat metadata
    await update(groupRef, {
      lastMessage: message.content,
      lastMessageTime: message.timestamp
    });
    
    return newMessageRef.key;
  } catch (error) {
    console.error('Error sending group message:', error);
    return null;
  }
};

// Get messages for a specific group chat
export const getGroupMessages = (
  groupId: string, 
  callback: (messages: GroupMessage[]) => void
) => {
  const messagesRef = ref(database, `groupChats/${groupId}/messages`);
  
  onValue(messagesRef, (snapshot) => {
    const messages: GroupMessage[] = [];
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

// Get all group chats for a user
export const getUserGroupChats = (
  username: string, 
  callback: (groupChats: GroupChat[]) => void
) => {
  onValue(groupChatsRef, (snapshot) => {
    const groupChats: GroupChat[] = [];
    snapshot.forEach((childSnapshot) => {
      const groupChat = childSnapshot.val() as GroupChat;
      
      // Only include group chats where the user is a member
      if (groupChat.members && groupChat.members.includes(username)) {
        groupChats.push({
          id: childSnapshot.key,
          ...groupChat
        });
      }
    });
    
    // Sort by most recent message
    groupChats.sort((a, b) => {
      const timeA = a.lastMessageTime || a.createdAt;
      const timeB = b.lastMessageTime || b.createdAt;
      return timeB - timeA;
    });
    
    callback(groupChats);
  });
};

// Add a user to a group chat
export const addUserToGroup = async (
  groupId: string, 
  username: string
): Promise<boolean> => {
  try {
    const groupRef = ref(database, `groupChats/${groupId}`);
    const snapshot = await get(groupRef);
    
    if (!snapshot.exists()) {
      console.error('Group chat not found');
      return false;
    }
    
    const groupChat = snapshot.val() as GroupChat;
    
    // Check if user is already in the group
    if (groupChat.members.includes(username)) {
      return true; // Already a member
    }
    
    // Add user to members array
    groupChat.members.push(username);
    
    // Update group chat
    await update(groupRef, {
      members: groupChat.members
    });
    
    return true;
  } catch (error) {
    console.error('Error adding user to group:', error);
    return false;
  }
};

// Remove a user from a group chat
export const removeUserFromGroup = async (
  groupId: string, 
  username: string, 
  currentUser: string
): Promise<boolean> => {
  try {
    const groupRef = ref(database, `groupChats/${groupId}`);
    const snapshot = await get(groupRef);
    
    if (!snapshot.exists()) {
      console.error('Group chat not found');
      return false;
    }
    
    const groupChat = snapshot.val() as GroupChat;
    
    // Only the creator or the user themselves can remove a user
    if (groupChat.creator !== currentUser && currentUser !== username) {
      console.error('Not authorized to remove user');
      return false;
    }
    
    // Filter out the user from members array
    const updatedMembers = groupChat.members.filter(member => member !== username);
    
    // Update group chat
    await update(groupRef, {
      members: updatedMembers
    });
    
    return true;
  } catch (error) {
    console.error('Error removing user from group:', error);
    return false;
  }
};

// Mark group messages as read for a user
export const markGroupMessagesAsRead = async (
  groupId: string, 
  username: string
): Promise<boolean> => {
  try {
    const messagesRef = ref(database, `groupChats/${groupId}/messages`);
    const snapshot = await get(messagesRef);
    
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val() as GroupMessage;
      // Only mark unread messages
      if (message.read && !message.read[username]) {
        const updatedRead = {...message.read, [username]: true};
        update(child(messagesRef, childSnapshot.key!), { read: updatedRead });
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error marking group messages as read:', error);
    return false;
  }
};

// Get unread message count for a user across all chats and groups
export const getUnreadMessageCount = async (
  username: string
): Promise<{direct: number, group: number}> => {
  try {
    const counts = { direct: 0, group: 0 };
    
    // Check direct messages
    const dmsSnapshot = await get(dmsRef);
    dmsSnapshot.forEach((convoSnapshot) => {
      const convo = convoSnapshot.val();
      if (convo.participants && convo.participants.includes(username) && convo.messages) {
        Object.values(convo.messages).forEach((msg: any) => {
          if (msg.recipient === username && !msg.read) {
            counts.direct++;
          }
        });
      }
    });
    
    // Check group messages
    const groupsSnapshot = await get(groupChatsRef);
    groupsSnapshot.forEach((groupSnapshot) => {
      const groupData = groupSnapshot.val();
      // Check if the group has messages
      if (groupData.members && 
          groupData.members.includes(username) && 
          groupData.messages) {
        
        // Loop through messages
        Object.values(groupData.messages).forEach((msg: any) => {
          // Check if the message is unread by the current user
          if (msg.read && 
              msg.sender !== username && 
              msg.read[username] === false) {
            counts.group++;
          }
        });
      }
    });
    
    return counts;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return { direct: 0, group: 0 };
  }
}; 