import { Request, Response } from 'express';
import { CronService } from './cron.service';
import { ProjectTasksService } from '../tasks/project-tasks.service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';

export class CronController {
  private cronService: CronService;
  private tasksService: ProjectTasksService;

  constructor() {
    this.cronService = new CronService();
    this.tasksService = new ProjectTasksService();
  }

  /**
   * @swagger
   * /api/v1/cron/lead-closing-reminder:
   *   post:
   *     summary: Send lead closing reminder emails for overdue leads
   *     description: >
   *       Finds all leads where status != CLOSED and expectedCloseDate < today,
   *       sends reminder emails to lead owners, admins, and ops managers.
   *       Deduplication is handled via the CommonReminderLog table using
   *       entityType=LEAD, type=LEAD_CLOSING_REMINDER, and sentDate.
   *       This endpoint is meant to be triggered by an external scheduler (e.g., cron job).
   *     tags: [Cron]
   *     parameters:
   *       - in: header
   *         name: x-cron-secret
   *         required: false
   *         schema:
   *           type: string
   *         description: Secret key to authenticate cron requests (required if CRON_SECRET env var is set)
   *     responses:
   *       200:
   *         description: Reminder job executed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     executedAt:
   *                       type: string
   *                       format: date-time
   *                     totalOverdueLeads:
   *                       type: integer
   *                       description: Total leads with expectedCloseDate < today and status != CLOSED
   *                     remindersAlreadySentToday:
   *                       type: integer
   *                       description: Leads skipped because reminder was already sent today (from CommonReminderLog)
   *                     newRemindersSent:
   *                       type: integer
   *                       description: New reminder emails successfully sent
   *                     emailsFailed:
   *                       type: integer
   *                       description: Emails that failed to send
   *                     results:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           leadId:
   *                             type: string
   *                           leadTitle:
   *                             type: string
   *                           companyName:
   *                             type: string
   *                           daysOverdue:
   *                             type: integer
   *                           recipientCount:
   *                             type: integer
   *                           emailSent:
   *                             type: boolean
   *       401:
   *         description: Missing or invalid cron secret
   *       500:
   *         description: Internal server error
   */
  sendLeadClosingReminders = asyncHandler(async (req: Request, res: Response) => {
    const summary = await this.cronService.sendLeadClosingReminders();

    res.json(successResponse(summary));
  });

  /**
   * @swagger
   * /api/v1/cron/auto-lock-tasks:
   *   post:
   *     summary: Auto-lock overdue tasks
   *     description: >
   *       Finds all tasks where dueDate < today, status != done, and isLocked = false,
   *       then locks them and sends notification emails to assignees.
   *     tags: [Cron]
   *     parameters:
   *       - in: header
   *         name: x-cron-secret
   *         required: false
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Auto-lock job executed successfully
   */
  autoLockOverdueTasks = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.tasksService.autoLockOverdueTasks();

    res.json(successResponse(result));
  });
}
