import { supabaseAdmin } from './supabaseAdmin';

interface CleanupResult {
  success: boolean;
  reportsDeleted: number;
  error?: string;
}

interface CleanupLog {
  operation: string;
  rows_affected: number;
  details: {
    dismissed_count?: number;
    resolved_count?: number;
    error?: string;
    timestamp: string;
  };
  executed_at: string;
}

async function cleanupReports(): Promise<CleanupResult> {
  try {
    const now = new Date();
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    console.log(`Cleaning up reports reviewed before: ${thirtyDaysAgoISO}`);
    console.log(`Current date: ${now.toISOString()}`);

    // Find reports to delete:
    // - reviewed_at is not null (has been reviewed)
    // - reviewed_at is at least 30 days ago
    // - status is not 'pending' (must be 'dismissed' or 'resolved')
    const { data: reports, error: findError } = await supabaseAdmin
      .from('reports')
      .select('id, status, reviewed_at')
      .not('reviewed_at', 'is', null)
      .lt('reviewed_at', thirtyDaysAgoISO)
      .neq('status', 'pending');

    if (findError) throw findError;

    if (!reports || reports.length === 0) {
      console.log('No reports to cleanup');
      return { success: true, reportsDeleted: 0 };
    }

    console.log(`Found ${reports.length} reports to cleanup`);

    // Separate reports by status for logging
    const dismissedCount = reports.filter((r) => r.status === 'dismissed').length;
    const resolvedCount = reports.filter((r) => r.status === 'resolved').length;

    // Delete reports
    const reportIds = reports.map((r) => r.id);
    const { data: deletedReports, error: deleteError } = await supabaseAdmin
      .from('reports')
      .delete()
      .in('id', reportIds)
      .select();

    if (deleteError) throw deleteError;

    if (!deletedReports || deletedReports.length !== reports.length) {
      throw new Error(
        `Failed to delete all reports. Expected: ${reports.length}, Deleted: ${deletedReports?.length || 0}`
      );
    }

    // Log cleanup operation
    const cleanupLog: CleanupLog = {
      operation: 'reports_cleanup',
      rows_affected: deletedReports.length,
      details: {
        dismissed_count: dismissedCount,
        resolved_count: resolvedCount,
        timestamp: now.toISOString(),
      },
      executed_at: now.toISOString(),
    };

    await supabaseAdmin.from('cleanup_logs').insert(cleanupLog);

    console.log(`Cleanup completed. Reports deleted: ${deletedReports.length}`);
    console.log(`- Dismissed reports: ${dismissedCount}`);
    console.log(`- Resolved reports: ${resolvedCount}`);

    return {
      success: true,
      reportsDeleted: deletedReports.length,
    };
  } catch (error) {
    console.error('Error in reports cleanup process:', error);

    // Log the error
    const errorLog: CleanupLog = {
      operation: 'reports_cleanup',
      rows_affected: 0,
      details: {
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
      reportsDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Execute the cleanup if run directly
if (require.main === module) {
  cleanupReports().catch((error) => {
    console.error('Reports cleanup failed:', error);
    process.exit(1);
  });
}

export { cleanupReports, CleanupResult };
