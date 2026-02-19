/**
 * Dashboard Routes
 * Enterprise-level dashboard API endpoints
 */

import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import {
  authenticateToken,
  requirePermissions,
} from "../../middleware/auth.middleware";

const router: Router = Router();
const dashboardController = new DashboardController();

// All dashboard routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Enterprise dashboard endpoints
 */

// GET /dashboard/stats - Permission-filtered dashboard statistics
router.get("/stats", dashboardController.getStats);

// GET /dashboard/activities - Recent activities feed
router.get("/activities", dashboardController.getActivities);

// GET /dashboard/my-tasks - Current user's task summary
router.get("/my-tasks", dashboardController.getMyTasksSummary);

// GET /dashboard/my-meetings - Current user's upcoming meetings
router.get(
  "/my-meetings",
  requirePermissions(["meetings:read"]),
  dashboardController.getMyMeetings
);

// GET /dashboard/client - Client portal dashboard (for client users only)
router.get("/client", dashboardController.getClientDashboard);

// GET /dashboard/widget-preferences - Get user's widget visibility preferences
router.get("/widget-preferences", dashboardController.getWidgetPreferences);

// PUT /dashboard/widget-preferences - Update user's widget visibility preferences
router.put("/widget-preferences", dashboardController.updateWidgetPreferences);

export default router;
