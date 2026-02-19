import { Request, Response } from "express";
import { LeadsService } from "./leads.service";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { successResponse, errorResponse } from "../../utils/response";
import { asyncHandler } from "../../middleware/error.middleware";
import {
  validateCreateLeadData,
  validateUpdateLeadData,
  validateLeadQueryParams,
} from "./leads.validator";

export class LeadsController {
  private leadsService: LeadsService;

  constructor() {
    this.leadsService = new LeadsService();
  }

  /**
   * @swagger
   * /api/v1/leads:
   *   post:
   *     summary: Create a new lead
   *     tags: [Leads]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - source
   *               - title
   *             properties:
   *               organizationId:
   *                 type: integer
   *               contactId:
   *                 type: integer
   *               source:
   *                 type: string
   *                 enum: [MOBILE_APP, MANUAL]
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               estimatedValue:
   *                 type: number
   *               probability:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 100
   *               expectedCloseDate:
   *                 type: string
   *                 format: date
   *               notes:
   *                 type: string
   *               companyName:
   *                 type: string
   *               contactName:
   *                 type: string
   *               contactEmail:
   *                 type: string
   *               contactPhone:
   *                 type: string
   *               serviceRequired:
   *                 type: string
   *               message:
   *                 type: string
   *     responses:
   *       201:
   *         description: Lead created successfully
   *       400:
   *         description: Validation error
   */
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    console.log("==== LEAD CREATION DEBUG ====");
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Full request body:");
    for (const [key, value] of Object.entries(req.body)) {
      console.log(`  ${key}: ${JSON.stringify(value)} (${typeof value})`);
    }

    const { error, value } = validateCreateLeadData(req.body);

    if (error) {
      console.log("==== VALIDATION ERRORS ====");
      console.log("Error details:", error.details);
      for (const [field, errors] of Object.entries(error.details || {})) {
        console.log(`  Field '${field}': ${JSON.stringify(errors)}`);
      }
      console.log("==== END VALIDATION ERRORS ====");

      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const lead = await this.leadsService.create(value);

    res.status(201).json(successResponse(lead));
  });

  /**
   * @swagger
   * /api/v1/leads/lookup:
   *   get:
   *     summary: Get lightweight lead list for dropdowns
   *     tags: [Leads]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lead lookup list retrieved successfully
   */
  lookup = asyncHandler(async (req: Request, res: Response) => {
    const leads = await this.leadsService.lookup();
    res.json(successResponse(leads));
  });

  /**
   * @swagger
   * /api/v1/leads:
   *   get:
   *     summary: Get all leads with filtering and pagination
   *     tags: [Leads]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 2000
   *           default: 10
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [NEW, IN_PROGRESS, CLOSED]
   *       - in: query
   *         name: source
   *         schema:
   *           type: string
   *           enum: [MOBILE_APP, MANUAL]
   *       - in: query
   *         name: organizationId
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Leads retrieved successfully
   */
  findMany = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validateLeadQueryParams(req.query);

    if (error) {
      return res
        .status(400)
        .json(
          errorResponse(
            "VALIDATION_ERROR",
            "Invalid query parameters",
            error.details
          )
        );
    }

    const result = await this.leadsService.findMany(value);

    res.json(successResponse(result.leads, result.meta));
  });

  /**
   * @swagger
   * /api/v1/leads/{id}:
   *   get:
   *     summary: Get lead by ID
   *     tags: [Leads]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Lead retrieved successfully
   *       404:
   *         description: Lead not found
   */
  findById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid lead ID"));
    }

    const lead = await this.leadsService.findById(id);

    res.json(successResponse(lead));
  });

  /**
   * @swagger
   * /api/v1/leads/{id}:
   *   put:
   *     summary: Update lead
   *     tags: [Leads]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [NEW, IN_PROGRESS, CLOSED]
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               estimatedValue:
   *                 type: number
   *               probability:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 100
   *               expectedCloseDate:
   *                 type: string
   *                 format: date
   *               actualCloseDate:
   *                 type: string
   *                 format: date
   *               notes:
   *                 type: string
   *     responses:
   *       200:
   *         description: Lead updated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Lead not found
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    console.log("==== LEAD UPDATE DEBUG ====");
    console.log("Lead ID:", id);
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Full request body:");
    for (const [key, value] of Object.entries(req.body)) {
      console.log(`  ${key}: ${JSON.stringify(value)} (${typeof value})`);
    }

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid lead ID"));
    }

    const { error, value } = validateUpdateLeadData(req.body);

    if (error) {
      console.log("==== UPDATE VALIDATION ERRORS ====");
      console.log("Error details:", error.details);
      for (const [field, errors] of Object.entries(error.details || {})) {
        console.log(`  Field '${field}': ${JSON.stringify(errors)}`);
      }
      console.log("==== END UPDATE VALIDATION ERRORS ====");

      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const lead = await this.leadsService.update(id, value);

    res.json(successResponse(lead));
  });

  /**
   * @swagger
   * /api/v1/leads/{id}:
   *   delete:
   *     summary: Delete lead
   *     tags: [Leads]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Lead deleted successfully
   *       400:
   *         description: Cannot delete lead with dependencies
   *       404:
   *         description: Lead not found
   */
  delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid lead ID"));
    }

    const result = await this.leadsService.delete(id, {
      deletedById: req.user?.id,
    });

    res.json(successResponse(result));
  });

  /**
   * @swagger
   * /api/v1/leads/stats:
   *   get:
   *     summary: Get lead statistics
   *     tags: [Leads]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lead statistics retrieved successfully
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.leadsService.getStats();

    res.json(successResponse(stats));
  });

  /**
   * @swagger
   * /api/v1/leads/mobile-enquiry:
   *   post:
   *     summary: Create lead from mobile app enquiry (public endpoint)
   *     tags: [Leads]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - contactName
   *               - contactPhone
   *               - contactEmail
   *               - companyName
   *               - serviceRequired
   *               - message
   *             properties:
   *               contactName:
   *                 type: string
   *               contactPhone:
   *                 type: string
   *               contactEmail:
   *                 type: string
   *               companyName:
   *                 type: string
   *               serviceRequired:
   *                 type: string
   *               message:
   *                 type: string
   *     responses:
   *       201:
   *         description: Enquiry submitted successfully
   *       400:
   *         description: Validation error
   */
  createMobileEnquiry = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validateCreateLeadData({
      ...req.body,
      source: "MOBILE_APP", // SRS 5.1.1 - Mobile app enquiries are tagged as MOBILE_APP
      title: `Enquiry from ${req.body.contactName} - ${req.body.serviceRequired}`,
    });

    if (error) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const lead = await this.leadsService.create(value);

    // Email notifications are handled automatically in the service layer per SRS 5.1.5

    res.status(201).json(
      successResponse({
        message:
          "Thank you for your enquiry. Our team will contact you shortly.",
        leadId: lead.id,
      })
    );
  });
}
