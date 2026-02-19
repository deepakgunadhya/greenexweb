import { Router } from "express";
import { ContentController } from "./content.controller";
import {
  authenticateToken,
  requirePermissions,
} from "../../middleware/auth.middleware";
import { uploadFields } from "../../middleware/upload.middleware";

const router: Router = Router();
const contentController = new ContentController();

/**
 * @swagger
 * tags:
 *   name: Content
 *   description: CMS Content management endpoints
 */

// Public endpoints (no authentication required)

// Public endpoints (no authentication required)
router.get("/slug/:slug", contentController.getBySlug);
router.get("/featured", contentController.getFeatured);
router.get("/public", contentController.getPublic);

// Protected endpoints (authentication required)
router.get(
  "/stats",
  authenticateToken,
  requirePermissions(["cms:read"]),
  contentController.getStats
);
router.get(
  "/training",
  authenticateToken,
  requirePermissions(["cms:read"]),
  contentController.getTraining
);
router.post(
  "/",
  authenticateToken,
  requirePermissions(["cms:create"]),
  uploadFields,
  contentController.create
);
router.get(
  "/",
  authenticateToken,
  requirePermissions(["cms:read"]),
  contentController.getAll
);
router.get(
  "/:id",
  authenticateToken,
  requirePermissions(["cms:read"]),
  contentController.getById
);
router.put(
  "/:id",
  authenticateToken,
  requirePermissions(["cms:update"]),
  uploadFields,
  contentController.update
);
router.delete(
  "/:id",
  authenticateToken,
  requirePermissions(["cms:delete"]),
  contentController.delete
);

export default router;
