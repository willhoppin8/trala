import React, { useState, useEffect, useRef } from 'react';
import { 
  GroupChat as GroupChatType,
  GroupMessage, 
  sendGroupMessage, 
  getGroupMessages, 
  getUserGroupChats,
  markGroupMessagesAsRead,
  getUsers,
  User,
  createGroupChat,
  addUserToGroup,
  removeUserFromGroup
} from '../services/firebase';
import './GroupChat.css';
import ProfilePicture from './ProfilePicture';

interface GroupChatProps {
  username: string;
  initialGroupId?: string | null;
  userProfilePicture?: string;
  setInMobileChatView?: (isInView: boolean) => void;
  navigateBack?: () => void;
}

const GroupChatComponent: React.FC<GroupChatProps> = ({ 
  username, 
  initialGroupId, 
  userProfilePicture,
  setInMobileChatView,
  navigateBack
}) => {
  const [groupChats, setGroupChats] = useState<GroupChatType[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [users, setUsers] = useState<{[username: string]: User}>({});
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState('');
  const [currentGroup, setCurrentGroup] = useState<GroupChatType | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  // Check if we're on a mobile device
  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth <= 768;
      setIsMobileView(isMobile);
      
      // Only set mobile chat view when in an actual conversation, not the list
      if (setInMobileChatView) {
        setInMobileChatView(isMobile && !!currentGroupId);
      }
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
      // Make sure to reset mobile chat view state when component unmounts
      if (setInMobileChatView) {
        setInMobileChatView(false);
      }
    };
  }, [currentGroupId, setInMobileChatView]);

  useEffect(() => {
    // Get all users
    getUsers((allUsers) => {
      const usersMap: {[username: string]: User} = {};
      allUsers.forEach(user => {
        usersMap[user.username] = user;
      });
      setUsers(usersMap);
    });
    
    // Get all group chats for this user
    getUserGroupChats(username, setGroupChats);
  }, [username]);

  useEffect(() => {
    // When a group is selected, get the messages
    if (currentGroupId) {
      getGroupMessages(currentGroupId, setMessages);
      markGroupMessagesAsRead(currentGroupId, username);
      
      // Get current group details
      const group = groupChats.find(g => g.id === currentGroupId) || null;
      setCurrentGroup(group);
      
      // Notify parent about mobile chat view
      if (isMobileView && setInMobileChatView) {
        setInMobileChatView(true);
      }
    } else {
      // When no group is selected, make sure we're not in mobile chat view
      if (setInMobileChatView) {
        setInMobileChatView(false);
      }
    }
  }, [currentGroupId, groupChats, username, isMobileView, setInMobileChatView]);

  useEffect(() => {
    // Scroll to bottom of messages
    scrollToBottom();
  }, [messages]);

  // Set initial group if provided
  useEffect(() => {
    if (initialGroupId) {
      setCurrentGroupId(initialGroupId);
    }
  }, [initialGroupId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !currentGroupId) return;
    
    const newMessage = {
      sender: username,
      content: messageText,
      timestamp: Date.now()
    };
    
    sendGroupMessage(currentGroupId, newMessage).then(() => {
      setMessageText('');
      scrollToBottom();
    });
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    
    createGroupChat(newGroupName, username, selectedMembers).then((groupId) => {
      if (groupId) {
        setCurrentGroupId(groupId);
        setShowNewGroup(false);
        setNewGroupName('');
        setSelectedMembers([]);
      }
    });
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMember || !currentGroupId) return;
    
    addUserToGroup(currentGroupId, newMember).then((success) => {
      if (success) {
        // Update current group members locally
        if (currentGroup) {
          const updatedGroup = { 
            ...currentGroup, 
            members: [...currentGroup.members, newMember] 
          };
          setCurrentGroup(updatedGroup);
          
          // Update in the groups list
          setGroupChats(prev => prev.map(group => 
            group.id === currentGroupId ? updatedGroup : group
          ));
        }
        
        setShowAddMember(false);
        setNewMember('');
      }
    });
  };

  const handleRemoveMember = (memberToRemove: string) => {
    if (!currentGroupId || !currentGroup) return;
    
    removeUserFromGroup(currentGroupId, memberToRemove, username).then((success) => {
      if (success) {
        // Update current group members locally
        const updatedMembers = currentGroup.members.filter(m => m !== memberToRemove);
        const updatedGroup = { ...currentGroup, members: updatedMembers };
        setCurrentGroup(updatedGroup);
        
        // Update in the groups list
        setGroupChats(prev => prev.map(group => 
          group.id === currentGroupId ? updatedGroup : group
        ));
      }
    });
  };

  const handleBackButton = () => {
    if (isMobileView && currentGroupId) {
      // In mobile view, go back to group list
      setCurrentGroupId(null);
      // Notify parent that we're no longer in mobile chat view
      if (setInMobileChatView) {
        setInMobileChatView(false);
      }
    } else if (navigateBack) {
      // If we're not in a chat or on desktop, use the parent's navigation
      navigateBack();
    }
  };

  const toggleMemberSelection = (user: string) => {
    if (selectedMembers.includes(user)) {
      setSelectedMembers(prev => prev.filter(member => member !== user));
    } else {
      setSelectedMembers(prev => [...prev, user]);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // In mobile view, we only show one section at a time
  const showSidebar = !isMobileView || !currentGroupId;
  const showMainChat = !isMobileView || currentGroupId;

  return (
    <div className={`group-chat-container ${isMobileView && currentGroupId ? 'mobile-view' : ''}`}>
      {showSidebar && (
        <div className="group-chat-sidebar">
          <div className="group-chat-header">
            <h3>Group Chats</h3>
            <div className="group-chat-header-actions">
              <button 
                className="new-group-btn"
                onClick={() => setShowNewGroup(true)}
              >
                Create Group
              </button>
            </div>
          </div>
          
          {showNewGroup && (
            <form onSubmit={handleCreateGroup} className="new-group-form">
              <input
                type="text"
                placeholder="Group Name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                required
              />
              <div className="members-selection">
                <label>Select Members:</label>
                <div className="members-list">
                  {Object.keys(users)
                    .filter(user => user !== username)
                    .map(user => (
                      <div 
                        key={user} 
                        className={`member-option ${selectedMembers.includes(user) ? 'selected' : ''}`}
                        onClick={() => toggleMemberSelection(user)}
                      >
                        <ProfilePicture
                          imageUrl={users[user]?.profilePictureUrl}
                          username={user}
                          size="small"
                        />
                        <span>{user}</span>
                        {selectedMembers.includes(user) && <span className="checkmark">✓</span>}
                      </div>
                    ))
                  }
                </div>
              </div>
              <button type="submit" disabled={!newGroupName || selectedMembers.length === 0}>
                Create Group
              </button>
            </form>
          )}
          
          <div className="group-list">
            {groupChats.length === 0 ? (
              <p className="no-groups">No group chats yet</p>
            ) : (
              groupChats.map(group => (
                <div 
                  key={group.id} 
                  className={`group-item ${currentGroupId === group.id ? 'active' : ''}`}
                  onClick={() => setCurrentGroupId(group.id || null)}
                >
                  <div className="group-icon">👥</div>
                  <div className="group-info">
                    <div className="group-name">
                      {group.name}
                    </div>
                    <div className="group-preview">
                      {group.lastMessage || `${group.members.length} members`}
                    </div>
                  </div>
                  <div className="group-time">
                    {group.lastMessageTime ? formatDate(group.lastMessageTime) : formatDate(group.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {showMainChat && (
        <div className="group-chat-main">
          {currentGroupId && currentGroup ? (
            <>
              <div className="group-chat-header">
                {isMobileView && (
                  <button 
                    className="back-btn"
                    onClick={handleBackButton}
                  >
                    ← Back
                  </button>
                )}
                <div className="group-icon large">👥</div>
                <div className="group-info">
                  <div className="group-name">{currentGroup.name}</div>
                  <div className="group-members-count">
                    {currentGroup.members.length} members
                  </div>
                </div>
                <div className="group-actions">
                  <button 
                    className="manage-members-btn"
                    onClick={() => setShowAddMember(!showAddMember)}
                  >
                    {showAddMember ? 'Cancel' : 'Add Member'}
                  </button>
                </div>
              </div>
              
              {showAddMember && (
                <form onSubmit={handleAddMember} className="add-member-form">
                  <select
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                    required
                  >
                    <option value="">Select a user</option>
                    {Object.keys(users)
                      .filter(user => user !== username && !currentGroup.members.includes(user))
                      .map(user => (
                        <option key={user} value={user}>
                          {user}
                        </option>
                      ))
                    }
                  </select>
                  <button type="submit">Add to Group</button>
                </form>
              )}
              
              <div className="group-members">
                {currentGroup.members.map(member => (
                  <div key={member} className="group-member">
                    <ProfilePicture
                      imageUrl={users[member]?.profilePictureUrl}
                      username={member}
                      size="small"
                    />
                    <span>{member}</span>
                    {/* Only show remove button for creator or self */}
                    {(currentGroup.creator === username || member === username) && member !== currentGroup.creator && (
                      <button 
                        className="remove-member-btn"
                        onClick={() => handleRemoveMember(member)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="group-messages">
                {messages.map((message, index) => (
                  <div 
                    key={message.id || index} 
                    className={`group-message ${message.sender === username ? 'sent' : 'received'}`}
                  >
                    {message.sender !== username && (
                      <div className="message-sender-info">
                        <ProfilePicture
                          imageUrl={users[message.sender]?.profilePictureUrl}
                          username={message.sender}
                          size="small"
                          className="message-avatar"
                        />
                        <span className="message-sender">{message.sender}</span>
                      </div>
                    )}
                    <div className="group-message-content">
                      {message.content}
                    </div>
                    <div className="group-message-time">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              <form onSubmit={handleSendMessage} className="group-input">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <button type="submit">Send</button>
              </form>
            </>
          ) : (
            <div className="group-empty-state">
              <div className="group-empty-icon">👥</div>
              <h3>Select a group chat</h3>
              <p>Choose an existing group or create a new one</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupChatComponent; 