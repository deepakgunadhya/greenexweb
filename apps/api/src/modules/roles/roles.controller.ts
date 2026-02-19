import { Request, Response } from "express";
import { RolesService } from "./roles.service";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { successResponse, errorResponse } from "../../utils/response";
import { asyncHandler } from "../../middleware/error.middleware";
import {
  validateCreateRoleData,
  validateUpdateRoleData,
} from "./roles.validator";

export class RolesController {
  private rolesService: RolesService;

  constructor() {
    this.rolesService = new RolesService();
  }

  /**
   * @swagger
   * /api/v1/roles:
   *   post:
   *     summary: Create a new role
   *     tags: [Roles]
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
   *               - permissions
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               permissions:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       201:
   *         description: Role created successfully
   *       400:
   *         description: Validation error
   *       409:
   *         description: Role already exists
   */
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { error, value } = validateCreateRoleData(req.body);

    if (error) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const role = await this.rolesService.create(value);

    res.status(201).json(successResponse(role));
  });

  /**
   * @swagger
   * /api/v1/roles/lookup:
   *   get:
   *     summary: Get lightweight role list for dropdowns
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Role lookup list retrieved successfully
   */
  lookup = asyncHandler(async (req: Request, res: Response) => {
    const roles = await this.rolesService.lookup();
    res.json(successResponse(roles));
  });

  /**
   * @swagger
   * /api/v1/roles:
   *   get:
   *     summary: Get all roles
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Roles retrieved successfully
   */
  findMany = asyncHandler(async (req: Request, res: Response) => {
    const roles = await this.rolesService.findMany();

    res.json(successResponse(roles));
  });

  /**
   * @swagger
   * /api/v1/roles/{id}:
   *   get:
   *     summary: Get role by ID
   *     tags: [Roles]
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
   *         description: Role retrieved successfully
   *       404:
   *         description: Role not found
   */
  findById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid role ID"));
    }

    const role = await this.rolesService.findById(id);

    res.json(successResponse(role));
  });

  /**
   * @swagger
   * /api/v1/roles/{id}:
   *   put:
   *     summary: Update role
   *     tags: [Roles]
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
   *               description:
   *                 type: string
   *               permissions:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Role updated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Role not found
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid role ID"));
    }

    const { error, value } = validateUpdateRoleData(req.body);

    if (error) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const role = await this.rolesService.update(id, value);

    res.json(successResponse(role));
  });

  /**
   * @swagger
   * /api/v1/roles/{id}:
   *   delete:
   *     summary: Delete role
   *     tags: [Roles]
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
   *         description: Role deleted successfully
   *       400:
   *         description: Cannot delete role with assigned users
   *       404:
   *         description: Role not found
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid role ID"));
    }

    const result = await this.rolesService.delete(id);

    res.json(successResponse(result));
  });

  /**
   * @swagger
   * /api/v1/roles/permissions:
   *   get:
   *     summary: Get available permissions
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Available permissions retrieved successfully
   */
  getAvailablePermissions = asyncHandler(
    async (req: Request, res: Response) => {
      const permissions = await this.rolesService.getAvailablePermissions();

      res.json(successResponse(permissions));
    }
  );

  /**
   * @swagger
   * /api/v1/roles/stats:
   *   get:
   *     summary: Get role statistics
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Role statistics retrieved successfully
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.rolesService.getStats();

    res.json(successResponse(stats));
  });
}
