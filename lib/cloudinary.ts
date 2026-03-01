const CLOUDINARY_CONFIG = {
  cloud_name: 'dtac4dhtj',
  upload_preset: 'Default',
};

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
}

/**
 * Constructs a Cloudinary URL from an image ID
 * @param imageId - The Cloudinary image ID (without folder prefix)
 * @param folder - Optional folder name (defaults to 'avatars')
 * @returns The complete Cloudinary URL
 */
export const getCloudinaryUrl = (
  imageId: string | null,
  folder: string = 'avatars'
): string | null => {
  if (!imageId) return null;

  // If the imageId already includes the folder, use it as is
  const publicId = imageId.includes('/') ? imageId : `${folder}/${imageId}`;
  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload/${publicId}`;
};

/**
 * Uploads an image to Cloudinary and returns only the image ID
 * @param base64Image - Base64 encoded image data
 * @param folder - Optional folder name (defaults to 'posts')
 * @returns The image ID (without folder prefix)
 */
export const uploadToCloudinary = async (
  base64Image: string,
  folder: string = 'posts'
): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('upload_preset', CLOUDINARY_CONFIG.upload_preset);
    formData.append('cloud_name', CLOUDINARY_CONFIG.cloud_name);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloud_name}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data: CloudinaryResponse = await response.json();

    // Return only the image ID, not the full URL
    const imageId = data.public_id.split('/').pop();
    if (!imageId) {
      throw new Error('Failed to extract image ID from Cloudinary response');
    }

    return imageId;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image');
  }
};
