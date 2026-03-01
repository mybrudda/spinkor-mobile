import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export function useBlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const { data, error } = await supabase.from('blocked_users').select('blocked_id');

      if (error) throw error;

      setBlockedUsers(data.map((block) => block.blocked_id));
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isUserBlocked = (userId: string) => {
    return blockedUsers.includes(userId);
  };

  const canMessageUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('can_message_user', {
        sender_id: (await supabase.auth.getUser()).data.user?.id,
        receiver_id: userId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking message permission:', error);
      return false;
    }
  };

  return {
    blockedUsers,
    isLoading,
    isUserBlocked,
    canMessageUser,
    refreshBlockedUsers: fetchBlockedUsers,
  };
}
