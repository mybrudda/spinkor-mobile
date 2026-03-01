import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../../../components/layout/Header';
import PostCard from '../../../components/posts/PostCard';
import { savedPostsService } from '../../../lib/savedPostsService';
import { useAuthStore } from '../../../store/useAuthStore';
import { Post } from '../../../types/database';

export default function SavedPostsScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedPosts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSavedPosts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const posts = await savedPostsService.getSavedPosts(user.id);
      setSavedPosts(posts);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSavedPosts();
    setRefreshing(false);
  };

  const handlePostUnsave = (postId: string) => {
    // Remove the unsaved post from the local state
    setSavedPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard post={item} onUnsave={handlePostUnsave} />
  );

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Saved Posts" />
        <View style={styles.content}>
          <MaterialCommunityIcons
            name="account-lock"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Login Required
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Please login to view your saved posts.
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Saved Posts" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Saved Posts" />
      {savedPosts.length === 0 ? (
        <View style={styles.content}>
          <MaterialCommunityIcons
            name="bookmark-outline"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            No Saved Posts
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Start saving posts by tapping the bookmark icon on any post.
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
});
