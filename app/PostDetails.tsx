import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Linking,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import {
  Text,
  Surface,
  useTheme,
  ActivityIndicator,
  Button,
  Divider,
  Chip,
  Portal,
  IconButton,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Carousel from 'react-native-reanimated-carousel';
import Header from '../components/layout/Header';
import { useAuthStore } from '../store/useAuthStore';
import { Image as ExpoImage } from 'expo-image';
import { formatPrice, formatDate } from '../utils/format';
import { Post, CarouselRenderItemInfo } from '../types/database';
import { useSavePost } from '../lib/hooks/useSavePost';
import { Platform } from 'react-native';
import ReportPostModal from '../components/ReportPostModal';
import { getCloudinaryUrl } from '../lib/cloudinary';
import ProfileImage from '../components/ui/ProfileImage';
import LoginRequiredModal from '../components/auth/LoginRequiredModal';
import { PLACEHOLDER_BLURHASH } from '../constants/images';

// Move DetailItem component outside to prevent hook recreation
const DetailItem = ({ label, value }: { label: string; value: string }) => {
  const theme = useTheme();
  return (
    <View style={styles.detailItem}>
      <Text
        variant="bodySmall"
        style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={[styles.detailValue, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
};

export default function PostDetails() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalAction, setLoginModalAction] = useState<'message' | 'save' | 'report'>(
    'message'
  );
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [imageError, setImageError] = useState(false);
  const width = Dimensions.get('window').width;
  const { user } = useAuthStore();
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Memoize filtered images to avoid recalculating on every render
  const filteredImages = React.useMemo(() => {
    if (!post?.image_ids) return [];
    // Convert image IDs to URLs
    return post.image_ids
      .filter((img) => img && img.trim() !== '')
      .map((imgId) => getCloudinaryUrl(imgId, 'posts'))
      .filter((url) => url !== null) as string[];
  }, [post?.image_ids]);

  // Optimize carousel index update callback
  const handleSnapToItem = React.useCallback((index: number) => {
    setCarouselIndex(index);
  }, []);

  // Use shared save post hook
  const { isSaved, saving, handleSavePost } = useSavePost({
    postId: post?.id || '',
    userId: post?.user_id || '',
    showAuthDialog: () => {
      setLoginModalAction('save');
      setShowLoginModal(true);
    },
    showSuccessAlerts: false,
  });

  // Move renderCarouselItem outside to prevent recreation
  const renderCarouselItem = React.useCallback(
    ({ item }: CarouselRenderItemInfo) => (
      <View style={styles.carouselImageContainer}>
        <ExpoImage
          source={{ uri: item }}
          style={styles.carouselImage}
          contentFit="cover"
          transition={300}
          placeholder={PLACEHOLDER_BLURHASH}
          cachePolicy="memory-disk"
          onError={() => setImageError(true)}
        />
        {imageError && (
          <View style={[styles.errorOverlay, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons
              name="image-off"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.imageErrorText, { color: theme.colors.onSurfaceVariant }]}>
              Image unavailable
            </Text>
          </View>
        )}
      </View>
    ),
    [imageError, theme.colors.surfaceVariant, theme.colors.onSurfaceVariant]
  );

  useEffect(() => {
    if (params.post) {
      try {
        const postData = JSON.parse(params.post as string) as Post;
        setPost(postData);
        setImageError(false); // Reset image error state when post changes
        setCarouselIndex(0); // Reset carousel index when post changes
        setLoading(false);
      } catch (error) {
        console.error('Error parsing post data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [params.post]);

  const handleMessageSeller = async () => {
    if (!post?.user?.id) return;

    if (!user) {
      setLoginModalAction('message');
      setShowLoginModal(true);
      return;
    }

    // Prevent self-messaging
    if (user.id === post.user.id) {
      Alert.alert('Cannot Message', 'You cannot message yourself on your own post');
      return;
    }

    try {
      // Check if the seller has blocked the current user
      const { data: isBlocked, error: blockCheckError } = await supabase.rpc('is_user_blocked', {
        blocker_id: post.user.id,
        blocked_id: user.id,
      });

      if (blockCheckError) throw blockCheckError;

      if (isBlocked) {
        Alert.alert('Cannot Message', 'This user has blocked you. You cannot send them a message.');
        return;
      }

      // Check if the current user has blocked the seller
      const { data: hasBlocked, error: hasBlockedError } = await supabase.rpc('is_user_blocked', {
        blocker_id: user.id,
        blocked_id: post.user.id,
      });

      if (hasBlockedError) throw hasBlockedError;

      if (hasBlocked) {
        Alert.alert(
          'Cannot Message',
          'You have blocked this user. Please unblock them to send a message.'
        );
        return;
      }

      // Navigate to chat room
      router.push({
        pathname: '/ChatRoom',
        params: {
          postId: post.id,
          sellerId: post.user.id,
          sellerName: post.user.display_name,
          sellerAvatar: post.user.profile_image_id || '',
          postTitle: post.title,
          postImage: post.image_ids && post.image_ids.length > 0 ? post.image_ids[0] : '',
          postPrice: post.price.toString(),
          postCurrency: post.currency,
        },
      });
    } catch (error) {
      console.error('Error checking block status:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const handleReportPost = () => {
    if (!user) {
      setLoginModalAction('report');
      setShowLoginModal(true);
      return;
    }
    setShowReportDialog(true);
  };

  const openInMaps = () => {
    if (!post) return;
    const address = encodeURIComponent(
      `${post.location.address || ''} ${post.location.city || ''}`.trim()
    );
    const url = Platform.select({
      ios: `maps:0,0?q=${address}`,
      android: `geo:0,0?q=${address}`,
      default: `https://www.google.com/maps/search/?api=1&query=${address}`,
    });
    if (url) Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Header title="Details" />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Details" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
          <Text variant="titleMedium" style={styles.errorText}>
            Post not found
          </Text>
          <Button mode="contained" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  const baseDetailItems: Array<{ label: string; value: string }> = [
    { label: 'Category', value: formatDetailLabel(post.category) },
    { label: 'Subcategory', value: formatDetailLabel(post.subcategory) },
    { label: 'Make', value: post.details?.make || '' },
    { label: 'Model', value: post.details?.model || '' },
    { label: 'Year', value: post.details?.year || '' },
  ];

  const dynamicDetailItems: Array<{ label: string; value: string }> = Object.entries(
    post.details || {}
  )
    .filter(([key]) => !['make', 'model', 'year'].includes(key))
    .map(([key, value]) => ({
      icon: 'check' as IconName,
      label: formatDetailLabel(key),
      value: formatDetailValue(value),
    }))
    .filter((item) => item.value);

  const combinedDetailItems = [...baseDetailItems, ...dynamicDetailItems].filter(
    (item) => item.value
  );
  const detailRows = [];
  for (let i = 0; i < combinedDetailItems.length; i += 2) {
    detailRows.push(combinedDetailItems.slice(i, i + 2));
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Details" />
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}>
          {/* Image Carousel */}
          <View style={[styles.carouselContainer, { backgroundColor: theme.colors.surface }]}>
            {!filteredImages || filteredImages.length === 0 ? (
              <View style={[styles.errorOverlay, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons
                  name="image-off"
                  size={48}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.imageErrorText, { color: theme.colors.onSurfaceVariant }]}>
                  No images available
                </Text>
              </View>
            ) : (
              <>
                <Carousel
                  key={`carousel-${filteredImages.length}`}
                  loop
                  width={width}
                  height={300}
                  data={filteredImages}
                  scrollAnimationDuration={500}
                  renderItem={renderCarouselItem}
                  defaultIndex={0}
                  onSnapToItem={handleSnapToItem}
                />
                {/* Image count indicator */}
                {filteredImages.length > 1 && (
                  <View
                    style={[
                      styles.imageCountContainer,
                      { backgroundColor: theme.colors.surfaceVariant + 'CC' },
                    ]}>
                    <Text style={[styles.imageCountText, { color: theme.colors.onSurfaceVariant }]}>
                      {carouselIndex + 1}/{filteredImages.length}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.content}>
            {/* Title and Save Button */}
            <View style={styles.titleRow}>
              <Text
                variant="titleLarge"
                style={[styles.title, { color: theme.colors.onSurface, fontSize: 20 }]}
                numberOfLines={2}
                ellipsizeMode="tail">
                {post.title}
              </Text>
              <IconButton
                icon={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={24}
                iconColor={isSaved ? theme.colors.error : theme.colors.primary}
                onPress={handleSavePost}
                disabled={saving || user?.id === post.user_id}
                loading={saving}
              />
            </View>
            {/* Price and Listing Type */}
            <View style={styles.priceRow}>
              <Text style={[styles.priceText, { color: theme.colors.onSurface, fontSize: 18 }]}>
                {formatPrice(post.price, post.currency)}
              </Text>
              <Chip
                mode="flat"
                style={[styles.listingTypeChip, { backgroundColor: theme.colors.primaryContainer }]}
                textStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                {post.listing_type === 'rent' ? 'Rent' : 'Sale'}
              </Chip>
            </View>
            {/* Location and Date */}
            <View style={styles.metadataRow}>
              <TouchableOpacity style={styles.metadataItem} onPress={openInMaps}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodyMedium"
                  style={[styles.metadataText, { color: theme.colors.onSurface, fontSize: 13 }]}
                  numberOfLines={1}>
                  {post.location.city}
                  {post.location.address && `, ${post.location.address}`}
                </Text>
              </TouchableOpacity>
            </View>
            <Text
              variant="bodySmall"
              style={[styles.date, { color: theme.colors.onSurfaceVariant, fontSize: 12 }]}>
              Posted on {formatDate(post.created_at)}
            </Text>
            {combinedDetailItems.length > 0 && (
              <>
                <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
                <Text
                  variant="titleMedium"
                  style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: 16 }]}>
                  Item Details
                </Text>
                <View style={styles.detailsGrid}>
                  {detailRows.map((row, rowIndex) => (
                    <View key={`detail-row-${rowIndex}`} style={styles.detailsRow}>
                      {row.map((detail) => (
                        <View
                          key={`${detail.label}-${detail.value}`}
                          style={styles.detailItemContainer}>
                          <DetailItem label={detail.label} value={detail.value} />
                        </View>
                      ))}
                      {row.length === 1 && <View style={styles.detailItemContainer} />}
                    </View>
                  ))}
                </View>
              </>
            )}
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            {/* Description */}
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: 16 }]}>
              Description
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.description, { color: theme.colors.onSurface }]}>
              {post.description}
            </Text>
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            {/* Contact Section */}
            <View style={styles.contactSection}>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: 16 }]}>
                Contact Seller
              </Text>
              <View style={styles.sellerInfo}>
                <View style={{ marginRight: 12 }}>
                  <ProfileImage imageId={post.user?.profile_image_id} size={48} folder="avatars" />
                </View>
                <View style={styles.sellerDetails}>
                  <Text
                    variant="titleMedium"
                    style={[styles.sellerName, { color: theme.colors.onSurface }]}>
                    {post.user?.display_name || 'Unknown Seller'}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.sellerLocation, { color: theme.colors.onSurfaceVariant }]}>
                    {post.location.city}
                  </Text>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  icon="message"
                  onPress={handleMessageSeller}
                  style={styles.messageButton}
                  contentStyle={styles.buttonContent}>
                  Message Seller
                </Button>
                <Button
                  mode="outlined"
                  icon="flag"
                  onPress={handleReportPost}
                  style={[styles.reportButton, { borderColor: theme.colors.error }]}
                  contentStyle={styles.buttonContent}>
                  Report Post
                </Button>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Login Required Modal */}
      <Portal>
        <LoginRequiredModal
          visible={showLoginModal}
          onDismiss={() => setShowLoginModal(false)}
          action={loginModalAction}
        />
      </Portal>

      {/* Report Post Modal */}
      <ReportPostModal
        visible={showReportDialog}
        onDismiss={() => setShowReportDialog(false)}
        postId={post.id}
        reporterId={user?.id || ''}
        postOwnerId={post.user_id}
        postTitle={post.title}
      />
    </>
  );
}

const formatDetailLabel = (label: string) => {
  if (!label) return '';
  return label.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDetailValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    return value
      .map((item) => formatDetailValue(item))
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('value' in record || 'unit' in record) {
      const numericValue = record.value as string | number | undefined;
      const unit = record.unit as string | undefined;
      return [numericValue, unit].filter(Boolean).join(' ').trim();
    }

    return Object.values(record)
      .map((entry) => (typeof entry === 'string' || typeof entry === 'number' ? String(entry) : ''))
      .filter(Boolean)
      .join(', ');
  }

  return String(value);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginVertical: 16,
    textAlign: 'center',
  },
  carouselContainer: {
    position: 'relative',
  },
  carouselImageContainer: {
    flex: 1,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  imageCountContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    // backgroundColor will be set dynamically with theme
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    // color will be set dynamically with theme
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorText: {
    marginTop: 8,
    fontSize: 14,
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceText: {
    fontWeight: 'bold',
  },
  listingTypeChip: {
    height: 32,
    paddingHorizontal: 8,
  },
  metadataRow: {
    marginBottom: 4,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    marginLeft: 4,
  },
  date: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  detailsGrid: {
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  detailItemContainer: {
    flex: 1,
  },
  detailItem: {
    gap: 4,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  description: {
    lineHeight: 20,
    marginBottom: 16,
  },
  contactSection: {
    marginTop: 8,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  sellerLocation: {
    fontSize: 12,
  },
  actionButtons: {
    gap: 12,
  },
  messageButton: {
    marginBottom: 8,
  },
  reportButton: {
    // borderColor will be set dynamically with theme
  },
  buttonContent: {
    height: 48,
  },
});
