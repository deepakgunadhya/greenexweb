import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export interface StatusUpdate {
  status?: string;
  verificationStatus?: string;
  executionStatus?: string;
  clientReviewStatus?: string;
  paymentStatus?: string;
}

export interface StatusChange {
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: Date;
}

export interface ProjectStatusValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Project Status Management Service
 * Implements SRS 5.3.4 - Independent Status Fields with business rules validation
 */
export class ProjectStatusService {
  
  /**
   * Status transition rules based on SRS business logic
   */
  private static readonly STATUS_RULES = {
    // Main project status lifecycle (SRS 5.3.3)
    status: {
      planned: ['checklist_finalized'],
      checklist_finalized: ['verification_passed', 'planned'], // Can go back if needed
      verification_passed: ['execution_in_progress'],
      execution_in_progress: ['execution_complete', 'verification_passed'], // Can go back if verification fails
      execution_complete: ['draft_prepared'],
      draft_prepared: ['client_review'],
      client_review: ['draft_prepared', 'account_closure'], // Can go back for revisions or forward if approved
      account_closure: ['completed'],
      completed: [] // Final state
    },
    
    // Verification status rules
    verificationStatus: {
      pending: ['under_verification'],
      under_verification: ['passed', 'failed', 'pending'],
      passed: ['failed'], // Can fail if issues found later
      failed: ['pending', 'under_verification'] // Can restart verification
    },
    
    // Execution status rules
    executionStatus: {
      not_started: ['in_progress'],
      in_progress: ['complete', 'not_started'], // Can reset if needed
      complete: ['in_progress'] // Can reopen if issues found
    },
    
    // Client review status rules
    clientReviewStatus: {
      not_started: ['in_review'],
      in_review: ['changes_requested', 'client_approved', 'not_started'],
      changes_requested: ['revised_shared', 'in_review'],
      revised_shared: ['in_review'],
      client_approved: ['changes_requested'] // Can request changes even after approval
    },
    
    // Payment status rules
    paymentStatus: {
      pending: ['partial', 'paid'],
      partial: ['paid', 'pending'], // Can go back if payment reversed
      paid: ['partial', 'pending'] // Can go back if refund/chargeback
    }
  };

  /**
   * Business rule constraints between different status types
   */
  private static readonly INTER_STATUS_CONSTRAINTS = {
    // Cannot start execution until verification passes
    executionStatus: {
      in_progress: {
        requires: { verificationStatus: 'passed' }
      },
      complete: {
        requires: { verificationStatus: 'passed' }
      }
    },
    
    // Main status progression rules
    status: {
      verification_passed: {
        requires: { verificationStatus: 'passed' }
      },
      execution_in_progress: {
        requires: { 
          verificationStatus: 'passed',
          executionStatus: ['in_progress', 'complete']
        }
      },
      execution_complete: {
        requires: {
          verificationStatus: 'passed',
          executionStatus: 'complete'
        }
      },
      client_review: {
        requires: {
          clientReviewStatus: ['in_review', 'changes_requested', 'revised_shared', 'client_approved']
        }
      },
      completed: {
        requires: {
          verificationStatus: 'passed',
          executionStatus: 'complete',
          clientReviewStatus: 'client_approved',
          paymentStatus: 'paid' // Configurable - can be disabled if payment not required
        }
      }
    }
  };

  /**
   * Validate if a status transition is allowed
   */
  validateStatusTransition(currentProject: any, updates: StatusUpdate): ProjectStatusValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate each status field transition
    for (const [field, newValue] of Object.entries(updates)) {
      if (!newValue) continue;

      const currentValue = currentProject[field];
      const fieldRules = ProjectStatusService.STATUS_RULES[field as keyof typeof ProjectStatusService.STATUS_RULES];
      
      if (fieldRules && currentValue !== newValue) {
        const allowedTransitions = (fieldRules as any)[currentValue] || [];
        
        if (!allowedTransitions.includes(newValue)) {
          errors.push(`Invalid ${field} transition from '${currentValue}' to '${newValue}'. Allowed: [${allowedTransitions.join(', ')}]`);
        }
      }
    }

    // Validate inter-status constraints
    const finalStatuses = { ...currentProject, ...updates };
    
    for (const [statusField, statusValue] of Object.entries(finalStatuses)) {
      const constraints = ProjectStatusService.INTER_STATUS_CONSTRAINTS[statusField as keyof typeof ProjectStatusService.INTER_STATUS_CONSTRAINTS];
      
      if (constraints && statusValue && typeof statusValue === 'string') {
        const constraintRule = (constraints as any)[statusValue as string];
        if (constraintRule && constraintRule.requires) {
          const requirement = constraintRule.requires;
        
          for (const [reqField, reqValues] of Object.entries(requirement)) {
            const actualValue = finalStatuses[reqField];
            const allowedValues = Array.isArray(reqValues) ? reqValues : [reqValues];
            
            if (!allowedValues.includes(actualValue)) {
              errors.push(`Cannot set ${statusField}='${statusValue}' because ${reqField}='${actualValue}'. Required: [${allowedValues.join(', ')}]`);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get valid next statuses based on current state
   */
  getValidTransitions(project: any): Record<string, string[]> {
    const validTransitions: Record<string, string[]> = {};

    for (const [field, rules] of Object.entries(ProjectStatusService.STATUS_RULES)) {
      const currentValue = project[field];
      validTransitions[field] = (rules as any)[currentValue] || [];
    }

    return validTransitions;
  }

  /**
   * Update project statuses with validation and audit logging
   *
   * IMPORTANT: Status updates are only allowed after the project checklist has been finalized.
   * A project in 'planned' status cannot have its status fields updated (except transitioning to checklist_finalized).
   */
  async updateProjectStatuses(projectId: string, updates: StatusUpdate, userId: string): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // Get current project state
      const currentProject = await tx.project.findUnique({
        where: { id: projectId }
      });

      if (!currentProject) {
        throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }

      // RULE: Status updates are blocked when project is in 'planned' status
      // Exception: Transitioning main status from 'planned' to 'checklist_finalized' is allowed
      if (currentProject.status === 'planned') {
        const isTransitioningToFinalized = updates.status === 'checklist_finalized';
        const hasOtherStatusUpdates =
          updates.verificationStatus ||
          updates.executionStatus ||
          updates.clientReviewStatus ||
          updates.paymentStatus;

        if (!isTransitioningToFinalized && updates.status) {
          throw new AppError(
            'Cannot update project status. Project checklist must be finalized first. Current status: planned',
            400,
            'CHECKLIST_NOT_FINALIZED'
          );
        }

        if (hasOtherStatusUpdates) {
          throw new AppError(
            'Cannot update verification, execution, client review, or payment status. Project checklist must be finalized first.',
            400,
            'CHECKLIST_NOT_FINALIZED'
          );
        }
      }

      // Validate the status transition
      const validation = this.validateStatusTransition(currentProject, updates);
      
      if (!validation.isValid) {
        throw new AppError(
          `Status transition validation failed: ${validation.errors.join(', ')}`,
          400,
          'INVALID_STATUS_TRANSITION'
        );
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        logger.warn(`Project status update warnings for ${projectId}:`, validation.warnings);
      }

      // Prepare the update data
      const updateData = {
        ...updates,
        statusChangedAt: new Date(),
        statusChangedBy: userId
      };

      // Update the project
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: updateData,
        include: {
          organization: true,
          statusChanger: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      // Log status changes for audit trail
      const changes: StatusChange[] = [];
      for (const [field, newValue] of Object.entries(updates)) {
        if (newValue && currentProject[field as keyof typeof currentProject] !== newValue) {
          changes.push({
            field,
            oldValue: currentProject[field as keyof typeof currentProject] as string,
            newValue: newValue as string,
            timestamp: new Date()
          });
        }
      }

      await this.logStatusChanges(projectId, changes, userId, tx);

      logger.info(`Project ${projectId} status updated by user ${userId}:`, changes);

      return updatedProject;
    });
  }

  /**
   * Log status changes for audit trail
   */
  private async logStatusChanges(
    projectId: string, 
    changes: StatusChange[], 
    userId: string,
    tx: any
  ): Promise<void> {
    // For now, we'll use simple logging. In future, this could be stored in a dedicated audit table
    for (const change of changes) {
      logger.info(`Project ${projectId} status change:`, {
        projectId,
        userId,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        timestamp: change.timestamp
      });
    }
  }

  /**
   * Check if a project is ready for specific workflow actions
   */
  async checkWorkflowReadiness(projectId: string): Promise<{
    canStartVerification: boolean;
    canStartExecution: boolean;
    canStartClientReview: boolean;
    canComplete: boolean;
    blockers: string[];
  }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        templateAssignments: {
          select: {
            status: true
          }
        }
      }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const blockers: string[] = [];

    // Check verification readiness - all template assignments should be verified
    const canStartVerification = project.status === 'checklist_finalized' &&
      project.templateAssignments.every(ta => ta.status === 'verified');

    if (!canStartVerification && project.status === 'checklist_finalized') {
      const incompleteAssignments = project.templateAssignments.filter(ta => ta.status !== 'verified');
      if (incompleteAssignments.length > 0) {
        blockers.push(`${incompleteAssignments.length} template assignments are not verified`);
      }
    }

    // Check execution readiness
    const canStartExecution = project.verificationStatus === 'passed';
    
    if (!canStartExecution && project.status === 'verification_passed') {
      blockers.push('Verification must pass before starting execution');
    }

    // Check client review readiness  
    const canStartClientReview = project.executionStatus === 'complete' && 
      project.status === 'execution_complete';

    if (!canStartClientReview && project.status === 'execution_complete') {
      blockers.push('Execution must be complete before client review');
    }

    // Check completion readiness
    const canComplete = project.verificationStatus === 'passed' &&
      project.executionStatus === 'complete' &&
      project.clientReviewStatus === 'client_approved' &&
      project.paymentStatus === 'paid';

    if (!canComplete) {
      if (project.verificationStatus !== 'passed') blockers.push('Verification not passed');
      if (project.executionStatus !== 'complete') blockers.push('Execution not complete');
      if (project.clientReviewStatus !== 'client_approved') blockers.push('Client approval pending');
      if (project.paymentStatus !== 'paid') blockers.push('Payment not received');
    }

    return {
      canStartVerification,
      canStartExecution,
      canStartClientReview,
      canComplete,
      blockers
    };
  }

  /**
   * Check if project status updates are allowed
   * Status updates are blocked when project is in 'planned' status (before checklist finalization)
   */
  async isStatusUpdateAllowed(projectId: string): Promise<{
    allowed: boolean;
    reason?: string;
    canFinalizeChecklist: boolean;
  }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        status: true,
        templateAssignments: {
          select: {
            status: true
          }
        }
      }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // If project is in 'planned' status, status updates are not allowed
    if (project.status === 'planned') {
      // Check if all template assignments are verified (ready to finalize checklist)
      const allVerified = project.templateAssignments.length > 0 &&
        project.templateAssignments.every(ta => ta.status === 'verified');

      return {
        allowed: false,
        reason: 'Project checklist must be finalized before status updates are allowed. Current status: planned',
        canFinalizeChecklist: allVerified
      };
    }

    return {
      allowed: true,
      canFinalizeChecklist: false
    };
  }

  /**
   * Bulk status update for multiple projects (admin operation)
   */
  async bulkUpdateStatus(
    projectIds: string[], 
    updates: StatusUpdate, 
    userId: string
  ): Promise<{ successful: string[], failed: { id: string, error: string }[] }> {
    const successful: string[] = [];
    const failed: { id: string, error: string }[] = [];

    for (const projectId of projectIds) {
      try {
        await this.updateProjectStatuses(projectId, updates, userId);
        successful.push(projectId);
      } catch (error) {
        failed.push({
          id: projectId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info(`Bulk status update completed by ${userId}:`, {
      successful: successful.length,
      failed: failed.length,
      updates
    });

    return { successful, failed };
  }
}