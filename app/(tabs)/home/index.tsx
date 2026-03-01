import { View, FlatList, StyleSheet, RefreshControl, ListRenderItem, Pressable } from 'react-native';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Text, useTheme, ActivityIndicator, Button } from 'react-native-paper';
import { supabase } from '../../../supabaseClient';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PostCard from '../../../components/posts/PostCard';
import FilterSection, { FilterOptions, DEFAULT_YEAR_RANGE } from '../../../components/posts/FilterSection';
import { Post } from '../../../types/database';
import { getCloudinaryUrl } from '../../../lib/cloudinary';
import { useCountryStore } from '../../../store/useCountryStore';
import { COUNTRY_DATA } from '../../../constants/CountryData';
import { POSTS_PER_PAGE } from '../../../constants/pagination';

export default function Home() {
  // Theme and State
  const theme = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterOptions | null>(null);

  const country = useCountryStore((state) => state.country);
  const countryName = country ? COUNTRY_DATA[country].name : null;

  // Fetch initial posts without filters
  const fetchInitialPosts = useCallback(async (start = 0, shouldAccumulate = false) => {
    try {
      setError(null);
      if (!shouldAccumulate) {
        setLoading(true);
      }

      let query = supabase
        .from('posts')
        .select(`
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
        `, { count: 'exact' })
        .eq('status', 'active');

      // Filter by country if selected
      if (countryName) {
        query = query.eq('location->>country', countryName);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(start, start + POSTS_PER_PAGE - 1);

      const { data, error: supabaseError, count } = await query;

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const total = count || 0;
      setTotalCount(total);
      setHasMore(start + POSTS_PER_PAGE < total);
      
      // Accumulate data if loading more, otherwise replace
      setPosts(prev => shouldAccumulate ? [...prev, ...(data || [])] : (data || []));

      if (__DEV__) {
        console.log('Initial fetch:', {
          totalPosts: total,
          fetchedPosts: data?.length,
          start,
          shouldAccumulate,
          countryFilter: countryName
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching posts');
      console.error('Error fetching initial posts:', err);
    } finally {
      setLoading(false);
    }
  }, [countryName]);

  // Fetch posts with filters
  const fetchFilteredPosts = useCallback(async (start = 0, filters: FilterOptions, shouldAccumulate = false) => {
    try {
      setError(null);
      if (!shouldAccumulate) {
        setLoading(true);
      }
      
      let query = supabase
        .from('posts')
        .select(`
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
        `, { count: 'exact' })
        .eq('status', 'active');

      // Apply filters
      if (filters.listingType) {
        query = query.eq('listing_type', filters.listingType);
      }

      if (filters.city) {
        query = query.eq('location->>city', filters.city);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.subcategory) {
        query = query.eq('subcategory', filters.subcategory);
      }

      if (filters.priceRange.min) {
        query = query.gte('price', parseFloat(filters.priceRange.min));
      }
      if (filters.priceRange.max) {
        query = query.lte('price', parseFloat(filters.priceRange.max));
      }

      if (filters.make.trim()) {
        query = query.ilike('details->>make', `%${filters.make.trim()}%`);
      }
      if (filters.model.trim()) {
        query = query.ilike('details->>model', `%${filters.model.trim()}%`);
      }

      const yearFilterActive =
        filters.category === 'vehicles' &&
        (filters.yearRange.min > DEFAULT_YEAR_RANGE.min || filters.yearRange.max < DEFAULT_YEAR_RANGE.max);

      if (yearFilterActive) {
        query = query
          .gte('details->>year', filters.yearRange.min.toString())
          .lte('details->>year', filters.yearRange.max.toString());
      }

      const { data, error: supabaseError, count } = await query
        .order('created_at', { ascending: false })
        .range(start, start + POSTS_PER_PAGE - 1);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const total = count || 0;
      setTotalCount(total);
      setHasMore(start + POSTS_PER_PAGE < total);
      
      // Accumulate data if loading more, otherwise replace
      setPosts(prev => shouldAccumulate ? [...prev, ...(data || [])] : (data || []));

      if (__DEV__) {
        console.log('Filtered fetch:', {
          totalPosts: total,
          fetchedPosts: data?.length,
          filters,
          start,
          shouldAccumulate
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching posts');
      console.error('Error fetching filtered posts:', err);
    } finally {
      if (!shouldAccumulate) {
        setLoading(false);
      }
    }
  }, [countryName]);

  // Handle search
  const handleSearch = useCallback((searchText: string) => {
    // Clear any active filters when searching
    setActiveFilters(null);
    setSearchQuery(searchText);
    setPage(0);
    setHasMore(true);
    
    const currentCountryName = countryName; // Capture current country value
    
    const searchPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        let searchQuery = supabase
          .from('posts')
          .select(`
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
          `, { count: 'exact' })
          .eq('status', 'active')
          .ilike('title', `%${searchText}%`);

        // Filter by country if selected
        if (currentCountryName) {
          searchQuery = searchQuery.eq('location->>country', currentCountryName);
        }

        const { data, error: supabaseError, count } = await searchQuery
          .order('created_at', { ascending: false })
          .range(0, POSTS_PER_PAGE - 1);

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        const total = count || 0;
        setTotalCount(total);
        setHasMore(POSTS_PER_PAGE < total);
        setPosts(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while searching posts');
        console.error('Error searching posts:', err);
      } finally {
        setLoading(false);
      }
    };
    
    searchPosts();
  }, [countryName]);

  // Handle filter changes
  const handleFilter = useCallback(async (filters: FilterOptions) => {
    setActiveFilters(filters);
    setSearchQuery('');
    setPage(0);
    setHasMore(true);
    
    const fetchFilteredPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const start = 0;

        let query = supabase
        .from('posts')
        .select(`
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
        `, { count: 'exact' })
          .eq('status', 'active');

        // Filter by country if selected
        if (countryName) {
          query = query.eq('location->>country', countryName);
        }

        // Apply filters
        if (filters.listingType) {
          query = query.eq('listing_type', filters.listingType);
        }
        if (filters.city) {
          query = query.eq('location->>city', filters.city);
        }
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.subcategory) {
          query = query.eq('subcategory', filters.subcategory);
        }
        if (filters.make.trim()) {
          query = query.ilike('details->>make', `%${filters.make.trim()}%`);
        }
        if (filters.model.trim()) {
          query = query.ilike('details->>model', `%${filters.model.trim()}%`);
        }
        if (filters.priceRange.min) {
          query = query.gte('price', parseFloat(filters.priceRange.min));
        }
        if (filters.priceRange.max) {
          query = query.lte('price', parseFloat(filters.priceRange.max));
        }

        const yearFilterActive =
          filters.category === 'vehicles' &&
          (filters.yearRange.min > DEFAULT_YEAR_RANGE.min || filters.yearRange.max < DEFAULT_YEAR_RANGE.max);

        if (yearFilterActive) {
          query = query
            .gte('details->>year', filters.yearRange.min.toString())
            .lte('details->>year', filters.yearRange.max.toString());
        }

        const { data, error: supabaseError, count } = await query
          .order('created_at', { ascending: false })
          .range(start, start + POSTS_PER_PAGE - 1);

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        const total = count || 0;
        setTotalCount(total);
        setHasMore(start + POSTS_PER_PAGE < total);
        setPosts(data || []);

        if (__DEV__) {
          console.log('Filtered fetch:', {
            totalPosts: total,
            fetchedPosts: data?.length,
            filters,
            start
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while fetching posts');
        console.error('Error fetching filtered posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredPosts();
  }, [countryName]);

  // Handle reset
  const handleReset = useCallback(() => {
    setSearchQuery('');
    setActiveFilters(null);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    fetchInitialPosts(0, false).finally(() => setLoading(false));
  }, [fetchInitialPosts]);

  // Initial load - fetch all posts without filters
  useEffect(() => { // useEffect will run twice on initial load due to REACT sctrict mode
    let mounted = true;

    const loadInitialData = async () => {
      if (mounted) {
        await fetchInitialPosts(0, false);
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, [fetchInitialPosts]);

  // Reload posts when country changes
  useEffect(() => {
    if (countryName) {
      // Reset state and reload posts when country changes
      setPage(0);
      setHasMore(true);
      setActiveFilters(null);
      setSearchQuery('');
      fetchInitialPosts(0, false);
    }
  }, [countryName, fetchInitialPosts]);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    setPage(0);
    
    const fetchData = async () => {
      if (activeFilters) {
        await fetchFilteredPosts(0, activeFilters, false);
      } else {
        await fetchInitialPosts(0, false);
      }
      setRefreshing(false);
    };
    
    fetchData();
  }, [refreshing, activeFilters, fetchFilteredPosts, fetchInitialPosts]);

  // Load more posts
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    const nextStart = (page + 1) * POSTS_PER_PAGE;
    if (nextStart >= totalCount) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    setPage(prev => prev + 1);

    const loadMore = async () => {
      if (activeFilters) {
        await fetchFilteredPosts(nextStart, activeFilters, true);
      } else {
        await fetchInitialPosts(nextStart, true);
      }
      setLoadingMore(false);
    };

    loadMore();
  }, [loadingMore, hasMore, page, totalCount, activeFilters, fetchFilteredPosts, fetchInitialPosts]);

  // Pad posts to ensure consistent two-column layout
  const numColumns = 2;
  const paddedPosts = posts.length % numColumns === 0 ? posts : [...posts, ...Array(numColumns - (posts.length % numColumns)).fill(null)];

  // Memoized Components
  const ListHeaderComponent = useMemo(() => (
    <View style={styles.headerSpacer} />
  ), []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Pressable onPress={handleReset}>
        <MaterialCommunityIcons 
          name="shopping" 
          size={48} 
          color={theme.colors.onSurfaceVariant} 
        />
      </Pressable>
      <Text variant="titleMedium" style={styles.emptyText}>
        {loading ? "Loading posts..." : (searchQuery || activeFilters) ? "No posts found" : "No posts available"}
      </Text>
      <Text style={styles.emptySubtext}>
        {(searchQuery || activeFilters) ? 
          "Try adjusting your search or filters" : 
          "Be the first to post something!"
        }
      </Text>
      {!searchQuery && !activeFilters && (
        <Button 
          mode="contained" 
          onPress={() => router.replace('/(tabs)/create')}
          style={styles.emptyButton}
        >
          Create Post
        </Button>
      )}
    </View>
  ), [theme.colors.onSurfaceVariant, loading, searchQuery, activeFilters, handleReset]);

  const ListFooterComponent = useCallback(() => {
    if (posts.length === 0) return null;
    
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingMoreText}>Loading more posts...</Text>
        </View>
      );
    }

    if (!hasMore) {
      return (
        <View style={styles.endOfListContainer}>
          <MaterialCommunityIcons 
            name="check-circle" 
            size={24} 
            color={theme.colors.primary}
          />
          <Text style={[styles.endOfListText, { color: theme.colors.primary }]}>
            You're all caught up!
          </Text>
          <Text style={styles.endOfListSubtext}>
            Pull to refresh for new listings
          </Text>
        </View>
      );
    }

    return null;
  }, [loadingMore, hasMore, theme.colors.primary, posts.length]);

  const renderItem: ListRenderItem<Post> = useCallback(({ item }) => (
    <View style={styles.postCardWrapper}>
      <PostCard post={item} cardStyle={styles.postCard} />
    </View>
  ), []);

  const keyExtractor = useCallback((item: Post | null, index: number) => item ? item.id : `empty-${index}`, []);

  // Error State
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.errorContainer }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        <Button mode="contained" onPress={handleRefresh}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FilterSection 
        onSearch={handleSearch} 
        onFilter={handleFilter}
        onLogoPress={handleReset}
      />
      <FlatList
        data={paddedPosts}
        renderItem={(info) =>
          info.item ? renderItem({ ...info, item: info.item }) : <View style={[styles.postCardWrapper, { backgroundColor: 'transparent' }]} />
        }
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        numColumns={numColumns}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
      <Button 
        mode="contained" 
        onPress={() => router.push('/(tabs)/create')}
        style={styles.fab}
        icon="plus"
      >
        Post
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 32,
  },
  headerSpacer: {
    height: 8, // Reduced from 64 to minimize top spacing
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    borderRadius: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 8,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingMoreText: {
    color: '#666',
  },
  endOfListContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 16,
  },
  endOfListText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  endOfListSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    padding: 16,
  },
  columnWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postCardWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  postCard: {
    width: '100%',
  },
}); 