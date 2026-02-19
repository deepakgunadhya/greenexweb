import { Request, Response } from "express";
import { OrganizationsService } from "./organizations.service";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { successResponse, errorResponse } from "../../utils/response";
import { asyncHandler } from "../../middleware/error.middleware";

import {
  validateCreateOrganizationData,
  validateUpdateOrganizationData,
  validateQueryParams,
} from "./organizations.validator";

export class OrganizationsController {
  private organizationsService: OrganizationsService;

  constructor() {
    this.organizationsService = new OrganizationsService();
  }

  /**
   * @swagger
   * /api/v1/organizations:
   *   post:
   *     summary: Create a new organization
   *     tags: [Organizations]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - type
   *             properties:
   *               name:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [CLIENT, PARTNER, VENDOR, PROSPECT]
   *               industry:
   *                 type: string
   *               website:
   *                 type: string
   *               phone:
   *                 type: string
   *               email:
   *                 type: string
   *               address:
   *                 type: string
   *               city:
   *                 type: string
   *               state:
   *                 type: string
   *               country:
   *                 type: string
   *               postalCode:
   *                 type: string
   *     responses:
   *       201:
   *         description: Organization created successfully
   *       400:
   *         description: Validation error
   *       409:
   *         description: Organization already exists
   */
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { error, value } = validateCreateOrganizationData(req.body);

    if (error) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const organization = await this.organizationsService.create(value, req.user?.id);

    res.status(201).json(successResponse(organization));
  });

  /**
   * @swagger
   * /api/v1/organizations/lookup:
   *   get:
   *     summary: Get lightweight organization list for dropdowns
   *     tags: [Organizations]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Organization lookup list retrieved successfully
   */
  lookup = asyncHandler(async (req: Request, res: Response) => {
    const organizations = await this.organizationsService.lookup();
    res.json(successResponse(organizations));
  });

  /**
   * @swagger
   * /api/v1/organizations:
   *   get:
   *     summary: Get all organizations with filtering and pagination
   *     tags: [Organizations]
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
   *           maximum: 100
   *           default: 10
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [CLIENT, PARTNER, VENDOR, PROSPECT]
   *       - in: query
   *         name: industry
   *         schema:
   *           type: string
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: Organizations retrieved successfully
   */
  findMany = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validateQueryParams(req.query);

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

    const result = await this.organizationsService.findMany(value);

    res.json(successResponse(result.organizations, result.meta));
  });

  /**
   * @swagger
   * /api/v1/organizations/{id}:
   *   get:
   *     summary: Get organization by ID
   *     tags: [Organizations]
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
   *         description: Organization retrieved successfully
   *       404:
   *         description: Organization not found
   */
  findById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid organization ID"));
    }

    const organization = await this.organizationsService.findById(id);

    res.json(successResponse(organization));
  });

  /**
   * @swagger
   * /api/v1/organizations/{id}:
   *   put:
   *     summary: Update organization
   *     tags: [Organizations]
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
   *               name:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [CLIENT, PARTNER, VENDOR, PROSPECT]
   *               industry:
   *                 type: string
   *               website:
   *                 type: string
   *               phone:
   *                 type: string
   *               email:
   *                 type: string
   *               address:
   *                 type: string
   *               city:
   *                 type: string
   *               state:
   *                 type: string
   *               country:
   *                 type: string
   *               postalCode:
   *                 type: string
   *     responses:
   *       200:
   *         description: Organization updated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Organization not found
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid organization ID"));
    }

    const { error, value } = validateUpdateOrganizationData(req.body);

    if (error) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const organization = await this.organizationsService.update(id, value);

    res.json(successResponse(organization));
  });

  /**
   * @swagger
   * /api/v1/organizations/{id}:
   *   delete:
   *     summary: Delete organization (soft delete)
   *     tags: [Organizations]
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
   *         description: Organization deleted successfully
   *       400:
   *         description: Cannot delete organization with dependencies
   *       404:
   *         description: Organization not found
   */
  delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid organization ID"));
    }

    const result = await this.organizationsService.delete(id, {
      deletedById: req.user?.id,
    });

    res.json(successResponse(result));
  });

  /**
   * @swagger
   * /api/v1/organizations/stats:
   *   get:
   *     summary: Get organization statistics
   *     tags: [Organizations]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Organization statistics retrieved successfully
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.organizationsService.getStats();

    res.json(successResponse(stats));
  });
}
