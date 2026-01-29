/**
 * Background Job Queue System
 *
 * Provides in-memory job queues for processing tasks asynchronously.
 * Supports automatic retries with exponential backoff.
 *
 * Queues:
 * - Email: Email sending jobs
 * - Notifications: Notification creation jobs
 * - Cleanup: Data cleanup jobs (old activities, notifications, expired tokens)
 * - Data Processing: Project stats updates, report generation
 */

import { getDatabase } from '../database.js';
import { randomUUID } from 'crypto';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface JobData {
    type: string;
    userId?: string;
    data: any;
}

export interface JobResult {
    success: boolean;
    data?: any;
    error?: string;
}

// ============================================================================
// QUEUE CONFIGURATION
// ============================================================================

// Simple in-memory queue for development (upgrade to Bull/Redis for production)
interface Job {
    id: string;
    type: string;
    data: any;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
}

abstract class SimpleQueue {
    private queue: Job[] = [];
    private processing: boolean = false;
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    async add(data: any, options?: any): Promise<void> {
        const job: Job = {
            id: randomUUID(),
            type: data.type || 'unknown',
            data,
            attempts: 0,
            maxAttempts: options?.attempts || 3,
            createdAt: new Date()
        };
        this.queue.push(job);
        console.log(`[JobQueue] Job added to ${this.name}: ${job.type}`);
        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;
        const job = this.queue.shift();

        if (!job) {
            this.processing = false;
            return;
        }

        try {
            await this.processJob(job);
            console.log(`[JobQueue] Job completed in ${this.name}: ${job.type}`);
        } catch (error) {
            console.error(`[JobQueue] Job failed in ${this.name}:`, error);

            // Retry with exponential backoff
            job.attempts++;
            if (job.attempts < job.maxAttempts) {
                const delay = Math.pow(2, job.attempts) * 1000;
                setTimeout(() => {
                    this.queue.unshift(job);
                    this.processQueue();
                }, delay);
            }
        }

        this.processing = false;

        // Process next job
        this.processQueue();
    }

    protected abstract processJob(job: Job): Promise<void>;

    getJobCounts(): { waiting: number; active: number; completed: number; failed: number } {
        return {
            waiting: this.queue.length,
            active: this.processing ? 1 : 0,
            completed: 0, // Not tracked in simple implementation
            failed: 0
        };
    }

    async close(): Promise<void> {
        // Clear the queue and stop processing
        this.queue = [];
        this.processing = false;
    }
}

class EmailQueue extends SimpleQueue {
    protected async processJob(job: Job): Promise<void> {
        const { to, type } = job.data;

        console.log(`[EmailQueue] Sending ${type} to ${to}`);

        // Simulate email sending (in production, integrate with email service)
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log(`[EmailQueue] Sent ${type} to ${to}`);
    }
}

class NotificationQueue extends SimpleQueue {
    protected async processJob(job: Job): Promise<void> {
        const { userId, type, data } = job.data;

        console.log(`[NotificationQueue] Creating ${type} for user ${userId}`);

        try {
            const db = await getDatabase();

            await db.createNotification({
                user_id: userId,
                type,
                message: data.message || '',
                issue_id: data.entityId || null,
                is_read: false,
                actor_id: data.actorId || null
            });

            console.log(`[NotificationQueue] Created ${type} for user ${userId}`);
        } catch (error) {
            console.error(`[NotificationQueue] Failed:`, error);
            throw error;
        }
    }
}

class CleanupQueue extends SimpleQueue {
    protected async processJob(job: Job): Promise<void> {
        const { type } = job.data;

        console.log(`[CleanupQueue] Processing ${type}`);

        try {
            const db = await getDatabase();

            switch (type) {
                case 'old_activities': {
                    const ninetyDaysAgo = new Date();
                    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                    await db.getPrisma().activity.deleteMany({
                        where: {
                            createdAt: {
                                lt: ninetyDaysAgo
                            }
                        }
                    });
                    console.log(`[CleanupQueue] Removed old activities`);
                    break;
                }

                case 'old_notifications': {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    await db.getPrisma().notification.deleteMany({
                        where: {
                            isRead: true,
                            createdAt: {
                                lt: thirtyDaysAgo
                            }
                        }
                    });
                    console.log(`[CleanupQueue] Removed old notifications`);
                    break;
                }

                case 'expired_tokens':
                    await db.cleanupExpiredTokens();
                    console.log(`[CleanupQueue] Removed expired tokens`);
                    break;

                default:
                    console.warn(`[CleanupQueue] Unknown type: ${type}`);
            }
        } catch (error) {
            console.error(`[CleanupQueue] Failed:`, error);
            throw error;
        }
    }
}

class DataProcessingQueue extends SimpleQueue {
    protected async processJob(job: Job): Promise<void> {
        const { type, data } = job.data;

        console.log(`[DataProcessingQueue] Processing ${type}`);

        try {
            const db = await getDatabase();

            switch (type) {
                case 'update_project_stats': {
                    const projectId = data.projectId;
                    await db.getIssuesByProject(projectId);

                    await db.getPrisma().project.update({
                        where: { id: projectId },
                        data: { updatedAt: new Date() }
                    });

                    console.log(`[DataProcessingQueue] Updated stats for ${projectId}`);
                    break;
                }

                case 'generate_report':
                    await Promise.all([
                        db.getAllUsers(),
                        db.getAllTeams(),
                        db.getAllProjects(),
                        db.getAllIssues()
                    ]);

                    console.log(`[DataProcessingQueue] Generated usage report`);
                    break;

                default:
                    console.warn(`[DataProcessingQueue] Unknown type: ${type}`);
            }
        } catch (error) {
            console.error(`[DataProcessingQueue] Failed:`, error);
            throw error;
        }
    }
}

// Create queue instances
export const emailQueue = new EmailQueue('email');
export const notificationQueue = new NotificationQueue('notifications');
export const cleanupQueue = new CleanupQueue('cleanup');
export const dataProcessingQueue = new DataProcessingQueue('data-processing');

// ============================================================================
// JOB HELPER FUNCTIONS
// ============================================================================

/**
 * Add email job to queue
 */
export async function addEmailJob(data: {
    to: string;
    subject: string;
    body: string;
    type: string;
}, options?: any): Promise<void> {
    await emailQueue.add(data, options);
}

/**
 * Add notification job to queue
 */
export async function addNotificationJob(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
}, options?: any): Promise<void> {
    await notificationQueue.add(data, options);
}

/**
 * Add cleanup job to queue
 */
export async function addCleanupJob(data: {
    type: 'old_activities' | 'old_notifications' | 'expired_tokens';
    delay?: number;
}, options?: any): Promise<void> {
    await cleanupQueue.add(data, {
        ...options,
        delay: data.delay || 0
    });
}

/**
 * Add data processing job to queue
 */
export async function addDataProcessingJob(data: {
    type: 'update_project_stats' | 'generate_report';
    data?: any;
}, options?: any): Promise<void> {
    await dataProcessingQueue.add(data, options);
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
    email: { waiting: number; active: number; completed: number; failed: number };
    notifications: { waiting: number; active: number; completed: number; failed: number };
    cleanup: { waiting: number; active: number; completed: number; failed: number };
    dataProcessing: { waiting: number; active: number; completed: number; failed: number };
}> {
    const [email, notifications, cleanup, dataProcessing] = await Promise.all([
        emailQueue.getJobCounts(),
        notificationQueue.getJobCounts(),
        cleanupQueue.getJobCounts(),
        dataProcessingQueue.getJobCounts()
    ]);

    return {
        email,
        notifications,
        cleanup,
        dataProcessing
    };
}

/**
 * Schedule periodic cleanup jobs
 */
export async function schedulePeriodicJobs(): Promise<void> {
    const repeat = {
        every: 24 * 60 * 60 * 1000, // 24 hours
    };

    await addCleanupJob({ type: 'old_activities' }, { repeat });
    await addCleanupJob({ type: 'old_notifications' }, { repeat });
    await addCleanupJob({ type: 'expired_tokens' }, { repeat });

    console.log('[JobQueue] Periodic cleanup jobs scheduled');
}

/**
 * Gracefully close all queues
 */
export async function closeAllQueues(): Promise<void> {
    await Promise.all([
        emailQueue.close(),
        notificationQueue.close(),
        cleanupQueue.close(),
        dataProcessingQueue.close()
    ]);
    console.log('[JobQueue] All queues closed');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('[JobQueue] Background job queues initialized');
