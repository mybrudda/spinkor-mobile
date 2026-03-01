// Database types - data as stored in the database
export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  user_type: 'person' | 'company';
  is_verified: boolean;
  profile_image_id?: string | null;
  created_at: string;
  is_admin: boolean;
  is_banned: boolean;
  banned_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
}

export interface BasePost {
  id: string;
  user_id: string;
  user?: User;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  listing_type: 'sale' | 'rent' | 'other';
  price: number;
  currency: string;
  location: {
    city: string;
    address?: string;
    country: string;
  };
  image_ids: string[]; // Cloudinary image IDs
  details: PostDetails;
  status: 'active' | 'pending' | 'removed' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface PostDetails {
  make?: string;
  model?: string;
  year?: string;
  [key: string]: any;
}

export interface Post extends BasePost {
  details: PostDetails;
  user: User;
}

export type IconName =
  | 'car'
  | 'calendar'
  | 'speedometer'
  | 'car-cog'
  | 'gas-station'
  | 'car-shift-pattern'
  | 'map-marker'
  | 'phone'
  | 'message'
  | 'bookmark'
  | 'bookmark-outline'
  | 'share'
  | 'flag'
  | 'dots-vertical'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'check'
  | 'alert-circle'
  | 'image-off'
  | 'home'
  | 'bed'
  | 'shower'
  | 'ruler-square'
  | 'home-variant';

export interface CarouselRenderItemInfo {
  item: string;
  index: number;
}
