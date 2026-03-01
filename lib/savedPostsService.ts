import { supabase } from '../supabaseClient';
import { Post } from '../types/database';

export const savedPostsService = {
  // Save a post for the current user
  async savePost(postId: string, userId: string): Promise<void> {
    // First check if the user is the creator of the post
    const { data, error } = await supabase
      .from('posts')
      .select(
        `
        id,
        title,
        description,
        category,
        subcategory,
        listing_type,
        price,
        currency,
        location,
        image_ids,
        details,
        status,
        expires_at,
        created_at,
        updated_at,
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

    if (error) {
      console.error('Error fetching post:', error);
      throw error;
    }

    if (data.user?.id === userId) {
      throw new Error('Cannot save your own post');
    }

    const { error: savedPostError } = await supabase.from('saved_posts').insert([
      {
        user_id: userId,
        post_id: postId,
      },
    ]);

    if (savedPostError) {
      console.error('Error saving post:', savedPostError);
      throw savedPostError;
    }
  },

  // Remove a saved post for the current user
  async unsavePost(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    if (error) {
      console.error('Error unsaving post:', error);
      throw error;
    }
  },

  // Check if a post is saved by the current user
  async isPostSaved(postId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking if post is saved:', error);
      throw error;
    }

    return !!data;
  },

  // Get all saved posts for the current user (only active posts)
  async getSavedPosts(userId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('saved_posts')
      .select(
        `
        post_id,
        posts (
          id,
          user_id,
          title,
          description,
          category,
          subcategory,
          listing_type,
          price,
          currency,
          location,
          image_ids,
          details,
          status,
          expires_at,
          created_at,
          updated_at,
          user:user_id (
            id,
            username,
            display_name,
            profile_image_id,
            email,
            user_type,
            is_verified
          )
        )
      `
      )
      .eq('user_id', userId)
      .eq('posts.status', 'active');

    if (error) {
      console.error('Error fetching saved posts:', error);
      throw error;
    }

    // Transform the data to match the Post interface
    return (
      data?.map(
        (item) =>
          ({
            ...item.posts,
            user: item.posts.user,
          }) as any
      ) || []
    );
  },

  // Get saved post IDs for the current user (for checking saved status)
  async getSavedPostIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching saved post IDs:', error);
      throw error;
    }

    return data?.map((item) => item.post_id) || [];
  },
};
