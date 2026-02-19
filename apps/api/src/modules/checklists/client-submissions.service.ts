import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export interface UploadSubmissionDto {
  assignmentId: string;
  file: Express.Multer.File;
  uploadedBy: string;
}

export interface ReviewSubmissionDto {
  submissionId: string;
  reviewedBy: string;
  action: 'reject' | 'approve';
  remarks?: string;
}

export class ClientSubmissionsService {
  /**
   * Upload client submission for a template assignment
   * Creates new version and marks previous as not latest
   */
async uploadSubmission(
  assignmentId: string,
  file: Express.Multer.File,
  uploadedBy: string,
  comment?: string,
  submissionSource: string = 'client'
) {
  return await prisma.$transaction(
    async (tx) => {
      // 1. Validate assignment exists and is in correct status
      const assignment = await tx.projectTemplateAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          project: { select: { id: true, name: true, projectNumber: true } },
          templateFile: { select: { id: true, title: true } }
        }
      });

      if (!assignment) {
        throw new AppError(
          'Template assignment not found',
          404,
          'ASSIGNMENT_NOT_FOUND'
        );
      }

      // ✅ FIX: allow re-upload when already submitted
      if (
        assignment.status !== 'assigned' &&
        assignment.status !== 'incomplete' &&
        assignment.status !== 'submitted'
      ) {
        throw new AppError(
          `Cannot upload submission. Assignment status is '${assignment.status}'`,
          400,
          'INVALID_ASSIGNMENT_STATUS'
        );
      }

      // 2. Get latest version number
      const latestSubmission = await tx.clientSubmission.findFirst({
        where: { assignmentId },
        orderBy: { version: 'desc' },
        select: { version: true }
      });

      const newVersion = latestSubmission
        ? latestSubmission.version + 1
        : 1;

      // 3. Mark all previous submissions as not latest
      await tx.clientSubmission.updateMany({
        where: {
          assignmentId,
          isLatest: true
        },
        data: {
          isLatest: false
        }
      });

      // 4. Create new submission
      const submission = await tx.clientSubmission.create({
        data: {
          assignmentId,
          version: newVersion,
          filePath: file.path,
          originalName: file.originalname,
          fileSize: BigInt(file.size),
          mimeType: file.mimetype,
          status: 'submitted',
          uploadedBy,
          clientComment: comment || null,
          isLatest: true,
          submissionSource
        },
        include: {
          uploader: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          assignment: {
            include: {
              project: {
                select: { id: true, name: true, projectNumber: true }
              },
              templateFile: {
                select: { id: true, title: true, category: true }
              }
            }
          }
        }
      });

      // 5. Update assignment status to 'submitted'
      await tx.projectTemplateAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'submitted',
          currentRemarks: null
        }
      });

      logger.info('Submission uploaded', {
        submissionId: submission.id,
        assignmentId,
        version: newVersion,
        uploadedBy,
        submissionSource,
        projectId: assignment.project.id
      });

      return this.serializeSubmission(submission);
    },
    {
      timeout: 15000 // ✅ FIX: prevent transaction timeout
    }
  );
}



  /**
   * Get submission history for an assignment
   * Returns all versions ordered by version descending
   */
  async getSubmissionHistory(assignmentId: string) {
    // Validate assignment exists
    const assignment = await prisma.projectTemplateAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment) {
      throw new AppError('Template assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    const submissions = await prisma.clientSubmission.findMany({
      where: { assignmentId },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { version: 'desc' }
    });

    logger.info('Fetched submission history', {
      assignmentId,
      count: submissions.length
    });

    return submissions.map(sub => this.serializeSubmission(sub));
  }

  /**
   * Get latest submission for an assignment
   */
  async getLatestSubmission(assignmentId: string) {
    const submission = await prisma.clientSubmission.findFirst({
      where: { assignmentId, isLatest: true },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        assignment: {
          include: {
            project: { select: { id: true, name: true, projectNumber: true } },
            templateFile: { select: { id: true, title: true, category: true } }
          }
        }
      }
    });

    if (!submission) {
      return null;
    }

    return this.serializeSubmission(submission);
  }

  /**
   * Admin reviews a submission - reject or approve
   */
  async reviewSubmission(
    submissionId: string,
    reviewedBy: string,
    action: 'reject' | 'approve',
    remarks?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Find submission with assignment
      const submission = await tx.clientSubmission.findUnique({
        where: { id: submissionId },
        include: {
          assignment: {
            include: {
              project: { select: { id: true, name: true, projectNumber: true } },
              templateFile: { select: { id: true, title: true } }
            }
          },
          uploader: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      if (!submission) {
        throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
      }

      // Can only review submissions with status 'submitted'
      if (submission.status !== 'submitted') {
        throw new AppError(
          `Cannot review submission. Current status is '${submission.status}'`,
          400,
          'INVALID_SUBMISSION_STATUS'
        );
      }

      // Must be the latest submission
      if (!submission.isLatest) {
        throw new AppError(
          'Cannot review a submission that is not the latest version',
          400,
          'NOT_LATEST_SUBMISSION'
        );
      }

      const now = new Date();

      if (action === 'reject') {
        // Reject workflow
        const updatedSubmission = await tx.clientSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'rejected',
            reviewRemarks: remarks || 'Submission rejected by admin',
            reviewedBy,
            reviewedAt: now
          },
          include: {
            uploader: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            reviewer: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            assignment: {
              include: {
                project: { select: { id: true, name: true, projectNumber: true } },
                templateFile: { select: { id: true, title: true, category: true } }
              }
            }
          }
        });

        // Update assignment status to 'incomplete' with rejection remarks
        await tx.projectTemplateAssignment.update({
          where: { id: submission.assignmentId },
          data: {
            status: 'incomplete',
            currentRemarks: remarks || 'Submission rejected by admin'
          }
        });

        logger.info('Submission rejected', {
          submissionId,
          assignmentId: submission.assignmentId,
          reviewedBy,
          remarks
        });

        return this.serializeSubmission(updatedSubmission);
      } else {
        // Approve workflow
        const updatedSubmission = await tx.clientSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'approved',
            reviewRemarks: remarks,
            reviewedBy,
            reviewedAt: now
          },
          include: {
            uploader: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            reviewer: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            assignment: {
              include: {
                project: { select: { id: true, name: true, projectNumber: true } },
                templateFile: { select: { id: true, title: true, category: true } }
              }
            }
          }
        });

        // Update assignment status to 'verified'
        await tx.projectTemplateAssignment.update({
          where: { id: submission.assignmentId },
          data: {
            status: 'verified',
            verifiedBy: reviewedBy,
            verifiedAt: now,
            currentRemarks: null // Clear rejection remarks
          }
        });

        logger.info('Submission approved', {
          submissionId,
          assignmentId: submission.assignmentId,
          reviewedBy,
          remarks
        });

        return this.serializeSubmission(updatedSubmission);
      }
    });
  }

  /**
   * Get submission file info for download
   */
  async downloadSubmission(submissionId: string) {
    const submission = await prisma.clientSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        filePath: true,
        originalName: true
      }
    });

    if (!submission) {
      throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    }

    logger.info('Submission file accessed for download', {
      submissionId,
      originalName: submission.originalName
    });

    return {
      filePath: submission.filePath,
      originalName: submission.originalName
    };
  }

  /**
   * Get client's template assignments for a project
   */
  async getClientProjectAssignments(
    projectId: string,
    organizationId?: string,
    userType?: string
  ) {
    // First verify the project belongs to the client's organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        organizationId: true
      }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // If client user, verify they have access to this project
    if (userType === 'CLIENT' && project.organizationId !== organizationId) {
      throw new AppError(
        'Access denied: You do not have access to this project',
        403,
        'ACCESS_DENIED'
      );
    }

    // Get template assignments for the project
    const assignments = await prisma.projectTemplateAssignment.findMany({
      where: { projectId },
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
          orderBy: { version: 'desc' }
        }
      },
      orderBy: {
        assignedAt: 'desc'
      }
    });

    // Serialize BigInt fields
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

    logger.info('Client accessed project assignments', {
      projectId,
      organizationId,
      userType,
      assignmentCount: assignments.length
    });

    return serializedAssignments;
  }

  /**
   * Get project-level checklist history across all assignments
   * Returns all submissions ordered chronologically (newest first)
   */
  async getProjectChecklistHistory(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const assignments = await prisma.projectTemplateAssignment.findMany({
      where: { projectId },
      include: {
        templateFile: { select: { id: true, title: true, category: true } },
        submissions: {
          include: {
            uploader: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            reviewer: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          },
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    // Flatten all submissions with template context
    const history = assignments.flatMap(assignment =>
      assignment.submissions.map(sub => ({
        ...this.serializeSubmission(sub),
        templateTitle: assignment.templateFile.title,
        templateCategory: assignment.templateFile.category,
        assignmentId: assignment.id,
      }))
    );

    // Sort by uploadedAt descending
    history.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    logger.info('Fetched project checklist history', {
      projectId,
      totalRecords: history.length
    });

    return history;
  }

  /**
   * Helper: Serialize submission (convert BigInt to string)
   */
  private serializeSubmission(submission: any) {
    return {
      ...submission,
      fileSize: submission.fileSize ? submission.fileSize.toString() : null,
      uploadedAt: submission.uploadedAt?.toISOString(),
      reviewedAt: submission.reviewedAt?.toISOString()
    };
  }
}
