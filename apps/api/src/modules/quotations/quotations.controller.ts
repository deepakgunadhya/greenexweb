import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { QuotationsService } from './quotations.service';
import { successResponse, errorResponse } from '../../utils/response';
import { logger } from '../../utils/logger';
import prisma from '../../config/database';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads/quotations');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `quotation-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Only allow PDF files (SRS requirement)
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for quotations'));
  }
};

export const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export class QuotationsController {
  private quotationsService: QuotationsService;

  constructor() {
    this.quotationsService = new QuotationsService(prisma);
  }

  // SRS 5.2.1 - Upload Quotation PDF
  uploadQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, title, amount, notes } = req.body;
    const userId = req.user?.id;
    const file = req.file;

    // Debug logging
    logger.info('Quotation upload request', {
      bodyKeys: Object.keys(req.body),
      leadId: leadId,
      title: title,
      hasFile: !!file,
      userId: userId
    });

    if (!userId) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    if (!leadId) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Lead ID is required - please select a lead')
      );
    }

    if (!title) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Title is required')
      );
    }

    if (!file) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'PDF file is required')
      );
    }

    try {
      const quotationData = {
        title,
        amount: amount ? parseFloat(amount) : undefined,
        notes,
        file: {
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          path: file.path
        }
      };

      const quotation = await this.quotationsService.uploadQuotation(
        leadId,
        userId,
        quotationData
      );

      logger.info('Quotation uploaded via API', {
        quotationId: quotation.id,
        leadId,
        uploadedBy: userId
      });

      res.status(201).json(successResponse(quotation));
    } catch (error: any) {
      logger.error('Upload quotation error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      // Clean up uploaded file if there was an error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.warn('Failed to clean up uploaded file after error', {
            filePath: req.file.path,
            error: unlinkError
          });
        }
      }

      if (error.message.includes('not found') || error.message.includes('inactive')) {
        return res.status(404).json(errorResponse('NOT_FOUND', error.message));
      } else if (error.message.includes('Cannot upload quotation')) {
        return res.status(400).json(errorResponse('INVALID_STATE', error.message));
      } else {
        throw error; // Let asyncHandler deal with generic errors
      }
    }
  });

  // SRS 5.2.3 - Update quotation status
  updateQuotationStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
        return;
      }

      if (!status || !['SENT', 'ACCEPTED', 'REJECTED'].includes(status)) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Valid status (SENT, ACCEPTED, REJECTED) is required')
        );
        return;
      }

      const quotation = await this.quotationsService.updateQuotationStatus(
        id,
        status,
        userId,
        notes
      );

      logger.info('Quotation status updated via API', {
        quotationId: id,
        newStatus: status,
        updatedBy: userId
      });

      res.status(200).json(successResponse(quotation));
    } catch (error: any) {
      logger.error('Update quotation status error', {
        error: error.message,
        quotationId: req.params.id,
        userId: req.user?.id,
        requestedStatus: req.body?.status,
      });

      if (error.message.includes('Cannot accept quotation: client user creation failed')) {
        res.status(400).json(errorResponse('CLIENT_USER_CREATION_FAILED', error.message));
      } else if (error.message.includes('Invalid status transition')) {
        res.status(400).json(errorResponse('INVALID_TRANSITION', error.message));
      } else if (error.message.includes('not found')) {
        res.status(404).json(errorResponse('NOT_FOUND', error.message));
      } else {
        res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to update quotation status'));
      }
    }
  });

  // Get all quotations with filters
  getAllQuotations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        page = '1',
        pageSize = '20',
        status,
        leadId,
        organizationId,
        uploadedBy,
        fromDate,
        toDate,
        minAmount,
        maxAmount
      } = req.query;

      // Data isolation: Client users can only see quotations for their organization
      const userOrganizationId = req.user?.organizationId;
      
      const options = {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        status: status as string,
        leadId: leadId as string,
        organizationId: organizationId as string,
        uploadedBy: uploadedBy as string,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
        userId: req.user?.id,
        userOrganizationId
      };

      const result = await this.quotationsService.getAllQuotations(options);

      const meta = {
        page: options.page,
        pageSize: options.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / options.pageSize)
      };

      res.status(200).json(successResponse({ quotations: result.quotations, meta }));
    } catch (error: any) {
      logger.error('Get all quotations error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch quotations'));
    }
  });

  // Get quotation by ID
  getQuotationById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Data isolation: Client users can only see quotations for their organization
      const userOrganizationId = req.user?.organizationId;
      const quotation = await this.quotationsService.getQuotationById(id, userOrganizationId);

      if (!quotation) {
        res.status(404).json(errorResponse('NOT_FOUND', 'Quotation not found'));
        return;
      }

      res.status(200).json(successResponse(quotation));
    } catch (error: any) {
      logger.error('Get quotation by ID error', {
        error: error.message,
        quotationId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch quotation'));
    }
  });

  // Get quotations by lead ID
  getQuotationsByLead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { leadId } = req.params;

      // Data isolation: Client users can only see quotations for their organization
      const userOrganizationId = req.user?.organizationId;
      const quotations = await this.quotationsService.getQuotationsByLead(leadId, userOrganizationId);

      res.status(200).json(successResponse(quotations));
    } catch (error: any) {
      logger.error('Get quotations by lead error', {
        error: error.message,
        leadId: req.params.leadId,
        userId: req.user?.id
      });

      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch lead quotations'));
    }
  });

  // Update quotation metadata
  updateQuotationMetadata = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, amount, notes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
        return;
      }

      const updates = {
        ...(title && { title }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(notes !== undefined && { notes })
      };

      if (Object.keys(updates).length === 0) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'At least one field must be provided for update')
        );
        return;
      }

      const quotation = await this.quotationsService.updateQuotationMetadata(
        id,
        userId,
        updates
      );

      logger.info('Quotation metadata updated via API', {
        quotationId: id,
        updates,
        updatedBy: userId
      });

      res.status(200).json(successResponse(quotation));
    } catch (error: any) {
      logger.error('Update quotation metadata error', {
        error: error.message,
        quotationId: req.params.id,
        userId: req.user?.id
      });

      if (error.message.includes('not found')) {
        res.status(404).json(errorResponse('NOT_FOUND', error.message));
      } else if (error.message.includes('Cannot modify')) {
        res.status(400).json(errorResponse('INVALID_STATE', error.message));
      } else {
        res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to update quotation'));
      }
    }
  });

  // Delete quotation
  deleteQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
        return;
      }

      await this.quotationsService.deleteQuotation(id, userId);

      logger.info('Quotation deleted via API', {
        quotationId: id,
        deletedBy: userId
      });

      res.status(200).json(successResponse({ message: 'Quotation deleted successfully' }));
    } catch (error: any) {
      logger.error('Delete quotation error', {
        error: error.message,
        quotationId: req.params.id,
        userId: req.user?.id
      });

      if (error.message.includes('not found')) {
        res.status(404).json(errorResponse('NOT_FOUND', error.message));
      } else if (error.message.includes('Cannot delete')) {
        res.status(400).json(errorResponse('INVALID_STATE', error.message));
      } else {
        res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete quotation'));
      }
    }
  });

  // Get quotation statistics
  getQuotationStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.query;

      const stats = await this.quotationsService.getQuotationStats(
        userId as string
      );

      res.status(200).json(successResponse(stats));
    } catch (error: any) {
      logger.error('Get quotation stats error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch quotation statistics'));
    }
  });

  // Download quotation PDF
  downloadQuotationPDF = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Data isolation: Client users can only see quotations for their organization
      const userOrganizationId = req.user?.organizationId;
      const quotation = await this.quotationsService.getQuotationById(id, userOrganizationId);

      if (!quotation) {
        res.status(404).json(errorResponse('NOT_FOUND', 'Quotation not found'));
        return;
      }

      if (!quotation.documentPath || !quotation.originalFileName) {
        res.status(404).json(errorResponse('NOT_FOUND', 'Quotation PDF not found'));
        return;
      }

      // Check if file exists
      try {
        await fs.access(quotation.documentPath);
      } catch {
        res.status(404).json(errorResponse('NOT_FOUND', 'Quotation file not found on server'));
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="${quotation.originalFileName}"`
      );

      res.sendFile(path.resolve(quotation.documentPath));

      logger.info('Quotation PDF downloaded', {
        quotationId: id,
        downloadedBy: req.user?.id,
        filename: quotation.originalFileName
      });
    } catch (error: any) {
      logger.error('Download quotation PDF error', {
        error: error.message,
        quotationId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to download quotation'));
    }
  });
}