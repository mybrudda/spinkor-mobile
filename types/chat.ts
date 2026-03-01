export interface Conversation {
  id: string;
  post_id: string;
  creator_id: string;
  participant_id: string;
  created_at: string;
  last_activity_date: string;
  deleted_by_creator: boolean;
  deleted_by_participant: boolean;
  post_title: string;
  post_image: string;
  post_price: number;
  post_status: 'active' | 'expired' | 'removed' | 'pending';
  other_user_name: string;
  other_user_display_name: string | null;
  other_user_profile_image_id: string | null;
  other_user_is_verified: boolean;
  other_user_type: 'person' | 'company';
  last_message: string | null;
  unread_count: number;
  user?: {
    id: string;
    username: string;
    profile_image_id: string | null;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender?: {
    id: string;
    username: string;
    profile_image_id: string | null;
  };
}

export interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
}
