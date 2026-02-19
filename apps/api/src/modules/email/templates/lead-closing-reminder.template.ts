import { generateEmailTemplate } from './base.template';

export interface LeadClosingReminderData {
  leadTitle: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  expectedCloseDate: string;
  daysOverdue: number;
  leadStatus: string;
  businessStage: string;
  estimatedValue: string | null;
  leadOwners: string[];
}

/**
 * Generate HTML email for lead closing reminder
 */
export function getLeadClosingReminderTemplate(data: LeadClosingReminderData): string {
  const content = `
    <p>This is an automated reminder that the following lead has passed its expected closing date and requires attention.</p>
    <p style="
      background-color: #fef3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 12px 16px;
      color: #856404;
      font-weight: 500;
      margin: 16px 0;
    ">
      ⚠️ This lead is <strong>${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''}</strong> past its expected close date.
    </p>
    ${data.leadOwners.length > 0 ? `<p><strong>Assigned to:</strong> ${data.leadOwners.join(', ')}</p>` : ''}
    <p>Please review this lead and take appropriate action — either update the expected close date, advance the lead to the next stage, or close it.</p>
  `;

  return generateEmailTemplate({
    title: 'Lead Closing Reminder',
    content,
    actionType: 'update',
    entityName: 'Lead Details',
    details: {
      'Lead Title': data.leadTitle,
      'Company': data.companyName,
      ...(data.contactName && { 'Contact': data.contactName }),
      ...(data.contactEmail && { 'Contact Email': data.contactEmail }),
      'Expected Close Date': data.expectedCloseDate,
      'Days Overdue': `${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''}`,
      'Current Status': data.leadStatus,
      'Business Stage': data.businessStage,
      ...(data.estimatedValue && { 'Estimated Value': data.estimatedValue }),
    },
  });
}

/**
 * Generate plain text email for lead closing reminder
 */
export function getLeadClosingReminderText(data: LeadClosingReminderData): string {
  return `
LEAD CLOSING REMINDER - Greenex Environmental

This is an automated reminder that the following lead has passed its expected closing date and requires attention.

Lead Details:
- Lead Title: ${data.leadTitle}
- Company: ${data.companyName}
${data.contactName ? `- Contact: ${data.contactName}` : ''}
${data.contactEmail ? `- Contact Email: ${data.contactEmail}` : ''}
- Expected Close Date: ${data.expectedCloseDate}
- Days Overdue: ${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''}
- Current Status: ${data.leadStatus}
- Business Stage: ${data.businessStage}
${data.estimatedValue ? `- Estimated Value: ${data.estimatedValue}` : ''}
${data.leadOwners.length > 0 ? `- Assigned to: ${data.leadOwners.join(', ')}` : ''}

Please review this lead and take appropriate action - either update the expected close date, advance the lead to the next stage, or close it.

This notification was sent by Greenex Environmental CRM System.
  `.trim();
}
