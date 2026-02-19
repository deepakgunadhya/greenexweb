import { Router } from 'express';
import { ClientSubmissionsController } from './client-submissions.controller';
import { authenticateToken, requirePermissions } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';

const router: Router = Router();
const controller = new ClientSubmissionsController();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/client-submissions/{assignmentId}/upload:
 *   post:
 *     summary: Upload client submission
 *     tags: [Client Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:assignmentId/upload',
  requirePermissions(['checklists:submit']),
  upload.single('file'),
  controller.uploadSubmission
);

/**
 * @swagger
 * /api/v1/client-submissions/{assignmentId}/admin-upload:
 *   post:
 *     summary: Admin uploads submission on behalf of client
 *     tags: [Client Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:assignmentId/admin-upload',
  requirePermissions(['checklists:create']),
  upload.single('file'),
  controller.adminUploadSubmission
);

/**
 * @swagger
 * /api/v1/client-submissions/{assignmentId}/history:
 *   get:
 *     summary: Get submission history
 *     tags: [Client Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:assignmentId/history',
  requirePermissions(['checklists:read']),
  controller.getSubmissionHistory
);

/**
 * @swagger
 * /api/v1/client-submissions/{assignmentId}/latest:
 *   get:
 *     summary: Get latest submission
 *     tags: [Client Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:assignmentId/latest',
  requirePermissions(['checklists:read']),
  controller.getLatestSubmission
);

/**
 * @swagger
 * /api/v1/client-submissions/{submissionId}/review:
 *   post:
 *     summary: Review submission (admin only)
 *     tags: [Client Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:submissionId/review',
  requirePermissions(['checklists:review']),
  controller.reviewSubmission
);

/**
 * @swagger
 * /api/v1/client-submissions/{submissionId}/download:
 *   get:
 *     summary: Download submission file
 *     tags: [Client Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:submissionId/download',
  requirePermissions(['checklists:read']),
  controller.downloadSubmission
);

/**
 * @swagger
 * /api/v1/client-submissions/project/{projectId}/assignments:
 *   get:
 *     summary: Get client's template assignments for a project
 *     tags: [Client Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/project/:projectId/assignments',
  requirePermissions(['checklists:read']),
  controller.getClientProjectAssignments
);

/**
 * @swagger
 * /api/v1/client-submissions/project/{projectId}/history:
 *   get:
 *     summary: Get project-level checklist history
 *     tags: [Client Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/project/:projectId/history',
  requirePermissions(['checklists:read']),
  controller.getProjectChecklistHistory
);

export default router;
