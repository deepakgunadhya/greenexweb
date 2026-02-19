import { Router } from 'express';
import { ProjectsController } from './projects.controller';
import { authenticateToken, requirePermissions } from '../../middleware/auth.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
// import projectChecklistsRoutes from '../checklists/project-checklists.routes'; // OLD - Disabled

const router: Router = Router();
const projectsController = new ProjectsController();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all projects with filtering
router.get('/', projectsController.findMany);

// Get eligible quotations for project creation
router.get('/quotations/eligible', projectsController.getEligibleQuotations);

// Check quotation eligibility for project creation
router.get('/quotations/:quotationId/eligibility', projectsController.checkProjectCreationEligibility);

// Create project from accepted quotation (SRS 5.2.3)
router.post('/create-from-quotation', uploadSingle, projectsController.createFromQuotation);

// Get specific project
router.get('/:id', projectsController.findOne);

// Update project
router.put('/:id', uploadSingle, projectsController.update);

// PO attachment management
router.get('/:id/po-attachment/download', projectsController.downloadPoAttachment);
router.delete('/:id/po-attachment', projectsController.removePoAttachment);

// Status management routes
router.put('/:id/status', projectsController.updateStatus);
router.get('/:id/status/transitions', projectsController.getStatusTransitions);
router.get('/:id/status/can-update', projectsController.checkStatusUpdateAllowed);

// Project template assignments (document-based checklist workflow)
router.get('/:projectId/checklists',
  requirePermissions(['checklists:read']),
  projectsController.getProjectChecklists
);
router.get('/:projectId/checklists/available-templates',
  requirePermissions(['checklists:read']),
  projectsController.getAvailableTemplates
);
router.get('/:projectId/checklists/assignable-users',
  requirePermissions(['checklists:read']),
  projectsController.getAssignableUsersForChecklists
);
router.post('/:projectId/checklists/assign-template',
  requirePermissions(['checklists:create']),
  projectsController.assignTemplate
);

export default router;