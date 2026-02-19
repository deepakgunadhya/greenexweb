import { Response } from 'express';
import {
  ProjectTasksService,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilters,
  GenerateTasksFromScopeDto,
  TaskStatus,
  TaskType,
  UserContext
} from './project-tasks.service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class ProjectTasksController {
  private tasksService: ProjectTasksService;

  constructor() {
    this.tasksService = new ProjectTasksService();
  }

  /**
   * @swagger
   * /api/v1/tasks:
   *   get:
   *     summary: Get all tasks with filtering and pagination
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: projectId
   *         schema:
   *           type: string
   *         description: Filter by project
   *       - in: query
   *         name: assigneeId
   *         schema:
   *           type: string
   *         description: Filter by assignee
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [to_do, doing, blocked, done]
   *         description: Filter by task status
   *       - in: query
   *         name: priority
   *         schema:
   *           type: string
   *           enum: [low, medium, high]
   *         description: Filter by priority
   *       - in: query
   *         name: slaStatus
   *         schema:
   *           type: string
   *           enum: [on_track, due_today, overdue]
   *         description: Filter by SLA status
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in title and description
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Items per page
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [dueDate, status, priority, createdAt, updatedAt]
   *           default: dueDate
   *         description: Sort field
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: asc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Tasks retrieved successfully
   */
  getTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      projectId,
      assigneeId,
      status,
      priority,
      slaStatus,
      serviceId,
      dueDateFrom,
      dueDateTo,
      search,
      taskType,
      page = 1,
      pageSize = 5,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    const filters: TaskFilters = {
      ...(projectId && { projectId: projectId as string }),
      ...(assigneeId && { assigneeId: assigneeId as string }),
      ...(status && { status: status as any }),
      ...(priority && { priority: priority as any }),
      ...(slaStatus && { slaStatus: slaStatus as any }),
      ...(serviceId && { serviceId: serviceId as string }),
      ...(dueDateFrom && { dueDateFrom: new Date(dueDateFrom as string) }),
      ...(dueDateTo && { dueDateTo: new Date(dueDateTo as string) }),
      ...(search && { search: search as string }),
      ...(taskType && { taskType: taskType as TaskType })
    };

    // Build user context for role-based filtering
    const userContext: UserContext | undefined = req.user ? {
      userId: req.user.id,
      permissions: req.user.permissions || []
    } : undefined;

    const result = await this.tasksService.getTasks(
      filters,
      parseInt(page as string),
      parseInt(pageSize as string),
      sortBy as string,
      sortOrder as 'asc' | 'desc',
      userContext
    );

    res.json(successResponse(result.tasks, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: Math.ceil(result.total / result.pageSize)
    }));
  });

  /**
   * @swagger
   * /api/v1/tasks/{id}:
   *   get:
   *     summary: Get task by ID
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Task ID
   *     responses:
   *       200:
   *         description: Task retrieved successfully
   *       404:
   *         description: Task not found
   */
  getTaskById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const task = await this.tasksService.getTaskById(id);

    res.json(successResponse(task));
  });

  /**
   * @swagger
   * /api/v1/tasks:
   *   post:
   *     summary: Create a new task
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - projectId
   *               - title
   *               - assigneeId
   *             properties:
   *               projectId:
   *                 type: string
   *                 description: Project ID
   *               title:
   *                 type: string
   *                 description: Task title
   *               description:
   *                 type: string
   *                 description: Task description
   *               assigneeId:
   *                 type: string
   *                 description: ID of user to assign task to
   *               serviceId:
   *                 type: string
   *                 description: Associated service ID
   *               checklistLink:
   *                 type: string
   *                 description: Link to related checklist
   *               dueDate:
   *                 type: string
   *                 format: date
   *                 description: Task due date
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high]
   *                 default: medium
   *                 description: Task priority
   *               notes:
   *                 type: string
   *                 description: Internal notes
   *     responses:
   *       201:
   *         description: Task created successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Project or assignee not found
   */
  createTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const taskData: CreateTaskDto = req.body;

    // Validation
    const isGeneralTask = taskData.taskType === 'general' || !taskData.projectId;

    if (!isGeneralTask && !taskData.projectId) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'projectId is required for project tasks'));
    }

    if (!taskData.title || taskData.title.trim().length === 0) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'title is required'));
    }

    if (!taskData.assigneeId) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'assigneeId is required'));
    }

    // Set taskType based on presence of projectId
    if (!taskData.taskType) {
      taskData.taskType = taskData.projectId ? 'project' : 'general';
    }

    const task = await this.tasksService.createTask(taskData, req.user.id);

    res.status(201).json(successResponse(task));
  });

  /**
   * @swagger
   * /api/v1/tasks/{id}:
   *   put:
   *     summary: Update a task
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Task ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               assigneeId:
   *                 type: string
   *               serviceId:
   *                 type: string
   *               checklistLink:
   *                 type: string
   *               dueDate:
   *                 type: string
   *                 format: date
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high]
   *               status:
   *                 type: string
   *                 enum: [to_do, doing, blocked, done]
   *               blockedReason:
   *                 type: string
   *               notes:
   *                 type: string
   *               estimatedHours:
   *                 type: number
   *               actualHours:
   *                 type: number
   *     responses:
   *       200:
   *         description: Task updated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Task not found
   */
  updateTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const { id } = req.params;
    const updateData: UpdateTaskDto = req.body;

    const task = await this.tasksService.updateTask(id, updateData, req.user.id, req.user.permissions || []);

    res.json(successResponse(task));
  });

  /**
   * @swagger
   * /api/v1/tasks/{id}/status:
   *   patch:
   *     summary: Update task status
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Task ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [to_do, doing, blocked, done]
   *               blockedReason:
   *                 type: string
   *                 description: Required when status is 'blocked'
   *     responses:
   *       200:
   *         description: Task status updated successfully
   *       400:
   *         description: Validation error (e.g., blocked reason required)
   *       404:
   *         description: Task not found
   */
  updateTaskStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const { id } = req.params;
    const { status, blockedReason } = req.body;

    if (!status) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'status is required'));
    }

    const validStatuses: TaskStatus[] = ['to_do', 'doing', 'blocked', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', `status must be one of: ${validStatuses.join(', ')}`));
    }

    const task = await this.tasksService.updateTaskStatus(id, status, blockedReason, req.user.id, req.user.permissions || []);

    res.json(successResponse(task));
  });

  /**
   * @swagger
   * /api/v1/tasks/{id}/reassign:
   *   patch:
   *     summary: Reassign task to different user
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Task ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - assigneeId
   *             properties:
   *               assigneeId:
   *                 type: string
   *                 description: ID of new assignee
   *     responses:
   *       200:
   *         description: Task reassigned successfully
   *       400:
   *         description: Invalid assignee (e.g., client user)
   *       404:
   *         description: Task or user not found
   */
  reassignTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const { id } = req.params;
    const { assigneeId } = req.body;

    if (!assigneeId) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'assigneeId is required'));
    }

    const task = await this.tasksService.reassignTask(id, assigneeId, req.user.id, req.user.permissions || []);

    res.json(successResponse(task));
  });

  /**
   * @swagger
   * /api/v1/tasks/generate-from-scope:
   *   post:
   *     summary: Generate tasks from project scope text
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - projectId
   *               - scopeText
   *             properties:
   *               projectId:
   *                 type: string
   *                 description: Project ID
   *               scopeText:
   *                 type: string
   *                 description: Scope text (each line becomes a task)
   *               defaultAssigneeId:
   *                 type: string
   *                 description: Default assignee for generated tasks
   *               defaultPriority:
   *                 type: string
   *                 enum: [low, medium, high]
   *                 default: medium
   *               defaultDueDate:
   *                 type: string
   *                 format: date
   *     responses:
   *       201:
   *         description: Tasks generated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Project not found
   */
  generateTasksFromScope = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const scopeData: GenerateTasksFromScopeDto = req.body;

    if (!scopeData.projectId) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'projectId is required'));
    }

    if (!scopeData.scopeText || scopeData.scopeText.trim().length === 0) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'scopeText is required'));
    }

    const tasks = await this.tasksService.generateTasksFromScope(scopeData, req.user.id);

    res.status(201).json(successResponse(tasks, {
      count: tasks.length
    }));
  });

  /**
   * @swagger
   * /api/v1/tasks/my-tasks:
   *   get:
   *     summary: Get tasks assigned to current user
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [to_do, doing, blocked, done]
   *       - in: query
   *         name: priority
   *         schema:
   *           type: string
   *           enum: [low, medium, high]
   *       - in: query
   *         name: slaStatus
   *         schema:
   *           type: string
   *           enum: [on_track, due_today, overdue]
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: User's tasks retrieved successfully
   */
  getMyTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const {
      projectId,
      status,
      priority,
      slaStatus,
      page = 1,
      pageSize = 20
    } = req.query;

    const filters: Omit<TaskFilters, 'assigneeId'> = {
      ...(projectId && { projectId: projectId as string }),
      ...(status && { status: status as any }),
      ...(priority && { priority: priority as any }),
      ...(slaStatus && { slaStatus: slaStatus as any })
    };

    const result = await this.tasksService.getMyTasks(
      req.user.id,
      filters,
      parseInt(page as string),
      parseInt(pageSize as string)
    );

    res.json(successResponse(result.tasks, {
      total: result.total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      totalPages: Math.ceil(result.total / parseInt(pageSize as string))
    }));
  });

  /**
   * @swagger
   * /api/v1/tasks/project/{projectId}:
   *   get:
   *     summary: Get tasks for a specific project with statistics
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [to_do, doing, blocked, done]
   *       - in: query
   *         name: assigneeId
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 50
   *     responses:
   *       200:
   *         description: Project tasks retrieved successfully
   */
  getProjectTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.params;
    const {
      status,
      assigneeId,
      priority,
      slaStatus,
      page = 1,
      pageSize = 50
    } = req.query;

    const filters: Omit<TaskFilters, 'projectId'> = {
      ...(status && { status: status as any }),
      ...(assigneeId && { assigneeId: assigneeId as string }),
      ...(priority && { priority: priority as any }),
      ...(slaStatus && { slaStatus: slaStatus as any })
    };

    // Build user context for role-based filtering
    const userContext: UserContext | undefined = req.user ? {
      userId: req.user.id,
      permissions: req.user.permissions || []
    } : undefined;

    const result = await this.tasksService.getProjectTasks(
      projectId,
      filters,
      parseInt(page as string),
      parseInt(pageSize as string),
      userContext
    );

    res.json(successResponse(result.tasks, {
      total: result.total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      totalPages: Math.ceil(result.total / parseInt(pageSize as string)),
      stats: result.stats
    }));
  });

  /**
   * @swagger
   * /api/v1/tasks/assignable-users:
   *   get:
   *     summary: Get users that can be assigned tasks (internal users only)
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Assignable users retrieved successfully
   */
  getAssignableUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const users = await this.tasksService.getAssignableUsers();

    res.json(successResponse(users));
  });

  /**
   * @swagger
   * /api/v1/tasks/stats:
   *   get:
   *     summary: Get task statistics
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: projectId
   *         schema:
   *           type: string
   *         description: Filter stats by project (optional)
   *     responses:
   *       200:
   *         description: Task statistics retrieved successfully
   */
  getTaskStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, taskType } = req.query;

    // Build user context for role-based filtering
    const userContext: UserContext | undefined = req.user ? {
      userId: req.user.id,
      permissions: req.user.permissions || []
    } : undefined;

    const stats = await this.tasksService.getTaskStats(
      projectId as string | undefined,
      userContext,
      taskType as string | undefined
    );

    res.json(successResponse(stats));
  });

  // ============================================
  // Task Locking & Unlock Request Endpoints
  // ============================================

  /**
   * @swagger
   * /api/v1/tasks/{id}/unlock-request:
   *   post:
   *     summary: Request unlock for a locked task
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Mandatory reason for requesting unlock
   *     responses:
   *       201:
   *         description: Unlock request submitted
   *       400:
   *         description: Task not locked or reason missing
   *       409:
   *         description: Pending request already exists
   */
  requestUnlock = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || (typeof reason === 'string' && reason.trim().length === 0)) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'reason is required'));
    }

    const unlockRequest = await this.tasksService.requestUnlock(
      id,
      { reason },
      req.user.id
    );

    res.status(201).json(successResponse(unlockRequest));
  });

  /**
   * @swagger
   * /api/v1/tasks/unlock-requests/{requestId}/review:
   *   patch:
   *     summary: Approve or reject an unlock request
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: requestId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [decision]
   *             properties:
   *               decision:
   *                 type: string
   *                 enum: [approved, rejected]
   *               reviewNote:
   *                 type: string
   *     responses:
   *       200:
   *         description: Unlock request reviewed
   *       400:
   *         description: Invalid decision or already reviewed
   *       403:
   *         description: Insufficient permissions
   */
  reviewUnlockRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const { requestId } = req.params;
    const { decision, reviewNote } = req.body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'decision must be "approved" or "rejected"')
      );
    }

    const result = await this.tasksService.reviewUnlockRequest(
      requestId,
      { decision, reviewNote },
      req.user.id,
      req.user.permissions || []
    );

    res.json(successResponse(result));
  });

  /**
   * @swagger
   * /api/v1/tasks/{id}/unlock-requests:
   *   get:
   *     summary: Get unlock request history for a task
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 10
   *     responses:
   *       200:
   *         description: Unlock requests retrieved
   */
  getUnlockRequests = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const result = await this.tasksService.getUnlockRequests(id, page, pageSize);

    res.json(successResponse(result.requests, {
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize)
    }));
  });

  /**
   * @swagger
   * /api/v1/tasks/unlock-requests/pending:
   *   get:
   *     summary: Get all pending unlock requests (admin view)
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: Pending unlock requests retrieved
   */
  getPendingUnlockRequests = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await this.tasksService.getPendingUnlockRequests(page, pageSize);

    res.json(successResponse(result.requests, {
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize)
    }));
  });

  /**
   * @swagger
   * /api/v1/tasks/{id}/direct-unlock:
   *   patch:
   *     summary: Directly unlock a task (admin action)
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Task unlocked successfully
   *       400:
   *         description: Task is not locked
   *       403:
   *         description: Insufficient permissions
   */
  /**
   * Manually lock a task (admin action)
   */
  manualLockTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const { id } = req.params;

    const task = await this.tasksService.manualLockTask(
      id,
      req.user.id,
      req.user.permissions || []
    );

    res.json(successResponse(task));
  });

  directUnlockTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const { id } = req.params;

    const task = await this.tasksService.directUnlockTask(
      id,
      req.user.id,
      req.user.permissions || []
    );

    res.json(successResponse(task));
  });
}
