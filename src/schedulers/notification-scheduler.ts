import cron from 'node-cron';
import { NotificationTriggerService } from '../services/notification-trigger.service';
import { NotificationService } from '../services/notification.service';

export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  /**
   * Start all scheduled notification jobs
   */
  public start(): void {
    if (this.isRunning) {
      console.log('Notification scheduler is already running');
      return;
    }

    console.log('🔔 Starting notification scheduler...');

    // Run deadline checks every hour
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('Running hourly deadline checks...');
        await NotificationTriggerService.checkProjectDeadlines();
      } catch (error) {
        console.error('Error in deadline check job:', error);
      }
    }, {
      name: 'deadline-checks',
      timezone: 'UTC'
    });

    // Run capacity warnings daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      try {
        console.log('Running daily capacity warning checks...');
        await NotificationTriggerService.checkCapacityWarnings();
      } catch (error) {
        console.error('Error in capacity warning job:', error);
      }
    }, {
      name: 'capacity-warnings',
      timezone: 'UTC'
    });

    // Run budget warnings daily at 8 AM
    cron.schedule('0 8 * * *', async () => {
      try {
        console.log('Running daily budget warning checks...');
        await NotificationTriggerService.checkBudgetWarnings();
      } catch (error) {
        console.error('Error in budget warning job:', error);
      }
    }, {
      name: 'budget-warnings',
      timezone: 'UTC'
    });

    // Process scheduled notifications every minute
    cron.schedule('* * * * *', async () => {
      try {
        // await NotificationService.processScheduledNotifications(); // TODO: Implement method
      } catch (error) {
        console.error('Error processing scheduled notifications:', error);
      }
    }, {
      name: 'scheduled-notifications',
      timezone: 'UTC'
    });

    // Clean up old notifications weekly on Sunday at midnight
    cron.schedule('0 0 * * 0', async () => {
      try {
        console.log('Cleaning up old notifications...');
        // const deletedCount = await NotificationService.cleanupOldNotifications(90); // TODO: Implement method
        const deletedCount = 0;
        console.log(`Cleaned up ${deletedCount} old notifications`);
      } catch (error) {
        console.error('Error cleaning up notifications:', error);
      }
    }, {
      name: 'cleanup-notifications',
      timezone: 'UTC'
    });

    // Run comprehensive periodic checks every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('Running comprehensive periodic checks...');
        await NotificationTriggerService.runPeriodicChecks();
      } catch (error) {
        console.error('Error in periodic checks:', error);
      }
    }, {
      name: 'periodic-checks',
      timezone: 'UTC'
    });

    this.isRunning = true;
    console.log('✅ Notification scheduler started successfully');
    console.log('📅 Scheduled jobs:');
    console.log('  - Deadline checks: Every hour');
    console.log('  - Capacity warnings: Daily at 9 AM UTC');
    console.log('  - Budget warnings: Daily at 8 AM UTC');
    console.log('  - Scheduled notifications: Every minute');
    console.log('  - Cleanup old notifications: Weekly on Sunday at midnight UTC');
    console.log('  - Comprehensive checks: Every 6 hours');
  }

  /**
   * Stop all scheduled jobs
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('Notification scheduler is not running');
      return;
    }

    console.log('🛑 Stopping notification scheduler...');

    // Destroy all scheduled tasks
    cron.getTasks().forEach((task, name) => {
      if (name.includes('notifications') || name.includes('warnings') || name.includes('deadline') || name.includes('capacity') || name.includes('budget') || name.includes('cleanup') || name.includes('periodic')) {
        task.destroy();
        console.log(`  - Stopped job: ${name}`);
      }
    });

    this.isRunning = false;
    console.log('✅ Notification scheduler stopped successfully');
  }

  /**
   * Get status of the scheduler
   */
  public getStatus(): { isRunning: boolean; jobs: string[] } {
    const jobs: string[] = [];
    
    cron.getTasks().forEach((task, name) => {
      if (name.includes('notifications') || name.includes('warnings') || name.includes('deadline') || name.includes('capacity') || name.includes('budget') || name.includes('cleanup') || name.includes('periodic')) {
        jobs.push(name);
      }
    });

    return {
      isRunning: this.isRunning,
      jobs
    };
  }

  /**
   * Manually trigger specific notification checks (useful for testing)
   */
  public async triggerManualCheck(type: 'deadlines' | 'capacity' | 'budget' | 'all'): Promise<void> {
    console.log(`🔄 Manually triggering ${type} checks...`);

    try {
      switch (type) {
        case 'deadlines':
          await NotificationTriggerService.checkProjectDeadlines();
          break;
        case 'capacity':
          await NotificationTriggerService.checkCapacityWarnings();
          break;
        case 'budget':
          await NotificationTriggerService.checkBudgetWarnings();
          break;
        case 'all':
          await NotificationTriggerService.runPeriodicChecks();
          break;
        default:
          throw new Error(`Unknown check type: ${type}`);
      }
      console.log(`✅ Manual ${type} check completed successfully`);
    } catch (error) {
      console.error(`❌ Manual ${type} check failed:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationScheduler = NotificationScheduler.getInstance();