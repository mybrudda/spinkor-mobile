import { supabaseAdmin } from './supabaseAdmin';

interface CleanupResult {
  success: boolean;
  conversationsDeleted: number;
  error?: string;
}

interface CleanupLog {
  operation: string;
  rows_affected: number;
  details: {
    deleted_by_both: number;
    deleted_by_inactivity: number;
    error?: string;
    timestamp: string;
  };
  executed_at: string;
}

async function cleanupConversations(): Promise<CleanupResult> {
  try {
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    ).toISOString();
    console.log(`Cleaning up conversations older than: ${oneMonthAgo}`);

    // Find conversations to delete
    const { data: conversations, error: findError } = await supabaseAdmin
      .from('conversations')
      .select('id, last_activity_date, deleted_by_creator, deleted_by_participant')
      .or(
        `and(deleted_by_creator.eq.true,deleted_by_participant.eq.true),last_activity_date.lt.${oneMonthAgo}`
      );

    if (findError) throw findError;

    if (!conversations || conversations.length === 0) {
      console.log('No conversations to cleanup');
      return { success: true, conversationsDeleted: 0 };
    }

    console.log(`Found ${conversations.length} conversations to cleanup`);

    // Separate conversations by deletion reason for logging
    const deletedByBoth = conversations.filter(
      (c) => c.deleted_by_creator && c.deleted_by_participant
    ).length;
    const deletedByInactivity = conversations.filter(
      (c) => new Date(c.last_activity_date) < new Date(oneMonthAgo)
    ).length;

    // Delete conversations directly (messages will be deleted automatically due to cascade delete)
    const conversationIds = conversations.map((c) => c.id);
    const { data: deletedConversations, error: deleteError } = await supabaseAdmin
      .from('conversations')
      .delete()
      .in('id', conversationIds)
      .select();

    if (deleteError) throw deleteError;

    if (!deletedConversations || deletedConversations.length !== conversations.length) {
      throw new Error(
        `Failed to delete all conversations. Expected: ${conversations.length}, Deleted: ${deletedConversations?.length || 0}`
      );
    }

    // Log cleanup operation
    const cleanupLog: CleanupLog = {
      operation: 'conversations_cleanup',
      rows_affected: deletedConversations.length,
      details: {
        deleted_by_both: deletedByBoth,
        deleted_by_inactivity: deletedByInactivity,
        timestamp: now.toISOString(),
      },
      executed_at: now.toISOString(),
    };

    await supabaseAdmin.from('cleanup_logs').insert(cleanupLog);

    console.log(`Cleanup completed. Conversations deleted: ${deletedConversations.length}`);
    console.log(`- Deleted by both users: ${deletedByBoth}`);
    console.log(`- Deleted due to inactivity: ${deletedByInactivity}`);

    return {
      success: true,
      conversationsDeleted: deletedConversations.length,
    };
  } catch (error) {
    console.error('Error in cleanup process:', error);

    // Log the error
    const errorLog: CleanupLog = {
      operation: 'conversations_cleanup',
      rows_affected: 0,
      details: {
        deleted_by_both: 0,
        deleted_by_inactivity: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      executed_at: new Date().toISOString(),
    };

    try {
      await supabaseAdmin.from('cleanup_logs').insert(errorLog);
    } catch (logError) {
      console.error('Failed to log error to cleanup_logs:', logError);
    }

    return {
      success: false,
      conversationsDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Execute the cleanup if run directly
if (require.main === module) {
  cleanupConversations().catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
}

export { cleanupConversations, CleanupResult };
