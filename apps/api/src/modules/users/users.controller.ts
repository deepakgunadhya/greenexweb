import { Request, Response } from "express";
import { UsersService } from "./users.service";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { successResponse, errorResponse } from "../../utils/response";
import { asyncHandler } from "../../middleware/error.middleware";
import {
  validateCreateUserData,
  validateUpdateUserData,
  validateUserQueryParams,
  validateAssignRolesData,
} from "./users.validator";
import prisma from "../../config/database";

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  /**
   * @swagger
   * /api/v1/users:
   *   post:
   *     summary: Create a new user
   *     tags: [Users]
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
   *               - password
   *               - firstName
   *               - lastName
   *               - roleIds
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 8
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               phone:
   *                 type: string
   *               roleIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *     responses:
   *       201:
   *         description: User created successfully
   *       400:
   *         description: Validation error
   *       409:
   *         description: User already exists
   */
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { error, value } = validateCreateUserData(req.body);

    if (error) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const user = await this.usersService.create(value);
    // Email notification is sent automatically in service

    res.status(201).json(successResponse(user));
  });

  /**
   * @swagger
   * /api/v1/users:
   *   get:
   *     summary: Get all users with filtering and pagination
   *     tags: [Users]
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
   *         name: role
   *         schema:
   *           type: string
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: isVerified
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   */
  findMany = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validateUserQueryParams(req.query);

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

    const result = await this.usersService.findMany(value);

    res.json(successResponse(result.users, result.meta));
  });

  /**
   * @swagger
   * /api/v1/users/{id}:
   *   get:
   *     summary: Get user by ID
   *     tags: [Users]
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
   *         description: User retrieved successfully
   *       404:
   *         description: User not found
   */
  findById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    if (id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid user ID"));
    }

    const user = await this.usersService.findById(id);

    res.json(successResponse(user));
  });

  /**
   * @swagger
   * /api/v1/users/{id}:
   *   put:
   *     summary: Update user
   *     tags: [Users]
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
   *               email:
   *                 type: string
   *                 format: email
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               phone:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *               isVerified:
   *                 type: boolean
   *               roleIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *     responses:
   *       200:
   *         description: User updated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: User not found
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid user ID"));
    }

    const { error, value } = validateUpdateUserData(req.body);

    if (error) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const user = await this.usersService.update(id, value);

    res.json(successResponse(user));
  });

  /**
   * @swagger
   * /api/v1/users/{id}:
   *   delete:
   *     summary: Delete user (soft delete)
   *     tags: [Users]
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
   *         description: User deleted successfully
   *       400:
   *         description: Cannot delete user with dependencies
   *       404:
   *         description: User not found
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid user ID"));
    }

    const result = await this.usersService.delete(id);

    res.json(successResponse(result));
  });

  /**
   * @swagger
   * /api/v1/users/{id}/roles:
   *   put:
   *     summary: Assign roles to user
   *     tags: [Users]
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
   *             required:
   *               - roleIds
   *             properties:
   *               roleIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *     responses:
   *       200:
   *         description: Roles assigned successfully
   *       400:
   *         description: Invalid role IDs
   *       404:
   *         description: User not found
   */
  assignRoles = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("INVALID_ID", "Invalid user ID"));
    }

    const { error, value } = validateAssignRolesData(req.body);

    if (error) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const result = await this.usersService.assignRoles(id, value.roleIds);

    res.json(successResponse(result));
  });

  /**
   * @swagger
   * /api/v1/users/chat-module:
   *   get:
   *     summary: Get users available for chat
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Chat users retrieved successfully
   */
  findChatUsers = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const callerType = req.user?.userType || "INTERNAL";
      const callerOrgId = req.user?.organizationId;
      const callerId = req.user?.id;

      const search = req.query.search as string | undefined;

      // Build search filter
      const searchFilter = search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      let users;

      if (callerType === "CLIENT") {
        // CLIENT caller: see internal users + client users from SAME organization only
        users = await prisma.user.findMany({
          where: {
            isActive: true,
            id: { not: callerId },
            ...searchFilter,
            OR: [
              // All internal users
              { userType: "INTERNAL" },
              // Client users from the same organization
              ...(callerOrgId
                ? [{ userType: "CLIENT", organizationId: callerOrgId }]
                : []),
            ],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
            userType: true,
            organization: {
              select: { id: true, name: true },
            },
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        });
      } else {
        // INTERNAL caller: see all active users (internal + client)
        users = await prisma.user.findMany({
          where: {
            isActive: true,
            id: { not: callerId },
            ...searchFilter,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
            userType: true,
            organization: {
              select: { id: true, name: true },
            },
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        });
      }

      res.json(successResponse(users));
    }
  );

  /**
   * @swagger
   * /api/v1/users/stats:
   *   get:
   *     summary: Get user statistics
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User statistics retrieved successfully
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.usersService.getStats();

    res.json(successResponse(stats));
  });
}
