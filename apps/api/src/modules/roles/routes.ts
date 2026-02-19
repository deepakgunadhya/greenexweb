import { Router } from 'express';
import { RolesController } from './roles.controller';
import { authenticateToken, requirePermissions } from '../../middleware/auth.middleware';

const router: Router = Router();
const rolesController = new RolesController();

// All routes require authentication
router.use(authenticateToken);

// GET /roles/permissions - Get available permissions
router.get('/permissions', 
  requirePermissions(['roles:read']),
  rolesController.getAvailablePermissions
);

// GET /roles/stats - Role statistics
router.get('/stats', 
  requirePermissions(['roles:read']),
  rolesController.getStats
);

// POST /roles - Create role
router.post('/', 
  requirePermissions(['roles:create']),
  rolesController.create
);

// GET /roles - List roles
router.get('/',
  requirePermissions(['roles:read']),
  rolesController.findMany
);

// GET /roles/lookup - Lightweight role list for dropdowns (auth-only, no permission required)
router.get('/lookup', rolesController.lookup);

// GET /roles/:id - Get role by ID
router.get('/:id', 
  requirePermissions(['roles:read']),
  rolesController.findById
);

// PUT /roles/:id - Update role
router.put('/:id', 
  requirePermissions(['roles:update']),
  rolesController.update
);

// DELETE /roles/:id - Delete role
router.delete('/:id', 
  requirePermissions(['roles:delete']),
  rolesController.delete
);

export default router;