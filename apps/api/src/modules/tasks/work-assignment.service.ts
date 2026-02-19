import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export interface CreateTaskDto {
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  serviceId?: string;
  checklistLink?: string; // Links task to specific checklist
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  estimatedHours?: number;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigneeId?: string;
  status?: 'to_do' | 'doing' | 'blocked' | 'done';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  notes?: string;
  blockedReason?: string;
}

export interface TaskWithDetails {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: Date | null;
  completedAt?: Date | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  notes?: string | null;
  blockedReason?: string | null;
  slaStatus: string;
  isLocked: boolean;
  lockedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  project: {
    id: string;
    name: string;
    projectNumber: string;
    status: string;
  } | null;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  service?: {
    id: string;
    name: string;
    category: string;
  } | null;
}

export interface TaskFilters {
  assigneeId?: string;
  projectId?: string;
  status?: string;
  priority?: string;
  slaStatus?: string;
  serviceId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
}

export interface TaskAssignmentReport {
  userId: string;
  userName: string;
  email: string;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  averageCompletionTime: number; // in days
}

export interface SlaMetrics {
  onTrack: number;
  dueToday: number;
  overdue: number;
  totalTasks: number;
  averageCompletionRate: number;
}

/**
 * Work Assignment Service
 * Implements SRS 5.5 - Work Assignment Module with SLA tracking
 */
export class WorkAssignmentService {

  /**
   * Create a new task assignment
   * SRS 5.5.1 - Task Creation with automatic SLA calculation
   */
  async createTask(taskData: CreateTaskDto, createdById: string): Promise<TaskWithDetails> {
    return await prisma.$transaction(async (tx) => {
      // Validate project exists and is active
      const project = await tx.project.findUnique({
        where: { id: taskData.projectId }
      });

      if (!project) {
        throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }

      if (project.status === 'completed') {
        throw new AppError('Cannot add tasks to completed project', 400, 'PROJECT_COMPLETED');
      }

      // Validate assignee exists if provided
      if (taskData.assigneeId) {
        const assignee = await tx.user.findUnique({
          where: { id: taskData.assigneeId }
        });

        if (!assignee) {
          throw new AppError('Assignee not found', 404, 'ASSIGNEE_NOT_FOUND');
        }

        if (!assignee.isActive) {
          throw new AppError('Cannot assign task to inactive user', 400, 'ASSIGNEE_INACTIVE');
        }
      }

      // Validate service if provided
      if (taskData.serviceId) {
        const service = await tx.service.findUnique({
          where: { id: taskData.serviceId }
        });

        if (!service || !service.isActive) {
          throw new AppError('Service not found or inactive', 400, 'SERVICE_INVALID');
        }
      }

      // Calculate SLA status
      const slaStatus = this.calculateSlaStatus(taskData.dueDate);

      // Create the task
      const task = await tx.projectTask.create({
        data: {
          title: taskData.title,
          description: taskData.description,
          projectId: taskData.projectId,
          assigneeId: taskData.assigneeId,
          createdById,
          serviceId: taskData.serviceId,
          checklistLink: taskData.checklistLink,
          priority: taskData.priority || 'medium',
          dueDate: taskData.dueDate,
          estimatedHours: taskData.estimatedHours,
          slaStatus
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              projectNumber: true,
              status: true
            }
          },
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
              lastName: true,
              email: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        }
      });

      logger.info(`Task created: ${task.title} for project ${taskData.projectId}`, {
        taskId: task.id,
        assigneeId: taskData.assigneeId,
        priority: taskData.priority
      });

      return task;
    });
  }

  /**
   * Update task details and status
   * SRS 5.5.2 - Status tracking with automatic SLA updates
   */
  async updateTask(taskId: string, updates: UpdateTaskDto, updatedById: string): Promise<TaskWithDetails> {
    return await prisma.$transaction(async (tx) => {
      const currentTask = await tx.projectTask.findUnique({
        where: { id: taskId }
      });

      if (!currentTask) {
        throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
      }

      // Validate assignee if being updated
      if (updates.assigneeId) {
        const assignee = await tx.user.findUnique({
          where: { id: updates.assigneeId }
        });

        if (!assignee || !assignee.isActive) {
          throw new AppError('Assignee not found or inactive', 400, 'ASSIGNEE_INVALID');
        }
      }

      // Handle status transitions
      const updateData: any = { ...updates };

      if (updates.status) {
        // Validate status transition
        this.validateStatusTransition(currentTask.status, updates.status);

        // Set completion timestamp if marking as done
        if (updates.status === 'done' && currentTask.status !== 'done') {
          updateData.completedAt = new Date();
        }

        // Clear completion timestamp if moving away from done
        if (updates.status !== 'done' && currentTask.status === 'done') {
          updateData.completedAt = null;
        }

        // Clear blocked reason if no longer blocked
        if (updates.status !== 'blocked') {
          updateData.blockedReason = null;
        }
      }

      // Recalculate SLA status if due date changed
      if (updates.dueDate || updates.status) {
        updateData.slaStatus = this.calculateSlaStatus(
          updates.dueDate || currentTask.dueDate,
          updates.status || currentTask.status
        );
      }

      // Update the task
      const updatedTask = await tx.projectTask.update({
        where: { id: taskId },
        data: updateData,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              projectNumber: true,
              status: true
            }
          },
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
              lastName: true,
              email: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        }
      });

      logger.info(`Task updated: ${taskId}`, {
        status: updates.status,
        assignee: updates.assigneeId,
        updatedBy: updatedById
      });

      return updatedTask;
    });
  }

  /**
   * Get tasks with filtering and pagination
   */
  async getTasks(
    filters: TaskFilters = {}, 
    page = 1, 
    pageSize = 20
  ): Promise<{ tasks: TaskWithDetails[], total: number, page: number, pageSize: number }> {
    const where: any = {};

    // Apply filters
    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.slaStatus) {
      where.slaStatus = filters.slaStatus;
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

    const [tasks, total] = await Promise.all([
      prisma.projectTask.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              projectNumber: true,
              status: true
            }
          },
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
              lastName: true,
              email: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.projectTask.count({ where })
    ]);

    return {
      tasks,
      total,
      page,
      pageSize
    };
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<TaskWithDetails | null> {
    return await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
            status: true
          }
        },
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
            lastName: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    });
  }

  /**
   * Bulk assign tasks to user
   */
  async bulkAssignTasks(taskIds: string[], assigneeId: string, assignedBy: string): Promise<void> {
    // Validate assignee
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId }
    });

    if (!assignee || !assignee.isActive) {
      throw new AppError('Assignee not found or inactive', 400, 'ASSIGNEE_INVALID');
    }

    await prisma.projectTask.updateMany({
      where: {
        id: { in: taskIds },
        status: { not: 'done' } // Don't reassign completed tasks
      },
      data: {
        assigneeId
      }
    });

    logger.info(`Bulk assigned ${taskIds.length} tasks to ${assigneeId} by ${assignedBy}`);
  }

  /**
   * Auto-assign tasks based on workload balancing
   * SRS 5.5.3 - Intelligent task assignment
   */
  async autoAssignTasks(projectId: string, serviceId?: string): Promise<void> {
    const unassignedTasks = await prisma.projectTask.findMany({
      where: {
        projectId,
        assigneeId: null,
        status: 'to_do',
        ...(serviceId && { serviceId })
      }
    });

    if (unassignedTasks.length === 0) {
      return;
    }

    // Get available team members with their current workload
    const teamMembers = await this.getTeamWorkload();

    // Simple round-robin assignment (can be enhanced with ML algorithms)
    const sortedMembers = teamMembers.sort((a, b) => a.totalTasks - b.totalTasks);

    for (let i = 0; i < unassignedTasks.length; i++) {
      const assignee = sortedMembers[i % sortedMembers.length];
      
      await prisma.projectTask.update({
        where: { id: unassignedTasks[i].id },
        data: { assigneeId: assignee.userId }
      });

      // Update workload count for next iteration
      assignee.totalTasks++;
    }

    logger.info(`Auto-assigned ${unassignedTasks.length} tasks for project ${projectId}`);
  }

  /**
   * Get team workload analysis
   */
  async getTeamWorkload(): Promise<TaskAssignmentReport[]> {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        userType: 'INTERNAL'
      },
      include: {
        assignedTasks: {
          where: {
            status: { not: 'done' }
          }
        }
      }
    });

    return users.map(user => {
      const tasks = user.assignedTasks;
      const completedTasks = user.assignedTasks.filter(t => t.status === 'done');

      // Calculate average completion time for completed tasks
      const avgCompletionTime = completedTasks.length > 0
        ? completedTasks.reduce((sum, task) => {
            const completionDays = task.completedAt
              ? Math.ceil((task.completedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24))
              : 0;
            return sum + completionDays;
          }, 0) / completedTasks.length
        : 0;

      return {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totalTasks: tasks.length,
        todoTasks: tasks.filter(t => t.status === 'to_do').length,
        inProgressTasks: tasks.filter(t => t.status === 'doing').length,
        blockedTasks: tasks.filter(t => t.status === 'blocked').length,
        completedTasks: completedTasks.length,
        overdueTasks: tasks.filter(t => t.slaStatus === 'overdue').length,
        totalEstimatedHours: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
        totalActualHours: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
        averageCompletionTime: avgCompletionTime
      };
    });
  }

  /**
   * Get SLA metrics across all tasks
   */
  async getSlaMetrics(filters: TaskFilters = {}): Promise<SlaMetrics> {
    const where: any = {};

    // Apply same filters as getTasks
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.serviceId) where.serviceId = filters.serviceId;

    const tasks = await prisma.projectTask.findMany({
      where,
      select: { slaStatus: true, status: true, completedAt: true, createdAt: true }
    });

    const metrics = {
      onTrack: tasks.filter(t => t.slaStatus === 'on_track').length,
      dueToday: tasks.filter(t => t.slaStatus === 'due_today').length,
      overdue: tasks.filter(t => t.slaStatus === 'overdue').length,
      totalTasks: tasks.length,
      averageCompletionRate: 0
    };

    // Calculate completion rate
    const completedTasks = tasks.filter(t => t.status === 'done');
    metrics.averageCompletionRate = tasks.length > 0 
      ? Math.round((completedTasks.length / tasks.length) * 100) 
      : 0;

    return metrics;
  }

  /**
   * Update SLA statuses for all active tasks (to be run daily)
   */
  async updateSlaStatuses(): Promise<void> {
    const activeTasks = await prisma.projectTask.findMany({
      where: {
        status: { not: 'done' },
        dueDate: { not: null }
      }
    });

    const updates = activeTasks.map(task => {
      const newSlaStatus = this.calculateSlaStatus(task.dueDate!, task.status);
      return {
        id: task.id,
        slaStatus: newSlaStatus
      };
    });

    // Batch update SLA statuses
    for (const update of updates) {
      await prisma.projectTask.update({
        where: { id: update.id },
        data: { slaStatus: update.slaStatus }
      });
    }

    logger.info(`Updated SLA statuses for ${updates.length} tasks`);
  }

  /**
   * Calculate SLA status based on due date and current status
   */
  private calculateSlaStatus(dueDate?: Date | null, status = 'to_do'): string {
    if (!dueDate || status === 'done') {
      return 'on_track';
    }

    const now = new Date();
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const timeDiff = dueDateOnly.getTime() - todayOnly.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      return 'overdue';
    } else if (daysDiff === 0) {
      return 'due_today';
    } else {
      return 'on_track';
    }
  }

  /**
   * Validate task status transitions
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      'to_do': ['doing', 'blocked'],
      'doing': ['blocked', 'done', 'to_do'],
      'blocked': ['to_do', 'doing', 'done'],
      'done': ['doing'] // Allow reopening completed tasks
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  /**
   * Delete a task (soft delete by setting status)
   */
  async deleteTask(taskId: string, deletedBy: string): Promise<void> {
    const task = await prisma.projectTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    if (task.status === 'done') {
      throw new AppError('Cannot delete completed tasks', 400, 'CANNOT_DELETE_COMPLETED');
    }

    // For now, we'll actually delete the task since there's no soft delete field
    // In production, you might want to add a deletedAt field
    await prisma.projectTask.delete({
      where: { id: taskId }
    });

    logger.info(`Task deleted: ${taskId} by ${deletedBy}`);
  }
}