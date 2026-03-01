import { supabaseAdmin } from './supabaseAdmin';
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CONFIG = {
  BATCH_SIZE: 10, // Number of posts per batch
  MAX_CLOUDINARY_DELETE: 100, // Max images Cloudinary allows in bulk delete
};

interface CleanupResult {
  success: boolean;
  postsDeleted: number;
  imagesDeleted: number;
  imagesFailed: number;
  postsSkipped: number;
}

interface FailedDeletion {
  postId: string;
  imageIds: string[];
  error: string;
}

interface CleanupLog {
  operation: string;
  rows_affected: number;
  details: {
    posts_deleted: number;
    images_deleted: number;
    posts_failed: number;
    images_failed: number;
    failed_deletions?: FailedDeletion[];
    timestamp: string;
  };
  executed_at: string;
}

interface Post {
  id: string;
  image_ids?: string[];
}

// Helper function to construct full Cloudinary public IDs for posts
function constructPostImagePublicIds(imageIds: string[]): string[] {
  return imageIds.map((imageId) => {
    // If imageId already includes folder prefix, use as is
    if (imageId.includes('/')) {
      return imageId;
    }
    // Otherwise, add the posts folder prefix
    return `posts/${imageId}`;
  });
}

// Bulk delete images via Cloudinary Admin API
async function deleteImagesFromCloudinary(
  imageIds: string[]
): Promise<{ deleted: string[]; failed: string[] }> {
  if (imageIds.length === 0) {
    return { deleted: [], failed: [] };
  }

  try {
    // Construct full public IDs with folder prefix for posts
    const publicIds = constructPostImagePublicIds(imageIds);

    console.log(`Attempting to delete ${publicIds.length} images from Cloudinary...`);

    // Cloudinary Admin API allows up to 100 images per call
    const result = await cloudinary.api.delete_resources(publicIds, {
      type: 'upload',
      resource_type: 'image',
    });

    const deleted: string[] = [];
    const failed: string[] = [];

    // Process results
    if (result.deleted) {
      for (const [id, status] of Object.entries(result.deleted)) {
        if (status === 'deleted') {
          deleted.push(id);
        } else {
          failed.push(id);
        }
      }
    }

    // Check for not found images
    if (result.not_found) {
      failed.push(...result.not_found);
    }

    console.log(`Cloudinary deletion result: ${deleted.length} deleted, ${failed.length} failed`);

    return { deleted, failed };
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    // On failure, assume all failed (to be safe)
    return { deleted: [], failed: imageIds };
  }
}

// Fetch posts that have been expired for more than 7 days in batches
async function getExpiredPosts(offset: number): Promise<Post[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('id, image_ids')
    .lt('expires_at', sevenDaysAgoISO)
    .range(offset, offset + CONFIG.BATCH_SIZE - 1)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch posts expired for more than 7 days: ${error.message}`);
  }

  return (data || []) as Post[];
}

// Log cleanup operation to database
async function logCleanupOperation(log: CleanupLog): Promise<void> {
  try {
    await supabaseAdmin.from('cleanup_logs').insert(log);
  } catch (error) {
    console.error('Failed to log cleanup operation:', error);
  }
}

// Main cleanup function
async function cleanupExpiredPosts(): Promise<CleanupResult> {
  const startTime = Date.now();
  let offset = 0;

  let totalPostsDeleted = 0;
  let totalImagesDeleted = 0;
  let totalImagesFailed = 0;
  let totalPostsSkipped = 0;

  const failedDeletions: FailedDeletion[] = [];

  try {
    console.log('Starting cleanup of posts expired for more than 7 days...');

    while (true) {
      const posts = await getExpiredPosts(offset);
      if (!posts.length) {
        console.log('No more posts expired for more than 7 days to process');
        break;
      }

      console.log(`Processing batch of ${posts.length} posts (offset: ${offset})`);

      // Process each post individually to ensure atomicity
      for (const post of posts) {
        const imageIds = post.image_ids || [];

        if (imageIds.length === 0) {
          // Post has no images, safe to delete directly
          try {
            const { error } = await supabaseAdmin.from('posts').delete().eq('id', post.id);

            if (error) {
              console.error(`Failed to delete post ${post.id}:`, error);
              totalPostsSkipped++;
            } else {
              totalPostsDeleted++;
              console.log(`Deleted post ${post.id} (no images)`);
            }
          } catch (error) {
            console.error(`Error deleting post ${post.id}:`, error);
            totalPostsSkipped++;
          }
          continue;
        }

        // Post has images, attempt to delete them first
        try {
          console.log(`Processing post ${post.id} with ${imageIds.length} images`);
          const { deleted, failed } = await deleteImagesFromCloudinary(imageIds);

          if (failed.length === 0) {
            // All images deleted successfully, safe to delete post
            const { error } = await supabaseAdmin.from('posts').delete().eq('id', post.id);

            if (error) {
              console.error(`Failed to delete post ${post.id}:`, error);
              totalPostsSkipped++;
            } else {
              totalPostsDeleted++;
              totalImagesDeleted += deleted.length;
              console.log(`Deleted post ${post.id} with ${deleted.length} images`);
            }
          } else {
            // Some images failed to delete, skip post deletion and log failure
            totalPostsSkipped++;
            totalImagesFailed += failed.length;
            totalImagesDeleted += deleted.length;

            failedDeletions.push({
              postId: post.id,
              imageIds: failed,
              error: 'Failed to delete images from Cloudinary',
            });

            console.log(`Skipped post ${post.id}: ${failed.length} images failed to delete`);
          }
        } catch (error) {
          console.error(`Error processing post ${post.id}:`, error);
          totalPostsSkipped++;
          totalImagesFailed += imageIds.length;

          failedDeletions.push({
            postId: post.id,
            imageIds: imageIds,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      offset += CONFIG.BATCH_SIZE;
    }

    // Log cleanup summary
    const cleanupLog: CleanupLog = {
      operation: 'posts_cleanup',
      rows_affected: totalPostsDeleted,
      details: {
        posts_deleted: totalPostsDeleted,
        images_deleted: totalImagesDeleted,
        posts_failed: totalPostsSkipped,
        images_failed: totalImagesFailed,
        failed_deletions: failedDeletions,
        timestamp: new Date().toISOString(),
      },
      executed_at: new Date().toISOString(),
    };

    await logCleanupOperation(cleanupLog);

    const duration = Date.now() - startTime;
    console.log(`Cleanup finished in ${duration}ms:`);
    console.log(`- Posts deleted: ${totalPostsDeleted}`);
    console.log(`- Posts skipped: ${totalPostsSkipped}`);
    console.log(`- Images deleted: ${totalImagesDeleted}`);
    console.log(`- Images failed: ${totalImagesFailed}`);

    if (totalImagesFailed > 0) {
      console.warn(
        `Warning: ${totalImagesFailed} images failed to delete. Check cleanup_logs for details.`
      );
      console.warn(
        `Posts with failed images were skipped to prevent orphaned images in Cloudinary.`
      );
    }

    return {
      success: true,
      postsDeleted: totalPostsDeleted,
      imagesDeleted: totalImagesDeleted,
      imagesFailed: totalImagesFailed,
      postsSkipped: totalPostsSkipped,
    };
  } catch (error) {
    console.error('Cleanup error:', error);

    // Log error to cleanup_logs table before throwing
    const errorLog: CleanupLog = {
      operation: 'posts_cleanup',
      rows_affected: 0,
      details: {
        posts_deleted: 0,
        images_deleted: 0,
        posts_failed: 0,
        images_failed: 0,
        failed_deletions: [],
        timestamp: new Date().toISOString(),
      },
      executed_at: new Date().toISOString(),
    };

    await logCleanupOperation(errorLog);
    throw error;
  }
}

// If run directly from CLI
if (require.main === module) {
  cleanupExpiredPosts()
    .then(() => {
      console.log('Cleanup completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}

export { cleanupExpiredPosts };
