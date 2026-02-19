import { Request, Response } from 'express';
import { getFileUrl, deleteFile, getAbsolutePath } from '../../middleware/upload.middleware';
import { successResponse, errorResponse } from '../../utils/response';
import path from 'path';

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadResponse:
 *       type: object
 *       properties:
 *         filename:
 *           type: string
 *           description: The generated filename
 *         originalName:
 *           type: string
 *           description: The original filename
 *         url:
 *           type: string
 *           description: The accessible URL for the file
 *         size:
 *           type: number
 *           description: File size in bytes
 *         mimetype:
 *           type: string
 *           description: File MIME type
 */

/**
 * @swagger
 * /api/v1/uploads/single:
 *   post:
 *     summary: Upload a single file
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: No file provided or invalid file
 *       413:
 *         description: File too large
 *       415:
 *         description: Unsupported file type
 */
export const uploadSingleFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json(errorResponse('NO_FILE', 'No file provided'));
      return;
    }

    const file = req.file;
    const fileType = file.mimetype.startsWith('image/') ? 'images' : 'documents';
    const fileUrl = getFileUrl(req, file.filename, fileType);

    const response = {
      filename: file.filename,
      originalName: file.originalname,
      url: fileUrl,
      size: file.size,
      mimetype: file.mimetype,
      type: fileType
    };

    res.json(successResponse(response));
  } catch (error) {
    res.status(500).json(errorResponse('UPLOAD_ERROR', 'Failed to upload file'));
  }
};

/**
 * @swagger
 * /api/v1/uploads/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: The files to upload (max 5)
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: No files provided
 */
export const uploadMultipleFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json(errorResponse('NO_FILES', 'No files provided'));
      return;
    }

    const uploadedFiles = files.map(file => {
      const fileType = file.mimetype.startsWith('image/') ? 'images' : 'documents';
      const fileUrl = getFileUrl(req, file.filename, fileType);

      return {
        filename: file.filename,
        originalName: file.originalname,
        url: fileUrl,
        size: file.size,
        mimetype: file.mimetype,
        type: fileType
      };
    });

    res.json(successResponse(uploadedFiles));
  } catch (error) {
    res.status(500).json(errorResponse('UPLOAD_ERROR', 'Failed to upload files'));
  }
};

/**
 * @swagger
 * /api/v1/uploads/{filename}:
 *   delete:
 *     summary: Delete an uploaded file
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The filename to delete
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [images, documents]
 *           default: images
 *         description: The file type directory
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 *       500:
 *         description: Failed to delete file
 */
export const deleteUploadedFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const fileType = (req.query.type as 'images' | 'documents') || 'images';
    
    const filepath = getAbsolutePath(filename, fileType);
    
    deleteFile(filepath);
    
    res.json(successResponse({ message: 'File deleted successfully' }));
  } catch (error) {
    res.status(500).json(errorResponse('DELETE_ERROR', 'Failed to delete file'));
  }
};

/**
 * @swagger
 * /api/v1/uploads/info/{filename}:
 *   get:
 *     summary: Get file information
 *     tags: [Uploads]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The filename to get info for
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [images, documents]
 *           default: images
 *         description: The file type directory
 *     responses:
 *       200:
 *         description: File information retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     url:
 *                       type: string
 *                     exists:
 *                       type: boolean
 *                     size:
 *                       type: number
 *       404:
 *         description: File not found
 */
export const getFileInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const fileType = (req.query.type as 'images' | 'documents') || 'images';
    
    const filepath = getAbsolutePath(filename, fileType);
    const fileUrl = getFileUrl(req, filename, fileType);
    
    // Check if file exists and get stats
    const fs = require('fs');
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      
      res.json(successResponse({
        filename,
        url: fileUrl,
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      }));
    } else {
      res.status(404).json(errorResponse('FILE_NOT_FOUND', 'File not found'));
    }
  } catch (error) {
    res.status(500).json(errorResponse('FILE_INFO_ERROR', 'Failed to get file information'));
  }
};