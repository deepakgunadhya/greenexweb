import { Router, RequestHandler } from "express";
import { ClientController } from "./client.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { validateSchema } from "../../middleware/validation.middleware";
import * as Joi from "joi";

const router: Router = Router();
const clientController = new ClientController();

// Validation schemas
const quotationActionSchema = Joi.object({
  action: Joi.string().valid('accept', 'reject', 'ACCEPT', 'REJECT').required()
});

const otpConfirmationSchema = Joi.object({
  otp: Joi.string().length(6).pattern(/^\d+$/).required()
});

const meetingConfirmSchema = Joi.object({
  attending: Joi.boolean().required()
});

const idParamSchema = Joi.object({
  id: Joi.string().required()
});

const quotationIdParamSchema = Joi.object({
  quotationId: Joi.string().required()
});

const meetingIdParamSchema = Joi.object({
  meetingId: Joi.string().required()
});

const projectIdParamSchema = Joi.object({
  projectId: Joi.string().required()
});

// All client routes require authentication and CLIENT user type
const requireClientAuth = [
  authenticateToken,
  (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user || user.userType !== 'CLIENT') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Client access required.'
        }
      });
    }
    next();
  }
];

/**
 * @swagger
 * components:
 *   schemas:
 *     ClientQuotation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         projectName:
 *           type: string
 *         description:
 *           type: string
 *         totalCost:
 *           type: number
 *         currency:
 *           type: string
 *         status:
 *           type: string
 *           enum: [draft, sent, accepted, rejected]
 *         validUntil:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/client/quotations:
 *   get:
 *     summary: Get client's quotations
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of client quotations
 */
router.get("/quotations", ...requireClientAuth, clientController.getQuotations);

/**
 * @swagger
 * /api/client/quotations/{quotationId}/request-action:
 *   post:
 *     summary: Request quotation action (accept/reject) with OTP
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/quotations/:quotationId/request-action",
  ...requireClientAuth,
  validateSchema(quotationIdParamSchema, "params"),
  validateSchema(quotationActionSchema, "body"),
  clientController.requestQuotationAction
);

/**
 * @swagger
 * /api/client/quotations/{quotationId}/confirm-action:
 *   post:
 *     summary: Confirm quotation action with OTP
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/quotations/:quotationId/confirm-action",
  ...requireClientAuth,
  validateSchema(quotationIdParamSchema, "params"),
  validateSchema(otpConfirmationSchema, "body"),
  clientController.confirmQuotationAction
);

/**
 * @swagger
 * /api/client/projects:
 *   get:
 *     summary: Get client's projects
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 */
router.get("/projects", ...requireClientAuth, clientController.getProjects);

/**
 * @swagger
 * /api/client/projects/stats:
 *   get:
 *     summary: Get client's project statistics
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 */
router.get("/projects/stats", ...requireClientAuth, clientController.getProjectStats);

/**
 * @swagger
 * /api/client/projects/{id}:
 *   get:
 *     summary: Get specific client project
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/projects/:id",
  ...requireClientAuth,
  validateSchema(idParamSchema, "params"),
  clientController.getProject
);

/**
 * @swagger
 * /api/client/projects/{projectId}/reports:
 *   get:
 *     summary: Get client project reports
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/projects/:projectId/reports",
  ...requireClientAuth,
  validateSchema(projectIdParamSchema, "params"),
  clientController.getProjectReports
);

/**
 * @swagger
 * /api/client/meetings:
 *   get:
 *     summary: Get client's meetings
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 */
router.get("/meetings", ...requireClientAuth, clientController.getMeetings);

/**
 * @swagger
 * /api/client/meetings/{id}:
 *   get:
 *     summary: Get specific client meeting
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/meetings/:id",
  ...requireClientAuth,
  validateSchema(idParamSchema, "params"),
  clientController.getMeeting
);

/**
 * @swagger
 * /api/client/meetings/{meetingId}/confirm:
 *   post:
 *     summary: Confirm meeting attendance
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/meetings/:meetingId/confirm",
  ...requireClientAuth,
  validateSchema(meetingIdParamSchema, "params"),
  validateSchema(meetingConfirmSchema, "body"),
  clientController.confirmMeeting
);

export default router;