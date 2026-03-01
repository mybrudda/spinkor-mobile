import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image } from 'expo-image';
import { VALIDATION_LIMITS } from '../../types/forms';
import { getCloudinaryUrl } from '../../lib/cloudinary';
import { PLACEHOLDER_BLURHASH } from '../../constants/images';

interface ImagePickerSectionProps {
  images: string[];
  onPickImage: () => void;
  onRemoveImage: (index: number) => void;
  maxImages?: number;
}

export default function ImagePickerSection({
  images,
  onPickImage,
  onRemoveImage,
  maxImages = VALIDATION_LIMITS.IMAGES_PER_POST,
}: ImagePickerSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.imageText, { color: theme.colors.onSurfaceVariant }]}>
        Images ({images.length}/{maxImages})
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.imageContainer}>
          {images.length < maxImages && (
            <TouchableOpacity 
              style={[
                styles.addButton,
                { backgroundColor: theme.colors.surfaceVariant }
              ]} 
              onPress={onPickImage}
            >
              <MaterialCommunityIcons 
                name="camera-plus" 
                size={32} 
                color={theme.colors.primary}
              />
              <Text style={[styles.addButtonText, { color: theme.colors.onSurfaceVariant }]}>
                Add Image
              </Text>
            </TouchableOpacity>
          )}
          
          {images.map((image, index) => {
            // Check if the image is a URL, base64, or image ID
            const isUrl = image.startsWith('http');
            // Base64 strings are typically very long and contain alphanumeric characters
            const isBase64 = !isUrl && image.length > 100 && /^[A-Za-z0-9+/=]+$/.test(image);
            
            let imageSource;
            if (isUrl) {
              imageSource = { uri: image };
            } else if (isBase64) {
              imageSource = `data:image/jpeg;base64,${image}`;
            } else {
              // Assume it's an image ID, construct the URL
              const imageUrl = getCloudinaryUrl(image, 'posts');
              imageSource = imageUrl ? { uri: imageUrl } : `data:image/jpeg;base64,${image}`;
            }
            
            return (
              <View key={index} style={styles.imageWrapper}>
                <View style={styles.imageContent}>
                  <Image
                    source={imageSource}
                    style={styles.image}
                    contentFit="cover"
                    transition={200}
                    placeholder={PLACEHOLDER_BLURHASH}
                  />
                </View>
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => onRemoveImage(index)}
                  style={styles.removeButton}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  imageText: {
    marginBottom: 8,
  },
  scrollView: {
    flexGrow: 0,
  },
  imageContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  imageContent: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    marginTop: 4,
  },
}); 