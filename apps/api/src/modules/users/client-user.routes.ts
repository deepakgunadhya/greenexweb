import { Router } from 'express';
import { authenticateToken, requirePermissions } from '../../middleware/auth.middleware';
import { clientUserController } from './client-user.controller';

const router: Router = Router();

// All client user management routes require authentication and appropriate permissions
router.use(authenticateToken);

/**
 * @swagger
 * /api/admin/client-users:
 *   post:
 *     tags: [Admin - Client Users]
 *     summary: Create a new client user
 *     description: Create a client user linked to an organization or lead
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *             properties:
 *               organizationId:
 *                 type: string
 *                 description: Organization ID (required if leadId not provided)
 *               leadId:
 *                 type: string
 *                 description: Lead ID (required if organizationId not provided)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Client user email
 *               firstName:
 *                 type: string
 *                 description: Client user first name
 *               lastName:
 *                 type: string
 *                 description: Client user last name
 *               phone:
 *                 type: string
 *                 description: Client user phone number
 *               password:
 *                 type: string
 *                 description: Custom password (optional - will generate if not provided)
 *               sendWelcomeEmail:
 *                 type: boolean
 *                 default: true
 *                 description: Send welcome email with credentials
 *     responses:
 *       201:
 *         description: Client user created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/ClientUser'
 *                     temporaryPassword:
 *                       type: string
 *                       description: Generated password (only if custom password not provided)
 *       400:
 *         description: Validation error or user already exists
 *       403:
 *         description: Insufficient permissions
 */
router.post('/', 
  requirePermissions(['users:create']),
  clientUserController.createClientUser
);

/**
 * @swagger
 * /api/admin/client-users:
 *   get:
 *     tags: [Admin - Client Users]
 *     summary: Get all client users
 *     description: Retrieve list of client users, optionally filtered by organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: Filter by organization ID
 *     responses:
 *       200:
 *         description: List of client users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ClientUser'
 */
router.get('/',
  requirePermissions(['users:read']),
  clientUserController.getClientUsers
);

/**
 * @swagger
 * /api/admin/client-users/{id}:
 *   get:
 *     tags: [Admin - Client Users]
 *     summary: Get client user by ID
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
 *         description: Client user details
 *       404:
 *         description: Client user not found
 */
router.get('/:id',
  requirePermissions(['users:read']),
  clientUserController.getClientUserById
);

/**
 * @swagger
 * /api/admin/client-users/{id}:
 *   put:
 *     tags: [Admin - Client Users]
 *     summary: Update client user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Client user updated successfully
 *       404:
 *         description: Client user not found
 */
router.put('/:id',
  requirePermissions(['users:update']),
  clientUserController.updateClientUser
);

/**
 * @swagger
 * /api/admin/client-users/{id}/deactivate:
 *   post:
 *     tags: [Admin - Client Users]
 *     summary: Deactivate client user
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
 *         description: Client user deactivated successfully
 *       404:
 *         description: Client user not found
 */
router.post('/:id/deactivate',
  requirePermissions(['users:update']),
  clientUserController.deactivateClientUser
);

/**
 * @swagger
 * /api/admin/client-users/{id}/reactivate:
 *   post:
 *     tags: [Admin - Client Users]
 *     summary: Reactivate client user
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
 *         description: Client user reactivated successfully
 *       404:
 *         description: Client user not found
 */
router.post('/:id/reactivate',
  requirePermissions(['users:update']),
  clientUserController.reactivateClientUser
);

/**
 * @swagger
 * /api/admin/client-users/{id}/reset-password:
 *   post:
 *     tags: [Admin - Client Users]
 *     summary: Reset client user password
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sendEmail:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: Client user not found
 */
router.post('/:id/reset-password',
  requirePermissions(['users:update']),
  clientUserController.resetClientPassword
);

export default router;