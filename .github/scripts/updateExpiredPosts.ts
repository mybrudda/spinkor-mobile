import { supabaseAdmin } from './supabaseAdmin';

const CONFIG = {
  BATCH_SIZE: 100, // Number of posts to process per batch
  MAX_RETRIES: 3, // Maximum number of retries for failed updates
};

interface UpdateResult {
  success: boolean;
  postsUpdated: number;
  postsFailed: number;
  totalPostsProcessed: number;
  timestamp: string;
}

interface Post {
  id: string;
  status: string;
  expires_at: string;
}

// Get expired posts that are still active
async function getExpiredActivePosts(offset: number, limit: number): Promise<Post[]> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('id, status, expires_at')
      .eq('status', 'active')
      .lt('expires_at', now)
      .range(offset, offset + limit - 1)
      .order('expires_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch expired posts: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching expired posts:', error);
    throw error;
  }
}

// Update a batch of posts to expired status
async function updatePostsToExpired(
  postIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('posts')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .in('id', postIds);

    if (error) {
      throw new Error(`Failed to update posts: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating posts to expired:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Log the update operation results
async function logUpdateOperation(result: UpdateResult): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('cleanup_logs').insert({
      operation: 'Update Expired Posts Status',
      rows_affected: result.postsUpdated,
      details: result,
      executed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log operation:', error);
    }
  } catch (error) {
    console.error('Error logging operation:', error);
  }
}

// Main function to update expired posts
async function updateExpiredPosts(): Promise<UpdateResult> {
  console.log('Starting expired posts update process...');

  const result: UpdateResult = {
    success: true,
    postsUpdated: 0,
    postsFailed: 0,
    totalPostsProcessed: 0,
    timestamp: new Date().toISOString(),
  };

  let offset = 0;
  let hasMorePosts = true;

  try {
    while (hasMorePosts) {
      console.log(`Processing batch starting at offset ${offset}...`);

      // Fetch a batch of expired posts
      const posts = await getExpiredActivePosts(offset, CONFIG.BATCH_SIZE);

      if (posts.length === 0) {
        hasMorePosts = false;
        break;
      }

      console.log(`Found ${posts.length} expired posts to update`);

      // Update posts to expired status
      const postIds = posts.map((post) => post.id);
      const updateResult = await updatePostsToExpired(postIds);

      if (updateResult.success) {
        result.postsUpdated += posts.length;
        console.log(`Successfully updated ${posts.length} posts to expired status`);
      } else {
        result.postsFailed += posts.length;
        console.error(`Failed to update batch of ${posts.length} posts:`, updateResult.error);
      }

      result.totalPostsProcessed += posts.length;
      offset += CONFIG.BATCH_SIZE;

      // Add a small delay between batches to avoid overwhelming the database
      if (hasMorePosts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log('\n=== Update Process Complete ===');
    console.log(`Total posts processed: ${result.totalPostsProcessed}`);
    console.log(`Successfully updated: ${result.postsUpdated}`);
    console.log(`Failed updates: ${result.postsFailed}`);

    // Log the operation results
    await logUpdateOperation(result);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Fatal error during update process:', errorMessage);

    result.success = false;

    // Log the failed operation
    await logUpdateOperation(result);

    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  updateExpiredPosts()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
