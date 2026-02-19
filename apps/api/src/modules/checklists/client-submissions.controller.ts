import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { successResponse, errorResponse } from '../../utils/response';
import { ClientSubmissionsService } from './client-submissions.service';
import * as fs from 'fs/promises';

/**
 * Controller for client submission management
 */
export class ClientSubmissionsController {
  private service: ClientSubmissionsService;

  constructor() {
    this.service = new ClientSubmissionsService();
  }

  /**
   * @swagger
   * /api/v1/client-submissions/{assignmentId}/upload:
   *   post:
   *     summary: Upload client submission for template assignment
   *     tags: [Client Submissions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: assignmentId
   *         required: true
   *         schema:
   *           type: string
   *         description: Template assignment ID
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
   *         description: Submission uploaded successfully
   *       400:
   *         description: Invalid request or assignment status
   *       404:
   *         description: Assignment not found
   */
  uploadSubmission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { assignmentId } = req.params;
    const userId = req.user!.id;
    const file = req.file;
    const comment = req.body.comment;

    if (!file) {
      return res.status(400).json(errorResponse('FILE_REQUIRED', 'File is required'));
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error('Failed to delete oversized file:', error);
      }
      return res.status(400).json(errorResponse('FILE_TOO_LARGE', 'File size must not exceed 10MB'));
    }

    const submission = await this.service.uploadSubmission(assignmentId, file, userId, comment);
    res.status(201).json(successResponse(submission));
  });

  /**
   * @swagger
   * /api/v1/client-submissions/{assignmentId}/admin-upload:
   *   post:
   *     summary: Admin uploads submission on behalf of client
   *     tags: [Client Submissions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: assignmentId
   *         required: true
   *         schema:
   *           type: string
   *         description: Template assignment ID
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
   *               comment:
   *                 type: string
   *                 description: Optional comment
   *     responses:
   *       201:
   *         description: Submission uploaded by admin successfully
   *       400:
   *         description: Invalid request or assignment status
   *       404:
   *         description: Assignment not found
   */
  adminUploadSubmission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { assignmentId } = req.params;
    const userId = req.user!.id;
    const file = req.file;
    const comment = req.body.comment;

    if (!file) {
      return res.status(400).json(errorResponse('FILE_REQUIRED', 'File is required'));
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error('Failed to delete oversized file:', error);
      }
      return res.status(400).json(errorResponse('FILE_TOO_LARGE', 'File size must not exceed 10MB'));
    }

    const submission = await this.service.uploadSubmission(assignmentId, file, userId, comment, 'admin');
    res.status(201).json(successResponse(submission));
  });

  /**
   * @swagger
   * /api/v1/client-submissions/{assignmentId}/history:
   *   get:
   *     summary: Get submission history for an assignment
   *     tags: [Client Submissions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: assignmentId
   *         required: true
   *         schema:
   *           type: string
   *         description: Template assignment ID
   *     responses:
   *       200:
   *         description: Submission history retrieved successfully
   *       404:
   *         description: Assignment not found
   */
  getSubmissionHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { assignmentId } = req.params;
    const submissions = await this.service.getSubmissionHistory(assignmentId);
    res.status(200).json(successResponse(submissions));
  });

  /**
   * @swagger
   * /api/v1/client-submissions/{assignmentId}/latest:
   *   get:
   *     summary: Get latest submission for an assignment
   *     tags: [Client Submissions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: assignmentId
   *         required: true
   *         schema:
   *           type: string
   *         description: Template assignment ID
   *     responses:
   *       200:
   *         description: Latest submission retrieved successfully
   *       404:
   *         description: Assignment or submission not found
   */
  getLatestSubmission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { assignmentId } = req.params;
    const submission = await this.service.getLatestSubmission(assignmentId);

    if (!submission) {
      return res.status(404).json(errorResponse('NO_SUBMISSIONS', 'No submissions found for this assignment'));
    }

    res.status(200).json(successResponse(submission));
  });

  /**
   * @swagger
   * /api/v1/client-submissions/{submissionId}/review:
   *   post:
   *     summary: Review submission (admin - reject or approve)
   *     tags: [Client Submissions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: submissionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Submission ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - action
   *             properties:
   *               action:
   *                 type: string
   *                 enum: [reject, approve]
   *                 description: Review action
   *               remarks:
   *                 type: string
   *                 description: Review remarks (required for rejection, optional for approval)
   *     responses:
   *       200:
   *         description: Submission reviewed successfully
   *       400:
   *         description: Invalid submission status or action
   *       404:
   *         description: Submission not found
   */
  reviewSubmission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { submissionId } = req.params;
    const { action, remarks } = req.body;
    const userId = req.user!.id;

    // Validate action
    if (!action || (action !== 'reject' && action !== 'approve')) {
      return res.status(400).json(
        errorResponse('INVALID_ACTION', 'Action must be either "reject" or "approve"')
      );
    }

    // Remarks are required for rejection
    if (action === 'reject' && !remarks) {
      return res.status(400).json(
        errorResponse('REMARKS_REQUIRED', 'Remarks are required when rejecting a submission')
      );
    }

    const submission = await this.service.reviewSubmission(submissionId, userId, action, remarks);
    res.status(200).json(successResponse(submission));
  });

  /**
   * @swagger
   * /api/v1/client-submissions/{submissionId}/download:
   *   get:
   *     summary: Download submission file
   *     tags: [Client Submissions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: submissionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Submission ID
   *     responses:
   *       200:
   *         description: File download
   *       404:
   *         description: Submission not found
   */
  downloadSubmission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { submissionId } = req.params;
    const fileInfo = await this.service.downloadSubmission(submissionId);
    res.download(fileInfo.filePath, fileInfo.originalName);
  });

  /**
   * @swagger
   * /api/v1/client-submissions/project/{projectId}/assignments:
   *   get:
   *     summary: Get client's template assignments for a project
   *     tags: [Client Submissions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     responses:
   *       200:
   *         description: List of template assignments
   *       403:
   *         description: Client does not have access to this project
   *       404:
   *         description: Project not found
   */
  getClientProjectAssignments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.params;

    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const assignments = await this.service.getClientProjectAssignments(
      projectId,
      req.user.organizationId,
      req.user.userType
    );

    res.status(200).json(successResponse(assignments));
  });

  /**
   * @swagger
   * /api/v1/client-submissions/project/{projectId}/history:
   *   get:
   *     summary: Get project-level checklist history across all assignments
   *     tags: [Client Submissions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     responses:
   *       200:
   *         description: Project checklist history retrieved successfully
   *       404:
   *         description: Project not found
   */
  getProjectChecklistHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.params;
    const history = await this.service.getProjectChecklistHistory(projectId);
    res.status(200).json(successResponse(history));
  });
}
