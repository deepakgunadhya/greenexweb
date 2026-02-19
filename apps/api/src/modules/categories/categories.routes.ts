import { Router } from "express";
import { CategoriesController } from "./categories.controller";
import { authenticateToken, requirePermissions } from "../../middleware/auth.middleware";

const router: Router = Router();
const categoriesController = new CategoriesController();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: CMS Categories management endpoints
 */

// Public endpoints (no authentication required)
router.get("/slug/:slug", categoriesController.getBySlug);
router.get("/with-content", categoriesController.getCategoriesWithContent);

// Protected endpoints (authentication required)
router.get("/all", authenticateToken, requirePermissions(['cms:read']), categoriesController.getAllActive);
router.get("/stats", authenticateToken, requirePermissions(['cms:read']), categoriesController.getStats);
router.post("/", authenticateToken, requirePermissions(['cms:create']), categoriesController.create);
router.get("/", authenticateToken, requirePermissions(['cms:read']), categoriesController.getAll);
router.get("/:id", authenticateToken, requirePermissions(['cms:read']), categoriesController.getById);
router.put("/:id", authenticateToken, requirePermissions(['cms:update']), categoriesController.update);
router.delete("/:id", authenticateToken, requirePermissions(['cms:delete']), categoriesController.delete);

export default router;
