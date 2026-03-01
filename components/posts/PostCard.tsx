import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Card, Text, useTheme, Menu, IconButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { Post, PostDetails } from '../../types/database';
import { formatPrice } from '../../utils/format';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useSavePost } from '../../lib/hooks/useSavePost';
import { getCloudinaryUrl } from '../../lib/cloudinary';
import { PLACEHOLDER_BLURHASH } from '../../constants/images';

interface PostCardProps {
  post: Post;
  showMenu?: boolean;
  onDelete?: (postId: string) => void;
  onUpdate?: (post: Post) => void;
  onUnsave?: (postId: string) => void;
  cardStyle?: object;
}

export default function PostCard({ post, showMenu = false, onDelete, onUpdate, onUnsave, cardStyle }: PostCardProps) {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [imageError, setImageError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Use shared save post hook
  const { isSaved, saving, handleSavePost } = useSavePost({
    postId: post.id,
    userId: post.user_id,
    onUnsave,
    showSuccessAlerts: true
  });

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleDelete = () => {
    closeMenu();
    onDelete?.(post.id);
  };

  const handleUpdate = () => {
    closeMenu();
    onUpdate?.(post);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const renderPostDetails = (details?: PostDetails) => {
    const makeModel = [details?.make, details?.model].filter(Boolean).join(' ').trim();
    if (!makeModel) return null;

    const yearSuffix = details?.year ? ` (${details.year})` : '';

    return (
      <View style={styles.detailsContainer}>
        <Text
          variant="bodySmall"
          style={styles.detailValue}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {makeModel}
          {yearSuffix}
        </Text>
      </View>
    );
  };

  // Get the first image URL from the image ID
  const firstImageUrl = post.image_ids && post.image_ids.length > 0 
    ? getCloudinaryUrl(post.image_ids[0], 'posts') 
    : null;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.push({ pathname: '/PostDetails', params: { post: JSON.stringify(post) } })}>
        <Card style={[cardStyle]}>
          <View style={styles.cardContentWrapper}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: firstImageUrl || '' }}
                style={styles.cardImage}
                contentFit="cover"
                transition={300}
                placeholder={PLACEHOLDER_BLURHASH}
                onError={() => setImageError(true)}
              />
              {imageError && (
                <View style={[styles.errorOverlay, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="image-off" size={24} color={theme.colors.onSurfaceVariant} />
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>Image unavailable</Text>
                </View>
              )}
              <View style={[styles.imageOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <Text 
                  numberOfLines={1}
                  style={{ color: "white", fontWeight: 'bold', fontSize: 14 }}
                >
                  {formatPrice(post.price, post.currency)}
                </Text>
              </View>
              
              {/* Top-right Icon: Save or Menu, same position and style */}
              <View style={styles.actionIconContainer}>
                {showMenu ? (
                  <Menu
                    visible={menuVisible}
                    onDismiss={closeMenu}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        size={14}
                        onPress={openMenu}
                        style={[styles.actionIcon, { backgroundColor: theme.colors.primaryContainer }]}
                        iconColor={theme.colors.primary}
                      />
                    }
                  >
                    <Menu.Item 
                      onPress={handleUpdate} 
                      title="Update"
                      leadingIcon="pencil"
                    />
                    <Menu.Item 
                      onPress={handleDelete} 
                      title="Delete"
                      leadingIcon="delete"
                    />
                  </Menu>
                ) : (
                  <IconButton
                    icon={isSaved ? "bookmark" : "bookmark-outline"}
                    size={14}
                    iconColor={isSaved ? "rgb(168, 96, 146)" : theme.colors.primary}
                    style={[styles.actionIcon, { backgroundColor: theme.colors.primaryContainer }]}
                    onPress={handleSavePost}
                    disabled={saving || user?.id === post.user_id}
                    loading={saving}
                  />
                )}
              </View>
            </View>

            <Card.Content style={styles.cardContent}>
              <Text 
                variant="titleMedium" 
                numberOfLines={1} 
                ellipsizeMode="tail"
                style={styles.title}
              >
                {post.title}
              </Text>
              
              {renderPostDetails(post.details)}

              <View style={styles.footerRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.locationContainer}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
                    <Text 
                      variant="bodySmall" 
                      numberOfLines={1}
                      style={[styles.detailValue, styles.locationText]}
                    >
                      {post.location.city}
                    </Text>
                  </View>
                  <Text 
                    variant="bodySmall" 
                    numberOfLines={1}
                    style={styles.date}
                  >
                    {formatDate(post.created_at)}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </View>
          
          {/* Menu is now handled inline above */}
        </Card>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  cardContentWrapper: {
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3,
  },
  cardImage: {
    height: '100%',
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  cardContent: {
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  title: {
    marginBottom: 8,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  locationText: {
    marginLeft: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    color: '#666',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
  },
  // menuButton style removed; use bookmarkIcon for both
  actionIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 3,
  },
  actionIcon: {
    borderRadius: 20,
    margin: 0,
  },
});