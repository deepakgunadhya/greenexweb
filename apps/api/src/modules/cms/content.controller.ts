import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import {
  ContentService,
  CreateContentRequest,
  UpdateContentRequest,
} from "./content.service";
import { successResponse, errorResponse } from "../../utils/response";
import { getFileUrl } from "../../middleware/upload.middleware";
import { logger } from "../../utils/logger";
import {
  validateCreateContentData,
  validateUpdateContentData,
} from "./content.validators";
import { FCMService } from "../fcm/fcm.service"; 

/**
 * @swagger
 * components:
 *   schemas:
 *     Content:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique content identifier
 *         type:
 *           type: string
 *           enum: [BLOG, GRAPHIC, VIDEO]
 *           description: Content type
 *         title:
 *           type: string
 *           description: Content title
 *         slug:
 *           type: string
 *           description: URL-friendly slug
 *         summary:
 *           type: string
 *           description: Content summary
 *         content:
 *           type: string
 *           description: Full content (for blogs)
 *         categoryId:
 *           type: string
 *           description: Category ID
 *         authorName:
 *           type: string
 *           description: Author name
 *         publishDate:
 *           type: string
 *           format: date-time
 *           description: Publish date
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED]
 *           description: Content status
 *         isPublic:
 *           type: boolean
 *           description: Whether content is public or client-only
 *         isFeatured:
 *           type: boolean
 *           description: Whether content is featured
 *         isTraining:
 *           type: boolean
 *           description: Whether content is training/workshop
 *         showInApp:
 *           type: boolean
 *           description: Whether to show in mobile app
 *         thumbnailUrl:
 *           type: string
 *           description: Thumbnail image URL
 *         imageUrl:
 *           type: string
 *           description: Main image URL (for graphics)
 *         videoUrl:
 *           type: string
 *           description: YouTube video URL
 *         eventDate:
 *           type: string
 *           format: date-time
 *           description: Event date (for training)
 *         eventLink:
 *           type: string
 *           description: Event registration link
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         category:
 *           $ref: '#/components/schemas/Category'
 *         contentTags:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               tag:
 *                 $ref: '#/components/schemas/Tag'
 */

export class ContentController {
  private contentService: ContentService;
  private fcmService: FCMService;

  constructor() {
    this.contentService = new ContentService();
    this.fcmService = new FCMService();
  }

  /**
   * @swagger
   * /api/content:
   *   post:
   *     summary: Create new content
   *     tags: [Content]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - type
   *               - title
   *               - categoryId
   *               - authorName
   *             properties:
   *               type:
   *                 type: string
   *                 enum: [BLOG, GRAPHIC, VIDEO]
   *               title:
   *                 type: string
   *               slug:
   *                 type: string
   *               summary:
   *                 type: string
   *               content:
   *                 type: string
   *               categoryId:
   *                 type: string
   *               authorName:
   *                 type: string
   *               publishDate:
   *                 type: string
   *                 format: date-time
   *               status:
   *                 type: string
   *                 enum: [DRAFT, PUBLISHED, ARCHIVED]
   *               isPublic:
   *                 type: boolean
   *               isFeatured:
   *                 type: boolean
   *               showInApp:
   *                 type: boolean
   *               thumbnailUrl:
   *                 type: string
   *               imageUrl:
   *                 type: string
   *               videoUrl:
   *                 type: string
   *               isTraining:
   *                 type: boolean
   *               eventDate:
   *                 type: string
   *                 format: date-time
   *               eventLink:
   *                 type: string
   *               tagIds:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       201:
   *         description: Content created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Content'
   */
  create = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Handle file uploads if present
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      // Process uploaded files and get their URLs
      if (files) {
        // Handle thumbnail upload
        if (files.thumbnail && files.thumbnail.length > 0) {
          const thumbnailFile = files.thumbnail[0];
          const fileType = thumbnailFile.mimetype.startsWith("image/")
            ? "images"
            : "documents";
          req.body.thumbnailUrl = getFileUrl(
            req,
            thumbnailFile.filename,
            fileType
          );
        }

        // Handle image upload
        if (files.image && files.image.length > 0) {
          const imageFile = files.image[0];
          const fileType = imageFile.mimetype.startsWith("image/")
            ? "images"
            : "documents";
          req.body.imageUrl = getFileUrl(req, imageFile.filename, fileType);
        }
      }

      const { error, value } = validateCreateContentData(req.body);
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
      const data: CreateContentRequest = req.body;
      const content = await this.contentService.create(data);

      logger.info("Content created successfully", {
        contentId: content.id,
        type: content.type,
        title: content.title,
        userId: req.user?.id,
      });

             // Send push notification if content is published and public
      if (content.status === "PUBLISHED" && content.isPublic && content.showInApp) {
        try {
          let notificationTitle = "";
          let notificationBody = "";
          let notificationData: Record<string, string> = {
            type: "content_published",
            contentId: content.id,
            contentType: content.type,
            slug: content.slug,
            action: "view_content",
          };

          switch (content.type) {
            case "BLOG":
              notificationTitle = "📝 New Blog Post";
              notificationBody = `${content.title}`;
              break;
            case "GRAPHIC":
              notificationTitle = "🎨 New Graphic Content";
              notificationBody = `${content.title}`;
              break;
            case "VIDEO":
              notificationTitle = "🎥 New Video";
              notificationBody = `${content.title}`;
              break;
          }

         // Send to all devices
          //TODO: Re-enable FCM notifications when FCMService is fixed
          const result = await this.fcmService.sendToAllDevices({
            title: notificationTitle,
            body: notificationBody,
            data: notificationData,
            imageUrl: content.thumbnailUrl || undefined,
          });

          logger.info("Content created (FCM notification disabled)", {
            contentId: content.id,
            // successCount: result.successCount,
            // failureCount: result.failureCount,
          });
        } catch (notifError) {
          // Don't fail the request if notification fails
          logger.error("Failed to send push notification for new content", {
            contentId: content.id,
            error: notifError instanceof Error ? notifError.message : "Unknown error",
          });
        }
      }

      res.status(201).json(successResponse(content));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/content:
   *   get:
   *     summary: Get content list with filtering and pagination
   *     tags: [Content]
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
   *           default: 10
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [BLOG, GRAPHIC, VIDEO]
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [DRAFT, PUBLISHED, ARCHIVED]
   *       - in: query
   *         name: isPublic
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: isFeatured
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: isTraining
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: showInApp
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: Content list retrieved successfully
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
        type: req.query.type as "BLOG" | "GRAPHIC" | "VIDEO",
        categoryId: req.query.categoryId as string,
        status: req.query.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
        isPublic: req.query.isPublic
          ? req.query.isPublic === "true"
          : undefined,
        isFeatured: req.query.isFeatured
          ? req.query.isFeatured === "true"
          : undefined,
        isTraining: req.query.isTraining
          ? req.query.isTraining === "true"
          : undefined,
        showInApp: req.query.showInApp
          ? req.query.showInApp === "true"
          : undefined,
        publishedAfter: req.query.publishedAfter
          ? new Date(req.query.publishedAfter as string)
          : undefined,
        publishedBefore: req.query.publishedBefore
          ? new Date(req.query.publishedBefore as string)
          : undefined,
      };

      const result = await this.contentService.findMany(options);
      res.json(successResponse(result.content, result.meta));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/content/{id}:
   *   get:
   *     summary: Get content by ID
   *     tags: [Content]
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
   *         description: Content retrieved successfully
   *       404:
   *         description: Content not found
   */
  getById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const content = await this.contentService.findById(id);
      res.json(successResponse(content));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/content/slug/{slug}:
   *   get:
   *     summary: Get published content by slug (public endpoint)
   *     tags: [Content]
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Content retrieved successfully
   *       404:
   *         description: Content not found
   */
  getBySlug = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { slug } = req.params;
      const content = await this.contentService.findBySlug(slug);
      res.json(successResponse(content));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/content/{id}:
   *   put:
   *     summary: Update content
   *     tags: [Content]
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
   *               type:
   *                 type: string
   *                 enum: [BLOG, GRAPHIC, VIDEO]
   *               title:
   *                 type: string
   *               slug:
   *                 type: string
   *               summary:
   *                 type: string
   *               content:
   *                 type: string
   *               categoryId:
   *                 type: string
   *               authorName:
   *                 type: string
   *               publishDate:
   *                 type: string
   *                 format: date-time
   *               status:
   *                 type: string
   *                 enum: [DRAFT, PUBLISHED, ARCHIVED]
   *               isPublic:
   *                 type: boolean
   *               isFeatured:
   *                 type: boolean
   *               showInApp:
   *                 type: boolean
   *               thumbnailUrl:
   *                 type: string
   *               imageUrl:
   *                 type: string
   *               videoUrl:
   *                 type: string
   *               isTraining:
   *                 type: boolean
   *               eventDate:
   *                 type: string
   *                 format: date-time
   *               eventLink:
   *                 type: string
   *               tagIds:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Content updated successfully
   *       404:
   *         description: Content not found
   */
  update = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      // Handle file uploads if present
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      // Process uploaded files and get their URLs
      if (files) {
        // Handle thumbnail upload
        if (files.thumbnail && files.thumbnail.length > 0) {
          const thumbnailFile = files.thumbnail[0];
          const fileType = thumbnailFile.mimetype.startsWith("image/")
            ? "images"
            : "documents";
          req.body.thumbnailUrl = getFileUrl(
            req,
            thumbnailFile.filename,
            fileType
          );
        }

        // Handle image upload
        if (files.image && files.image.length > 0) {
          const imageFile = files.image[0];
          const fileType = imageFile.mimetype.startsWith("image/")
            ? "images"
            : "documents";
          req.body.imageUrl = getFileUrl(req, imageFile.filename, fileType);
        }
      }

      const { error, value } = validateUpdateContentData(req.body);
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
      const data: UpdateContentRequest = req.body;
      const content = await this.contentService.update(id, data);

      logger.info("Content updated successfully", {
        contentId: id,
        userId: req.user?.id,
      });

       // Send push notification if content is published and public
      if (content.status === "PUBLISHED" && content.isPublic && content.showInApp) {
        try {
          let notificationTitle = "";
          let notificationBody = "";
          let notificationData: Record<string, string> = {
            type: "content_published",
            contentId: content.id,
            contentType: content.type,
            slug: content.slug,
            action: "view_content",
          };

          switch (content.type) {
            case "BLOG":
              notificationTitle = "📝 New Blog Post";
              notificationBody = `${content.title}`;
              break;
            case "GRAPHIC":
              notificationTitle = "🎨 New Graphic Content";
              notificationBody = `${content.title}`;
              break;
            case "VIDEO":
              notificationTitle = "🎥 New Video";
              notificationBody = `${content.title}`;
              break;
          }

         // Send to all devices
          //TODO: Re-enable FCM notifications when FCMService is fixed
           await this.fcmService.sendToAllDevices({
            title: notificationTitle,
            body: notificationBody,
            data: notificationData,
            imageUrl: content.thumbnailUrl || undefined,
          });

          logger.info("Content created (FCM notification disabled)", {
            contentId: content.id,
            // successCount: result.successCount,
            // failureCount: result.failureCount,
          });
        } catch (notifError) {
          // Don't fail the request if notification fails
          logger.error("Failed to send push notification for new content", {
            contentId: content.id,
            error: notifError instanceof Error ? notifError.message : "Unknown error",
          });
        }
      }

      res.json(successResponse(content));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/content/{id}:
   *   delete:
   *     summary: Delete content (soft delete)
   *     tags: [Content]
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
   *         description: Content deleted successfully
   *       404:
   *         description: Content not found
   */
  delete = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const result = await this.contentService.delete(id);

      logger.info("Content deleted successfully", {
        contentId: id,
        userId: req.user?.id,
      });

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/content/featured:
   *   get:
   *     summary: Get featured content
   *     tags: [Content]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 5
   *     responses:
   *       200:
   *         description: Featured content retrieved successfully
   */
  getFeatured = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const content = await this.contentService.getFeaturedContent(limit);
      res.json(successResponse(content));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/content/public:
   *   get:
   *     summary: Get public content (published and public)
   *     tags: [Content]
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
   *           default: 10
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [BLOG, GRAPHIC, VIDEO]
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Public content retrieved successfully
   */
  getPublic = async (
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
        type: req.query.type as "BLOG" | "GRAPHIC" | "VIDEO",
        categoryId: req.query.categoryId as string,
      };

      const result = await this.contentService.getPublicContent(options);
      res.json(successResponse(result.content, result.meta));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/content/training:
   *   get:
   *     summary: Get training/workshop content
   *     tags: [Content]
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
   *           default: 10
   *     responses:
   *       200:
   *         description: Training content retrieved successfully
   */
  getTraining = async (
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
      };

      const result = await this.contentService.getTrainingContent(options);
      res.json(successResponse(result.content, result.meta));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/content/stats:
   *   get:
   *     summary: Get content statistics
   *     tags: [Content]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Content statistics retrieved successfully
   */
  getStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const stats = await this.contentService.getContentStats();
      res.json(successResponse(stats));
    } catch (error) {
      next(error);
    }
  };
}
