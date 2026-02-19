import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import {
  TagsService,
  CreateTagRequest,
  UpdateTagRequest,
} from "./tags.service";
import { successResponse, errorResponse } from "../../utils/response";
import { AppError } from "../../middleware/error.middleware";
import { logger } from "../../utils/logger";
import {
  validateCreateTagData,
  validateUpdateTagData,
} from "./tags.validators";

/**
 * @swagger
 * components:
 *   schemas:
 *     Tag:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique tag identifier
 *         name:
 *           type: string
 *           description: Tag name
 *         slug:
 *           type: string
 *           description: URL-friendly slug
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         _count:
 *           type: object
 *           properties:
 *             contentTags:
 *               type: integer
 *               description: Number of content items with this tag
 */

export class TagsController {
  private tagsService: TagsService;

  constructor() {
    this.tagsService = new TagsService();
  }

  /**
   * @swagger
   * /api/tags:
   *   post:
   *     summary: Create new tag
   *     tags: [Tags]
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
   *                 example: "Best Practices"
   *               slug:
   *                 type: string
   *                 example: "best-practices"
   *     responses:
   *       201:
   *         description: Tag created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Tag'
   */
  create = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error, value } = validateCreateTagData(req.body);
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
      const data: CreateTagRequest = req.body;
      const tag = await this.tagsService.create(data);

      logger.info("Tag created successfully", {
        tagId: tag.id,
        name: tag.name,
        userId: req.user?.id,
      });

      res.status(201).json(successResponse(tag));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/tags:
   *   get:
   *     summary: Get tags list with filtering and pagination
   *     tags: [Tags]
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
   *         description: Search in tag name
   *       - in: query
   *         name: hasContent
   *         schema:
   *           type: boolean
   *         description: Filter tags that have or don't have content
   *     responses:
   *       200:
   *         description: Tags list retrieved successfully
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
        hasContent: req.query.hasContent
          ? req.query.hasContent === "true"
          : undefined,
      };

      const result = await this.tagsService.findMany(options);
      res.json(successResponse(result.tags, result.meta));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/tags/all:
   *   get:
   *     summary: Get all tags (no pagination)
   *     tags: [Tags]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All tags retrieved successfully
   */
  getAllTags = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const tags = await this.tagsService.findAll();
      res.json(successResponse(tags));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/tags/{id}:
   *   get:
   *     summary: Get tag by ID
   *     tags: [Tags]
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
   *         description: Tag retrieved successfully
   *       404:
   *         description: Tag not found
   */
  getById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const tag = await this.tagsService.findById(id);
      res.json(successResponse(tag));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/tags/slug/{slug}:
   *   get:
   *     summary: Get tag by slug (public endpoint)
   *     tags: [Tags]
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Tag retrieved successfully
   *       404:
   *         description: Tag not found
   */
  getBySlug = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { slug } = req.params;
      const tag = await this.tagsService.findBySlug(slug);
      res.json(successResponse(tag));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/tags/{id}:
   *   put:
   *     summary: Update tag
   *     tags: [Tags]
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
   *               slug:
   *                 type: string
   *     responses:
   *       200:
   *         description: Tag updated successfully
   *       404:
   *         description: Tag not found
   */
  update = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const { error, value } = validateUpdateTagData(req.body);
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
      const data: UpdateTagRequest = req.body;
      const tag = await this.tagsService.update(id, data);

      logger.info("Tag updated successfully", {
        tagId: id,
        userId: req.user?.id,
      });

      res.json(successResponse(tag));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/tags/{id}:
   *   delete:
   *     summary: Delete tag
   *     tags: [Tags]
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
   *         description: Tag deleted successfully
   *       404:
   *         description: Tag not found
   *       400:
   *         description: Tag cannot be deleted (assigned to content)
   */
  delete = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const result = await this.tagsService.delete(id);

      logger.info("Tag deleted successfully", {
        tagId: id,
        userId: req.user?.id,
      });

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/tags/popular:
   *   get:
   *     summary: Get popular tags (most used)
   *     tags: [Tags]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of tags to return
   *     responses:
   *       200:
   *         description: Popular tags retrieved successfully
   */
  getPopular = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const tags = await this.tagsService.getPopularTags(limit);
      res.json(successResponse(tags));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/tags/with-content:
   *   get:
   *     summary: Get tags with their published content (public endpoint)
   *     tags: [Tags]
   *     parameters:
   *       - in: query
   *         name: tagIds
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         style: form
   *         explode: true
   *         description: Specific tag IDs to include
   *     responses:
   *       200:
   *         description: Tags with content retrieved successfully
   */
  getTagsWithContent = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const tagIds = req.query.tagIds as string[] | undefined;
      const tags = await this.tagsService.getTagsWithContent(tagIds);
      res.json(successResponse(tags));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/tags/stats:
   *   get:
   *     summary: Get tag statistics
   *     tags: [Tags]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Tag statistics retrieved successfully
   */
  getStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const stats = await this.tagsService.getTagStats();
      res.json(successResponse(stats));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/tags/bulk:
   *   post:
   *     summary: Create multiple tags at once
   *     tags: [Tags]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tagNames
   *             properties:
   *               tagNames:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["Best Practices", "Case Study", "Advanced"]
   *     responses:
   *       201:
   *         description: Tags created successfully
   */
  bulkCreate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { tagNames } = req.body;

      if (!Array.isArray(tagNames)) {
        throw new AppError("tagNames must be an array", 400, "INVALID_INPUT");
      }

      const tags = await this.tagsService.bulkCreate(tagNames);

      logger.info("Tags created in bulk", {
        count: tags.length,
        userId: req.user?.id,
      });

      res.status(201).json(successResponse(tags));
    } catch (error) {
      next(error);
    }
  };
}
