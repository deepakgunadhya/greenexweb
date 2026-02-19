import { Router } from 'express';
import { OrganizationsController } from './organizations.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { CRM_PERMISSIONS, requireCrmPermission } from '../../middleware/crm.middleware';

const router: Router = Router();
const organizationsController = new OrganizationsController();

// All routes require authentication
router.use(authenticateToken);

// GET /organizations/stats - Organization statistics (SRS 5.1.4 - Sales Executive, Ops Manager, Accounts, Super Admin)
router.get('/stats', 
  requireCrmPermission(CRM_PERMISSIONS.ORGANIZATIONS_VIEW),
  organizationsController.getStats
);

// POST /organizations - Create organization (SRS 5.1.4 - Sales Executive, Super Admin only)
router.post('/', 
  requireCrmPermission(CRM_PERMISSIONS.ORGANIZATIONS_CREATE),
  organizationsController.create
);

// GET /organizations - List organizations with filtering/pagination (SRS 5.1.4 - Sales Executive, Ops Manager, Accounts, Super Admin)
router.get('/',
  requireCrmPermission(CRM_PERMISSIONS.ORGANIZATIONS_VIEW),
  organizationsController.findMany
);

// GET /organizations/lookup - Lightweight org list for dropdowns (auth-only, no permission required)
router.get('/lookup',
  organizationsController.lookup
);

// GET /organizations/:id - Get organization by ID (SRS 5.1.4 - Sales Executive, Ops Manager, Accounts, Super Admin)
router.get('/:id', 
  requireCrmPermission(CRM_PERMISSIONS.ORGANIZATIONS_VIEW),
  organizationsController.findById
);

// PUT /organizations/:id - Update organization (SRS 5.1.4 - Sales Executive, Super Admin only)
router.put('/:id', 
  requireCrmPermission(CRM_PERMISSIONS.ORGANIZATIONS_UPDATE),
  organizationsController.update
);

// DELETE /organizations/:id - Delete organization (soft delete) (SRS 5.1.4 - Sales Executive, Super Admin only)
router.delete('/:id', 
  requireCrmPermission(CRM_PERMISSIONS.ORGANIZATIONS_DELETE),
  organizationsController.delete
);

export default router;