/**
 * Dashboard Controller
 * HTTP endpoint handlers for the enterprise dashboard
 */

import { Response } from "express";
import { DashboardService } from "./dashboard.service";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { successResponse, errorResponse } from "../../utils/response";
import { asyncHandler } from "../../middleware/error.middleware";

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  /**
   * @swagger
   * /api/v1/dashboard/stats:
   *   get:
   *     summary: Get dashboard statistics based on user permissions
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Dashboard statistics retrieved successfully
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
   *                     leads:
   *                       type: object
   *                     organizations:
   *                       type: object
   *                     projects:
   *                       type: object
   *                     tasks:
   *                       type: object
   *                     quotations:
   *                       type: object
   *                     meetings:
   *                       type: object
   *                     cms:
   *                       type: object
   *                     users:
   *                       type: object
   *       401:
   *         description: Unauthorized
   */
  getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res
        .status(401)
        .json(errorResponse("UNAUTHORIZED", "User not authenticated"));
    }

    const stats = await this.dashboardService.getStats({
      userId: req.user.id,
      permissions: req.user.permissions,
      organizationId: req.user.organizationId,
      userType: req.user.userType,
    });

    res.json(successResponse(stats));
  });

  /**
   * @swagger
   * /api/v1/dashboard/activities:
   *   get:
   *     summary: Get recent activities based on user permissions
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *         description: Number of activities to return
   *     responses:
   *       200:
   *         description: Activities retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getActivities = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        return res
          .status(401)
          .json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const limit = Math.min(
        Math.max(parseInt(req.query.limit as string) || 10, 1),
        50
      );

      const activities = await this.dashboardService.getActivities(
        {
          userId: req.user.id,
          permissions: req.user.permissions,
          organizationId: req.user.organizationId,
          userType: req.user.userType,
        },
        limit
      );

      res.json(successResponse(activities));
    }
  );

  /**
   * @swagger
   * /api/v1/dashboard/my-tasks:
   *   get:
   *     summary: Get current user's task summary
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Task summary retrieved successfully
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
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       title:
   *                         type: string
   *                       status:
   *                         type: string
   *                       priority:
   *                         type: string
   *                       dueDate:
   *                         type: string
   *                         format: date-time
   *                       projectName:
   *                         type: string
   *       401:
   *         description: Unauthorized
   */
  getMyTasksSummary = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        return res
          .status(401)
          .json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const tasks = await this.dashboardService.getMyTasksSummary(req.user.id);

      res.json(successResponse(tasks));
    }
  );

  /**
   * @swagger
   * /api/v1/dashboard/my-meetings:
   *   get:
   *     summary: Get current user's upcoming meetings
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Meetings retrieved successfully
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
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       title:
   *                         type: string
   *                       startTime:
   *                         type: string
   *                         format: date-time
   *                       endTime:
   *                         type: string
   *                         format: date-time
   *                       type:
   *                         type: string
   *                       status:
   *                         type: string
   *                       participants:
   *                         type: integer
   *       401:
   *         description: Unauthorized
   */
  getMyMeetings = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        return res
          .status(401)
          .json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const meetings = await this.dashboardService.getMyMeetings(req.user.id);

      res.json(successResponse(meetings));
    }
  );

  /**
   * @swagger
   * /api/v1/dashboard/client:
   *   get:
   *     summary: Get client portal dashboard statistics
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Client dashboard statistics retrieved successfully
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
   *                     projects:
   *                       type: object
   *                     quotations:
   *                       type: object
   *                     submissions:
   *                       type: object
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Not a client user or no organization
   */
  getClientDashboard = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        return res
          .status(401)
          .json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      // Verify this is a client user with an organization
      if (req.user.userType !== "CLIENT" || !req.user.organizationId) {
        return res
          .status(403)
          .json(
            errorResponse(
              "FORBIDDEN",
              "This endpoint is only available for client users"
            )
          );
      }

      const stats = await this.dashboardService.getClientDashboardStats(
        req.user.organizationId
      );

      res.json(successResponse(stats));
    }
  );

  /**
   * GET /dashboard/widget-preferences
   * Get current user's dashboard widget visibility preferences
   */
  getWidgetPreferences = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        return res
          .status(401)
          .json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const preferences = await this.dashboardService.getWidgetPreferences(
        req.user.id
      );

      res.json(successResponse(preferences));
    }
  );

  /**
   * PUT /dashboard/widget-preferences
   * Update current user's dashboard widget visibility preferences
   */
  updateWidgetPreferences = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        return res
          .status(401)
          .json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const { hiddenWidgets } = req.body;

      if (!Array.isArray(hiddenWidgets)) {
        return res
          .status(400)
          .json(
            errorResponse(
              "VALIDATION_ERROR",
              "hiddenWidgets must be an array of widget IDs"
            )
          );
      }

      const preferences = await this.dashboardService.updateWidgetPreferences(
        req.user.id,
        { hiddenWidgets }
      );

      res.json(successResponse(preferences));
    }
  );
}
