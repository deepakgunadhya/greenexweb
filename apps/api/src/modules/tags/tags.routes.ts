import { Router } from "express";
import { TagsController } from "./tags.controller";
import { authenticateToken, requirePermissions } from "../../middleware/auth.middleware";

const router: Router = Router();
const tagsController = new TagsController();

/**
 * @swagger
 * tags:
 *   name: Tags
 *   description: CMS Tags management endpoints
 */

// CRITICAL: Routes must be ordered from most specific to least specific
// Otherwise, catch-all /:id will match before specific routes like /all, /stats, /popular, /bulk, /with-content

// Public endpoints (no authentication required) - Specific routes first
router.get("/slug/:slug", tagsController.getBySlug);
router.get("/popular", tagsController.getPopular);
router.get("/with-content", tagsController.getTagsWithContent);

// Protected endpoints - All specific routes BEFORE generic ones
router.get("/all", authenticateToken, requirePermissions(['cms:read']), tagsController.getAllTags);
router.get("/stats", authenticateToken, requirePermissions(['cms:read']), tagsController.getStats);
router.post("/bulk", authenticateToken, requirePermissions(['cms:create']), tagsController.bulkCreate);

// Generic/wildcard routes - MUST come after specific routes
router.post("/", authenticateToken, requirePermissions(['cms:create']), tagsController.create);
router.get("/", authenticateToken, requirePermissions(['cms:read']), tagsController.getAll);
router.get("/:id", authenticateToken, requirePermissions(['cms:read']), tagsController.getById);
router.put("/:id", authenticateToken, requirePermissions(['cms:update']), tagsController.update);
router.delete("/:id", authenticateToken, requirePermissions(['cms:delete']), tagsController.delete);

export default router;
