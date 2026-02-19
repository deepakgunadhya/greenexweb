import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import {
  CategoriesService,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "./categories.service";
import { successResponse, errorResponse } from "../../utils/response";
import {
  validateCreateCategoryData,
  validateUpdateCategoryData,
} from "./categories.validators";
import { logger } from "../../utils/logger";

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique category identifier
 *         name:
 *           type: string
 *           description: Category name
 *         description:
 *           type: string
 *           description: Category description
 *         slug:
 *           type: string
 *           description: URL-friendly slug
 *         isActive:
 *           type: boolean
 *           description: Whether category is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         _count:
 *           type: object
 *           properties:
 *             content:
 *               type: integer
 *               description: Number of content items in this category
 */

export class CategoriesController {
  private categoriesService: CategoriesService;

  constructor() {
    this.categoriesService = new CategoriesService();
  }

  /**
   * @swagger
   * /api/categories:
   *   post:
   *     summary: Create new category
   *     tags: [Categories]
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
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Environmental Compliance"
   *               description:
   *                 type: string
   *                 example: "Content related to environmental compliance and regulations"
   *               slug:
   *                 type: string
   *                 example: "environmental-compliance"
   *               isActive:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       201:
   *         description: Category created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Category'
   */
  create = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error, value } = validateCreateCategoryData(req.body);

      if (error) {
        return res
          .status(400)
          .json(
            errorResponse(
              "VALIDATION_ERROR",
              "Validation failed",
              error.details
            )
          );
      }
      const data: CreateCategoryRequest = req.body;
      const category = await this.categoriesService.create(data);

      logger.info("Category created successfully", {
        categoryId: category.id,
        name: category.name,
        userId: req.user?.id,
      });

      res.status(201).json(successResponse(category));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/categories:
   *   get:
   *     summary: Get categories list with filtering and pagination
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 20
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in name and description
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *         description: Filter by active status
   *     responses:
   *       200:
   *         description: Categories list retrieved successfully
   */
  getAll = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const options = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize
          ? parseInt(req.query.pageSize as string)
          : undefined,
        search: req.query.search as string,
        isActive: req.query.isActive
          ? req.query.isActive === "true"
          : undefined,
      };

      const result = await this.categoriesService.findMany(options);
      res.json(successResponse(result.categories, result.meta));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/categories/all:
   *   get:
   *     summary: Get all active categories (no pagination)
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All active categories retrieved successfully
   */
  getAllActive = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const categories = await this.categoriesService.findAll();
      res.json(successResponse(categories));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/categories/{id}:
   *   get:
   *     summary: Get category by ID
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Category retrieved successfully
   *       404:
   *         description: Category not found
   */
  getById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const category = await this.categoriesService.findById(id);
      res.json(successResponse(category));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/categories/slug/{slug}:
   *   get:
   *     summary: Get category by slug (public endpoint)
   *     tags: [Categories]
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Category retrieved successfully
   *       404:
   *         description: Category not found
   */
  getBySlug = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { slug } = req.params;
      const category = await this.categoriesService.findBySlug(slug);
      res.json(successResponse(category));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/categories/{id}:
   *   put:
   *     summary: Update category
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
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
   *               slug:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Category updated successfully
   *       404:
   *         description: Category not found
   */
  update = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const { error, value } = validateUpdateCategoryData(req.body);
      if (error) {
        return res
          .status(400)
          .json(
            errorResponse(
              "VALIDATION_ERROR",
              "Validation failed",
              error.details
            )
          );
      }

      const data: UpdateCategoryRequest = req.body;
      const category = await this.categoriesService.update(id, data);

      logger.info("Category updated successfully", {
        categoryId: id,
        userId: req.user?.id,
      });

      res.json(successResponse(category));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/categories/{id}:
   *   delete:
   *     summary: Delete category
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Category deleted successfully
   *       404:
   *         description: Category not found
   *       400:
   *         description: Category cannot be deleted (has content)
   */
  delete = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const result = await this.categoriesService.delete(id);

      logger.info("Category deleted successfully", {
        categoryId: id,
        userId: req.user?.id,
      });

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/categories/with-content:
   *   get:
   *     summary: Get categories with their published content (public endpoint)
   *     tags: [Categories]
   *     responses:
   *       200:
   *         description: Categories with content retrieved successfully
   */
  getCategoriesWithContent = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const categories =
        await this.categoriesService.getCategoriesWithContent();
      res.json(successResponse(categories));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/categories/stats:
   *   get:
   *     summary: Get category statistics
   *     tags: [Categories]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Category statistics retrieved successfully
   */
  getStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const stats = await this.categoriesService.getCategoryStats();
      res.json(successResponse(stats));
    } catch (error) {
      next(error);
    }
  };
}
