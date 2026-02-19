import { Router } from "express";
import { UsersController } from "./users.controller";
import {
  authenticateToken,
  requirePermissions,
} from "../../middleware/auth.middleware";

const router: Router = Router();
const usersController = new UsersController();

// All routes require authentication
router.use(authenticateToken);

// GET /users/stats - User statistics
router.get(
  "/stats",
  requirePermissions(["users:read"]),
  usersController.getStats
);

// POST /users - Create user
router.post("/", requirePermissions(["users:create"]), usersController.create);

// GET /users - List users with filtering/pagination
router.get("/", requirePermissions(["users:read"]), usersController.findMany);

// GET users available for chat (filtered by caller's userType)
router.get(
  "/chat-module",
  requirePermissions(["chat-module:access"]),
  usersController.findChatUsers
);

// GET /users/:id - Get user by ID
router.get(
  "/:id",
  requirePermissions(["users:read"]),
  usersController.findById
);

// PUT /users/:id - Update user
router.put(
  "/:id",
  requirePermissions(["users:update"]),
  usersController.update
);

// DELETE /users/:id - Delete user (soft delete)
router.delete(
  "/:id",
  requirePermissions(["users:delete"]),
  usersController.delete
);

// PUT /users/:id/roles - Assign roles to user
router.put(
  "/:id/roles",
  requirePermissions(["users:update"]),
  usersController.assignRoles
);

export default router;
