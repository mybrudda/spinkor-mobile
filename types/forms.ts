// Form types, validation, and transformations
import type { PostDetails } from './database';
import type { CategoryValue } from '../constants/FormOptions';

export interface BaseFormData {
  title: string;
  description: string;
  price: string;
  currency: string;
  location: {
    city: string;
    address?: string;
    country: string;
  };
  images: string[];
  listingType: 'sale' | 'rent' | 'other';
  category: CategoryValue;
  subcategory: string;
}

export interface PostFormData extends BaseFormData {
  make: string;
  model: string;
  year: string;
}

export type FormErrors = {
  [K in keyof PostFormData | `location.${keyof BaseFormData['location']}`]?: string;
};

export const VALIDATION_LIMITS = {
  TITLE_MIN: 3,
  TITLE_MAX: 100,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 1000,
  PRICE_MIN: 0,
  PRICE_MAX: 999999999,
  IMAGES_MIN: 1,
  IMAGES_MAX: 10,
  IMAGES_PER_POST: 10,
  MIN_IMAGES: 1,
  YEAR_MIN: 1900,
  YEAR_MAX: new Date().getFullYear() + 1,
} as const;

export const DEFAULT_FORM_VALUES = {
  CURRENCY: 'AFN',
  COUNTRY: 'Afghanistan',
  LISTING_TYPE: 'sale' as const,
  POST_EXPIRY_DAYS: 30,
  IMAGE_QUALITY: 1,
  IMAGE_ASPECT: [4, 3] as const,
} as const;

export const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Please log in to create a post.',
  VALIDATION_FAILED: 'Please check your input and try again.',
  SUPABASE_CONNECTION_FAILED: (error: string) => `Database connection failed: ${error}`,
  POST_NOT_FOUND: 'Post not found or you do not have permission to edit it.',
  IMAGE_UPLOAD_FAILED: 'Failed to upload image. Please try again.',
  IMAGE_PICK_FAILED: 'Failed to pick image. Please try again.',
  IMAGE_LIMIT_REACHED: (limit: number) => `You can only select up to ${limit} images.`,
  POST_CREATION_FAILED: 'Failed to create post. Please try again.',
  POST_UPDATE_FAILED: 'Failed to update post. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

export const validatePostForm = (form: PostFormData): FormErrors => {
  const errors: FormErrors = {};

  // Title validation
  if (!form.title.trim()) {
    errors.title = 'Title is required';
  } else if (form.title.length < VALIDATION_LIMITS.TITLE_MIN) {
    errors.title = `Title must be at least ${VALIDATION_LIMITS.TITLE_MIN} characters`;
  } else if (form.title.length > VALIDATION_LIMITS.TITLE_MAX) {
    errors.title = `Title must be no more than ${VALIDATION_LIMITS.TITLE_MAX} characters`;
  }

  // Description validation
  if (!form.description.trim()) {
    errors.description = 'Description is required';
  } else if (form.description.length < VALIDATION_LIMITS.DESCRIPTION_MIN) {
    errors.description = `Description must be at least ${VALIDATION_LIMITS.DESCRIPTION_MIN} characters`;
  } else if (form.description.length > VALIDATION_LIMITS.DESCRIPTION_MAX) {
    errors.description = `Description must be no more than ${VALIDATION_LIMITS.DESCRIPTION_MAX} characters`;
  }

  // Price validation
  const price = parseFloat(form.price);
  if (isNaN(price) || price < VALIDATION_LIMITS.PRICE_MIN) {
    errors.price = 'Price must be a positive number';
  } else if (price > VALIDATION_LIMITS.PRICE_MAX) {
    errors.price = `Price must be no more than ${VALIDATION_LIMITS.PRICE_MAX.toLocaleString()}`;
  }

  // Currency validation
  if (!form.currency) {
    errors.currency = 'Currency is required';
  }

  // Location validation
  if (!form.location.city.trim()) {
    errors['location.city'] = 'City is required';
  }
  if (!form.location.country.trim()) {
    errors['location.country'] = 'Country is required';
  }

  // Images validation
  if (!form.images || form.images.length < VALIDATION_LIMITS.IMAGES_MIN) {
    errors.images = `At least ${VALIDATION_LIMITS.IMAGES_MIN} image is required`;
  } else if (form.images.length > VALIDATION_LIMITS.IMAGES_MAX) {
    errors.images = `No more than ${VALIDATION_LIMITS.IMAGES_MAX} images allowed`;
  }

  // Listing type validation
  if (!form.listingType) {
    errors.listingType = 'Listing type is required';
  }

  // Category validation
  if (!form.category) {
    errors.category = 'Category is required';
  }

  // Subcategory validation
  if (!form.subcategory.trim()) {
    errors.subcategory = 'Subcategory is required';
  }

  // Year validation (optional)
  if (form.year.trim()) {
    const year = parseInt(form.year.trim(), 10);
    if (isNaN(year) || year < VALIDATION_LIMITS.YEAR_MIN || year > VALIDATION_LIMITS.YEAR_MAX) {
      errors.year = `Year must be between ${VALIDATION_LIMITS.YEAR_MIN} and ${VALIDATION_LIMITS.YEAR_MAX}`;
    }
  }

  return errors;
};

export const transformPostForm = (form: PostFormData): PostDetails => {
  const details: PostDetails = {};

  const makeValue = form.make.trim();
  if (makeValue) {
    details.make = makeValue;
  }

  const modelValue = form.model.trim();
  if (modelValue) {
    details.model = modelValue;
  }

  const yearValue = form.year.trim();
  if (yearValue) {
    details.year = yearValue;
  }

  return details;
};
