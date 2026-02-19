import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';
import { deleteFile } from '../../middleware/upload.middleware';

export interface CreateProjectFromQuotationDto {
  quotationId: string;
  name?: string; // Optional override - auto-generated if not provided
  description?: string;
  startDate?: Date;
  notes?: string;
  serviceIds: string[]; // Services to include in project
  poNumber?: string;
  poAttachment?: {
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
}

export interface ProjectWithDetails {
  id: string;
  quotationId: string;
  organizationId: string;
  projectNumber: string;
  name: string;
  description?: string;
  status: string;
  verificationStatus: string;
  executionStatus: string;
  clientReviewStatus: string;
  paymentStatus: string;
  startDate?: Date;
  endDate?: Date;
  estimatedCost?: number | null;
  actualCost?: number | null;
  notes?: string;
  statusChangedAt?: Date;
  statusChangedBy?: string;
  poNumber?: string;
  poAttachmentPath?: string;
  poAttachmentOriginalName?: string;
  poAttachmentMimeType?: string;
  poAttachmentSize?: string;
  createdAt: Date;
  updatedAt: Date;
  organization: {
    id: string;
    name: string;
    type: string;
    email?: string;
    phone?: string;
  };
  quotation: {
    id: string;
    quotation_number: string;
    title: string;
    amount?: number;
    status: string;
    lead: {
      id: string;
      title: string;
      contactName?: string;
      contactEmail?: string;
    };
  };
  projectServices: {
    id: string;
    service: {
      id: string;
      name: string;
      category: string;
      description?: string;
    };
  }[];
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: Date;
    assignee?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }[];
  checklists?: {
    id: string;
    status: string;
    completenessPercent: number;
    template: {
      id: string;
      name: string;
      category: string;
    };
  }[];
}

export interface ProjectFilters {
  organizationId?: string;
  status?: string;
  verificationStatus?: string;
  executionStatus?: string;
  clientReviewStatus?: string;
  paymentStatus?: string;
  search?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
}

/**
 * Project Management Service
 * Implements SRS 5.3 - Service Management & Project Creation
 * Enforces SRS 5.2.3 - Projects created ONLY from accepted quotations
 */
export class ProjectsService {

  /**
   * Create project from accepted quotation (SRS 5.2.3)
   * This is the ONLY way to create projects in the system
   */
  async createProjectFromQuotation(projectData: CreateProjectFromQuotationDto): Promise<ProjectWithDetails> {
    return await prisma.$transaction(async (tx) => {
      // Step 1: Validate quotation exists and is accepted
      const quotation = await tx.quotation.findUnique({
        where: { id: projectData.quotationId },
        include: {
          lead: {
            include: {
              organization: true
            }
          }
        }
      });

      if (!quotation) {
        throw new AppError('Quotation not found', 404, 'QUOTATION_NOT_FOUND');
      }

      if (quotation.status !== 'ACCEPTED') {
        throw new AppError(
          `Cannot create project from quotation with status '${quotation.status}'. Only accepted quotations can create projects.`,
          400,
          'QUOTATION_NOT_ACCEPTED'
        );
      }

      // Step 2: Check if project already exists for this quotation
      const existingProject = await tx.project.findFirst({
        where: { quotationId: projectData.quotationId }
      });

      if (existingProject) {
        throw new AppError(
          'Project already exists for this quotation',
          400,
          'PROJECT_ALREADY_EXISTS'
        );
      }

      // Step 3: Validate services exist and are active
      if (!projectData.serviceIds || projectData.serviceIds.length === 0) {
        throw new AppError('At least one service must be selected', 400, 'NO_SERVICES_SELECTED');
      }

      const services = await prisma.service.findMany({
        where: {
          id: { in: projectData.serviceIds },
          isActive: true
        }
      });

      if (services.length !== projectData.serviceIds.length) {
        const foundIds = services.map(s => s.id);
        const missingIds = projectData.serviceIds.filter(id => !foundIds.includes(id));
        throw new AppError(
          `Services not found or inactive: ${missingIds.join(', ')}`,
          400,
          'INVALID_SERVICES'
        );
      }

      // Step 4: Generate project number and name
      const projectNumber = await this.generateProjectNumber(tx);
      const projectName = projectData.name || this.generateProjectName(
        quotation.lead.organization.name,
        services,
        new Date()
      );

      // Step 5: Create the project
      const project = await tx.project.create({
        data: {
          quotationId: projectData.quotationId,
          organizationId: quotation.lead.organizationId,
          projectNumber,
          name: projectName,
          description: projectData.description,
          startDate: projectData.startDate ? new Date(projectData.startDate) : null,
          estimatedCost: quotation.amount,
          notes: projectData.notes,
          status: 'planned', // Initial status as per SRS 5.3.3
          verificationStatus: 'pending',
          executionStatus: 'not_started',
          clientReviewStatus: 'not_started',
          paymentStatus: 'pending',
          poNumber: projectData.poNumber || null,
          ...(projectData.poAttachment && {
            poAttachmentPath: projectData.poAttachment.path,
            poAttachmentOriginalName: projectData.poAttachment.originalName,
            poAttachmentMimeType: projectData.poAttachment.mimeType,
            poAttachmentSize: projectData.poAttachment.size,
          }),
        }
      });

      // Step 6: Create project-service associations
      const projectServiceData = services.map(service => ({
        projectId: project.id,
        serviceId: service.id
      }));

      await tx.projectService.createMany({
        data: projectServiceData
      });

      logger.info(`Project created from quotation: ${project.name}`, {
        projectId: project.id,
        quotationId: projectData.quotationId,
        organizationId: quotation.lead.organizationId,
        services: services.map(s => s.name)
      });

      // Step 7: Return complete project details
      return await this.getProjectDetails(project.id, tx);
    });
  }

  /**
   * Get project with complete details
   */
  async getProject(projectId: string): Promise<ProjectWithDetails | null> {
    return await this.getProjectDetails(projectId);
  }

  /**
   * Get projects with filtering and pagination
   */
  async getProjects(
    filters: ProjectFilters = {},
    page = 1,
    pageSize = 20
  ): Promise<{ projects: ProjectWithDetails[], total: number, page: number, pageSize: number }> {
    const where: any = {};

    // Apply filters
    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.verificationStatus) {
      where.verificationStatus = filters.verificationStatus;
    }

    if (filters.executionStatus) {
      where.executionStatus = filters.executionStatus;
    }

    if (filters.clientReviewStatus) {
      where.clientReviewStatus = filters.clientReviewStatus;
    }

    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters.startDateFrom || filters.startDateTo) {
      where.startDate = {};
      if (filters.startDateFrom) {
        where.startDate.gte = filters.startDateFrom;
      }
      if (filters.startDateTo) {
        where.startDate.lte = filters.startDateTo;
      }
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { projectNumber: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const [projectsRaw, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              type: true,
              email: true,
              phone: true
            }
          },
          quotation: {
            select: {
              id: true,
              quotation_number: true,
              title: true,
              amount: true,
              status: true,
              lead: {
                select: {
                  id: true,
                  title: true,
                  contactName: true,
                  contactEmail: true
                }
              }
            }
          },
          projectServices: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  description: true
                }
              }
            }
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
              assignee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            },
            where: {
              status: { not: 'done' }
            },
            take: 5 // Limit for overview
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.project.count({ where })
    ]);

    // Convert Decimal fields to numbers and BigInt to strings
    const projects = projectsRaw.map(project => ({
      ...project,
      estimatedCost: project.estimatedCost ? Number(project.estimatedCost) : null,
      actualCost: project.actualCost ? Number(project.actualCost) : null,
      poAttachmentSize: project.poAttachmentSize ? project.poAttachmentSize.toString() : null,
      quotation: project.quotation ? {
        ...project.quotation,
        amount: project.quotation.amount ? Number(project.quotation.amount) : null
      } : null
    })) as ProjectWithDetails[];

    return {
      projects,
      total,
      page,
      pageSize
    };
  }

  /**
   * Update project basic details (not status fields)
   */
  async updateProject(
    projectId: string,
    updates: {
      name?: string;
      description?: string;
      startDate?: Date | string;
      endDate?: Date | string;
      estimatedCost?: number;
      notes?: string;
      poNumber?: string;
      poAttachment?: {
        path: string;
        originalName: string;
        mimeType: string;
        size: number;
      };
    }
  ): Promise<ProjectWithDetails> {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    if (project.status === 'completed') {
      throw new AppError('Cannot update completed project', 400, 'PROJECT_COMPLETED');
    }

    // Prepare update data with proper date conversion
    const { poAttachment, ...restUpdates } = updates;
    const updateData: any = { ...restUpdates };

    // Convert date strings to Date objects for Prisma
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    // Handle PO attachment replacement - delete old file from disk
    if (poAttachment) {
      const existingPath = (project as any).poAttachmentPath;
      if (existingPath) {
        deleteFile(existingPath);
      }
      updateData.poAttachmentPath = poAttachment.path;
      updateData.poAttachmentOriginalName = poAttachment.originalName;
      updateData.poAttachmentMimeType = poAttachment.mimeType;
      updateData.poAttachmentSize = poAttachment.size;
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData
    });

    logger.info(`Project updated: ${projectId}`, updates);

    return await this.getProjectDetails(projectId);
  }

  /**
   * Remove PO attachment from project and delete file from disk
   */
  async removePoAttachment(projectId: string): Promise<ProjectWithDetails> {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const existingPath = (project as any).poAttachmentPath;
    if (!existingPath) {
      throw new AppError('No PO attachment to remove', 400, 'NO_PO_ATTACHMENT');
    }

    // Delete file from disk
    deleteFile(existingPath);

    // Clear attachment fields in database
    await prisma.project.update({
      where: { id: projectId },
      data: {
        poAttachmentPath: null,
        poAttachmentOriginalName: null,
        poAttachmentMimeType: null,
        poAttachmentSize: null,
      } as any
    });

    logger.info(`PO attachment removed from project: ${projectId}`);

    return await this.getProjectDetails(projectId);
  }

  /**
   * Get PO attachment file path for download
   */
  async getPoAttachment(projectId: string): Promise<{ filePath: string; originalName: string }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const filePath = (project as any).poAttachmentPath;
    const originalName = (project as any).poAttachmentOriginalName;

    if (!filePath) {
      throw new AppError('No PO attachment found', 404, 'NO_PO_ATTACHMENT');
    }

    return { filePath, originalName };
  }

  /**
   * Get projects by quotation status (for quotation management)
   */
  async getAcceptedQuotationsWithoutProjects(): Promise<any[]> {
    const quotations = await prisma.quotation.findMany({
      where: {
        status: 'ACCEPTED',
        projects: {
          none: {} // No associated projects
        }
      },
      include: {
        lead: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: { approved_at: 'desc' }
    });

    return quotations.map(quotation => ({
      id: quotation.id,
      quotation_number: quotation.quotation_number,
      title: quotation.title,
      amount: quotation.amount,
      approved_at: quotation.approved_at,
      organization: quotation.lead.organization,
      lead: {
        id: quotation.lead.id,
        title: quotation.lead.title,
        contactName: quotation.lead.contactName,
        contactEmail: quotation.lead.contactEmail
      }
    }));
  }

  /**
   * Get project creation eligibility for a quotation
   */
  async checkProjectCreationEligibility(quotationId: string): Promise<{
    canCreateProject: boolean;
    reason?: string;
    quotation?: any;
  }> {
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        projects: true,
        lead: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!quotation) {
      return {
        canCreateProject: false,
        reason: 'Quotation not found'
      };
    }

    if (quotation.status !== 'ACCEPTED') {
      return {
        canCreateProject: false,
        reason: `Quotation must be accepted first (current status: ${quotation.status})`
      };
    }

    if (quotation.projects.length > 0) {
      return {
        canCreateProject: false,
        reason: 'Project already exists for this quotation'
      };
    }

    return {
      canCreateProject: true,
      quotation: {
        id: quotation.id,
        quotation_number: quotation.quotation_number,
        title: quotation.title,
        amount: quotation.amount,
        organization: quotation.lead.organization,
        lead: {
          id: quotation.lead.id,
          title: quotation.lead.title,
          contactName: quotation.lead.contactName,
          contactEmail: quotation.lead.contactEmail
        }
      }
    };
  }

  /**
   * Generate unique project number
   */
  private async generateProjectNumber(tx: any): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `PRJ-${currentYear}-`;
    
    // Find the highest project number for this year
    const lastProject = await tx.project.findFirst({
      where: {
        projectNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        projectNumber: 'desc'
      }
    });

    let nextNumber = 1;
    if (lastProject) {
      const lastNumber = parseInt(lastProject.projectNumber.replace(prefix, ''));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Generate project name based on SRS 5.3.2 format
   * Format: "[Client] – [Service] – [Month]"
   */
  private generateProjectName(
    clientName: string, 
    services: any[], 
    date: Date
  ): string {
    const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (services.length === 1) {
      return `${clientName} – ${services[0].name} – ${month}`;
    } else {
      const primaryService = services[0]; // Use first service as primary
      return `${clientName} – ${primaryService.name} + ${services.length - 1} more – ${month}`;
    }
  }

  /**
   * Get detailed project information
   */
  private async getProjectDetails(projectId: string, tx?: any): Promise<ProjectWithDetails> {
    const db = tx || prisma;

    const projectRaw = await db.project.findUnique({
      where: { id: projectId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
            email: true,
            phone: true
          }
        },
        quotation: {
          select: {
            id: true,
            quotation_number: true,
            title: true,
            amount: true,
            status: true,
            lead: {
              select: {
                id: true,
                title: true,
                contactName: true,
                contactEmail: true
              }
            }
          }
        },
        projectServices: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                category: true,
                description: true
              }
            }
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        statusChanger: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        templateAssignments: {
          select: {
            id: true,
            status: true,
            templateFile: {
              select: {
                id: true,
                title: true,
                category: true
              }
            }
          }
        }
      }
    });

    if (!projectRaw) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Convert Decimal fields to numbers and BigInt to strings
    const project = {
      ...projectRaw,
      estimatedCost: projectRaw.estimatedCost ? Number(projectRaw.estimatedCost) : null,
      actualCost: projectRaw.actualCost ? Number(projectRaw.actualCost) : null,
      poAttachmentSize: projectRaw.poAttachmentSize ? projectRaw.poAttachmentSize.toString() : null,
      quotation: {
        ...projectRaw.quotation,
        amount: projectRaw.quotation.amount ? Number(projectRaw.quotation.amount) : null
      }
    } as ProjectWithDetails;

    return project;
  }

  /**
   * Delete project (only if not started)
   */
  async deleteProject(projectId: string, deletedBy: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: true }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    if (project.status !== 'planned') {
      throw new AppError(
        'Can only delete projects in planned status',
        400,
        'CANNOT_DELETE_ACTIVE_PROJECT'
      );
    }

    if (project.tasks.length > 0) {
      throw new AppError(
        'Cannot delete project with existing tasks',
        400,
        'PROJECT_HAS_TASKS'
      );
    }

    await prisma.$transaction(async (tx) => {
      // Delete project services
      await tx.projectService.deleteMany({
        where: { projectId }
      });

      // Delete project
      await tx.project.delete({
        where: { id: projectId }
      });
    });

    logger.info(`Project deleted: ${projectId} by ${deletedBy}`);
  }

  /**
   * Get project template assignments (document-based checklist workflow)
   */
  async getProjectTemplateAssignments(
    projectId: string,
    requestingUserId?: string,
    requestingUserRoles?: string[]
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Build where clause with user-based visibility filtering
    const where: any = { projectId };
    const isSuperAdmin = requestingUserRoles?.includes('Super Admin');

    if (requestingUserId && !isSuperAdmin) {
      // Non-Super Admin: only see templates specifically assigned to them
      where.assignedToUserId = requestingUserId;
    }

    const assignments = await prisma.projectTemplateAssignment.findMany({
      where,
      include: {
        templateFile: {
          include: {
            attachments: true
          }
        },
        submissions: {
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: {
            version: 'desc'
          }
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        assignedAt: 'desc'
      }
    });

    // Serialize BigInt fields to strings
    const serializedAssignments = assignments.map((assignment: any) => ({
      ...assignment,
      templateFile: {
        ...assignment.templateFile,
        attachments: assignment.templateFile.attachments.map((attachment: any) => ({
          ...attachment,
          fileSize: attachment.fileSize ? attachment.fileSize.toString() : null
        }))
      },
      submissions: assignment.submissions.map((submission: any) => ({
        ...submission,
        fileSize: submission.fileSize ? submission.fileSize.toString() : null
      }))
    }));

    return serializedAssignments;
  }

  /**
   * Get available template files for assignment to project
   */
  async getAvailableTemplatesForProject(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Get all template files
    const templates = await prisma.checklistTemplateFile.findMany({
      include: {
        attachments: true,
        _count: {
          select: {
            projectAssignments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Serialize BigInt fields
    const serializedTemplates = templates.map((template: any) => ({
      ...template,
      attachments: template.attachments.map((attachment: any) => ({
        ...attachment,
        fileSize: attachment.fileSize ? attachment.fileSize.toString() : null
      }))
    }));

    return serializedTemplates;
  }

  /**
   * Assign a template file to a project
   */
  async assignTemplateToProject(
    projectId: string,
    templateFileId: string,
    assignedBy: string,
    assignedToUserId?: string,
    reason?: string
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const templateFile = await prisma.checklistTemplateFile.findUnique({
      where: { id: templateFileId }
    });

    if (!templateFile) {
      throw new AppError('Template file not found', 404, 'TEMPLATE_NOT_FOUND');
    }

    // Validate assignedToUserId if provided
    if (assignedToUserId) {
      const assignedToUser = await prisma.user.findUnique({
        where: { id: assignedToUserId }
      });
      if (!assignedToUser) {
        throw new AppError('Assigned user not found', 404, 'ASSIGNED_USER_NOT_FOUND');
      }
      if (assignedToUser.userType === 'CLIENT') {
        throw new AppError('Cannot assign template to client users', 400, 'INVALID_ASSIGNED_USER');
      }
    }

    // Check if already assigned
    const existingAssignment = await prisma.projectTemplateAssignment.findFirst({
      where: {
        projectId,
        templateFileId
      }
    });

    if (existingAssignment) {
      throw new AppError(
        'Template already assigned to this project',
        400,
        'TEMPLATE_ALREADY_ASSIGNED'
      );
    }

    // Create assignment
    const assignment = await prisma.projectTemplateAssignment.create({
      data: {
        projectId,
        templateFileId,
        assignedBy,
        assignedToUserId: assignedToUserId || null,
        status: 'assigned'
      },
      include: {
        templateFile: {
          include: {
            attachments: true
          }
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    logger.info(`Template ${templateFileId} assigned to project ${projectId} by ${assignedBy}`, {
      assignedToUserId: assignedToUserId || null
    });

    // Serialize BigInt fields
    const serializedAssignment = {
      ...assignment,
      templateFile: {
        ...assignment.templateFile,
        attachments: assignment.templateFile.attachments.map((attachment: any) => ({
          ...attachment,
          fileSize: attachment.fileSize ? attachment.fileSize.toString() : null
        }))
      }
    };

    return serializedAssignment;
  }

  /**
   * Get internal users for checklist template assignment
   */
  async getAssignableUsersForChecklists() {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        userType: {
          not: 'CLIENT'
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    return users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.roles[0]?.role || null
    }));
  }
}