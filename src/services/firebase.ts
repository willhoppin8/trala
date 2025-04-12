import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, update, increment, remove, query, orderByChild } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCKE2myj5Cdpme0BMvpeJSbeKKmEN51Vsw",
  authDomain: "puzzler-23312.firebaseapp.com",
  projectId: "puzzler-23312",
  storageBucket: "puzzler-23312.appspot.com",
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

// Post interface
export interface Post {
  id?: string;
  content: string;
  author: string;
  timestamp: number;
  likes?: number;
  imageUrl?: string;
  comments?: Comment[];
}

// Comment interface
export interface Comment {
  id?: string;
  author: string;
  content: string;
  timestamp: number;
}

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