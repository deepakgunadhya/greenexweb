import { Request, Response } from 'express';
import { ProjectsService, CreateProjectFromQuotationDto } from './projects.service';
import { ProjectStatusService, StatusUpdate } from './project-status.service';
import { successResponse, errorResponse } from '../../utils/response';
import { asyncHandler } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class ProjectsController {
  private projectsService: ProjectsService;
  private statusService: ProjectStatusService;

  constructor() {
    this.projectsService = new ProjectsService();
    this.statusService = new ProjectStatusService();
  }

  /**
   * @swagger
   * /api/v1/projects:
   *   get:
   *     summary: Get all projects with filtering
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: organizationId
   *         schema:
   *           type: string
   *         description: Filter by organization
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [planned, checklist_finalized, verification_passed, execution_in_progress, execution_complete, draft_prepared, client_review, account_closure, completed]
   *         description: Filter by project status
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in project name, description, or project number
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Items per page
   *     responses:
   *       200:
   *         description: Projects retrieved successfully
   */
  findMany = asyncHandler(async (req: Request, res: Response) => {
    const {
      organizationId,
      status,
      verificationStatus,
      executionStatus,
      clientReviewStatus,
      paymentStatus,
      search,
      startDateFrom,
      startDateTo,
      page = 1,
      pageSize = 20
    } = req.query;

    const filters = {
      ...(organizationId && { organizationId: organizationId as string }),
      ...(status && { status: status as string }),
      ...(verificationStatus && { verificationStatus: verificationStatus as string }),
      ...(executionStatus && { executionStatus: executionStatus as string }),
      ...(clientReviewStatus && { clientReviewStatus: clientReviewStatus as string }),
      ...(paymentStatus && { paymentStatus: paymentStatus as string }),
      ...(search && { search: search as string }),
      ...(startDateFrom && { startDateFrom: new Date(startDateFrom as string) }),
      ...(startDateTo && { startDateTo: new Date(startDateTo as string) })
    };

    const result = await this.projectsService.getProjects(
      filters,
      parseInt(page as string),
      parseInt(pageSize as string)
    );

    res.json(successResponse(result.projects, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: Math.ceil(result.total / result.pageSize)
    }));
  });

  /**
   * @swagger
   * /api/v1/projects/{id}:
   *   get:
   *     summary: Get project by ID
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     responses:
   *       200:
   *         description: Project retrieved successfully
   *       404:
   *         description: Project not found
   */
  findOne = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const project = await this.projectsService.getProject(id);
    
    if (!project) {
      return res.status(404).json(errorResponse('PROJECT_NOT_FOUND', 'Project not found'));
    }

    res.json(successResponse(project));
  });

  /**
   * @swagger
   * /api/v1/projects/create-from-quotation:
   *   post:
   *     summary: Create project from accepted quotation (SRS 5.2.3)
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - quotationId
   *               - serviceIds
   *             properties:
   *               quotationId:
   *                 type: string
   *                 description: ID of the accepted quotation
   *               name:
   *                 type: string
   *                 description: Project name (auto-generated if not provided)
   *               description:
   *                 type: string
   *                 description: Project description
   *               startDate:
   *                 type: string
   *                 format: date
   *                 description: Project start date
   *               notes:
   *                 type: string
   *                 description: Internal notes
   *               serviceIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Services to include in the project
   *     responses:
   *       201:
   *         description: Project created successfully
   *       400:
   *         description: Invalid request or business rule violation
   *       404:
   *         description: Quotation not found
   */
  createFromQuotation = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body;

    // Parse serviceIds from form data (may come as JSON string or array)
    let serviceIds = body.serviceIds;
    if (typeof serviceIds === 'string') {
      try {
        serviceIds = JSON.parse(serviceIds);
      } catch {
        serviceIds = [serviceIds];
      }
    }

    // Validation
    if (!body.quotationId) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'quotationId is required'));
    }

    if (!serviceIds || serviceIds.length === 0) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'At least one service must be selected'));
    }

    const projectData: CreateProjectFromQuotationDto = {
      quotationId: body.quotationId,
      name: body.name,
      description: body.description,
      startDate: body.startDate,
      notes: body.notes,
      serviceIds,
      poNumber: body.poNumber,
    };

    // Handle PO attachment file
    const file = (req as any).file;
    if (file) {
      projectData.poAttachment = {
        path: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    const project = await this.projectsService.createProjectFromQuotation(projectData);

    res.status(201).json(successResponse(project));
  });

  /**
   * @swagger
   * /api/v1/projects/{id}:
   *   put:
   *     summary: Update project details
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 description: Project name
   *               description:
   *                 type: string
   *                 description: Project description
   *               startDate:
   *                 type: string
   *                 format: date
   *                 description: Project start date
   *               endDate:
   *                 type: string
   *                 format: date
   *                 description: Project end date
   *               estimatedCost:
   *                 type: number
   *                 description: Estimated project cost
   *               notes:
   *                 type: string
   *                 description: Internal notes
   *     responses:
   *       200:
   *         description: Project updated successfully
   *       400:
   *         description: Invalid request or business rule violation
   *       404:
   *         description: Project not found
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates: any = { ...req.body };

    // Handle PO attachment file
    const file = (req as any).file;
    if (file) {
      updates.poAttachment = {
        path: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    const project = await this.projectsService.updateProject(id, updates);

    res.json(successResponse(project));
  });

  /**
   * Download PO attachment for a project
   */
  downloadPoAttachment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { filePath, originalName } = await this.projectsService.getPoAttachment(id);

    res.download(filePath, originalName);
  });

  /**
   * Remove PO attachment from a project
   */
  removePoAttachment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const project = await this.projectsService.removePoAttachment(id);

    res.json(successResponse(project));
  });

  /**
   * @swagger
   * /api/v1/projects/quotations/eligible:
   *   get:
   *     summary: Get accepted quotations that can create projects
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Eligible quotations retrieved successfully
   */
  getEligibleQuotations = asyncHandler(async (req: Request, res: Response) => {
    const quotations = await this.projectsService.getAcceptedQuotationsWithoutProjects();

    res.json(successResponse(quotations));
  });

  /**
   * @swagger
   * /api/v1/projects/quotations/{quotationId}/eligibility:
   *   get:
   *     summary: Check if quotation can create a project
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: quotationId
   *         required: true
   *         schema:
   *           type: string
   *         description: Quotation ID
   *     responses:
   *       200:
   *         description: Eligibility check completed
   */
  checkProjectCreationEligibility = asyncHandler(async (req: Request, res: Response) => {
    const { quotationId } = req.params;

    const eligibility = await this.projectsService.checkProjectCreationEligibility(quotationId);

    res.json(successResponse(eligibility));
  });

  /**
   * @swagger
   * /api/v1/projects/{id}/status:
   *   put:
   *     summary: Update project status fields
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [planned, checklist_finalized, verification_passed, execution_in_progress, execution_complete, draft_prepared, client_review, account_closure, completed]
   *                 description: Main project status
   *               verificationStatus:
   *                 type: string
   *                 enum: [pending, under_verification, passed, failed]
   *                 description: Verification status
   *               executionStatus:
   *                 type: string
   *                 enum: [not_started, in_progress, complete]
   *                 description: Execution status
   *               clientReviewStatus:
   *                 type: string
   *                 enum: [not_started, in_review, changes_requested, revised_shared, client_approved]
   *                 description: Client review status
   *               paymentStatus:
   *                 type: string
   *                 enum: [pending, partial, paid]
   *                 description: Payment status
   *     responses:
   *       200:
   *         description: Project status updated successfully
   *       400:
   *         description: Invalid status transition or business rule violation
   *       404:
   *         description: Project not found
   */
  updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const statusUpdates: StatusUpdate = req.body;

    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const updatedProject = await this.statusService.updateProjectStatuses(id, statusUpdates, req.user.id);

    res.json(successResponse(updatedProject));
  });

  /**
   * @swagger
   * /api/v1/projects/{id}/status/transitions:
   *   get:
   *     summary: Get valid status transitions for a project
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     responses:
   *       200:
   *         description: Valid transitions retrieved successfully
   *       404:
   *         description: Project not found
   */
  getStatusTransitions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const project = await this.projectsService.getProject(id);
    if (!project) {
      return res.status(404).json(errorResponse('PROJECT_NOT_FOUND', 'Project not found'));
    }

    const validTransitions = this.statusService.getValidTransitions(project);

    res.json(successResponse(validTransitions));
  });

  /**
   * @swagger
   * /api/v1/projects/{id}/status/can-update:
   *   get:
   *     summary: Check if project status updates are allowed
   *     description: Status updates are blocked when project checklist is not finalized (status = planned)
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     responses:
   *       200:
   *         description: Status update permission check result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 allowed:
   *                   type: boolean
   *                   description: Whether status updates are allowed
   *                 reason:
   *                   type: string
   *                   description: Reason if not allowed
   *                 canFinalizeChecklist:
   *                   type: boolean
   *                   description: Whether the checklist can be finalized
   *       404:
   *         description: Project not found
   */
  checkStatusUpdateAllowed = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await this.statusService.isStatusUpdateAllowed(id);

    res.json(successResponse(result));
  });

  /**
   * @swagger
   * /api/v1/projects/{projectId}/checklists:
   *   get:
   *     summary: Get project template assignments (document-based checklists)
   *     tags: [Projects]
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
   *         description: Template assignments retrieved successfully
   *       404:
   *         description: Project not found
   */
  getProjectChecklists = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.params;

    const assignments = await this.projectsService.getProjectTemplateAssignments(
      projectId,
      req.user?.id,
      req.user?.roles
    );

    res.json(successResponse(assignments));
  });

  /**
   * Get available template files for assignment to project
   */
  getAvailableTemplates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.params;

    const templates = await this.projectsService.getAvailableTemplatesForProject(projectId);

    res.json(successResponse(templates));
  });

  /**
   * Assign a template file to a project
   */
  assignTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.params;
    const { templateFileId, assignedToUserId, reason } = req.body;

    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
    }

    const assignment = await this.projectsService.assignTemplateToProject(
      projectId,
      templateFileId,
      req.user.id,
      assignedToUserId,
      reason
    );

    res.status(201).json(successResponse(assignment));
  });

  /**
   * Get internal users assignable to checklist templates
   */
  getAssignableUsersForChecklists = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const users = await this.projectsService.getAssignableUsersForChecklists();
    res.json(successResponse(users));
  });
}