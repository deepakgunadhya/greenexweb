import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { successResponse, errorResponse } from '../../utils/response';
import { TemplateFilesService } from './template-files.service';
import * as fs from 'fs/promises';

/**
 * Controller for checklist template file management
 */
export class TemplateFilesController {
  private templateFilesService: TemplateFilesService;

  constructor() {
    this.templateFilesService = new TemplateFilesService();
  }

  /**
   * @swagger
   * /api/v1/template-files:
   *   get:
   *     summary: Get all template files
   *     tags: [Template Files]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filter by category
   *     responses:
   *       200:
   *         description: Template files retrieved successfully
   */
  getAllTemplateFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { category } = req.query;
    const files = await this.templateFilesService.getAllTemplateFiles(category as string);
    res.status(200).json(successResponse(files));
  });

  /**
   * @swagger
   * /api/v1/template-files/{id}:
   *   get:
   *     summary: Get a single template file
   *     tags: [Template Files]
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
   *         description: Template file retrieved successfully
   *       404:
   *         description: Template file not found
   */
  getTemplateFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const file = await this.templateFilesService.getTemplateFile(id);
    res.status(200).json(successResponse(file));
  });

  /**
   * @swagger
   * /api/v1/template-files/upload:
   *   post:
   *     summary: Upload single template file
   *     tags: [Template Files]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - category
   *               - file
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               category:
   *                 type: string
   *               clientVisible:
   *                 type: boolean
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       201:
   *         description: Template file uploaded successfully
   */
  uploadTemplateFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { title, description, category, clientVisible } = req.body;
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json(errorResponse('FILE_REQUIRED', 'File is required'));
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (req.file.size > maxSize) {
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.error('Failed to delete oversized file:', error);
      }
      return res.status(400).json(errorResponse('FILE_TOO_LARGE', 'File size must not exceed 10MB'));
    }

    // Create template with one attachment
    const file = await this.templateFilesService.createTemplateFileWithAttachments({
      title,
      description,
      category,
      clientVisible: clientVisible === 'true' || clientVisible === true,
      createdBy: userId,
      attachments: [
        {
          filePath: req.file.path,
          originalName: req.file.originalname,
          fileSize: BigInt(req.file.size),
          mimeType: req.file.mimetype,
          uploadedBy: userId
        }
      ]
    });

    res.status(201).json(successResponse(file));
  });

  /**
   * @swagger
   * /api/v1/template-files/upload-multiple:
   *   post:
   *     summary: Upload template with multiple files (ONE template, MULTIPLE attachments)
   *     tags: [Template Files]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - category
   *               - files
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               category:
   *                 type: string
   *               clientVisible:
   *                 type: boolean
   *               files:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *     responses:
   *       201:
   *         description: Template with multiple files uploaded successfully
   */
  uploadMultipleTemplateFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { title, description, category, clientVisible } = req.body;
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json(errorResponse('FILES_REQUIRED', 'At least one file is required'));
    }

    // Validate file sizes (10MB max per file)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const oversizedFiles = files.filter(file => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      // Delete all uploaded files
      for (const file of files) {
        try {
          await fs.unlink(file.path);
        } catch (error) {
          console.error('Failed to delete file:', error);
        }
      }
      return res.status(400).json(
        errorResponse('FILE_TOO_LARGE', `${oversizedFiles.length} file(s) exceed 10MB size limit`)
      );
    }

    // Create ONE template with MULTIPLE attachments
    const templateFile = await this.templateFilesService.createTemplateFileWithAttachments({
      title: title || `Template - ${files[0].originalname}`,
      description,
      category,
      clientVisible: clientVisible === 'true' || clientVisible === true,
      createdBy: userId,
      attachments: files.map(file => ({
        filePath: file.path,
        originalName: file.originalname,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
        uploadedBy: userId
      }))
    });

    res.status(201).json(successResponse(templateFile));
  });

  /**
   * @swagger
   * /api/v1/template-files/{id}:
   *   put:
   *     summary: Update template file metadata
   *     tags: [Template Files]
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
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               category:
   *                 type: string
   *               clientVisible:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Template file updated successfully
   *       404:
   *         description: Template file not found
   */
  updateTemplateFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { title, description, category, clientVisible } = req.body;

    const file = await this.templateFilesService.updateTemplateFile(id, {
      title,
      description,
      category,
      clientVisible
    });

    res.status(200).json(successResponse(file));
  });

  /**
   * @swagger
   * /api/v1/template-files/{templateFileId}/add-attachment:
   *   post:
   *     summary: Add attachment to existing template file
   *     tags: [Template Files]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: templateFileId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - file
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       201:
   *         description: Attachment added successfully
   *       404:
   *         description: Template file not found
   */
  addAttachment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { templateFileId } = req.params;
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json(errorResponse('FILE_REQUIRED', 'File is required'));
    }

    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.error('Failed to delete oversized file:', error);
      }
      return res.status(400).json(errorResponse('FILE_TOO_LARGE', 'File size must not exceed 10MB'));
    }

    const attachment = await this.templateFilesService.addAttachment(templateFileId, {
      filePath: req.file.path,
      originalName: req.file.originalname,
      fileSize: BigInt(req.file.size),
      mimeType: req.file.mimetype,
      uploadedBy: userId
    });

    res.status(201).json(successResponse(attachment));
  });

  /**
   * @swagger
   * /api/v1/template-files/attachments/{attachmentId}:
   *   delete:
   *     summary: Delete an attachment
   *     tags: [Template Files]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: attachmentId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Attachment deleted successfully
   *       404:
   *         description: Attachment not found
   */
  deleteAttachment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { attachmentId } = req.params;
    const result = await this.templateFilesService.deleteAttachment(attachmentId);
    res.status(200).json(successResponse(result));
  });

  /**
   * @swagger
   * /api/v1/template-files/{id}:
   *   delete:
   *     summary: Delete template file (and all its attachments)
   *     tags: [Template Files]
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
   *         description: Template file deleted successfully
   *       404:
   *         description: Template file not found
   */
  deleteTemplateFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const result = await this.templateFilesService.deleteTemplateFile(id);
    res.status(200).json(successResponse(result));
  });

  /**
   * @swagger
   * /api/v1/template-files/{id}/download:
   *   get:
   *     summary: Download template file (first attachment)
   *     tags: [Template Files]
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
   *         description: File download
   *       404:
   *         description: Template file not found
   */
  downloadTemplateFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const templateFile = await this.templateFilesService.getTemplateFile(id);

    if (!templateFile.attachments || templateFile.attachments.length === 0) {
      return res.status(404).json(errorResponse('NO_ATTACHMENTS', 'No attachments found for this template'));
    }

    // Download the first attachment
    const attachment = templateFile.attachments[0];
    res.download(attachment.filePath, attachment.originalName);
  });

  /**
   * @swagger
   * /api/v1/template-files/attachments/{attachmentId}/download:
   *   get:
   *     summary: Download specific attachment
   *     tags: [Template Files]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: attachmentId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: File download
   *       404:
   *         description: Attachment not found
   */
  downloadAttachment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { attachmentId } = req.params;

    // We need to add a method to get single attachment
    // For now, we'll search through all templates (not efficient, but works)
    const allTemplates = await this.templateFilesService.getAllTemplateFiles();

    let attachment: any = null;
    for (const template of allTemplates) {
      const found = template.attachments?.find((att: any) => att.id === attachmentId);
      if (found) {
        attachment = found;
        break;
      }
    }

    if (!attachment) {
      return res.status(404).json(errorResponse('ATTACHMENT_NOT_FOUND', 'Attachment not found'));
    }

    res.download(attachment.filePath, attachment.originalName);
  });
}
