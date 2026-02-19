import { Router } from 'express';
import { QuotationsController, upload } from './quotations.controller';
import { authenticateToken, requirePermissions } from '../../middleware/auth.middleware';

const router = Router();
const quotationsController = new QuotationsController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Quotation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique quotation identifier
 *         leadId:
 *           type: string
 *           description: Associated lead ID
 *         title:
 *           type: string
 *           description: Quotation title/reference
 *         amount:
 *           type: number
 *           description: Quotation amount
 *         notes:
 *           type: string
 *           description: Additional notes
 *         documentPath:
 *           type: string
 *           description: Path to uploaded PDF
 *         originalFileName:
 *           type: string
 *           description: Original filename
 *         fileSize:
 *           type: integer
 *           description: File size in bytes
 *         status:
 *           type: string
 *           enum: [UPLOADED, SENT, ACCEPTED, REJECTED]
 *           description: Quotation status
 *         sentAt:
 *           type: string
 *           format: date-time
 *           description: When quotation was sent
 *         statusChangedAt:
 *           type: string
 *           format: date-time
 *           description: When status was last changed
 *         uploadedBy:
 *           type: string
 *           description: User ID who uploaded quotation
 *         statusChangedBy:
 *           type: string
 *           description: User ID who changed status
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         lead:
 *           $ref: '#/components/schemas/Lead'
 *         uploader:
 *           $ref: '#/components/schemas/User'
 *         statusChanger:
 *           $ref: '#/components/schemas/User'
 *     QuotationUpload:
 *       type: object
 *       required:
 *         - leadId
 *         - title
 *       properties:
 *         leadId:
 *           type: string
 *           description: Lead ID for quotation
 *         title:
 *           type: string
 *           description: Quotation title/reference
 *         amount:
 *           type: number
 *           description: Optional quotation amount
 *         notes:
 *           type: string
 *           description: Optional notes
 *         file:
 *           type: string
 *           format: binary
 *           description: PDF file to upload
 *     QuotationStatusUpdate:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [SENT, ACCEPTED, REJECTED]
 *           description: New status
 *         notes:
 *           type: string
 *           description: Optional notes about status change
 */

/**
 * @swagger
 * /api/quotations:
 *   get:
 *     tags: [Quotations]
 *     summary: Get all quotations with filters
 *     description: Retrieve quotations with pagination and filtering options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [UPLOADED, SENT, ACCEPTED, REJECTED]
 *         description: Filter by status
 *       - in: query
 *         name: leadId
 *         schema:
 *           type: string
 *         description: Filter by lead ID
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: Filter by organization ID
 *       - in: query
 *         name: uploadedBy
 *         schema:
 *           type: string
 *         description: Filter by uploader user ID
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Minimum amount filter
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Maximum amount filter
 *     responses:
 *       200:
 *         description: Quotations retrieved successfully
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
 *                     quotations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Quotation'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         pageSize:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/', requirePermissions(['quotations:read']), quotationsController.getAllQuotations);

/**
 * @swagger
 * /api/quotations/upload:
 *   post:
 *     tags: [Quotations]
 *     summary: Upload quotation PDF (SRS 5.2.1)
 *     description: Upload a PDF quotation file for a lead
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/QuotationUpload'
 *     responses:
 *       201:
 *         description: Quotation uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Quotation'
 *       400:
 *         description: Invalid input or lead state
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Server error
 */
router.post('/upload', 
  requirePermissions(['quotations:create']), 
  upload.single('file'), 
  quotationsController.uploadQuotation
);

/**
 * @swagger
 * /api/quotations/stats:
 *   get:
 *     tags: [Quotations]
 *     summary: Get quotation statistics
 *     description: Get quotation counts and values by status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter stats by specific user (optional)
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     total:
 *                       type: integer
 *                     uploaded:
 *                       type: integer
 *                     sent:
 *                       type: integer
 *                     accepted:
 *                       type: integer
 *                     rejected:
 *                       type: integer
 *                     totalValue:
 *                       type: number
 *                     acceptedValue:
 *                       type: number
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/stats', requirePermissions(['quotations:read']), quotationsController.getQuotationStats);

/**
 * @swagger
 * /api/quotations/{id}:
 *   get:
 *     tags: [Quotations]
 *     summary: Get quotation by ID
 *     description: Retrieve a specific quotation with full details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     responses:
 *       200:
 *         description: Quotation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Quotation'
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Quotation not found
 *       500:
 *         description: Server error
 */
router.get('/:id', requirePermissions(['quotations:read']), quotationsController.getQuotationById);

/**
 * @swagger
 * /api/quotations/{id}/status:
 *   put:
 *     tags: [Quotations]
 *     summary: Update quotation status (SRS 5.2.3)
 *     description: Update quotation status (SENT, ACCEPTED, REJECTED)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuotationStatusUpdate'
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Quotation'
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Quotation not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', requirePermissions(['quotations:update']), quotationsController.updateQuotationStatus);

/**
 * @swagger
 * /api/quotations/{id}:
 *   put:
 *     tags: [Quotations]
 *     summary: Update quotation metadata
 *     description: Update quotation title, amount, or notes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated title
 *               amount:
 *                 type: number
 *                 description: Updated amount
 *               notes:
 *                 type: string
 *                 description: Updated notes
 *     responses:
 *       200:
 *         description: Quotation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Quotation'
 *       400:
 *         description: Invalid state for update
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Quotation not found
 *       500:
 *         description: Server error
 */
router.put('/:id', requirePermissions(['quotations:update']), quotationsController.updateQuotationMetadata);

/**
 * @swagger
 * /api/quotations/{id}/download:
 *   get:
 *     tags: [Quotations]
 *     summary: Download quotation PDF
 *     description: Download the uploaded quotation PDF file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Quotation or file not found
 *       500:
 *         description: Server error
 */
router.get('/:id/download', requirePermissions(['quotations:read']), quotationsController.downloadQuotationPDF);

/**
 * @swagger
 * /api/quotations/{id}:
 *   delete:
 *     tags: [Quotations]
 *     summary: Delete quotation
 *     description: Soft delete a quotation (cannot delete accepted quotations)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     responses:
 *       200:
 *         description: Quotation deleted successfully
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
 *                     message:
 *                       type: string
 *       400:
 *         description: Invalid state for deletion
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Quotation not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', requirePermissions(['quotations:delete']), quotationsController.deleteQuotation);

/**
 * @swagger
 * /api/quotations/lead/{leadId}:
 *   get:
 *     tags: [Quotations]
 *     summary: Get quotations by lead
 *     description: Retrieve all quotations for a specific lead
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Quotations retrieved successfully
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
 *                     $ref: '#/components/schemas/Quotation'
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/lead/:leadId', requirePermissions(['quotations:read']), quotationsController.getQuotationsByLead);

export default router;