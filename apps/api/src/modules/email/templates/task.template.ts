import { generateEmailTemplate } from './base.template';

export interface TaskAssignedTemplateData {
    taskId: string;
    taskTitle: string;
    taskDescription?: string;
    assigneeName: string;
    assigneeEmail: string;
    assignedByName: string;
    dueDate?: Date | null;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    status?: string;
    projectName?: string;
    clientName?: string;
    serviceName?: string;
    checklistLink?: string;
    notes?: string;
    assignedAt: Date;
}

export interface TaskUpdatedTemplateData extends TaskAssignedTemplateData {
    updatedByName: string;
    changes?: Record<string, { from: any; to: any }>;
}

/**
 * Get priority badge display
 */
function getPriorityDisplay(priority?: string): string {
    const priorityMap: Record<string, { label: string; emoji: string }> = {
        low: { label: 'Low', emoji: '🟢' },
        medium: { label: 'Medium', emoji: '🟡' },
        high: { label: 'High', emoji: '🟠' },
        urgent: { label: 'Urgent', emoji: '🔴' },
    };

    if (!priority) return 'N/A';
    const config = priorityMap[priority.toLowerCase()] || { label: priority, emoji: '⚪' };
    return `${config.emoji} ${config.label}`;
}

/**
 * Format date for display
 */
function formatDate(date?: Date | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Format status for display
 */
function formatStatus(status?: string): string {
    if (!status) return 'N/A';
    return status
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * HTML template for task assignment notification (sent to assignee)
 */
export function getTaskAssignedNotificationTemplate(data: TaskAssignedTemplateData): string {
    const content = `
    <p>Hello <strong>${data.assigneeName}</strong>,</p>
    <p>A new task has been assigned to you by <strong>${data.assignedByName}</strong>.</p>
    <p>Please review the task details below and take necessary action.</p>
  `;

    const details: Record<string, any> = {
        'Task Title': data.taskTitle,
        Description: data.taskDescription || 'N/A',
        Priority: getPriorityDisplay(data.priority),
        'Due Date': formatDate(data.dueDate),
        Status: formatStatus(data.status),
    };

    if (data.projectName) {
        details['Project'] = data.projectName;
    }

    if (data.clientName) {
        details['Client'] = data.clientName;
    }

    if (data.serviceName) {
        details['Service'] = data.serviceName;
    }

    if (data.checklistLink) {
        details['Checklist'] = `<a href="${data.checklistLink}" style="color: #0d7a3a;">View Checklist</a>`;
    }

    details['Assigned By'] = data.assignedByName;
    details['Assigned On'] = data.assignedAt.toLocaleString();

    if (data.notes) {
        details['Notes'] = data.notes;
    }

    return generateEmailTemplate({
        title: 'New Task Assigned to You',
        content,
        actionType: 'create',
        entityName: 'Task Details',
        details,
    });
}

/**
 * Plain text version of task assignment notification
 */
export function getTaskAssignedNotificationText(data: TaskAssignedTemplateData): string {
    return `NEW TASK ASSIGNED

Hello ${data.assigneeName},

A new task has been assigned to you by ${data.assignedByName}.

TASK DETAILS:
- Title: ${data.taskTitle}
- Description: ${data.taskDescription || 'N/A'}
- Priority: ${data.priority?.toUpperCase() || 'N/A'}
- Due Date: ${formatDate(data.dueDate)}
- Status: ${formatStatus(data.status)}
${data.projectName ? `- Project: ${data.projectName}\n` : ''}${data.clientName ? `- Client: ${data.clientName}\n` : ''}${data.serviceName ? `- Service: ${data.serviceName}\n` : ''}${data.checklistLink ? `- Checklist: ${data.checklistLink}\n` : ''}
Assigned By: ${data.assignedByName}
Assigned On: ${data.assignedAt.toLocaleString()}
${data.notes ? `\nNotes:\n${data.notes}\n` : ''}
Please take action on this task promptly.

Best regards,
Greenex Environmental Team`;
}

/**
 * HTML template for task assignment confirmation (sent to creator/assigner)
 */
export function getTaskAssignedConfirmationTemplate(data: TaskAssignedTemplateData): string {
    const content = `
    <p>Hello <strong>${data.assignedByName}</strong>,</p>
    <p>Your task has been successfully created and assigned to <strong>${data.assigneeName}</strong>.</p>
    <p>They have been notified via email.</p>
  `;

    return generateEmailTemplate({
        title: 'Task Created Successfully',
        content,
        actionType: 'create',
        entityName: 'Task Summary',
        details: {
            'Task Title': data.taskTitle,
            'Assigned To': data.assigneeName,
            'Assignee Email': data.assigneeEmail,
            Priority: getPriorityDisplay(data.priority),
            'Due Date': formatDate(data.dueDate),
            Project: data.projectName || 'N/A',
            'Created On': data.assignedAt.toLocaleString(),
        },
    });
}

/**
 * Plain text version of task assignment confirmation
 */
export function getTaskAssignedConfirmationText(data: TaskAssignedTemplateData): string {
    return `TASK CREATED SUCCESSFULLY

Hello ${data.assignedByName},

Your task has been successfully created and assigned to ${data.assigneeName}.

TASK SUMMARY:
- Title: ${data.taskTitle}
- Assigned To: ${data.assigneeName} (${data.assigneeEmail})
- Priority: ${data.priority?.toUpperCase() || 'N/A'}
- Due Date: ${formatDate(data.dueDate)}
- Project: ${data.projectName || 'N/A'}
- Created On: ${data.assignedAt.toLocaleString()}

The assignee has been notified via email.

Best regards,
Greenex Environmental Team`;
}

/**
 * HTML template for task update notification (sent to assignee)
 */
export function getTaskUpdatedNotificationTemplate(data: TaskUpdatedTemplateData): string {
    const content = `
    <p>Hello <strong>${data.assigneeName}</strong>,</p>
    <p>A task assigned to you has been updated by <strong>${data.updatedByName}</strong>.</p>
    <p>Please review the updated details below.</p>
  `;

    const details: Record<string, any> = {
        'Task Title': data.taskTitle,
        Priority: getPriorityDisplay(data.priority),
        'Due Date': formatDate(data.dueDate),
        Status: formatStatus(data.status),
    };

    if (data.projectName) {
        details['Project'] = data.projectName;
    }

    // Add changes summary if provided
    if (data.changes && Object.keys(data.changes).length > 0) {
        Object.entries(data.changes).forEach(([key, value]) => {
            details[`${key} (Changed)`] = `${value.from || 'N/A'} → ${value.to || 'N/A'}`;
        });
    }

    details['Updated By'] = data.updatedByName;
    details['Updated On'] = new Date().toLocaleString();

    return generateEmailTemplate({
        title: 'Task Updated',
        content,
        actionType: 'update',
        entityName: 'Updated Task Details',
        details,
    });
}

/**
 * Plain text version of task update notification
 */
export function getTaskUpdatedNotificationText(data: TaskUpdatedTemplateData): string {
    let changesText = '';
    if (data.changes && Object.keys(data.changes).length > 0) {
        changesText = '\nCHANGES MADE:\n';
        Object.entries(data.changes).forEach(([key, value]) => {
            changesText += `- ${key}: ${value.from || 'N/A'} → ${value.to || 'N/A'}\n`;
        });
    }

    return `TASK UPDATED

Hello ${data.assigneeName},

A task assigned to you has been updated by ${data.updatedByName}.

TASK DETAILS:
- Title: ${data.taskTitle}
- Priority: ${data.priority?.toUpperCase() || 'N/A'}
- Due Date: ${formatDate(data.dueDate)}
- Status: ${formatStatus(data.status)}
${data.projectName ? `- Project: ${data.projectName}\n` : ''}${changesText}
Updated By: ${data.updatedByName}
Updated On: ${new Date().toLocaleString()}

Please review the changes and take necessary action.

Best regards,
Greenex Environmental Team`;
}

/**
 * HTML template for task reassignment (sent to new assignee)
 */
export function getTaskReassignedNotificationTemplate(
    data: TaskAssignedTemplateData,
    previousAssigneeName: string
): string {
    const content = `
    <p>Hello <strong>${data.assigneeName}</strong>,</p>
    <p>A task has been reassigned to you from <strong>${previousAssigneeName}</strong> by <strong>${data.assignedByName}</strong>.</p>
    <p>Please review the task details below and continue the work.</p>
  `;

    const details: Record<string, any> = {
        'Task Title': data.taskTitle,
        Description: data.taskDescription || 'N/A',
        'Previous Assignee': previousAssigneeName,
        Priority: getPriorityDisplay(data.priority),
        'Due Date': formatDate(data.dueDate),
        Status: formatStatus(data.status),
    };

    if (data.projectName) {
        details['Project'] = data.projectName;
    }

    details['Reassigned By'] = data.assignedByName;
    details['Reassigned On'] = new Date().toLocaleString();

    return generateEmailTemplate({
        title: 'Task Reassigned to You',
        content,
        actionType: 'update',
        entityName: 'Task Details',
        details,
    });
}

/**
 * HTML template for task unassignment (sent to previous assignee)
 */
export function getTaskUnassignedNotificationTemplate(
    data: TaskAssignedTemplateData,
    unassignedByName: string,
    newAssigneeName: string
): string {
    const content = `
    <p>Hello <strong>${data.assigneeName}</strong>,</p>
    <p>You have been unassigned from the following task by <strong>${unassignedByName}</strong>.</p>
    <p>The task has been reassigned to <strong>${newAssigneeName}</strong>.</p>
  `;

    return generateEmailTemplate({
        title: 'Task Reassigned',
        content,
        actionType: 'update',
        entityName: 'Task Details',
        details: {
            'Task Title': data.taskTitle,
            'New Assignee': newAssigneeName,
            'Reassigned By': unassignedByName,
            'Reassigned On': new Date().toLocaleString(),
        },
    });
}

/**
 * HTML template for task deletion notification
 */
export function getTaskDeletedNotificationTemplate(data: TaskAssignedTemplateData, deletedByName: string): string {
    const content = `
    <p>Hello <strong>${data.assigneeName}</strong>,</p>
    <p>A task that was assigned to you has been deleted by <strong>${deletedByName}</strong>.</p>
    <p>No further action is required from you on this task.</p>
  `;

    return generateEmailTemplate({
        title: 'Task Deleted',
        content,
        actionType: 'delete',
        entityName: 'Deleted Task Details',
        details: {
            'Task Title': data.taskTitle,
            Project: data.projectName || 'N/A',
            'Deleted By': deletedByName,
            'Deleted On': new Date().toLocaleString(),
        },
    });
}

/**
 * Plain text version of task deletion notification
 */
export function getTaskDeletedNotificationText(data: TaskAssignedTemplateData, deletedByName: string): string {
    return `TASK DELETED

Hello ${data.assigneeName},

A task that was assigned to you has been deleted by ${deletedByName}.

DELETED TASK DETAILS:
- Title: ${data.taskTitle}
- Project: ${data.projectName || 'N/A'}

Deleted By: ${deletedByName}
Deleted On: ${new Date().toLocaleString()}

No further action is required from you on this task.

Best regards,
Greenex Environmental Team`;
}