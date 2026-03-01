import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, useTheme, Portal } from 'react-native-paper';
import { ConversationList } from '../../../components/chat/ConversationList';
import { useRouter } from 'expo-router';
import { Conversation } from '../../../types/chat';
import { chatService } from '../../../lib/chatService';
import { supabase } from '../../../supabaseClient';
import { useIsFocused } from '@react-navigation/native';
import { useAuthStore } from '../../../store/useAuthStore';
import { useUnreadMessagesStore } from '../../../store/useUnreadMessagesStore';
import LoginRequiredModal from '../../../components/auth/LoginRequiredModal';

export default function MessagesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const isFocused = useIsFocused();
  const { user } = useAuthStore();
  const { fetchUnreadCounts, incrementUnreadCount } = useUnreadMessagesStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const lastRefreshTime = useRef<number>(Date.now());
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loadConversations = useCallback(
    async (force = false) => {
      try {
        setError(null);
        const data = await chatService.getConversations();
        setConversations(data);
        await fetchUnreadCounts();
        lastRefreshTime.current = Date.now();
      } catch (error) {
        console.error('Error loading conversations:', error);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    },
    [fetchUnreadCounts]
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await chatService.deleteConversation(conversationId);
        setConversations((prevConversations) =>
          prevConversations.filter((conv) => conv.id !== conversationId)
        );
        await fetchUnreadCounts();
      } catch (error) {
        console.error('Error deleting conversation:', error);
        Alert.alert('Error', 'Failed to delete conversation');
      }
    },
    [fetchUnreadCounts]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setShowLoginModal(true);
      return;
    }

    // Initial load
    loadConversations(true);

    // Only set up real-time subscription when screen is focused
    if (!isFocused) return;

    const channel = supabase.channel('messages').on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        const conversationId = payload.new.conversation_id;

        // Check if the conversation is deleted for the current user
        const { data: conversation } = await supabase
          .from('conversations')
          .select('creator_id, deleted_by_creator, deleted_by_participant')
          .eq('id', conversationId)
          .single();

        if (conversation) {
          const isCreator = conversation.creator_id === user.id;
          const isDeleted = isCreator
            ? conversation.deleted_by_creator
            : conversation.deleted_by_participant;

          // Only update if the conversation is not deleted for this user
          if (!isDeleted) {
            // Update the unread count
            incrementUnreadCount(conversationId);

            // Debounce the conversation list update
            if (refreshTimeoutRef.current) {
              clearTimeout(refreshTimeoutRef.current);
            }

            // Only refresh if it's been more than 2 seconds since the last refresh
            const now = Date.now();
            if (now - lastRefreshTime.current > 2000) {
              refreshTimeoutRef.current = setTimeout(() => {
                loadConversations(false);
              }, 1000);
            }
          }
        }
      }
    );

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to real-time updates');
      }
    });

    // Set up a periodic refresh for unread counts
    const refreshInterval = setInterval(() => {
      if (isFocused) {
        fetchUnreadCounts();
      }
    }, 10000); // Increased to 10 seconds to reduce server load

    // Cleanup when screen loses focus or unmounts
    return () => {
      console.log('Unsubscribing from real-time updates');
      channel.unsubscribe();
      clearInterval(refreshInterval);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isFocused, user, loadConversations, fetchUnreadCounts, incrementUnreadCount]);

  const handleSelectConversation = (conversation: Conversation) => {
    router.push({
      pathname: '/ChatRoom',
      params: {
        id: conversation.id,
        conversation: JSON.stringify(conversation),
      },
    });
  };

  if (!user) {
    return (
      <>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.surfaceVariant }]}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
              Messages
            </Text>
          </View>
          <View style={styles.centerContent}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Please sign in to view messages
            </Text>
          </View>
        </View>

        <Portal>
          <LoginRequiredModal
            visible={showLoginModal}
            onDismiss={() => setShowLoginModal(false)}
            action="custom"
            customTitle="Login Required"
            customMessage="You need to be logged in to view messages"
          />
        </Portal>
      </>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.surfaceVariant }]}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
            Messages
          </Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.surfaceVariant }]}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
            Messages
          </Text>
        </View>
        <ConversationList
          conversations={conversations}
          loading={loading}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </View>

      <Portal>
        <LoginRequiredModal
          visible={showLoginModal}
          onDismiss={() => setShowLoginModal(false)}
          action="custom"
          customTitle="Login Required"
          customMessage="You need to be logged in to view messages"
        />
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});
