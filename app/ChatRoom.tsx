import React, { useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Keyboard,
} from "react-native";
import { useTheme, Text, Menu } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { ChatMessage } from "../components/chat/ChatMessage";

import { ChatInput } from "../components/chat/ChatInput";
import { UserInfoModal } from "../components/chat/UserInfoModal";
import { chatService } from "../lib/chatService";
import { Message, Conversation } from "../types/chat";
import { GroupedMessage, groupMessages, formatDateSeparator } from "../utils/messageUtils";
import { supabase } from "../supabaseClient";
import Header from "../components/layout/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useUnreadMessagesStore } from "../store/useUnreadMessagesStore";
import { useBlockedUsers } from '../lib/hooks/useBlockedUsers';
import { formatPrice } from '../utils/format';
import { getCloudinaryUrl } from '../lib/cloudinary';
import { Image as ExpoImage } from "expo-image";
import ProfileImage from "../components/ui/ProfileImage";

import { PLACEHOLDER_BLURHASH } from '@/constants/images';
const MemoizedChatMessage = memo(ChatMessage);

export default function ChatRoom() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  
  // Navigation params
  const conversationId = params.id as string;
  const conversationParam = params.conversation as string;
  const postId = params.postId as string;
  const sellerId = params.sellerId as string;
  const sellerName = params.sellerName as string;
  const sellerAvatar = params.sellerAvatar as string;
  const postTitle = params.postTitle as string;
  const postImage = params.postImage as string;
  const postPrice = params.postPrice as string;
  const postCurrency = params.postCurrency as string;

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [failedMessages, setFailedMessages] = useState<Set<string>>(new Set());
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockingLoading, setBlockingLoading] = useState(false);
  const [canSendMessages, setCanSendMessages] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<string | null>(null);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const { clearUnreadCount } = useUnreadMessagesStore();
  const { isUserBlocked, canMessageUser, refreshBlockedUsers } = useBlockedUsers();

  // Constants
  const INITIAL_MESSAGES_COUNT = 15;
  const MESSAGES_PER_PAGE = 10;

  // Determine if this is a new conversation (from PostDetails) or existing (from messages)
  const isNewConversation = useMemo(() => {
    return !conversationId && postId && sellerId;
  }, [conversationId, postId, sellerId]);

  // Initialize conversation based on navigation source
  useEffect(() => {
    if (isNewConversation) {
      // New conversation from PostDetails
      const tempConversation: Conversation = {
        id: 'temp-' + Date.now(),
        creator_id: '',
        participant_id: sellerId,
        post_id: postId,
        created_at: new Date().toISOString(),
        last_activity_date: new Date().toISOString(),
        deleted_by_creator: false,
        deleted_by_participant: false,
        post_title: postTitle,
        post_image: postImage, // This is now an image ID
        post_price: parseFloat(postPrice) || 0,
        post_status: 'active',
        other_user_name: sellerName,
        other_user_display_name: sellerName,
        other_user_profile_image_id: sellerAvatar,
        other_user_is_verified: false,
        other_user_type: 'person',
        last_message: null,
        unread_count: 0
      };
      setConversation(tempConversation);
    } else if (conversationParam) {
      // Existing conversation from messages list
      try {
        const existingConversation = JSON.parse(conversationParam);
        setConversation(existingConversation);
      } catch (error) {
        console.error('Error parsing conversation:', error);
        Alert.alert('Error', 'Invalid conversation data');
      }
    }
  }, [isNewConversation, conversationParam, postId, sellerId, sellerName, sellerAvatar, postTitle, postImage, postPrice]);

  // Load current user and initial data
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Error', 'Please sign in to continue');
          return;
        }
        setCurrentUser(user);

        if (isNewConversation) {
          // For new conversations, just set loading to false
          setLoading(false);
          setHasMoreMessages(false);
          
          // Scroll to bottom for new conversations
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        } else if (conversation) {
          // For existing conversations, load messages and check permissions
          await loadMessages(conversation.id);
          await checkUserPermissions(user.id, conversation);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        setLoading(false);
      }
    };

    if (conversation) {
      initializeChat();
    }
  }, [conversation, isNewConversation]);

  // Load messages for existing conversation
  const loadMessages = async (convId: string) => {
    try {
      const messagesData = await chatService.getMessages(convId, INITIAL_MESSAGES_COUNT);
      setMessages(messagesData);
      
      if (messagesData.length > 0) {
        setOldestMessageTimestamp(messagesData[0].created_at);
        setHasMoreMessages(messagesData.length === INITIAL_MESSAGES_COUNT);
      }
      
      // Mark messages as read when entering the chat
      await chatService.markMessagesAsRead(convId);

      // Scroll to bottom after loading messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Check user permissions (blocking, etc.)
  const checkUserPermissions = async (userId: string, conv: Conversation) => {
    try {
      const otherUserId = conv.creator_id === userId ? conv.participant_id : conv.creator_id;
      
      // Check if user is blocked
      const blocked = await isUserBlocked(otherUserId);
      setIsBlocked(blocked);
      
      // Check if user can message
      const canMessage = await canMessageUser(otherUserId);
      setCanSendMessages(canMessage);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  // Load older messages for pagination
  const loadOlderMessages = async () => {
    if (!conversation || isLoadingOlderMessages || !hasMoreMessages || !oldestMessageTimestamp) return;

    setIsLoadingOlderMessages(true);
    try {
      const olderMessages = await chatService.getMessages(
        conversation.id,
        MESSAGES_PER_PAGE,
        oldestMessageTimestamp
      );

      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
        setOldestMessageTimestamp(olderMessages[0].created_at);
        setHasMoreMessages(olderMessages.length === MESSAGES_PER_PAGE);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !conversation || sendingMessage) return;

    const messageContent = newMessage.trim();
    let actualConversationId = conversation.id;

    // Create conversation if this is a new conversation
    if (isNewConversation && conversation.id.startsWith('temp-')) {
      try {
        const newConversation = await chatService.createConversation(postId, sellerId);
        actualConversationId = newConversation.id;
        
        // Update conversation state with real data
        const updatedConversation: Conversation = {
          ...conversation,
          id: newConversation.id,
          creator_id: currentUser?.id || '',
          created_at: newConversation.created_at,
          last_activity_date: newConversation.updated_at || newConversation.created_at,
        };
        setConversation(updatedConversation);
      } catch (error) {
        console.error('Failed to create conversation:', error);
        Alert.alert('Error', 'Failed to create conversation. Please try again.');
        return;
      }
    }

    // Create temporary message for optimistic update
    const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage: Message = {
      id: tempMessageId,
      conversation_id: actualConversationId,
      sender_id: currentUser?.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      read_at: null,
      sender: {
        id: currentUser?.id,
        username: currentUser?.username || currentUser?.email,
        profile_image_id: currentUser?.profile_image_id
      },
    };

    // Clear input and add temporary message
    setNewMessage("");
    setSendingMessage(true);
    setMessages(prev => [...prev, tempMessage]);

    // Scroll to bottom to show the new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Cleanup timeout for temporary message
    const cleanupTimeout = setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
    }, 10000);

    try {
      // Send the actual message
      const sentMessage = await chatService.sendMessage(actualConversationId, messageContent);
      
      // Clear timeout and replace temporary message
      clearTimeout(cleanupTimeout);
      setMessages(prev => {
        const withoutTemp = prev.filter(msg => msg.id !== tempMessageId);
        return [...withoutTemp, sentMessage];
      });

      // Scroll to bottom to show the sent message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      clearTimeout(cleanupTimeout);
      console.error('Error sending message:', error);
      setFailedMessages(prev => new Set(prev).add(tempMessageId));
      setNewMessage(messageContent);
      Alert.alert('Error', 'Failed to send message. Tap the message to retry.');
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, conversation, currentUser, sendingMessage, isNewConversation, postId, sellerId]);

  // Retry failed message
  const handleRetryMessage = useCallback(async (failedMessage: Message) => {
    if (!conversation || sendingMessage) return;

    try {
      setFailedMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(failedMessage.id);
        return newSet;
      });

      setSendingMessage(true);
      const sentMessage = await chatService.sendMessage(conversation.id, failedMessage.content);
      
      setMessages(prev => prev.map(msg => 
        msg.id === failedMessage.id ? sentMessage : msg
      ));

      // Scroll to bottom to show the retried message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error retrying message:', error);
      setFailedMessages(prev => new Set(prev).add(failedMessage.id));
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  }, [conversation, sendingMessage]);

  // Block/Unblock user
  const handleBlock = useCallback(async () => {
    if (!conversation || !currentUser || blockingLoading) return;

    setBlockingLoading(true);
    try {
      const otherUserId = conversation.creator_id === currentUser.id 
        ? conversation.participant_id 
        : conversation.creator_id;

      await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUser.id,
          blocked_id: otherUserId
        });

      setIsBlocked(true);
      await refreshBlockedUsers();
      Alert.alert('User Blocked', 'You will no longer receive messages from this user.');
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    } finally {
      setBlockingLoading(false);
    }
  }, [conversation, currentUser, blockingLoading, refreshBlockedUsers]);

  const handleUnblock = useCallback(async () => {
    if (!conversation || !currentUser || blockingLoading) return;

    setBlockingLoading(true);
    try {
      const otherUserId = conversation.creator_id === currentUser.id 
        ? conversation.participant_id 
        : conversation.creator_id;

      await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', otherUserId);

      setIsBlocked(false);
      await refreshBlockedUsers();
      Alert.alert('User Unblocked', 'You can now receive messages from this user.');
    } catch (error) {
      console.error('Error unblocking user:', error);
      Alert.alert('Error', 'Failed to unblock user. Please try again.');
    } finally {
      setBlockingLoading(false);
    }
  }, [conversation, currentUser, blockingLoading, refreshBlockedUsers]);



  // Realtime subscription for messages
  useEffect(() => {
    if (!conversation || conversation.id.startsWith('temp-')) return;

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Don't add if it's our own message (already added optimistically)
          if (newMessage.sender_id !== currentUser?.id) {
            setMessages(prev => [...prev, newMessage]);
            
            // Mark the new message as read immediately if user is viewing the chat
            chatService.markMessagesAsRead(conversation.id).catch(console.error);
            
            // Auto-scroll to bottom for new incoming messages
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          
          // Update the message in our state (for read status changes)
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id 
                ? { ...msg, ...updatedMessage }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversation?.id, currentUser?.id]);



  // Clear unread count when entering chat and set up periodic read status updates
  useEffect(() => {
    if (conversation && !conversation.id.startsWith('temp-')) {
      clearUnreadCount(conversation.id);
      
      // Mark messages as read periodically while user is viewing the chat
      const interval = setInterval(() => {
        chatService.markMessagesAsRead(conversation.id).catch(console.error);
      }, 5000); // Every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [conversation?.id, clearUnreadCount]);





  // Memoized data
  const memoizedMessages = useMemo(() => {
    return groupMessages(messages);
  }, [messages]);

  // Keyboard listener to auto-scroll when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      // Auto-scroll to bottom when keyboard appears
      if (flatListRef.current && memoizedMessages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return () => {
      keyboardDidShowListener?.remove();
    };
  }, [memoizedMessages.length]);

  const renderMessage = useCallback(({ item }: { item: GroupedMessage }) => {
    if (item.type === 'date-separator') {
      return (
        <View style={styles.dateSeparator}>
          <Text variant="labelSmall" style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>
            {formatDateSeparator((item.data as { date: string }).date)}
          </Text>
        </View>
      );
    }

    const message = item.data as Message;
    const isOwnMessage = message.sender_id === currentUser?.id;
    const hasFailed = failedMessages.has(message.id);
    
    return (
      <ChatMessage
        message={message}
        isOwnMessage={isOwnMessage}
        hasFailed={hasFailed}
        onRetry={() => hasFailed ? handleRetryMessage(message) : undefined}
        onLongPress={() => console.log('Long pressed message:', message.id)}
        isFirstInGroup={item.isFirstInGroup}
        isLastInGroup={item.isLastInGroup}
      />
    );
  }, [currentUser?.id, failedMessages, handleRetryMessage, theme.colors.onSurfaceVariant]);

  const keyExtractor = useCallback((item: GroupedMessage) => {
    if (item.type === 'date-separator') {
      return `date-${(item.data as { date: string }).date}`;
    }
    return (item.data as Message).id;
  }, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 60,
    offset: 60 * index,
    index,
  }), []);



  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Header title="Chat" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text 
            variant="bodyMedium" 
            style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}
          >
            Loading conversation...
          </Text>
        </View>
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Header title="Chat" />
        <Text>Conversation not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
         behavior={Platform.OS === "ios" ? "padding" : "height"}
         style={{ flex: 1 }}
         keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <Header
          title={conversation.other_user_name || "Chat"}
          rightElement={
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setShowUserInfo(true)}
              >
                <MaterialCommunityIcons
                  name="account-circle"
                  size={24}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setMenuVisible(true)}
                  >
                    <MaterialCommunityIcons
                      name="dots-vertical"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  </TouchableOpacity>
                }
              >
                {isBlocked ? (
                  <Menu.Item
                    onPress={() => {
                      handleUnblock();
                      setMenuVisible(false);
                    }}
                    title="Unblock User"
                    leadingIcon="account-check"
                    disabled={blockingLoading}
                  />
                ) : (
                  <Menu.Item
                    onPress={() => {
                      handleBlock();
                      setMenuVisible(false);
                    }}
                    title="Block User"
                    leadingIcon="account-remove"
                    disabled={blockingLoading}
                  />
                )}
              </Menu>
            </View>
          }
        />
        
        {conversation?.post_title && (
          <View style={styles.postInfoContainer}>
            <ExpoImage
              source={{ uri: conversation?.post_image ? getCloudinaryUrl(conversation.post_image, 'posts') || '' : '' }}
              style={[
                styles.postImage,
                conversation?.post_status !== 'active' && { opacity: 0.5 }
              ]}
              contentFit="cover"
              transition={300}
              placeholder={PLACEHOLDER_BLURHASH}
              cachePolicy="memory-disk"
            />
            <View style={styles.postTitleContainer}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurface }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {conversation?.post_title}
              </Text>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                {formatPrice(conversation?.post_price || 0, postCurrency || 'USD')}
              </Text>
              {conversation?.post_status !== 'active' && (
                <Text
                  variant="bodySmall"
                  style={{ 
                    color: theme.colors.error,
                    fontStyle: 'italic'
                  }}
                >
                  This post is no longer available
                </Text>
              )}
            </View>
          </View>
        )}
        
        <FlatList
          ref={flatListRef}
          data={memoizedMessages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messageList}
          contentContainerStyle={[
            styles.messageListContent,
            { backgroundColor: theme.colors.background },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={getItemLayout}
          automaticallyAdjustKeyboardInsets={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => {
            // Auto-scroll to bottom when new content is added
            if (flatListRef.current && memoizedMessages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          }}
          onLayout={() => {
            // Auto-scroll to bottom when layout changes (e.g., keyboard appears)
            if (flatListRef.current && memoizedMessages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingOlderMessages}
              onRefresh={hasMoreMessages ? loadOlderMessages : undefined}
              enabled={hasMoreMessages}
            />
          }
        />
        
        {!isBlocked && canSendMessages && (
          <ChatInput
            value={newMessage}
            onChangeText={setNewMessage}
            onSend={handleSendMessage}
            onAttachment={() => console.log('Attachment pressed')}
            isSending={sendingMessage}
            disabled={!canSendMessages}
            placeholder="Type a message..."
            maxLength={1000}
          />
        )}
        
        {(isBlocked || !canSendMessages) && (
          <View
            style={[
              styles.blockedMessageContainer,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.surfaceVariant,
              },
            ]}
          >
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
                fontStyle: 'italic',
                paddingVertical: 20,
              }}
            >
              {isBlocked 
                ? "You have blocked this user. You can view the conversation but cannot send new messages."
                : "You cannot send messages to this user."
              }
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <UserInfoModal
        visible={showUserInfo}
        onClose={() => setShowUserInfo(false)}
        conversation={conversation}
        blurhash={PLACEHOLDER_BLURHASH}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 60, // Space above the header
  },
  loadingText: {
    marginTop: 16,
    textAlign: "center",
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
  },
  postInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  postImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  postTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  blockedMessageContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
  },
  dateSeparator: {
    padding: 8,
    alignItems: 'center',
  },
  dateText: {
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 8,
  },
});
