import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { useTheme, Text, Avatar, IconButton, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../../supabaseClient';
import { useBlockedUsers } from '../../../lib/hooks/useBlockedUsers';
import Header from '../../../components/layout/Header';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProfileImage from '../../../components/ui/ProfileImage';

interface BlockedUser {
  id: string;
  username: string;
  display_name: string;
  profile_image_id: string | null;
  is_verified: boolean;
}

interface BlockedUserResponse {
  blocked_id: string;
  blocked_user: BlockedUser;
}

export default function BlockedUsers() {
  const theme = useTheme();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshBlockedUsers } = useBlockedUsers();

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to view blocked users');
        return;
      }

      const { data, error } = await supabase
        .from('blocked_users')
        .select(
          `
          blocked_id,
          blocked_user:blocked_id (
            id,
            username,
            display_name,
            profile_image_id,
            is_verified
          )
        `
        )
        .eq('blocker_id', user.id);

      if (error) throw error;

      const typedData = data as unknown as BlockedUserResponse[];
      const blockedUsers = typedData.map((item) => item.blocked_user);
      setBlockedUsers(blockedUsers);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      Alert.alert('Error', 'Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to unblock users');
        return;
      }

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) throw error;

      // Update local state
      setBlockedUsers((prev) => prev.filter((user) => user.id !== userId));
      // Refresh blocked users in the hook
      await refreshBlockedUsers();

      Alert.alert('Success', 'User has been unblocked');
    } catch (error) {
      console.error('Error unblocking user:', error);
      Alert.alert('Error', 'Failed to unblock user');
    }
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <View style={[styles.userCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.userInfo}>
        <ProfileImage imageId={item.profile_image_id} size={40} folder="avatars" />
        <View style={styles.userDetails}>
          <View style={styles.nameRow}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              {item.display_name || item.username}
            </Text>
            {item.is_verified && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={20}
                color={theme.colors.primary}
                style={styles.verifiedIcon}
              />
            )}
          </View>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            @{item.username}
          </Text>
        </View>
      </View>
      <IconButton
        icon="account-check"
        size={24}
        onPress={() => handleUnblock(item.id)}
        iconColor={theme.colors.primary}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Blocked Users" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Blocked Users"
        rightElement={
          <IconButton
            icon="refresh"
            size={24}
            onPress={fetchBlockedUsers}
            iconColor={theme.colors.primary}
          />
        }
      />
      {blockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="account-lock"
            size={48}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            No blocked users
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            Users you block won't be able to message you or see your profile
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});
