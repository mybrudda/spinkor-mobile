import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { getCloudinaryUrl } from '../../lib/cloudinary';

interface ProfileImageProps {
  imageId?: string | null;
  size?: number;
  folder?: string;
  style?: any;
  tempImageUrl?: string | null;
}

const ProfileImage: React.FC<ProfileImageProps> = ({
  imageId,
  size = 40,
  folder = 'avatars',
  style,
  tempImageUrl,
}) => {
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Use temp image if available, otherwise use Cloudinary URL
  const imageUrl = tempImageUrl || (imageId ? getCloudinaryUrl(imageId, folder) : null);
  const showPlaceholder = !imageUrl || imageError;

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleImageLoadStart = () => {
    setImageLoading(true);
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: showPlaceholder ? theme.colors.surfaceVariant : 'transparent',
        },
        style,
      ]}>
      {imageUrl && !imageError ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
          onLoadStart={handleImageLoadStart}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : null}

      {showPlaceholder && (
        <View style={styles.placeholderContainer}>
          <MaterialCommunityIcons
            name="account"
            size={size * 0.5}
            color={theme.colors.onSurfaceVariant}
          />
          {imageError && (
            <View style={styles.errorIndicator}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={size * 0.25}
                color={theme.colors.error}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    margin: 5,
  },
  image: {
    position: 'absolute',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  errorIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 2,
  },
});

export default ProfileImage;
