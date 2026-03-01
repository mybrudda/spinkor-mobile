import { create } from 'zustand';
import { supabase } from '../supabaseClient';

interface UnreadMessagesState {
  unreadCounts: { [conversationId: string]: number };
  totalUnread: number;
  setUnreadCount: (conversationId: string, count: number) => void;
  incrementUnreadCount: (conversationId: string) => void;
  clearUnreadCount: (conversationId: string) => void;
  clearAllUnreadCounts: () => void;
  fetchUnreadCounts: () => Promise<void>;
  isUpdating: boolean;
}

export const useUnreadMessagesStore = create<UnreadMessagesState>((set, get) => ({
  unreadCounts: {},
  totalUnread: 0,
  isUpdating: false,

  setUnreadCount: async (conversationId: string, count: number) => {
    // Prevent concurrent updates
    if (get().isUpdating) return;

    try {
      set({ isUpdating: true });

      // Check if the conversation is deleted for the current user before updating
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data: conversation } = await supabase
        .from('conversations')
        .select('creator_id, deleted_by_creator, deleted_by_participant')
        .eq('id', conversationId)
        .single();

      if (!conversation) return;

      const isCreator = conversation.creator_id === currentUser.user.id;
      const isDeleted = isCreator
        ? conversation.deleted_by_creator
        : conversation.deleted_by_participant;

      // Only update count if the conversation is not deleted for this user
      if (!isDeleted) {
        set((state) => {
          const newUnreadCounts = {
            ...state.unreadCounts,
            [conversationId]: count,
          };
          return {
            unreadCounts: newUnreadCounts,
            totalUnread: Object.values(newUnreadCounts).reduce((a, b) => a + b, 0),
          };
        });
      }
    } finally {
      set({ isUpdating: false });
    }
  },

  incrementUnreadCount: async (conversationId: string) => {
    // Prevent concurrent updates
    if (get().isUpdating) return;

    try {
      set({ isUpdating: true });

      // Check if the conversation is deleted for the current user before incrementing
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data: conversation } = await supabase
        .from('conversations')
        .select('creator_id, deleted_by_creator, deleted_by_participant')
        .eq('id', conversationId)
        .single();

      if (!conversation) return;

      const isCreator = conversation.creator_id === currentUser.user.id;
      const isDeleted = isCreator
        ? conversation.deleted_by_creator
        : conversation.deleted_by_participant;

      // Only increment count if the conversation is not deleted for this user
      if (!isDeleted) {
        set((state) => {
          const currentCount = state.unreadCounts[conversationId] || 0;
          const newUnreadCounts = {
            ...state.unreadCounts,
            [conversationId]: currentCount + 1,
          };
          return {
            unreadCounts: newUnreadCounts,
            totalUnread: Object.values(newUnreadCounts).reduce((a, b) => a + b, 0),
          };
        });
      }
    } finally {
      set({ isUpdating: false });
    }
  },

  clearUnreadCount: (conversationId: string) => {
    set((state) => {
      const { [conversationId]: _, ...newUnreadCounts } = state.unreadCounts;
      return {
        unreadCounts: newUnreadCounts,
        totalUnread: Object.values(newUnreadCounts).reduce((a, b) => a + b, 0),
      };
    });
  },

  clearAllUnreadCounts: () => {
    set({
      unreadCounts: {},
      totalUnread: 0,
    });
  },

  fetchUnreadCounts: async () => {
    // Prevent concurrent updates
    if (get().isUpdating) return;

    try {
      set({ isUpdating: true });

      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      // Get conversations and check deletion status
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(
          'id, creator_id, participant_id, deleted_by_creator, deleted_by_participant, unread_count_creator, unread_count_participant'
        )
        .or(`creator_id.eq.${currentUser.user.id},participant_id.eq.${currentUser.user.id})`);

      if (error) throw error;
      if (!conversations) return;

      const countsMap: { [key: string]: number } = {};
      let total = 0;

      conversations.forEach((conv) => {
        // Check if the conversation is deleted by the current user
        const isCreator = conv.creator_id === currentUser.user.id;
        const isDeleted = isCreator ? conv.deleted_by_creator : conv.deleted_by_participant;

        // Only add unread count if the conversation is not deleted by the current user
        if (!isDeleted) {
          const count = isCreator ? conv.unread_count_creator : conv.unread_count_participant;
          if (count > 0) {
            countsMap[conv.id] = count;
            total += count;
          }
        }
      });

      // Update state in a single operation
      set({
        unreadCounts: countsMap,
        totalUnread: total,
      });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    } finally {
      set({ isUpdating: false });
    }
  },
}));
