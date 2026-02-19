import { generateEmailTemplate } from './base.template';

export interface TaskLockedTemplateData {
  taskTitle: string;
  assigneeName: string;
  projectName: string;
  dueDate: Date | string | null;
  lockedAt: Date | string;
}

export interface UnlockRequestNotificationData {
  taskTitle: string;
  requesterName: string;
  reason: string;
  projectName: string;
  recipientName: string;
}

export interface UnlockDecisionNotificationData {
  taskTitle: string;
  requesterName: string;
  decision: 'approved' | 'rejected';
  reviewNote?: string | null;
  reviewerName: string;
  projectName: string;
}

function formatDateString(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getTaskLockedNotificationTemplate(data: TaskLockedTemplateData): string {
  const content = `
    <p>Hello <strong>${data.assigneeName}</strong>,</p>
    <p>Your task <strong>"${data.taskTitle}"</strong> has been <span style="color: #dc2626; font-weight: bold;">automatically locked</span> because it has exceeded its due date.</p>
    <p>You will not be able to make changes to this task until an unlock is approved.</p>
    <p>To request an unlock, please go to the task details and submit an unlock request with a reason.</p>
  `;

  const details: Record<string, any> = {
    'Task': data.taskTitle,
    'Project': data.projectName,
    'Due Date': formatDateString(data.dueDate),
    'Locked At': formatDateString(data.lockedAt),
  };

  return generateEmailTemplate({
    title: 'Task Auto-Locked',
    content,
    actionType: 'delete',
    entityName: 'Task',
    details,
  });
}

export function getTaskLockedNotificationText(data: TaskLockedTemplateData): string {
  return `Hello ${data.assigneeName},\n\nYour task "${data.taskTitle}" has been automatically locked because it has exceeded its due date (${formatDateString(data.dueDate)}).\n\nYou will not be able to make changes to this task until an unlock is approved. To request an unlock, please go to the task details and submit an unlock request with a reason.\n\nProject: ${data.projectName}\nLocked At: ${formatDateString(data.lockedAt)}`;
}

export function getUnlockRequestNotificationTemplate(data: UnlockRequestNotificationData): string {
  const content = `
    <p>Hello <strong>${data.recipientName}</strong>,</p>
    <p><strong>${data.requesterName}</strong> has submitted an unlock request for the task <strong>"${data.taskTitle}"</strong>.</p>
    <p>Please review the request and approve or reject it.</p>
  `;

  const details: Record<string, any> = {
    'Task': data.taskTitle,
    'Project': data.projectName,
    'Requested By': data.requesterName,
    'Reason': data.reason,
  };

  return generateEmailTemplate({
    title: 'Unlock Request Submitted',
    content,
    actionType: 'update',
    entityName: 'Task',
    details,
  });
}

export function getUnlockRequestNotificationText(data: UnlockRequestNotificationData): string {
  return `Hello ${data.recipientName},\n\n${data.requesterName} has submitted an unlock request for the task "${data.taskTitle}".\n\nReason: ${data.reason}\nProject: ${data.projectName}\n\nPlease review the request and approve or reject it.`;
}

export function getUnlockDecisionNotificationTemplate(data: UnlockDecisionNotificationData): string {
  const isApproved = data.decision === 'approved';

  const content = `
    <p>Hello <strong>${data.requesterName}</strong>,</p>
    <p>Your unlock request for task <strong>"${data.taskTitle}"</strong> has been
      <span style="color: ${isApproved ? '#16a34a' : '#dc2626'}; font-weight: bold;">
        ${isApproved ? 'APPROVED' : 'REJECTED'}
      </span> by <strong>${data.reviewerName}</strong>.
    </p>
    ${isApproved
      ? '<p>The task is now unlocked and you can continue working on it.</p>'
      : '<p>The task remains locked. Please contact your manager for further guidance.</p>'
    }
    ${data.reviewNote ? `<p><strong>Reviewer Note:</strong> ${data.reviewNote}</p>` : ''}
  `;

  const details: Record<string, any> = {
    'Task': data.taskTitle,
    'Project': data.projectName,
    'Decision': isApproved ? 'Approved' : 'Rejected',
    'Reviewed By': data.reviewerName,
  };

  if (data.reviewNote) {
    details['Review Note'] = data.reviewNote;
  }

  return generateEmailTemplate({
    title: `Unlock Request ${isApproved ? 'Approved' : 'Rejected'}`,
    content,
    actionType: isApproved ? 'create' : 'delete',
    entityName: 'Task',
    details,
  });
}

export function getUnlockDecisionNotificationText(data: UnlockDecisionNotificationData): string {
  const isApproved = data.decision === 'approved';
  return `Hello ${data.requesterName},\n\nYour unlock request for task "${data.taskTitle}" has been ${isApproved ? 'APPROVED' : 'REJECTED'} by ${data.reviewerName}.\n\n${isApproved ? 'The task is now unlocked and you can continue working on it.' : 'The task remains locked. Please contact your manager for further guidance.'}${data.reviewNote ? `\n\nReviewer Note: ${data.reviewNote}` : ''}\n\nProject: ${data.projectName}`;
}
