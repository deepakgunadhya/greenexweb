import prisma from '../../config/database';
import { EmailService } from '../email/email.service';
import {
  getLeadClosingReminderTemplate,
  getLeadClosingReminderText,
  LeadClosingReminderData,
} from '../email/templates/lead-closing-reminder.template';
import { logger } from '../../utils/logger';

const ENTITY_TYPE_LEAD = 'LEAD';
const REMINDER_TYPE_LEAD_CLOSING = 'LEAD_CLOSING_REMINDER';

interface ReminderResult {
  leadId: string;
  leadTitle: string;
  companyName: string;
  daysOverdue: number;
  recipientCount: number;
  emailSent: boolean;
}

export interface LeadClosingReminderSummary {
  executedAt: string;
  totalOverdueLeads: number;
  remindersAlreadySentToday: number;
  newRemindersSent: number;
  emailsFailed: number;
  results: ReminderResult[];
}

export class CronService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Find overdue leads and send closing reminder emails
   * - Finds leads where status != 'CLOSED' and expectedCloseDate < today
   * - Sends emails to lead owners + Admins + Ops Managers
   * - Prevents duplicate reminders for the same lead on the same day via CommonReminderLog
   */
  async sendLeadClosingReminders(): Promise<LeadClosingReminderSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Find all overdue leads (not closed, not deleted, expectedCloseDate < today)
    const overdueLeads = await prisma.lead.findMany({
      where: {
        isDeleted: false,
        status: {
          not: 'CLOSED',
        },
        expectedCloseDate: {
          lt: today,
          not: null,
        },
      },
      include: {
        organization: {
          select: { name: true },
        },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // 2. Check which leads already received a reminder today via CommonReminderLog
    const overdueLeadIds = overdueLeads.map((lead) => lead.id);

    const existingLogs = await prisma.commonReminderLog.findMany({
      where: {
        entityId: { in: overdueLeadIds },
        entityType: ENTITY_TYPE_LEAD,
        type: REMINDER_TYPE_LEAD_CLOSING,
        sentDate: todayStr,
      },
      select: {
        entityId: true,
      },
    });

    const alreadySentLeadIds = new Set(existingLogs.map((log) => log.entityId));
    const leadsNeedingReminder = overdueLeads.filter(
      (lead) => !alreadySentLeadIds.has(lead.id)
    );
    const alreadySentCount = overdueLeads.length - leadsNeedingReminder.length;

    // 3. Get admin and ops manager emails (dynamic role-based)
    const adminAndOpsEmails = await this.getAdminAndOpsManagerEmails();

    // 4. Process each overdue lead
    const results: ReminderResult[] = [];
    let emailsFailed = 0;

    for (const lead of leadsNeedingReminder) {
      const daysOverdue = Math.floor(
        (today.getTime() - new Date(lead.expectedCloseDate!).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Collect all recipients: lead owners + admins + ops managers
      const leadOwnerEmails = lead.users.map((u) => u.email);
      const allRecipients = [...new Set([...leadOwnerEmails, ...adminAndOpsEmails])];

      if (allRecipients.length === 0) {
        logger.warn(`No recipients found for lead ${lead.id} (${lead.title})`);
        results.push({
          leadId: lead.id,
          leadTitle: lead.title,
          companyName: lead.organization?.name || lead.companyName || 'N/A',
          daysOverdue,
          recipientCount: 0,
          emailSent: false,
        });
        emailsFailed++;
        continue;
      }

      const templateData: LeadClosingReminderData = {
        leadTitle: lead.title,
        companyName: lead.organization?.name || lead.companyName || 'N/A',
        contactName: lead.contactName,
        contactEmail: lead.contactEmail,
        expectedCloseDate: new Date(lead.expectedCloseDate!).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        daysOverdue,
        leadStatus: lead.status,
        businessStage: lead.businessStage,
        estimatedValue: lead.estimatedValue ? `${lead.estimatedValue}` : null,
        leadOwners: lead.users.map((u) => `${u.firstName} ${u.lastName}`),
      };

      const html = getLeadClosingReminderTemplate(templateData);
      const text = getLeadClosingReminderText(templateData);

      const emailSent = await this.emailService.sendEmail({
        to: allRecipients,
        subject: `Lead Closing Reminder: ${lead.title} - ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
        html,
        text,
      });

      if (emailSent) {
        // Log the reminder in the common log table to prevent duplicates
        await prisma.commonReminderLog.create({
          data: {
            entityId: lead.id,
            entityType: ENTITY_TYPE_LEAD,
            type: REMINDER_TYPE_LEAD_CLOSING,
            sentDate: todayStr,
            recipients: allRecipients,
          },
        });
      } else {
        emailsFailed++;
      }

      results.push({
        leadId: lead.id,
        leadTitle: lead.title,
        companyName: lead.organization?.name || lead.companyName || 'N/A',
        daysOverdue,
        recipientCount: allRecipients.length,
        emailSent,
      });
    }

    const summary: LeadClosingReminderSummary = {
      executedAt: new Date().toISOString(),
      totalOverdueLeads: overdueLeads.length,
      remindersAlreadySentToday: alreadySentCount,
      newRemindersSent: results.filter((r) => r.emailSent).length,
      emailsFailed,
      results,
    };

    logger.info('Lead closing reminder job completed', {
      total: summary.totalOverdueLeads,
      sent: summary.newRemindersSent,
      skipped: summary.remindersAlreadySentToday,
      failed: summary.emailsFailed,
    });

    return summary;
  }

  /**
   * Get emails for users with Super Admin or Ops Manager roles
   */
  private async getAdminAndOpsManagerEmails(): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            role: {
              name: {
                in: ['Super Admin', 'Ops Manager'],
              },
            },
          },
        },
      },
      select: {
        email: true,
      },
    });

    return users.map((u) => u.email);
  }
}
