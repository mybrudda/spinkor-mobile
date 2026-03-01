import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, useTheme, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/useAuthStore';
import { supabase } from '../../../supabaseClient';
import PostCard from '../../../components/posts/PostCard';
import { Post } from '../../../types/database';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import Header from '../../../components/layout/Header';
import { POSTS_PER_PAGE } from '../../../constants/pagination';

export default function MyPostsScreen() {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const theme = useTheme();
  const { user } = useAuthStore();

  const fetchUserPosts = useCallback(
    async (start = 0, isRefresh = false) => {
      if (!user) return;

      try {
        if (start >= totalCount && totalCount > 0) {
          setHasMore(false);
          return;
        }

        const { data, error, count } = await supabase
          .from('posts')
          .select(
            `
          *,
          user:user_id (
            id,
            username,
            display_name,
            profile_image_id,
            email,
            user_type,
            is_verified
          )
        `,
            { count: 'exact' }
          )
          .eq('user_id', user.id)
          .neq('status', 'removed')
          .order('created_at', { ascending: false })
          .range(start, start + POSTS_PER_PAGE - 1);

        if (error) throw error;

        const total = count || 0;
        setTotalCount(total);

        const hasMorePosts = start + POSTS_PER_PAGE < total;
        setHasMore(hasMorePosts);

        setUserPosts((prevPosts) => (isRefresh ? data || [] : [...prevPosts, ...(data || [])]));
      } catch (error) {
        console.error('Error fetching posts:', error);
        setHasMore(false);
      }
    },
    [user, page, userPosts.length, totalCount]
  );

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchUserPosts(0, true).finally(() => setLoading(false));
    }
  }, [user, fetchUserPosts]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setPage(0);
    await fetchUserPosts(0, true);
    setRefreshing(false);
  }, [fetchUserPosts, refreshing]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    const nextStart = page * POSTS_PER_PAGE + POSTS_PER_PAGE;

    if (nextStart >= totalCount) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchUserPosts(nextStart);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, totalCount, fetchUserPosts]);

  const handleDelete = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'removed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        return;
      }

      // Remove the post from the local state
      setUserPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
      setTotalCount((prev) => prev - 1);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  }, []);

  const handleUpdate = useCallback((post: Post) => {
    router.push({
      pathname: '/(tabs)/create/create-post',
      params: {
        mode: 'update',
        post: JSON.stringify(post),
      },
    });
  }, []);

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="post-outline"
          size={48}
          color={theme.colors.onSurfaceVariant}
        />
        <Text
          variant="bodyLarge"
          style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
          {loading ? 'Loading posts...' : 'No posts yet'}
        </Text>
      </View>
    ),
    [theme.colors.onSurfaceVariant, loading]
  );

  if (!user) {
    return <LoadingScreen />;
  }

  // Pad userPosts to ensure consistent two-column layout
  const numColumns = 2;
  const paddedUserPosts =
    userPosts.length % numColumns === 0
      ? userPosts
      : [...userPosts, ...Array(numColumns - (userPosts.length % numColumns)).fill(null)];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="My Posts" />
      <FlatList
        data={paddedUserPosts}
        renderItem={({ item }) =>
          item ? (
            <View style={styles.postCardWrapper}>
              <PostCard
                post={item}
                showMenu={true}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                cardStyle={styles.postCard}
              />
            </View>
          ) : (
            <View style={[styles.postCardWrapper, { backgroundColor: 'transparent' }]} />
          )
        }
        keyExtractor={(item, index) => (item ? item.id : `empty-${index}`)}
        contentContainerStyle={styles.listContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingMoreText}>Loading more posts...</Text>
            </View>
          ) : null
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        numColumns={numColumns}
        columnWrapperStyle={styles.columnWrapper}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
  },
  columnWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postCardWrapper: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 4,
  },
  postCard: {
    width: '100%',
  },
});
