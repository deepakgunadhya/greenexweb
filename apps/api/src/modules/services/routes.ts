import { Router } from 'express';
import { ServicesController } from './services.controller';
import { authenticateToken, requirePermissions } from '../../middleware/auth.middleware';

const router: Router = Router();
const servicesController = new ServicesController();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/v1/services - Get all services
router.get('/', requirePermissions(['services:read']), servicesController.findMany);

// GET /api/v1/services/lookup - Lightweight service list for dropdowns (auth-only, no permission required)
router.get('/lookup', servicesController.lookup);

// GET /api/v1/services/:id - Get service by ID
router.get('/:id', requirePermissions(['services:read']), servicesController.findOne);

// POST /api/v1/services - Create new service
router.post('/', requirePermissions(['services:create']), servicesController.create);

// PUT /api/v1/services/:id - Update service
router.put('/:id', requirePermissions(['services:update']), servicesController.update);

// DELETE /api/v1/services/:id - Delete (deactivate) service
router.delete('/:id', requirePermissions(['services:delete']), servicesController.delete);

export default router;