import React, { useState, useEffect, useRef } from 'react';
import { 
  DirectMessage, 
  GroupChat as GroupChatType,
  GroupMessage,
  sendDirectMessage, 
  getConversationMessages, 
  getUserConversations,
  getUserGroupChats,
  markMessagesAsRead,
  markGroupMessagesAsRead,
  getConversationId,
  getUsers,
  User,
  getGroupMessages,
  sendGroupMessage,
  createGroupChat,
  addUserToGroup,
  removeUserFromGroup
} from '../services/firebase';
import './DirectMessages.css';
import ProfilePicture from './ProfilePicture';

interface DirectMessagesProps {
  username: string;
  initialRecipient?: string | null;
  initialGroupId?: string | null;
  userProfilePicture?: string;
  setInMobileChatView?: (isInView: boolean) => void;
  navigateBack?: () => void;
  switchToGroups?: (initialGroupId: string) => void;
}

// Define a unified conversation type for the UI
interface UnifiedConversation {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageTime: number;
  members?: string[];
  creator?: string;
}

const DirectMessages: React.FC<DirectMessagesProps> = ({ 
  username, 
  initialRecipient, 
  initialGroupId,
  userProfilePicture,
  setInMobileChatView,
  navigateBack,
  switchToGroups
}) => {
  const [directConversations, setDirectConversations] = useState<any[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChatType[]>([]);
  const [unifiedConversations, setUnifiedConversations] = useState<UnifiedConversation[]>([]);
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isActiveGroup, setIsActiveGroup] = useState<boolean>(false);
  const [activeGroupData, setActiveGroupData] = useState<GroupChatType | null>(null);
  
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  
  const [messageText, setMessageText] = useState('');
  const [users, setUsers] = useState<{[username: string]: User}>({});
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessageRecipient, setNewMessageRecipient] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  // Check if we're on a mobile device
  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth <= 768;
      setIsMobileView(isMobile);
      
      // Only set mobile chat view when in an actual conversation, not the list
      if (setInMobileChatView) {
        // Only activate mobile chat view when in a conversation with someone
        setInMobileChatView(isMobile && !!activeChatId);
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
  }, [activeChatId, setInMobileChatView]);

  useEffect(() => {
    // Get all users
    getUsers((allUsers) => {
      const usersMap: {[username: string]: User} = {};
      allUsers.forEach(user => {
        usersMap[user.username] = user;
      });
      setUsers(usersMap);
    });
    
    // Get all direct conversations for this user
    getUserConversations(username, setDirectConversations);
    
    // Get all group chats for this user
    getUserGroupChats(username, setGroupChats);
  }, [username]);

  // Combine direct conversations and group chats into a unified list
  useEffect(() => {
    const unified: UnifiedConversation[] = [
      ...directConversations.map(convo => ({
        id: convo.id,
        name: convo.otherUser,
        isGroup: false,
        lastMessage: convo.lastMessage || '',
        lastMessageTime: convo.lastMessageTime || Date.now()
      })),
      ...groupChats.map(group => ({
        id: group.id || '',
        name: group.name,
        isGroup: true,
        lastMessage: group.lastMessage || `${group.members.length} members`,
        lastMessageTime: group.lastMessageTime || group.createdAt,
        members: group.members,
        creator: group.creator
      }))
    ];
    
    // Sort by most recent message
    unified.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    setUnifiedConversations(unified);
  }, [directConversations, groupChats]);

  // When a chat is selected, get the appropriate messages
  useEffect(() => {
    if (!activeChatId) return;
    
    if (isActiveGroup) {
      // Load group messages
      getGroupMessages(activeChatId, (messages) => {
        setGroupMessages(messages);
        // Force scroll after messages load
        setTimeout(scrollToBottom, 300);
      });
      markGroupMessagesAsRead(activeChatId, username);
      
      // Set active group data
      const groupData = groupChats.find(g => g.id === activeChatId) || null;
      setActiveGroupData(groupData);
    } else {
      // Load direct messages
      const otherUser = unifiedConversations.find(c => c.id === activeChatId)?.name || '';
      getConversationMessages(username, otherUser, (messages) => {
        setDirectMessages(messages);
        // Force scroll after messages load
        setTimeout(scrollToBottom, 300);
      });
      
      // Mark messages as read
      markMessagesAsRead(activeChatId, username);
    }
    
    // Notify parent about mobile chat view
    if (isMobileView && setInMobileChatView) {
      setInMobileChatView(true);
    }
  }, [activeChatId, isActiveGroup, username, unifiedConversations, groupChats, isMobileView, setInMobileChatView]);

  // Add touch event effects for iOS scrolling
  useEffect(() => {
    // Find the messages container
    const messagesContainer = document.querySelector('.dm-messages');
    if (!messagesContainer) return;
    
    // Enable momentum scrolling manually for iOS
    const handleTouchStart = (e: Event) => {
      // This prevents other touch events from interfering
      e.stopPropagation();
    };
    
    messagesContainer.addEventListener('touchstart', handleTouchStart);
    
    return () => {
      messagesContainer.removeEventListener('touchstart', handleTouchStart);
    };
  }, [activeChatId, directMessages, groupMessages]);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [directMessages, groupMessages]);

  // Set initial recipient or group if provided
  useEffect(() => {
    if (initialRecipient) {
      // Find the conversation with this recipient
      const conversationId = getConversationId(username, initialRecipient);
      setActiveChatId(conversationId);
      setIsActiveGroup(false);
      
      // Make sure we have this conversation in our list
      setDirectMessageUser(initialRecipient);
    } else if (initialGroupId) {
      setActiveChatId(initialGroupId);
      setIsActiveGroup(true);
    }
  }, [initialRecipient, initialGroupId, username]);
  
  // Set up a direct message with a user if they're not already in our conversations
  const setDirectMessageUser = (recipient: string) => {
    // Check if this user already exists in conversations
    const conversationId = getConversationId(username, recipient);
    const existingConvo = directConversations.find(c => c.id === conversationId);
    
    if (!existingConvo && recipient !== username) {
      // If not found and valid recipient, create a new conversation structure
      const newConvo = {
        id: conversationId,
        otherUser: recipient,
        lastMessage: "",
        lastMessageTime: Date.now()
      };
      
      setDirectConversations(prev => [...prev, newConvo]);
    }
    
    setActiveChatId(conversationId);
    setIsActiveGroup(false);
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      try {
        // Try smooth scrolling first
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
        
        // For iOS, also apply a manual scroll as backup
        const messagesContainer = document.querySelector('.dm-messages');
        if (messagesContainer) {
          setTimeout(() => {
            // Add extra scroll padding to make sure the last message is well above the input
            messagesContainer.scrollTop = messagesContainer.scrollHeight + 100;
          }, 100);
        }
      } catch (error) {
        // Fallback to direct scrolling if smooth scrolling fails
        const messagesContainer = document.querySelector('.dm-messages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight + 100;
        }
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !activeChatId) return;
    
    if (isActiveGroup) {
      // Send group message
      const newMessage = {
        sender: username,
        content: messageText,
        timestamp: Date.now()
      };
      
      sendGroupMessage(activeChatId, newMessage).then(() => {
        setMessageText('');
        scrollToBottom();
      });
    } else {
      // Send direct message
      const recipient = unifiedConversations.find(c => c.id === activeChatId)?.name || '';
      const newMessage = {
        sender: username,
        recipient: recipient,
        content: messageText,
        timestamp: Date.now()
      };
      
      sendDirectMessage(newMessage).then(() => {
        setMessageText('');
        scrollToBottom();
      });
    }
  };

  const handleStartNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessageRecipient || newMessageRecipient === username) return;
    
    setDirectMessageUser(newMessageRecipient);
    setShowNewMessage(false);
    setNewMessageRecipient('');
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newGroupName.trim() || (showCreateGroup && selectedMembers.length === 0)) return;
    
    // Handle two different group creation scenarios:
    if (showCreateGroup) {
      // Creating a brand new group with multiple members
      createGroupChat(newGroupName, username, selectedMembers).then((groupId) => {
        if (groupId) {
          setActiveChatId(groupId);
          setIsActiveGroup(true);
          setShowCreateGroup(false);
          setNewGroupName('');
          setSelectedMembers([]);
        }
      });
    } else {
      // Creating a group from an existing direct message conversation
      const recipient = unifiedConversations.find(c => c.id === activeChatId && !c.isGroup)?.name;
      if (recipient) {
        const members = [username, recipient];
        createGroupChat(newGroupName, username, members).then((groupId) => {
          if (groupId) {
            setActiveChatId(groupId);
            setIsActiveGroup(true);
            setShowCreateGroup(false);
            setNewGroupName('');
          }
        });
      }
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMember || !activeChatId || !isActiveGroup) return;
    
    addUserToGroup(activeChatId, newMember).then((success) => {
      if (success && activeGroupData) {
        // Update active group members locally
        const updatedGroup = { 
          ...activeGroupData, 
          members: [...activeGroupData.members, newMember] 
        };
        setActiveGroupData(updatedGroup);
        
        // Update in the groups list
        setGroupChats(prev => prev.map(group => 
          group.id === activeChatId ? updatedGroup : group
        ));
        
        setShowAddMember(false);
        setNewMember('');
      }
    });
  };

  const handleRemoveMember = (memberToRemove: string) => {
    if (!activeChatId || !isActiveGroup || !activeGroupData) return;
    
    removeUserFromGroup(activeChatId, memberToRemove, username).then((success) => {
      if (success) {
        // Update active group members locally
        const updatedMembers = activeGroupData.members.filter(m => m !== memberToRemove);
        const updatedGroup = { ...activeGroupData, members: updatedMembers };
        setActiveGroupData(updatedGroup);
        
        // Update in the groups list
        setGroupChats(prev => prev.map(group => 
          group.id === activeChatId ? updatedGroup : group
        ));
      }
    });
  };

  const handleBackButton = () => {
    if (isMobileView && activeChatId) {
      // In mobile view, go back to conversation list
      setActiveChatId(null);
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
  const showSidebar = !isMobileView || !activeChatId;
  const showMainChat = !isMobileView || activeChatId;

  const getActiveChatName = () => {
    const conversation = unifiedConversations.find(c => c.id === activeChatId);
    return conversation?.name || '';
  };

  return (
    <div className={`dm-container ${isMobileView && activeChatId ? 'mobile-view' : ''}`}>
      {showSidebar && (
        <div className="dm-sidebar">
          <div className="dm-header">
            <h3>Messages</h3>
            <div className="dm-header-actions">
              <button 
                className="new-message-btn"
                onClick={() => setShowNewMessage(true)}
              >
                New Message
              </button>
              <button 
                className="new-group-btn"
                onClick={() => {
                  setShowCreateGroup(true);
                  setShowNewMessage(false);
                }}
              >
                New Group
              </button>
            </div>
          </div>
          
          {showNewMessage && (
            <form onSubmit={handleStartNewChat} className="new-message-form">
              <select
                value={newMessageRecipient}
                onChange={(e) => setNewMessageRecipient(e.target.value)}
                required
              >
                <option value="">Select a user</option>
                {Object.keys(users)
                  .filter(user => user !== username)
                  .map(user => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))
                }
              </select>
              <button type="submit">Start Chat</button>
            </form>
          )}
          
          {showCreateGroup && (
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
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowCreateGroup(false)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={!newGroupName || selectedMembers.length === 0}>
                  Create Group
                </button>
              </div>
            </form>
          )}
          
          <div className="conversation-list">
            {unifiedConversations.length === 0 ? (
              <p className="no-conversations">No conversations yet</p>
            ) : (
              unifiedConversations.map(convo => (
                <div 
                  key={convo.id} 
                  className={`conversation-item ${activeChatId === convo.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveChatId(convo.id);
                    setIsActiveGroup(convo.isGroup);
                  }}
                >
                  {convo.isGroup ? (
                    <div className="group-avatar">👥</div>
                  ) : (
                    <ProfilePicture
                      imageUrl={users[convo.name]?.profilePictureUrl}
                      username={convo.name}
                      size="medium"
                    />
                  )}
                  <div className="conversation-info">
                    <div className="conversation-name">
                      {convo.name}
                      {convo.isGroup && <span className="group-indicator">Group</span>}
                    </div>
                    <div className="conversation-preview">
                      {convo.lastMessage}
                    </div>
                  </div>
                  <div className="conversation-time">
                    {formatDate(convo.lastMessageTime)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {showMainChat && (
        <div className="dm-main">
          {activeChatId ? (
            <>
              <div className="dm-chat-header">
                {isMobileView && (
                  <button 
                    className="back-btn"
                    onClick={handleBackButton}
                  >
                    ← Back
                  </button>
                )}
                
                {isActiveGroup ? (
                  <div className="group-avatar large">👥</div>
                ) : (
                  <ProfilePicture
                    imageUrl={users[getActiveChatName()]?.profilePictureUrl}
                    username={getActiveChatName()}
                    size="small"
                    className="dm-chat-avatar-img"
                  />
                )}
                
                <div className="dm-chat-info">
                  <div className="dm-chat-name">{getActiveChatName()}</div>
                  {isActiveGroup && activeGroupData && (
                    <div className="group-members-count">
                      {activeGroupData.members.length} members
                    </div>
                  )}
                </div>
                
                <div className="dm-chat-actions">
                  {!isActiveGroup && (
                    <button 
                      className="create-group-btn"
                      onClick={() => setShowCreateGroup(true)}
                      title="Create a group chat with this user"
                    >
                      👥 Create Group
                    </button>
                  )}
                  
                  {isActiveGroup && (
                    <button 
                      className="manage-members-btn"
                      onClick={() => setShowAddMember(!showAddMember)}
                    >
                      {showAddMember ? 'Cancel' : 'Add Member'}
                    </button>
                  )}
                </div>
              </div>
              
              {!isActiveGroup && showCreateGroup && (
                <form onSubmit={handleCreateGroup} className="create-group-form">
                  <input
                    type="text"
                    placeholder="Group Name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                  />
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => setShowCreateGroup(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit">Create</button>
                  </div>
                </form>
              )}
              
              {isActiveGroup && showAddMember && activeGroupData && (
                <form onSubmit={handleAddMember} className="add-member-form">
                  <select
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                    required
                  >
                    <option value="">Select a user</option>
                    {Object.keys(users)
                      .filter(user => 
                        user !== username && 
                        !activeGroupData.members.includes(user)
                      )
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
              
              {isActiveGroup && activeGroupData && (
                <div className="group-members">
                  {activeGroupData.members.map(member => (
                    <div key={member} className="group-member">
                      <ProfilePicture
                        imageUrl={users[member]?.profilePictureUrl}
                        username={member}
                        size="small"
                      />
                      <span>{member}</span>
                      {/* Only show remove button for creator or self */}
                      {(activeGroupData.creator === username || member === username) && member !== activeGroupData.creator && (
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
              )}
              
              <div className="dm-messages">
                {isActiveGroup ? (
                  // Display group messages
                  groupMessages.map((message, index) => (
                    <div 
                      key={message.id || index} 
                      className={`dm-message ${message.sender === username ? 'sent' : 'received'}`}
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
                      <div className="dm-message-content">
                        {message.content}
                      </div>
                      <div className="dm-message-time">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  ))
                ) : (
                  // Display direct messages
                  directMessages.map((message, index) => (
                    <div 
                      key={message.id || index} 
                      className={`dm-message ${message.sender === username ? 'sent' : 'received'}`}
                    >
                      {message.sender !== username && (
                        <ProfilePicture
                          imageUrl={users[message.sender]?.profilePictureUrl}
                          username={message.sender}
                          size="small"
                          className="message-avatar"
                        />
                      )}
                      <div className="dm-message-content">
                        {message.content}
                      </div>
                      <div className="dm-message-time">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  ))
                )}
                {/* Add extra space at the bottom */}
                <div className="message-end-spacer" style={{ height: '40px' }}></div>
                <div ref={messagesEndRef} />
              </div>
              
              <form onSubmit={handleSendMessage} className="dm-input">
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
            <div className="dm-empty-state">
              <div className="dm-empty-icon">💬</div>
              <h3>Select a conversation</h3>
              <p>Choose an existing conversation or start a new one</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DirectMessages; 