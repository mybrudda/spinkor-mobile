import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/useAuthStore';
import { uploadToCloudinary, getCloudinaryUrl } from '../cloudinary';
import { Post, PostDetails } from '../../types/database';
import {
  BaseFormData,
  VALIDATION_LIMITS,
  DEFAULT_FORM_VALUES,
  ERROR_MESSAGES,
} from '../../types/forms';
import { normalizeCategoryValue } from '../../constants/FormOptions';

interface UsePostUpdateProps<T extends BaseFormData> {
  postType: string;
  transformForm: (formState: T) => Record<string, any>;
  validateForm: (formState: T) => Record<string, string>;
  successMessage: string;
}

interface ImageChange {
  type: 'added' | 'removed' | 'unchanged';
  url?: string;
  base64?: string;
  imageId?: string;
  index: number;
}

// Helper function to extract public ID from Cloudinary URL
const extractCloudinaryPublicId = (url: string): string | null => {
  try {
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex((part) => part === 'upload');
    if (uploadIndex !== -1 && uploadIndex + 1 < urlParts.length) {
      const publicId = urlParts
        .slice(uploadIndex + 1)
        .join('/')
        .split('.')[0];
      return publicId;
    }
    return null;
  } catch (error) {
    console.error('Error extracting Cloudinary public ID:', error);
    return null;
  }
};

// Helper function to resize image
const resizeImage = async (base64Image: string): Promise<string> => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      `data:image/jpeg;base64,${base64Image}`,
      [{ resize: { width: 800 } }], // Only specify width, height will be calculated automatically
      {
        compress: 0.5,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (manipResult.base64) {
      return manipResult.base64;
    } else {
      throw new Error('Failed to get base64 from manipulated image');
    }
  } catch (error) {
    console.error('Error resizing image:', error);
    throw new Error('Failed to resize image');
  }
};

export function usePostUpdate<T extends BaseFormData>({
  postType,
  transformForm,
  validateForm,
  successMessage,
}: UsePostUpdateProps<T>) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageChanges, setImageChanges] = useState<ImageChange[]>([]);

  const initializeFormFromPost = useCallback((post: Post): T => {
    // Convert image IDs to URLs for display
    const imageUrls = post.image_ids.map(
      (imageId: string) => getCloudinaryUrl(imageId, 'posts') || imageId
    );

    const postLocation = post.location || {};
    const formData: any = {
      title: post.title,
      description: post.description,
      price: post.price.toString(),
      currency: post.currency,
      listingType: post.listing_type,
      category: normalizeCategoryValue(post.category),
      subcategory: post.subcategory,
      location: {
        city: postLocation.city || '',
        address: postLocation.address ?? '',
        country: postLocation.country || DEFAULT_FORM_VALUES.COUNTRY,
      },
      images: imageUrls, // Use URLs for display
    };

    if (post.details) {
      const details = post.details as PostDetails;
      Object.assign(formData, {
        make: details.make || '',
        model: details.model || '',
        year: details.year || '',
      });
    }

    // Reset image changes tracking and initialize with current images
    const initialImageChanges: ImageChange[] = post.image_ids.map(
      (imageId: string, index: number) => ({
        type: 'unchanged',
        url: getCloudinaryUrl(imageId, 'posts') || undefined,
        imageId,
        index,
      })
    );
    setImageChanges(initialImageChanges);

    return formData;
  }, []);

  const handlePickImage = async (
    images: string[],
    setImages: (images: string[]) => void,
    source: 'gallery' | 'camera' = 'gallery'
  ) => {
    if (images.length >= VALIDATION_LIMITS.IMAGES_PER_POST) {
      Alert.alert(
        'Limit Reached',
        ERROR_MESSAGES.IMAGE_LIMIT_REACHED(VALIDATION_LIMITS.IMAGES_PER_POST)
      );
      return;
    }

    try {
      // Request permissions for camera if needed
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take pictures.');
          return;
        }
      } else {
        // Request permissions for media library if needed
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Media library permission is required to select images.'
          );
          return;
        }
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: 'images',
              allowsEditing: true,
              aspect: [...DEFAULT_FORM_VALUES.IMAGE_ASPECT],
              quality: DEFAULT_FORM_VALUES.IMAGE_QUALITY,
              base64: true,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: 'images',
              allowsEditing: true,
              aspect: [...DEFAULT_FORM_VALUES.IMAGE_ASPECT],
              quality: DEFAULT_FORM_VALUES.IMAGE_QUALITY,
              base64: true,
            });

      if (!result.canceled && result.assets?.[0] && result.assets[0].base64) {
        const resizedBase64 = await resizeImage(result.assets[0].base64 as string);
        const newImages = [...images, resizedBase64];
        setImages(newImages);

        // Track the new image as added
        const newImageChange: ImageChange = {
          type: 'added',
          base64: resizedBase64,
          index: images.length,
        };
        setImageChanges((prev) => [...prev, newImageChange]);

        // Clear image error if images are now valid
        if (newImages.length >= VALIDATION_LIMITS.MIN_IMAGES && errors.images) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.images;
            return newErrors;
          });
        }
      }
    } catch (error) {
      console.error('Error picking or resizing image:', error);
      Alert.alert('Error', ERROR_MESSAGES.IMAGE_PICK_FAILED);
    }
  };

  const handleRemoveImage = (
    index: number,
    images: string[],
    setImages: (images: string[]) => void
  ) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);

    // Track the removed image
    const removedImage = images[index];
    const isUrl = removedImage.startsWith('http');

    // Find the original image ID for this URL
    const originalImageChange = imageChanges.find(
      (change) => change.url === removedImage && change.type === 'unchanged'
    );

    const newImageChange: ImageChange = {
      type: 'removed',
      url: isUrl ? removedImage : undefined,
      base64: !isUrl ? removedImage : undefined,
      imageId: originalImageChange?.imageId,
      index,
    };
    setImageChanges((prev) => [...prev, newImageChange]);

    // Clear image error if images are still valid, or add error if now invalid
    if (newImages.length >= VALIDATION_LIMITS.MIN_IMAGES && errors.images) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.images;
        return newErrors;
      });
    } else if (newImages.length < VALIDATION_LIMITS.MIN_IMAGES && !errors.images) {
      setErrors((prev) => ({
        ...prev,
        images: 'At least one image is required',
      }));
    }
  };

  const handleInputChange = (
    field: keyof T,
    value: string | string[],
    formState: T,
    setFormState: (state: T) => void
  ) => {
    setFormState({ ...formState, [field]: value });
    const fieldKey = String(field);
    if (errors[fieldKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  const handleLocationChange = (
    field: keyof T['location'],
    value: string,
    formState: T,
    setFormState: (state: T) => void
  ) => {
    setFormState({
      ...formState,
      location: { ...formState.location, [field]: value },
    });
    const locationFieldKey = `location.${String(field)}`;
    if (errors[locationFieldKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[locationFieldKey];
        return newErrors;
      });
    }
  };

  const validateFormData = (formState: T) => {
    const newErrors = validateForm(formState);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async (formState: T, postId: string) => {
    if (!user) {
      Alert.alert('Authentication Required', ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      router.push('/(auth)/login');
      return;
    }

    if (!validateFormData(formState)) {
      Alert.alert('Error', ERROR_MESSAGES.VALIDATION_FAILED);
      return;
    }

    setLoading(true);
    let uploadedImageIds: string[] = [];

    try {
      // Load existing post data
      const { data: post, error: fetchError } = await supabase
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
        `
        )
        .eq('id', postId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch post: ${fetchError.message}`);
      }

      if (!post) {
        throw new Error(ERROR_MESSAGES.POST_NOT_FOUND);
      }

      // Transform existing data to form state
      const existingImages = post.image_ids || [];
      const imageUrls = existingImages.map(
        (imageId: string) => getCloudinaryUrl(imageId, 'posts') || imageId
      );

      // First test if we can connect to Supabase
      const testQuery = await supabase.from('posts').select('id').limit(1);
      if (testQuery.error) {
        throw new Error(ERROR_MESSAGES.SUPABASE_CONNECTION_FAILED(testQuery.error.message));
      }

      // Verify post ownership
      if (post.user_id !== user.id) {
        Alert.alert('Error', ERROR_MESSAGES.POST_NOT_FOUND);
        return;
      }

      // Process image changes
      const imageIdsToDelete: string[] = [];

      // Handle image uploads for new images
      const newImages = formState.images.filter((image: string) => !image.startsWith('http'));
      const existingImageIds = formState.images
        .filter((image: string) => image.startsWith('http'))
        .map((imageUrl: string) => {
          // Extract image ID from URL using the existing helper function
          const imageId = extractCloudinaryPublicId(imageUrl);
          return imageId || imageUrl;
        });

      // Upload new base64 images
      if (newImages.length > 0) {
        uploadedImageIds = await Promise.all(
          newImages.map((base64Image: string) =>
            uploadToCloudinary(`data:image/jpeg;base64,${base64Image}`)
          )
        );
      }

      // Collect image IDs of images to delete
      const removedImages = imageChanges.filter(
        (change) => change.type === 'removed' && change.imageId
      );
      if (removedImages.length > 0) {
        imageIdsToDelete.push(...removedImages.map((change) => change.imageId!));
      }

      // Delete removed images from Cloudinary FIRST (before database update)
      let deletionResults = null;
      if (imageIdsToDelete.length > 0) {
        try {
          const { data: session } = await supabase.auth.getSession();
          if (!session.session?.access_token) {
            console.warn('No session token available for image deletion');
          } else {
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-images-cloudinary`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.session.access_token}`,
                },
                body: JSON.stringify({
                  imageIds: imageIdsToDelete,
                  folder: 'posts',
                }),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error(
                'Failed to delete images from Cloudinary:',
                response.status,
                response.statusText,
                errorText
              );
            } else {
              const result = await response.json();
              console.log('Image deletion results:', result);
              deletionResults = result;

              // Show user feedback about deletion results
              if (result.results) {
                const { successful, failed } = result.results;
                if (successful.length > 0 && failed.length === 0) {
                  console.log(`Successfully deleted ${successful.length} images`);
                } else if (successful.length > 0 && failed.length > 0) {
                  console.log(
                    `Partially successful: ${successful.length} deleted, ${failed.length} failed`
                  );
                  console.log('Failed images:', failed);
                } else if (failed.length > 0) {
                  console.log(`Failed to delete ${failed.length} images:`, failed);
                }
              }
            }
          }
        } catch (deleteError) {
          console.error('Error deleting images from Cloudinary:', deleteError);
          // Don't throw error to avoid breaking the update flow
        }
      }

      // Build final image IDs array
      // For existing images, we need to extract the image IDs from the URLs
      let finalImageIds = [...existingImageIds, ...uploadedImageIds];

      // If deletion was attempted, filter out failed deletions
      if (deletionResults && deletionResults.results) {
        const { successful, failed } = deletionResults.results;

        // Map failed publicIds back to image IDs for comparison
        const failedPublicIds = failed.map((f: any) => f.publicId).filter(Boolean);
        const failedImageIds = imageIdsToDelete.filter((imageId) => {
          const publicId = `posts/${imageId}`;
          return failedPublicIds.includes(publicId);
        });

        // Keep failed deletions in the final images array
        finalImageIds = finalImageIds.filter((imgId) => !failedImageIds.includes(imgId));
        console.log(`Keeping ${failedImageIds.length} failed deletions in database`);
      }

      const postData = {
        title: formState.title,
        description: formState.description,
        category: formState.category,
        subcategory: formState.subcategory,
        price: parseFloat(formState.price),
        currency: formState.currency,
        listing_type: formState.listingType,
        location: {
          ...formState.location,
          country: formState.location.country || DEFAULT_FORM_VALUES.COUNTRY,
        },
        image_ids: finalImageIds, // Store image IDs in database
        details: transformForm(formState),
        updated_at: new Date().toISOString(),
      };

      console.log('Attempting to update post with data:', JSON.stringify(postData, null, 2));

      const { data, error } = await supabase
        .from('posts')
        .update(postData)
        .eq('id', postId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      Alert.alert('Success', successMessage);
      router.back();
    } catch (error) {
      console.error('Error updating post:', error);

      // Rollback: Delete newly uploaded images if database update failed
      if (uploadedImageIds.length > 0) {
        try {
          console.log('Rolling back uploaded images due to update failure');
          const { data: session } = await supabase.auth.getSession();
          if (session.session?.access_token) {
            await fetch(
              `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-images-cloudinary`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.session.access_token}`,
                },
                body: JSON.stringify({
                  imageIds: uploadedImageIds,
                  folder: 'posts',
                }),
              }
            );
          }
        } catch (rollbackError) {
          console.error('Failed to rollback uploaded images:', rollbackError);
        }
      }

      Alert.alert(
        'Error',
        `${ERROR_MESSAGES.POST_UPDATE_FAILED} ${error instanceof Error ? error.message : ''}`
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    errors,
    imageChanges,
    initializeFormFromPost,
    handlePickImage,
    handleRemoveImage,
    handleInputChange,
    handleLocationChange,
    handleUpdate,
  };
}
