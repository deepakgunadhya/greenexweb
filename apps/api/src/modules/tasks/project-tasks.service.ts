import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';
import { EmailService } from '../email/email.service';
import {
  TaskAssignedTemplateData,
  TaskUpdatedTemplateData,
  getTaskAssignedNotificationTemplate,
  getTaskAssignedNotificationText,
  getTaskAssignedConfirmationTemplate,
  getTaskAssignedConfirmationText,
  getTaskUpdatedNotificationTemplate,
  getTaskUpdatedNotificationText,
  getTaskReassignedNotificationTemplate,
  getTaskUnassignedNotificationTemplate,
} from './../email/templates/task.template';
import {
  getTaskLockedNotificationTemplate,
  getUnlockRequestNotificationTemplate,
  getUnlockDecisionNotificationTemplate,
} from './../email/templates/task-lock.template';

// Task status types
export type TaskStatus = 'to_do' | 'doing' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type SlaStatus = 'on_track' | 'due_today' | 'overdue';
export type TaskType = 'project' | 'general';

// DTOs
export interface CreateTaskDto {
  projectId?: string;
  title: string;
  description?: string;
  assigneeId: string;
  serviceId?: string;
  checklistLink?: string;
  dueDate?: Date | string;
  priority?: TaskPriority;
  notes?: string;
  taskType?: TaskType;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigneeId?: string;
  serviceId?: string;
  checklistLink?: string;
  dueDate?: Date | string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  blockedReason?: string;
  notes?: string;
  estimatedHours?: number;
  actualHours?: number;
}

export interface TaskFilters {
  projectId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  slaStatus?: SlaStatus;
  serviceId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
  taskType?: TaskType;
}

// User context for permission-based filtering
export interface UserContext {
  userId: string;
  permissions: string[];
}

// Permission that grants visibility to all tasks
const PERMISSION_READ_ALL_TASKS = 'tasks:read-all';

export interface GenerateTasksFromScopeDto {
  projectId: string;
  scopeText: string;
  defaultAssigneeId?: string;
  defaultPriority?: TaskPriority;
  defaultDueDate?: Date | string;
}

export type UnlockRequestStatus = 'pending' | 'approved' | 'rejected';

export interface CreateUnlockRequestDto {
  reason: string;
}

export interface ReviewUnlockRequestDto {
  decision: 'approved' | 'rejected';
  reviewNote?: string;
}

export interface UnlockRequestWithDetails {
  id: string;
  taskId: string;
  reason: string;
  status: UnlockRequestStatus;
  reviewNote?: string | null;
  createdAt: Date;
  reviewedAt?: Date | null;
  requestedBy: { id: string; firstName: string; lastName: string; email: string };
  reviewedBy?: { id: string; firstName: string; lastName: string } | null;
  task?: { id: string; title: string; projectId?: string | null };
}

export interface TaskWithDetails {
  id: string;
  projectId?: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  slaStatus: SlaStatus;
  taskType: TaskType;
  dueDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  notes?: string;
  blockedReason?: string;
  checklistLink?: string;
  serviceId?: string;
  isLocked: boolean;
  lockedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  project?: {
    id: string;
    projectNumber: string;
    name: string;
  } | null;
  service?: {
    id: string;
    name: string;
    category: string;
  };
  unlockRequests?: UnlockRequestWithDetails[];
}

/**
 * Project Task Management Service
 * Implements Task Management & Assignment Module
 * Internal-only module - no client visibility
 */
export class ProjectTasksService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Calculate SLA status based on due date and current status
   * Derived at runtime - not stored in database
   */
  private calculateSlaStatus(dueDate: Date | null, status: string): SlaStatus {
    if (!dueDate || status === 'done') {
      return 'on_track';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (today.getTime() < due.getTime()) {
      return 'on_track';
    } else if (today.getTime() === due.getTime()) {
      return 'due_today';
    } else {
      return 'overdue';
    }
  }

  /**
   * Auto-lock overdue tasks inline (non-blocking).
   * Called after fetching tasks to ensure overdue tasks are locked
   * without depending on the cron job.
   */
  private autoLockOverdueTasksInline(tasks: any[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const tasksToLock = tasks.filter(
      t => !t.isLocked && t.status !== 'done' && t.dueDate && new Date(t.dueDate) < today
    );

    if (tasksToLock.length === 0) return;

    // Immediately mark as locked in-memory so the current response reflects it
    for (const task of tasksToLock) {
      task.isLocked = true;
      task.lockedAt = now;
    }

    // Persist to DB in background (fire-and-forget)
    Promise.all(
      tasksToLock.map(async (task) => {
        try {
          await prisma.projectTask.update({
            where: { id: task.id },
            data: { isLocked: true, lockedAt: now }
          });

          // Send notification (non-blocking)
          if (task.assignee?.email) {
            this.sendTaskLockedEmail(task, task.assignee).catch(() => {});
          }
        } catch (err) {
          logger.error('Failed to auto-lock task inline', { taskId: task.id, error: err });
        }
      })
    ).catch(() => {});
  }

  /**
   * Manually lock a task (admin action)
   * Requires tasks:manage-locks permission
   */
  async manualLockTask(
    taskId: string,
    lockedById: string,
    userPermissions: string[]
  ): Promise<TaskWithDetails> {
    const hasPermission = userPermissions.includes('tasks:manage-locks');
    if (!hasPermission) {
      throw new AppError('You do not have permission to lock tasks', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const task = await prisma.projectTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    if (task.isLocked) {
      throw new AppError('Task is already locked', 400, 'TASK_ALREADY_LOCKED');
    }

    if (task.status === 'done') {
      throw new AppError('Cannot lock a completed task', 400, 'TASK_COMPLETED');
    }

    await prisma.projectTask.update({
      where: { id: taskId },
      data: { isLocked: true, lockedAt: new Date() }
    });

    logger.info(`Task manually locked by admin`, { taskId, lockedBy: lockedById });

    return await this.getTaskById(taskId);
  }

  /**
   * Directly unlock a task (admin action, no unlock request needed)
   * Requires tasks:manage-locks permission
   */
  async directUnlockTask(
    taskId: string,
    unlockedById: string,
    userPermissions: string[]
  ): Promise<TaskWithDetails> {
    const hasPermission = userPermissions.includes('tasks:manage-locks');
    if (!hasPermission) {
      throw new AppError('You do not have permission to unlock tasks', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const task = await prisma.projectTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    if (!task.isLocked) {
      throw new AppError('Task is not locked', 400, 'TASK_NOT_LOCKED');
    }

    // Unlock the task
    const updatedTask = await prisma.projectTask.update({
      where: { id: taskId },
      data: { isLocked: false, lockedAt: null },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, projectNumber: true, name: true } },
        service: { select: { id: true, name: true, category: true } }
      }
    });

    // Also resolve any pending unlock requests for this task
    await prisma.taskUnlockRequest.updateMany({
      where: { taskId, status: 'pending' },
      data: {
        status: 'approved',
        reviewedById: unlockedById,
        reviewedAt: new Date(),
        reviewNote: 'Directly unlocked by admin'
      }
    });

    logger.info(`Task directly unlocked by admin`, { taskId, unlockedBy: unlockedById });

    return {
      ...updatedTask,
      slaStatus: this.calculateSlaStatus(updatedTask.dueDate, updatedTask.status),
      status: updatedTask.status as TaskStatus,
      priority: updatedTask.priority as TaskPriority,
      taskType: (updatedTask as any).taskType as TaskType || 'project'
    } as TaskWithDetails;
  }

  /**
   * Create a new task
   * Only Ops Manager or Super Admin can create tasks
   */
  async createTask(data: CreateTaskDto, createdById: string): Promise<TaskWithDetails> {
    const isGeneralTask = data.taskType === 'general' || !data.projectId;
    let project: any = null;

    // Validate project exists (only for project tasks)
    if (!isGeneralTask) {
      project = await prisma.project.findUnique({
        where: { id: data.projectId! }
      });

      if (!project) {
        throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }
    }

    // Validate assignee exists and is internal user
    const assignee = await prisma.user.findUnique({
      where: { id: data.assigneeId }
    });

    if (!assignee) {
      throw new AppError('Assignee not found', 404, 'ASSIGNEE_NOT_FOUND');
    }

    // Check if user is internal (not a client)
    if (assignee.userType === 'CLIENT') {
      throw new AppError('Cannot assign tasks to client users', 400, 'INVALID_ASSIGNEE');
    }

    // Validate service if provided (only for project tasks)
    if (data.serviceId && !isGeneralTask) {
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId }
      });
      if (!service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }
    }

    // Create task
    const task = await prisma.projectTask.create({
      data: {
        projectId: isGeneralTask ? null : data.projectId!,
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        createdById: createdById,
        serviceId: isGeneralTask ? null : (data.serviceId || null),
        checklistLink: data.checklistLink,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: data.priority || 'medium',
        status: 'to_do',
        notes: data.notes,
        slaStatus: 'on_track',
        taskType: isGeneralTask ? 'general' : 'project'
      }
    });

    logger.info(`Task created: ${task.id}`, {
      taskId: task.id,
      taskType: isGeneralTask ? 'general' : 'project',
      projectId: data.projectId || null,
      assigneeId: data.assigneeId,
      createdBy: createdById
    });

    // Get creator for email
    const creator = await prisma.user.findUnique({
      where: { id: createdById },
      select: { id: true, firstName: true, lastName: true, email: true }
    });

    // Get service if provided
    let service = null;
    if (data.serviceId && !isGeneralTask) {
      service = await prisma.service.findUnique({
        where: { id: data.serviceId },
        select: { id: true, name: true }
      });
    }

    // Send email notifications (non-blocking)
    if (creator) {
      this.sendTaskAssignedEmails({
        task,
        assignee,
        creator,
        project: project || { name: 'General Task' },
        service,
      }).catch((error) => {
        logger.error('Failed to send task assigned emails', { error, taskId: task.id });
      });
    }

    return await this.getTaskById(task.id);
  }

  /**
   * Generate tasks from project scope text
   * Splits scope by newlines and creates draft tasks
   */
  async generateTasksFromScope(data: GenerateTasksFromScopeDto, createdById: string): Promise<TaskWithDetails[]> {
    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: data.projectId }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Split scope text by newlines and filter empty lines
    const lines = data.scopeText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      throw new AppError('No valid scope items found', 400, 'EMPTY_SCOPE');
    }

    // Validate default assignee if provided
    if (data.defaultAssigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.defaultAssigneeId }
      });

      if (!assignee) {
        throw new AppError('Default assignee not found', 404, 'ASSIGNEE_NOT_FOUND');
      }

      if (assignee.userType === 'CLIENT') {
        throw new AppError('Cannot assign tasks to client users', 400, 'INVALID_ASSIGNEE');
      }
    }

    // Create tasks in a transaction
    const tasks = await prisma.$transaction(async (tx) => {
      const createdTasks: any[] = [];

      for (const line of lines) {
        const task = await tx.projectTask.create({
          data: {
            projectId: data.projectId,
            title: line,
            assigneeId: data.defaultAssigneeId || null,
            createdById: createdById,
            priority: data.defaultPriority || 'medium',
            status: 'to_do',
            dueDate: data.defaultDueDate ? new Date(data.defaultDueDate) : null,
            slaStatus: 'on_track'
          }
        });
        createdTasks.push(task);
      }

      return createdTasks;
    });

    logger.info(`Generated ${tasks.length} tasks from scope`, {
      projectId: data.projectId,
      createdBy: createdById,
      taskCount: tasks.length
    });

    // Return full task details
    const taskDetails = await Promise.all(
      tasks.map(task => this.getTaskById(task.id))
    );

    return taskDetails;
  }

  /**
   * Get task by ID with full details
   */
  async getTaskById(taskId: string): Promise<TaskWithDetails> {
    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        unlockRequests: {
          orderBy: { createdAt: 'desc' as const },
          take: 5,
          include: {
            requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            reviewedBy: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!task) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    // Calculate SLA status at runtime
    const slaStatus = this.calculateSlaStatus(task.dueDate, task.status);

    return {
      ...task,
      slaStatus,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      taskType: (task as any).taskType as TaskType || 'project'
    } as TaskWithDetails;
  }

  /**
   * Check if user has permission to view all tasks
   */
  private canViewAllTasks(permissions: string[]): boolean {
    return permissions.includes(PERMISSION_READ_ALL_TASKS);
  }

  /**
   * Get tasks with filtering and pagination
   * Role-based visibility:
   * - Admin users (Super Admin, Ops Manager, Admin): Can view all tasks
   * - Non-admin users: Can only view tasks assigned to them
   */
  async getTasks(
    filters: TaskFilters = {},
    page = 1,
    pageSize = 20,
    sortBy = 'dueDate',
    sortOrder: 'asc' | 'desc' = 'asc',
    userContext?: UserContext
  ): Promise<{ tasks: TaskWithDetails[], total: number, page: number, pageSize: number }> {
    const where: any = {};

    // Apply role-based filtering
    // Non-admin users can only see tasks assigned to them
    if (userContext && !this.canViewAllTasks(userContext.permissions)) {
      where.assigneeId = userContext.userId;
    }

    // Apply filters
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    // Only apply assigneeId filter if it doesn't conflict with role-based filtering
    if (filters.assigneeId && (!userContext || this.canViewAllTasks(userContext.permissions))) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.serviceId) {
      where.serviceId = filters.serviceId;
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) {
        where.dueDate.gte = filters.dueDateFrom;
      }
      if (filters.dueDateTo) {
        where.dueDate.lte = filters.dueDateTo;
      }
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Filter by task type
    if (filters.taskType) {
      where.taskType = filters.taskType;
    }

    // Build order by
    const orderBy: any = {};
    if (sortBy === 'dueDate') {
      orderBy.dueDate = sortOrder;
    } else if (sortBy === 'status') {
      orderBy.status = sortOrder;
    } else if (sortBy === 'priority') {
      orderBy.priority = sortOrder;
    } else if (sortBy === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [tasksRaw, total] = await Promise.all([
      prisma.projectTask.findMany({
        where,
        include: {
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          project: {
            select: {
              id: true,
              projectNumber: true,
              name: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              category: true
            }
          },
          unlockRequests: {
            where: { status: 'pending' },
            take: 1,
            orderBy: { createdAt: 'desc' as const },
            include: {
              requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
          }
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.projectTask.count({ where })
    ]);

    // Auto-lock any overdue tasks that aren't locked yet (inline, no cron needed)
    this.autoLockOverdueTasksInline(tasksRaw);

    // Calculate SLA status for each task and filter by SLA if needed
    let tasks = tasksRaw.map(task => ({
      ...task,
      slaStatus: this.calculateSlaStatus(task.dueDate, task.status),
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      taskType: (task as any).taskType as TaskType || 'project'
    })) as TaskWithDetails[];

    // Filter by SLA status if provided (post-query filter since it's computed)
    if (filters.slaStatus) {
      tasks = tasks.filter(task => task.slaStatus === filters.slaStatus);
    }

    return {
      tasks,
      total,
      page,
      pageSize
    };
  }

  /**
   * Get tasks for a specific project
   * Role-based visibility is applied via getTasks
   */
  async getProjectTasks(
    projectId: string,
    filters: Omit<TaskFilters, 'projectId'> = {},
    page = 1,
    pageSize = 50,
    userContext?: UserContext
  ): Promise<{ tasks: TaskWithDetails[], total: number, stats: any }> {
    const result = await this.getTasks(
      { ...filters, projectId },
      page,
      pageSize,
      'dueDate',
      'asc',
      userContext
    );

    // Calculate task statistics with role-based filtering
    const statsWhere: any = { projectId };

    // Non-admin users only see stats for their tasks
    if (userContext && !this.canViewAllTasks(userContext.permissions)) {
      statsWhere.assigneeId = userContext.userId;
    }

    const allProjectTasks = await prisma.projectTask.findMany({
      where: statsWhere,
      select: { status: true, dueDate: true }
    });

    const stats = {
      total: allProjectTasks.length,
      byStatus: {
        to_do: allProjectTasks.filter(t => t.status === 'to_do').length,
        doing: allProjectTasks.filter(t => t.status === 'doing').length,
        blocked: allProjectTasks.filter(t => t.status === 'blocked').length,
        done: allProjectTasks.filter(t => t.status === 'done').length
      },
      bySla: {
        on_track: 0,
        due_today: 0,
        overdue: 0
      }
    };

    // Calculate SLA stats
    allProjectTasks.forEach(task => {
      const sla = this.calculateSlaStatus(task.dueDate, task.status);
      stats.bySla[sla]++;
    });

    return {
      ...result,
      stats
    };
  }

  /**
   * Update task
   * Enforces business rules for status changes
   */
  async updateTask(taskId: string, data: UpdateTaskDto, updatedById: string, userPermissions?: string[]): Promise<TaskWithDetails> {
    const existingTask = await prisma.projectTask.findUnique({
      where: { id: taskId }
    });

    if (!existingTask) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    // Block updates on locked tasks (admins with tasks:manage-locks can bypass)
    const canBypassLock = userPermissions?.includes('tasks:manage-locks') || false;
    if (existingTask.isLocked && !canBypassLock) {
      throw new AppError(
        'This task is locked because it passed its due date. Request an unlock to modify it.',
        423,
        'TASK_LOCKED'
      );
    }

    // If task is done, only allow updating notes
    if (existingTask.status === 'done' && data.status !== 'done') {
      // Allow changing status away from done (reopening)
    } else if (existingTask.status === 'done') {
      // Only allow notes update for completed tasks
      const allowedUpdates = ['notes'];
      const attemptedUpdates = Object.keys(data).filter(key => data[key as keyof UpdateTaskDto] !== undefined);
      const disallowedUpdates = attemptedUpdates.filter(key => !allowedUpdates.includes(key));

      if (disallowedUpdates.length > 0) {
        throw new AppError(
          'Completed tasks can only have notes updated',
          400,
          'TASK_COMPLETED'
        );
      }
    }

    // Validate blocked reason is provided when status is blocked
    if (data.status === 'blocked' && !data.blockedReason && !existingTask.blockedReason) {
      throw new AppError(
        'Blocked reason is required when setting status to blocked',
        400,
        'BLOCKED_REASON_REQUIRED'
      );
    }

    // Validate assignee if being changed
    if (data.assigneeId && data.assigneeId !== existingTask.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.assigneeId }
      });

      if (!assignee) {
        throw new AppError('Assignee not found', 404, 'ASSIGNEE_NOT_FOUND');
      }

      if (assignee.userType === 'CLIENT') {
        throw new AppError('Cannot assign tasks to client users', 400, 'INVALID_ASSIGNEE');
      }
    }

    // Validate service if being changed
    if (data.serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId }
      });
      if (!service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.serviceId !== undefined) updateData.serviceId = data.serviceId;
    if (data.checklistLink !== undefined) updateData.checklistLink = data.checklistLink;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.estimatedHours !== undefined) updateData.estimatedHours = data.estimatedHours;
    if (data.actualHours !== undefined) updateData.actualHours = data.actualHours;
    if (data.blockedReason !== undefined) updateData.blockedReason = data.blockedReason;

    // Handle due date (can be null to clear it)
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    // Handle status change
    if (data.status !== undefined) {
      updateData.status = data.status;

      // Set completedAt if moving to done
      if (data.status === 'done' && existingTask.status !== 'done') {
        updateData.completedAt = new Date();
      }

      // Clear completedAt if moving away from done
      if (data.status !== 'done' && existingTask.status === 'done') {
        updateData.completedAt = null;
      }

      // Clear blocked reason if moving away from blocked
      if (data.status !== 'blocked') {
        updateData.blockedReason = null;
      }
    }

    // Update task
    const updatedTask = await prisma.projectTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    logger.info(`Task updated: ${taskId}`, {
      taskId,
      updatedBy: updatedById,
      changes: Object.keys(updateData)
    });

    // Send email notification to assignee (non-blocking)
    if (updatedTask.assignee) {
      const updatedBy = await prisma.user.findUnique({
        where: { id: updatedById },
        select: { id: true, firstName: true, lastName: true, email: true }
      });

      // Build changes object for email
      const changes: Record<string, { from: any; to: any }> = {};
      if (data.status && data.status !== existingTask.status) {
        changes['Status'] = { from: existingTask.status, to: data.status };
      }
      if (data.priority && data.priority !== existingTask.priority) {
        changes['Priority'] = { from: existingTask.priority, to: data.priority };
      }
      if (data.dueDate !== undefined && String(data.dueDate) !== String(existingTask.dueDate)) {
        changes['Due Date'] = { from: existingTask.dueDate, to: data.dueDate };
      }

      if (updatedBy && Object.keys(changes).length > 0) {
        this.sendTaskUpdatedEmail({
          task: updatedTask,
          assignee: updatedTask.assignee,
          updatedBy,
          project: updatedTask.project,
          changes
        }).catch((error) => {
          logger.error('Failed to send task updated email', { error, taskId });
        });
      }
    }

    return await this.getTaskById(taskId);
  }

  /**
   * Update task status (shorthand for status-only updates)
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    blockedReason: string | undefined,
    updatedById: string,
    userPermissions?: string[]
  ): Promise<TaskWithDetails> {
    return await this.updateTask(
      taskId,
      { status, blockedReason },
      updatedById,
      userPermissions
    );
  }

  /**
   * Reassign task to different user
   */
  async reassignTask(
    taskId: string,
    newAssigneeId: string,
    reassignedById: string,
    userPermissions?: string[]
  ): Promise<TaskWithDetails> {
    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, name: true } }
      }
    });

    if (!task) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    // Block reassignment on locked tasks (admins with tasks:manage-locks can bypass)
    const canBypassLock = userPermissions?.includes('tasks:manage-locks') || false;
    if (task.isLocked && !canBypassLock) {
      throw new AppError(
        'This task is locked because it passed its due date. Request an unlock to modify it.',
        423,
        'TASK_LOCKED'
      );
    }

    const previousAssigneeId = task.assigneeId;

    // Validate new assignee
    const newAssignee = await prisma.user.findUnique({
      where: { id: newAssigneeId },
      select: { id: true, firstName: true, lastName: true, email: true, userType: true }
    });

    if (!newAssignee) {
      throw new AppError('Assignee not found', 404, 'ASSIGNEE_NOT_FOUND');
    }

    if (newAssignee.userType === 'CLIENT') {
      throw new AppError('Cannot assign tasks to client users', 400, 'INVALID_ASSIGNEE');
    }

    await prisma.projectTask.update({
      where: { id: taskId },
      data: { assigneeId: newAssigneeId }
    });

    logger.info(`Task reassigned: ${taskId}`, {
      taskId,
      previousAssignee: previousAssigneeId,
      newAssignee: newAssigneeId,
      reassignedBy: reassignedById
    });

    // Send email notifications (non-blocking)
    if (previousAssigneeId && previousAssigneeId !== newAssigneeId) {
      const previousAssignee = await prisma.user.findUnique({
        where: { id: previousAssigneeId },
        select: { id: true, firstName: true, lastName: true, email: true }
      });

      const reassignedBy = await prisma.user.findUnique({
        where: { id: reassignedById },
        select: { id: true, firstName: true, lastName: true, email: true }
      });

      if (previousAssignee && reassignedBy) {
        this.sendTaskReassignedEmails({
          task,
          newAssignee,
          previousAssignee,
          reassignedBy,
          project: task.project
        }).catch((error) => {
          logger.error('Failed to send task reassigned emails', { error, taskId });
        });
      }
    }

    return await this.getTaskById(taskId);
  }

  /**
   * Get tasks assigned to a specific user
   */
  async getMyTasks(
    userId: string,
    filters: Omit<TaskFilters, 'assigneeId'> = {},
    page = 1,
    pageSize = 20
  ): Promise<{ tasks: TaskWithDetails[], total: number }> {
    return await this.getTasks(
      { ...filters, assigneeId: userId },
      page,
      pageSize,
      'dueDate',
      'asc'
    );
  }

  /**
   * Get internal users for task assignment
   * Excludes client users
   */
  async getAssignableUsers(): Promise<any[]> {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        userType: {
          not: 'CLIENT'
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    // Transform the nested role structure to a simpler format
    return users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.roles[0]?.role || null
    }));
  }

  /**
   * Get task statistics summary
   * Role-based visibility:
   * - Admin users: Can see stats for all tasks
   * - Non-admin users: Can only see stats for their assigned tasks
   */
  async getTaskStats(projectId?: string, userContext?: UserContext, taskType?: string): Promise<any> {
    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    // Filter by task type (for tab-specific stats)
    if (taskType) {
      where.taskType = taskType;
    }

    // Non-admin users only see stats for their tasks
    if (userContext && !this.canViewAllTasks(userContext.permissions)) {
      where.assigneeId = userContext.userId;
    }

    const tasks = await prisma.projectTask.findMany({
      where,
      select: {
        id: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeId: true
      }
    });

    const stats = {
      total: tasks.length,
      byStatus: {
        to_do: 0,
        doing: 0,
        blocked: 0,
        done: 0
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0
      },
      bySla: {
        on_track: 0,
        due_today: 0,
        overdue: 0
      },
      unassigned: 0
    };

    tasks.forEach(task => {
      // Status stats
      stats.byStatus[task.status as TaskStatus]++;

      // Priority stats
      stats.byPriority[task.priority as TaskPriority]++;

      // SLA stats
      const sla = this.calculateSlaStatus(task.dueDate, task.status);
      stats.bySla[sla]++;

      // Unassigned count
      if (!task.assigneeId) {
        stats.unassigned++;
      }
    });

    return stats;
  }

  /**
   * Send task assigned email notifications
   * Sends notification to assignee and confirmation to creator
   */
  private async sendTaskAssignedEmails(params: {
    task: any;
    assignee: any;
    creator: any;
    project: any;
    service?: any;
  }): Promise<void> {
    const { task, assignee, creator, project, service } = params;

    const templateData: TaskAssignedTemplateData = {
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description,
      assigneeName: `${assignee.firstName} ${assignee.lastName}`.trim(),
      assigneeEmail: assignee.email,
      assignedByName: `${creator.firstName} ${creator.lastName}`.trim(),
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      projectName: project.name,
      serviceName: service?.name,
      checklistLink: task.checklistLink,
      notes: task.notes,
      assignedAt: task.createdAt
    };

    // Send notification to assignee
    if (assignee.email) {
      try {
        await this.emailService.sendEmail({
          to: assignee.email,
          subject: `New Task Assigned: ${task.title}`,
          html: getTaskAssignedNotificationTemplate(templateData),
          text: getTaskAssignedNotificationText(templateData)
        });
        logger.info(`Task assigned email sent to ${assignee.email}`, { taskId: task.id });
      } catch (error) {
        logger.error('Failed to send task assigned email to assignee', {
          taskId: task.id,
          assigneeEmail: assignee.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Send confirmation to creator (if different from assignee)
    if (creator.email && creator.id !== assignee.id) {
      try {
        await this.emailService.sendEmail({
          to: creator.email,
          subject: `Task Created: ${task.title}`,
          html: getTaskAssignedConfirmationTemplate(templateData),
          text: getTaskAssignedConfirmationText(templateData)
        });
        logger.info(`Task creation confirmation email sent to ${creator.email}`, { taskId: task.id });
      } catch (error) {
        logger.error('Failed to send task creation confirmation email', {
          taskId: task.id,
          creatorEmail: creator.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Send task updated email notification to assignee
   */
  private async sendTaskUpdatedEmail(params: {
    task: any;
    assignee: any;
    updatedBy: any;
    project: any;
    changes?: Record<string, { from: any; to: any }>;
  }): Promise<void> {
    const { task, assignee, updatedBy, project, changes } = params;

    if (!assignee?.email) return;

    const templateData: TaskUpdatedTemplateData = {
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description,
      assigneeName: `${assignee.firstName} ${assignee.lastName}`.trim(),
      assigneeEmail: assignee.email,
      assignedByName: `${updatedBy.firstName} ${updatedBy.lastName}`.trim(),
      updatedByName: `${updatedBy.firstName} ${updatedBy.lastName}`.trim(),
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      projectName: project.name,
      assignedAt: task.createdAt,
      changes
    };

    try {
      await this.emailService.sendEmail({
        to: assignee.email,
        subject: `Task Updated: ${task.title}`,
        html: getTaskUpdatedNotificationTemplate(templateData),
        text: getTaskUpdatedNotificationText(templateData)
      });
      logger.info(`Task updated email sent to ${assignee.email}`, { taskId: task.id });
    } catch (error) {
      logger.error('Failed to send task updated email', {
        taskId: task.id,
        assigneeEmail: assignee.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send task reassigned email notifications
   * Sends notification to new assignee and unassignment notice to previous assignee
   */
  private async sendTaskReassignedEmails(params: {
    task: any;
    newAssignee: any;
    previousAssignee: any;
    reassignedBy: any;
    project: any;
  }): Promise<void> {
    const { task, newAssignee, previousAssignee, reassignedBy, project } = params;

    const templateData: TaskAssignedTemplateData = {
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description,
      assigneeName: `${newAssignee.firstName} ${newAssignee.lastName}`.trim(),
      assigneeEmail: newAssignee.email,
      assignedByName: `${reassignedBy.firstName} ${reassignedBy.lastName}`.trim(),
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      projectName: project.name,
      assignedAt: new Date()
    };

    const previousAssigneeName = `${previousAssignee.firstName} ${previousAssignee.lastName}`.trim();

    // Send notification to new assignee
    if (newAssignee.email) {
      try {
        await this.emailService.sendEmail({
          to: newAssignee.email,
          subject: `Task Reassigned to You: ${task.title}`,
          html: getTaskReassignedNotificationTemplate(templateData, previousAssigneeName)
        });
        logger.info(`Task reassigned email sent to ${newAssignee.email}`, { taskId: task.id });
      } catch (error) {
        logger.error('Failed to send task reassigned email to new assignee', {
          taskId: task.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Send unassignment notice to previous assignee
    if (previousAssignee.email && previousAssignee.id !== newAssignee.id) {
      const previousTemplateData: TaskAssignedTemplateData = {
        ...templateData,
        assigneeName: previousAssigneeName,
        assigneeEmail: previousAssignee.email
      };

      try {
        await this.emailService.sendEmail({
          to: previousAssignee.email,
          subject: `Task Reassigned: ${task.title}`,
          html: getTaskUnassignedNotificationTemplate(
            previousTemplateData,
            `${reassignedBy.firstName} ${reassignedBy.lastName}`.trim(),
            `${newAssignee.firstName} ${newAssignee.lastName}`.trim()
          )
        });
        logger.info(`Task unassigned email sent to ${previousAssignee.email}`, { taskId: task.id });
      } catch (error) {
        logger.error('Failed to send task unassigned email to previous assignee', {
          taskId: task.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  // ============================================
  // Task Locking & Unlock Request Methods
  // ============================================

  /**
   * Auto-lock overdue tasks
   * Called by cron endpoint. Locks tasks where dueDate < today, status != done, not already locked.
   */
  async autoLockOverdueTasks(): Promise<{
    totalChecked: number;
    newlyLocked: number;
    lockedTaskIds: string[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = await prisma.projectTask.findMany({
      where: {
        isLocked: false,
        status: { not: 'done' },
        dueDate: { lt: today, not: null },
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, projectNumber: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    const lockedTaskIds: string[] = [];
    const now = new Date();

    for (const task of overdueTasks) {
      await prisma.projectTask.update({
        where: { id: task.id },
        data: { isLocked: true, lockedAt: now }
      });
      lockedTaskIds.push(task.id);

      // Send lock notification to assignee (non-blocking)
      if (task.assignee?.email) {
        this.sendTaskLockedEmail(task, task.assignee).catch(err => {
          logger.error('Failed to send task locked email', {
            error: err instanceof Error ? err.message : 'Unknown error',
            taskId: task.id
          });
        });
      }
    }

    logger.info(`Auto-locked ${lockedTaskIds.length} overdue tasks`, { lockedTaskIds });

    return {
      totalChecked: overdueTasks.length,
      newlyLocked: lockedTaskIds.length,
      lockedTaskIds
    };
  }

  /**
   * Request unlock for a locked task
   */
  async requestUnlock(
    taskId: string,
    data: CreateUnlockRequestDto,
    requestedById: string
  ): Promise<UnlockRequestWithDetails> {
    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true } }
      }
    });

    if (!task) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    if (!task.isLocked) {
      throw new AppError('Task is not locked', 400, 'TASK_NOT_LOCKED');
    }

    // Check for existing pending request
    const existingPending = await prisma.taskUnlockRequest.findFirst({
      where: { taskId, status: 'pending' }
    });

    if (existingPending) {
      throw new AppError(
        'An unlock request is already pending for this task',
        409,
        'UNLOCK_REQUEST_PENDING'
      );
    }

    if (!data.reason || data.reason.trim().length === 0) {
      throw new AppError('Reason is required for unlock request', 400, 'REASON_REQUIRED');
    }

    const unlockRequest = await prisma.taskUnlockRequest.create({
      data: {
        taskId,
        requestedById,
        reason: data.reason.trim(),
        status: 'pending'
      },
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        task: { select: { id: true, title: true, projectId: true } }
      }
    });

    logger.info(`Unlock request created for task ${taskId}`, {
      requestId: unlockRequest.id,
      taskId,
      requestedBy: requestedById
    });

    // Notify task creator and admins about the unlock request (non-blocking)
    this.sendUnlockRequestNotification(task, unlockRequest).catch(err => {
      logger.error('Failed to send unlock request notification', {
        error: err instanceof Error ? err.message : 'Unknown error',
        taskId
      });
    });

    return unlockRequest as UnlockRequestWithDetails;
  }

  /**
   * Review (approve/reject) an unlock request
   */
  async reviewUnlockRequest(
    requestId: string,
    data: ReviewUnlockRequestDto,
    reviewedById: string,
    userPermissions: string[]
  ): Promise<UnlockRequestWithDetails> {
    const unlockRequest = await prisma.taskUnlockRequest.findUnique({
      where: { id: requestId },
      include: {
        task: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
            project: { select: { id: true, name: true } }
          }
        },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    if (!unlockRequest) {
      throw new AppError('Unlock request not found', 404, 'UNLOCK_REQUEST_NOT_FOUND');
    }

    if (unlockRequest.status !== 'pending') {
      throw new AppError(
        `Request has already been ${unlockRequest.status}`,
        400,
        'REQUEST_ALREADY_REVIEWED'
      );
    }

    // Authorization: must have tasks:manage-locks OR be the task creator
    const isTaskCreator = unlockRequest.task.createdBy?.id === reviewedById;
    const hasManageLocksPermission = userPermissions.includes('tasks:manage-locks');

    if (!isTaskCreator && !hasManageLocksPermission) {
      throw new AppError(
        'You do not have permission to review this unlock request',
        403,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    // Update the request
    const updatedRequest = await prisma.taskUnlockRequest.update({
      where: { id: requestId },
      data: {
        status: data.decision,
        reviewedById,
        reviewedAt: new Date(),
        reviewNote: data.reviewNote || null
      },
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        task: { select: { id: true, title: true, projectId: true } }
      }
    });

    // If approved, unlock the task
    if (data.decision === 'approved') {
      await prisma.projectTask.update({
        where: { id: unlockRequest.taskId },
        data: { isLocked: false, lockedAt: null }
      });

      logger.info(`Task unlocked via approved request`, {
        taskId: unlockRequest.taskId,
        requestId,
        approvedBy: reviewedById
      });
    } else {
      logger.info(`Unlock request rejected`, {
        taskId: unlockRequest.taskId,
        requestId,
        rejectedBy: reviewedById
      });
    }

    // Notify the requester about the decision (non-blocking)
    this.sendUnlockDecisionNotification(
      unlockRequest.task,
      updatedRequest,
      data.decision
    ).catch(err => {
      logger.error('Failed to send unlock decision notification', {
        error: err instanceof Error ? err.message : 'Unknown error',
        requestId
      });
    });

    return updatedRequest as UnlockRequestWithDetails;
  }

  /**
   * Get unlock requests for a specific task
   */
  async getUnlockRequests(
    taskId: string,
    page = 1,
    pageSize = 10
  ): Promise<{ requests: UnlockRequestWithDetails[]; total: number }> {
    const [requests, total] = await Promise.all([
      prisma.taskUnlockRequest.findMany({
        where: { taskId },
        include: {
          requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          reviewedBy: { select: { id: true, firstName: true, lastName: true } },
          task: { select: { id: true, title: true, projectId: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.taskUnlockRequest.count({ where: { taskId } })
    ]);

    return { requests: requests as UnlockRequestWithDetails[], total };
  }

  /**
   * Get all pending unlock requests (for admin dashboard)
   */
  async getPendingUnlockRequests(
    page = 1,
    pageSize = 20
  ): Promise<{ requests: any[]; total: number }> {
    const [requests, total] = await Promise.all([
      prisma.taskUnlockRequest.findMany({
        where: { status: 'pending' },
        include: {
          requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          reviewedBy: { select: { id: true, firstName: true, lastName: true } },
          task: {
            select: {
              id: true,
              title: true,
              projectId: true,
              dueDate: true,
              project: { select: { id: true, name: true, projectNumber: true } },
              assignee: { select: { id: true, firstName: true, lastName: true } }
            }
          }
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.taskUnlockRequest.count({ where: { status: 'pending' } })
    ]);

    return { requests, total };
  }

  // ============================================
  // Task Lock Email Notifications (Private)
  // ============================================

  /**
   * Send email when a task is auto-locked
   */
  private async sendTaskLockedEmail(task: any, assignee: any): Promise<void> {
    if (!assignee?.email) return;

    await this.emailService.sendEmail({
      to: assignee.email,
      subject: `Task Locked: ${task.title}`,
      html: getTaskLockedNotificationTemplate({
        taskTitle: task.title,
        assigneeName: `${assignee.firstName} ${assignee.lastName}`.trim(),
        projectName: task.project?.name || 'General Task',
        dueDate: task.dueDate,
        lockedAt: new Date()
      }),
      text: `Your task "${task.title}" has been automatically locked because it passed its due date.`
    });
  }

  /**
   * Send email when someone requests an unlock
   */
  private async sendUnlockRequestNotification(task: any, request: any): Promise<void> {
    // Notify task creator
    if (task.createdBy?.email) {
      await this.emailService.sendEmail({
        to: task.createdBy.email,
        subject: `Unlock Request: ${task.title}`,
        html: getUnlockRequestNotificationTemplate({
          taskTitle: task.title,
          requesterName: `${request.requestedBy.firstName} ${request.requestedBy.lastName}`.trim(),
          reason: request.reason,
          projectName: task.project?.name || 'General Task',
          recipientName: `${task.createdBy.firstName} ${task.createdBy.lastName}`.trim()
        }),
        text: `An unlock request has been submitted for task "${task.title}". Reason: ${request.reason}`
      });
    }
  }

  /**
   * Send email when unlock request is approved/rejected
   */
  private async sendUnlockDecisionNotification(
    task: any,
    request: any,
    decision: 'approved' | 'rejected'
  ): Promise<void> {
    if (!request.requestedBy?.email) return;

    await this.emailService.sendEmail({
      to: request.requestedBy.email,
      subject: `Unlock Request ${decision === 'approved' ? 'Approved' : 'Rejected'}: ${task.title}`,
      html: getUnlockDecisionNotificationTemplate({
        taskTitle: task.title,
        requesterName: `${request.requestedBy.firstName} ${request.requestedBy.lastName}`.trim(),
        decision,
        reviewNote: request.reviewNote,
        reviewerName: request.reviewedBy
          ? `${request.reviewedBy.firstName} ${request.reviewedBy.lastName}`.trim()
          : 'System',
        projectName: task.project?.name || 'General Task'
      }),
      text: `Your unlock request for task "${task.title}" has been ${decision}.${request.reviewNote ? ` Note: ${request.reviewNote}` : ''}`
    });
  }
}
