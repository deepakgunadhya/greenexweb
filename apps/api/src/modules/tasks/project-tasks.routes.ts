import { Router } from 'express';
import { ProjectTasksController } from './project-tasks.controller';
import { authenticateToken, requirePermissions } from '../../middleware/auth.middleware';

const router: Router = Router();
const controller = new ProjectTasksController();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Project task management and assignment
 */

// Task CRUD routes
// GET /api/v1/tasks - List all tasks with filtering
router.get('/',
  requirePermissions(['tasks:read']),
  controller.getTasks
);

// GET /api/v1/tasks/my-tasks - Get current user's assigned tasks
router.get('/my-tasks',
  requirePermissions(['tasks:read']),
  controller.getMyTasks
);

// GET /api/v1/tasks/assignable-users - Get users that can be assigned tasks
router.get('/assignable-users',
  requirePermissions(['tasks:read']),
  controller.getAssignableUsers
);

// GET /api/v1/tasks/stats - Get task statistics
router.get('/stats',
  requirePermissions(['tasks:read']),
  controller.getTaskStats
);

// GET /api/v1/tasks/unlock-requests/pending - Get all pending unlock requests (admin)
router.get('/unlock-requests/pending',
  requirePermissions(['tasks:manage-locks']),
  controller.getPendingUnlockRequests
);

// PATCH /api/v1/tasks/unlock-requests/:requestId/review - Approve/reject unlock request
router.patch('/unlock-requests/:requestId/review',
  requirePermissions(['tasks:manage-locks']),
  controller.reviewUnlockRequest
);

// POST /api/v1/tasks/generate-from-scope - Generate tasks from scope text
router.post('/generate-from-scope',
  requirePermissions(['tasks:create']),
  controller.generateTasksFromScope
);

// GET /api/v1/tasks/project/:projectId - Get project tasks with stats
router.get('/project/:projectId',
  requirePermissions(['tasks:read']),
  controller.getProjectTasks
);

// GET /api/v1/tasks/:id - Get single task by ID
router.get('/:id',
  requirePermissions(['tasks:read']),
  controller.getTaskById
);

// POST /api/v1/tasks - Create a new task
router.post('/',
  requirePermissions(['tasks:create']),
  controller.createTask
);

// PUT /api/v1/tasks/:id - Update a task
router.put('/:id',
  requirePermissions(['tasks:update']),
  controller.updateTask
);

// PATCH /api/v1/tasks/:id/status - Update task status only
router.patch('/:id/status',
  requirePermissions(['tasks:update']),
  controller.updateTaskStatus
);

// PATCH /api/v1/tasks/:id/reassign - Reassign task to different user
router.patch('/:id/reassign',
  requirePermissions(['tasks:assign']),
  controller.reassignTask
);

// PATCH /api/v1/tasks/:id/manual-lock - Manually lock a task (admin)
router.patch('/:id/manual-lock',
  requirePermissions(['tasks:manage-locks']),
  controller.manualLockTask
);

// PATCH /api/v1/tasks/:id/direct-unlock - Directly unlock a task (admin)
router.patch('/:id/direct-unlock',
  requirePermissions(['tasks:manage-locks']),
  controller.directUnlockTask
);

// POST /api/v1/tasks/:id/unlock-request - Request unlock for a locked task
router.post('/:id/unlock-request',
  requirePermissions(['tasks:read']),
  controller.requestUnlock
);

// GET /api/v1/tasks/:id/unlock-requests - Get unlock request history for a task
router.get('/:id/unlock-requests',
  requirePermissions(['tasks:read']),
  controller.getUnlockRequests
);

export default router;
