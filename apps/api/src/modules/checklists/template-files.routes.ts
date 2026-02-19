import { Router } from 'express';
import { TemplateFilesController } from './template-files.controller';
import { authenticateToken, requirePermissions } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';

const router: Router = Router();
const templateFilesController = new TemplateFilesController();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/template-files:
 *   get:
 *     summary: Get all template files
 *     tags: [Template Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: Template files retrieved successfully
 */
router.get('/',
  requirePermissions(['checklists:read']),
  templateFilesController.getAllTemplateFiles
);

/**
 * @swagger
 * /api/v1/template-files/{id}:
 *   get:
 *     summary: Get single template file
 *     tags: [Template Files]
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
 *         description: Template file retrieved successfully
 *       404:
 *         description: Template file not found
 */
router.get('/:id',
  requirePermissions(['checklists:read']),
  templateFilesController.getTemplateFile
);

/**
 * @swagger
 * /api/v1/template-files:
 *   post:
 *     summary: Upload template file
 *     tags: [Template Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - file
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               clientVisible:
 *                 type: boolean
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Template file uploaded successfully
 */
router.post('/',
  requirePermissions(['checklists:create']),
  upload.single('file'),
  templateFilesController.uploadTemplateFile
);

/**
 * @swagger
 * /api/v1/template-files/upload-multiple:
 *   post:
 *     summary: Upload multiple template files
 *     tags: [Template Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - files
 *             properties:
 *               category:
 *                 type: string
 *               clientVisible:
 *                 type: boolean
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Template files uploaded successfully
 */
router.post('/upload-multiple',
  requirePermissions(['checklists:create']),
  upload.array('files', 20), // Max 20 files
  templateFilesController.uploadMultipleTemplateFiles
);

/**
 * @swagger
 * /api/v1/template-files/{id}:
 *   put:
 *     summary: Update template file metadata
 *     tags: [Template Files]
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               clientVisible:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Template file updated successfully
 *       404:
 *         description: Template file not found
 */
router.put('/:id',
  requirePermissions(['checklists:update']),
  templateFilesController.updateTemplateFile
);

/**
 * @swagger
 * /api/v1/template-files/{templateFileId}/add-attachment:
 *   post:
 *     summary: Add attachment to existing template file
 *     tags: [Template Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateFileId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Attachment added successfully
 *       404:
 *         description: Template file not found
 */
router.post('/:templateFileId/add-attachment',
  requirePermissions(['checklists:update']),
  upload.single('file'),
  templateFilesController.addAttachment
);

/**
 * @swagger
 * /api/v1/template-files/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete an attachment
 *     tags: [Template Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attachment deleted successfully
 *       404:
 *         description: Attachment not found
 */
router.delete('/attachments/:attachmentId',
  requirePermissions(['checklists:delete']),
  templateFilesController.deleteAttachment
);

/**
 * @swagger
 * /api/v1/template-files/attachments/{attachmentId}/download:
 *   get:
 *     summary: Download specific attachment
 *     tags: [Template Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File download
 *       404:
 *         description: Attachment not found
 */
router.get('/attachments/:attachmentId/download',
  requirePermissions(['checklists:read']),
  templateFilesController.downloadAttachment
);

/**
 * @swagger
 * /api/v1/template-files/{id}:
 *   delete:
 *     summary: Delete template file
 *     tags: [Template Files]
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
 *         description: Template file deleted successfully
 *       404:
 *         description: Template file not found
 */
router.delete('/:id',
  requirePermissions(['checklists:delete']),
  templateFilesController.deleteTemplateFile
);

/**
 * @swagger
 * /api/v1/template-files/{id}/download:
 *   get:
 *     summary: Download template file
 *     tags: [Template Files]
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
 *         description: File downloaded successfully
 *       404:
 *         description: Template file not found
 */
router.get('/:id/download',
  requirePermissions(['checklists:read']),
  templateFilesController.downloadTemplateFile
);

export default router;
 
