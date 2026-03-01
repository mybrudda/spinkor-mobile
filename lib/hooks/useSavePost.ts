import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { savedPostsService } from '../savedPostsService';
import { useAuthStore } from '../../store/useAuthStore';

interface UseSavePostOptions {
  postId: string;
  userId: string;
  showAuthDialog?: () => void;
  onUnsave?: (postId: string) => void;
  showSuccessAlerts?: boolean;
}

export const useSavePost = ({
  postId,
  userId,
  showAuthDialog,
  onUnsave,
  showSuccessAlerts = false,
}: UseSavePostOptions) => {
  const { user } = useAuthStore();
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if post is saved when component mounts
  useEffect(() => {
    if (user && postId) {
      checkSavedStatus();
    }
  }, [user, postId]);

  const checkSavedStatus = async () => {
    if (!user || !postId) return;

    try {
      const saved = await savedPostsService.isPostSaved(postId, user.id);
      setIsSaved(saved);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleSavePost = async () => {
    if (!user) {
      if (showAuthDialog) {
        showAuthDialog();
      } else {
        Alert.alert('Login Required', 'Please login to save posts');
      }
      return;
    }

    if (!postId) {
      Alert.alert('Error', 'Post not found');
      return;
    }

    // Prevent users from saving their own posts
    if (user.id === userId) {
      Alert.alert('Cannot Save', 'You cannot save your own posts');
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        await savedPostsService.unsavePost(postId, user.id);
        setIsSaved(false);
        // Call onUnsave callback if provided
        onUnsave?.(postId);
        // Show success message for unsave (only if not in saved posts screen)
        if (showSuccessAlerts && !onUnsave) {
          Alert.alert('Success', 'Post removed from saved posts');
        }
      } else {
        await savedPostsService.savePost(postId, user.id);
        setIsSaved(true);
        // Show success message for save
        if (showSuccessAlerts) {
          Alert.alert('Success', 'Post added to saved posts');
        }
      }
    } catch (error) {
      console.error('Error saving/unsaving post:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return {
    isSaved,
    saving,
    handleSavePost,
    checkSavedStatus,
  };
};
