import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';

export interface EmailJobData {
  type: 'email';
  recipients: string[];
  template: string;
  context: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface DigestJobData {
  type: 'digest';
  userId: number;
  frequency: 'daily' | 'weekly';
}

export interface ScheduledNotificationJobData {
  type: 'scheduled';
  notificationId: number;
}

export type QueueJobData = EmailJobData | DigestJobData | ScheduledNotificationJobData;

export class NotificationQueueService {
  private redis!: Redis;
  private emailQueue!: Queue<EmailJobData>;
  private digestQueue!: Queue<DigestJobData>;
  private scheduledQueue!: Queue<ScheduledNotificationJobData>;

  constructor() {
    this.initializeRedis();
    this.initializeQueues();
    this.setupProcessors();
    this.setupCronJobs();
  }

  private initializeRedis(): void {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true
    };

    this.redis = new Redis(redisConfig);
  }

  private initializeQueues(): void {
    const queueConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0')
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    };

    this.emailQueue = new Bull('email-notifications', queueConfig);
    this.digestQueue = new Bull('digest-notifications', queueConfig);
    this.scheduledQueue = new Bull('scheduled-notifications', queueConfig);
  }

  private setupProcessors(): void {
    // Email queue processor
    this.emailQueue.process('send-bulk-email', 5, this.processBulkEmail.bind(this));
    this.emailQueue.process('send-single-email', 10, this.processSingleEmail.bind(this));

    // Digest queue processor
    this.digestQueue.process('daily-digest', 2, this.processDailyDigest.bind(this));
    this.digestQueue.process('weekly-digest', 1, this.processWeeklyDigest.bind(this));

    // Scheduled notifications processor
    this.scheduledQueue.process('process-scheduled', 5, this.processScheduledNotification.bind(this));

    // Error handling
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    const queues = [this.emailQueue, this.digestQueue, this.scheduledQueue];

    queues.forEach(queue => {
      queue.on('failed', (job, error) => {
        console.error(`Job ${job.id} failed:`, error.message);
        
        // Log to monitoring system if available
        if (process.env.NODE_ENV === 'production') {
          // Add your monitoring/alerting logic here
        }
      });

      queue.on('stalled', (job) => {
        console.warn(`Job ${job.id} stalled and will be retried`);
      });
    });
  }

  private setupCronJobs(): void {
    // Daily digest at 9 AM
    this.digestQueue.add('daily-digest', { type: 'digest', userId: 0, frequency: 'daily' }, {
      repeat: { cron: '0 9 * * *' },
      removeOnComplete: 5,
      removeOnFail: 3
    });

    // Weekly digest on Monday at 9 AM
    this.digestQueue.add('weekly-digest', { type: 'digest', userId: 0, frequency: 'weekly' }, {
      repeat: { cron: '0 9 * * 1' },
      removeOnComplete: 5,
      removeOnFail: 3
    });

    // Process scheduled notifications every minute
    this.scheduledQueue.add('process-scheduled', { type: 'scheduled', notificationId: 0 }, {
      repeat: { cron: '* * * * *' },
      removeOnComplete: 10,
      removeOnFail: 5
    });
  }

  /**
   * Add bulk email job to queue
   */
  async addBulkEmailJob(
    recipients: string[],
    template: string,
    context: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<Job<EmailJobData>> {
    const jobData: EmailJobData = {
      type: 'email',
      recipients,
      template,
      context,
      priority
    };

    const jobOptions = {
      priority: this.getPriorityValue(priority),
      delay: priority === 'low' ? 60000 : 0, // Delay low priority emails by 1 minute
    };

    return this.emailQueue.add('send-bulk-email', jobData, jobOptions);
  }

  /**
   * Add single email job to queue
   */
  async addSingleEmailJob(
    recipient: string,
    template: string,
    context: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<Job<EmailJobData>> {
    const jobData: EmailJobData = {
      type: 'email',
      recipients: [recipient],
      template,
      context,
      priority
    };

    const jobOptions = {
      priority: this.getPriorityValue(priority),
      delay: priority === 'critical' ? 0 : (priority === 'high' ? 1000 : 5000),
    };

    return this.emailQueue.add('send-single-email', jobData, jobOptions);
  }

  /**
   * Process bulk email job
   */
  private async processBulkEmail(job: Job<EmailJobData>): Promise<void> {
    const { recipients, template, context, priority } = job.data;

    try {
      job.progress(10);

      // TODO: Implement proper email service
      const result = { success: 0, failed: 0 };
      // const result = await EmailService.sendBulkEmail(recipients, {
      //   template,
      //   context,
      //   subject: '', // Will be filled by template
      //   priority: priority as any
      // });

      job.progress(100);

      console.log(`Bulk email job ${job.id} completed: ${result.success} sent, ${result.failed} failed`);

      if (result.failed > 0) {
        throw new Error(`${result.failed} emails failed to send`);
      }
    } catch (error) {
      console.error(`Bulk email job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Process single email job
   */
  private async processSingleEmail(job: Job<EmailJobData>): Promise<void> {
    const { recipients, template, context, priority } = job.data;

    try {
      // TODO: Implement proper email service
      const success = true;
      // const success = await EmailService.sendEmail({
      //   to: recipients[0],
      //   template,
      //   context,
      //   subject: '', // Will be filled by template
      //   priority: priority as any
      // });

      if (!success) {
        throw new Error('Failed to send email');
      }

      console.log(`Single email job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`Single email job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Process daily digest
   */
  private async processDailyDigest(job: Job<DigestJobData>): Promise<void> {
    try {
      // Logic to send daily digest emails
      console.log('Processing daily digest...');
      
      // This would typically:
      // 1. Find all users with daily digest enabled
      // 2. Gather their unread notifications from the last 24 hours
      // 3. Generate and send digest emails
      
      job.progress(100);
    } catch (error) {
      console.error('Daily digest job failed:', error);
      throw error;
    }
  }

  /**
   * Process weekly digest
   */
  private async processWeeklyDigest(job: Job<DigestJobData>): Promise<void> {
    try {
      // Logic to send weekly digest emails
      console.log('Processing weekly digest...');
      
      job.progress(100);
    } catch (error) {
      console.error('Weekly digest job failed:', error);
      throw error;
    }
  }

  /**
   * Process scheduled notifications
   */
  private async processScheduledNotification(job: Job<ScheduledNotificationJobData>): Promise<void> {
    try {
      // TODO: Implement proper notification service\n      // await NotificationService.processScheduledNotifications();
      job.progress(100);
    } catch (error) {
      console.error('Scheduled notification job failed:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<string, any>> {
    const [emailStats, digestStats, scheduledStats] = await Promise.all([
      this.emailQueue.getJobCounts(),
      this.digestQueue.getJobCounts(),
      this.scheduledQueue.getJobCounts()
    ]);

    return {
      email: emailStats,
      digest: digestStats,
      scheduled: scheduledStats
    };
  }

  /**
   * Clean completed jobs
   */
  async cleanCompletedJobs(): Promise<void> {
    await Promise.all([
      this.emailQueue.clean(24 * 60 * 60 * 1000, 'completed'), // 24 hours
      this.digestQueue.clean(7 * 24 * 60 * 60 * 1000, 'completed'), // 7 days
      this.scheduledQueue.clean(24 * 60 * 60 * 1000, 'completed') // 24 hours
    ]);
  }

  /**
   * Get priority value for Bull queue
   */
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'critical': return 1;
      case 'high': return 2;
      case 'normal': return 3;
      case 'low': return 4;
      default: return 3;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    await Promise.all([
      this.emailQueue.close(),
      this.digestQueue.close(),
      this.scheduledQueue.close(),
      this.redis.disconnect()
    ]);
  }
}

export const NotificationQueue = new NotificationQueueService();
export default NotificationQueue;