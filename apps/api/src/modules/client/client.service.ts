import prisma from "../../config/database";
import { AppError } from "../../middleware/error.middleware";
import { logger } from "../../utils/logger";
import { EmailService } from "../email/email.service";
import { getOTPVerificationTemplate, getOTPVerificationText } from "../email/templates/otp.template";
import { getQuotationActionRequestedTemplate } from "../email/templates/quotation.template";
import { getUserCreatedTemplate, getUserCreatedText } from "../email/templates/user.template";

export class ClientService {
  private emailService = new EmailService();

  /**
   * Get user's organization and lead info for data filtering
   */
  private async getUserAccess(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, userType: 'CLIENT', isActive: true },
      include: {
        organization: true
      }
    });

    if (!user) {
      throw new AppError("Client user not found or inactive", 404, "CLIENT_NOT_FOUND");
    }

    return {
      userId,
      organizationId: user.organizationId,
      leadId: user.leadId,
      organization: user.organization
    };
  }

  /**
   * Generate random OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Get client quotations from database
   */
  async getClientQuotations(userId: string) {
    const userAccess = await this.getUserAccess(userId);
    
    try {
      // Get real quotations from database for this organization
      const quotations = await prisma.quotation.findMany({
        where: {
          lead: {
            organizationId: userAccess.organizationId
          },
          status: {
            in: ['SENT', 'ACCEPTED', 'REJECTED'] // Show all relevant statuses for clients
          }
        },
        include: {
          lead: {
            include: {
              organization: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (quotations.length > 0) {
        return quotations.map(q => ({
          id: q.id,
          title: q.title || 'Environmental Assessment Project',
          description: q.description,
          amount: q.amount ? parseFloat(q.amount.toString()) : 0,
          currency: q.currency || 'INR',
          validUntil: q.valid_until,
          status: q.status,
          createdAt: q.createdAt,
          lead: {
            id: q.lead.id,
            name: q.lead.title || q.lead.contactName || "Client Contact", 
            organization: q.lead.organization
          },
          clientAction: null
        }));
      }

      // If no quotations found, log for debugging
      logger.info(`No quotations found for organization ${userAccess.organizationId}`);
      return [];

    } catch (error) {
      logger.error('Error fetching real quotations:', error);
      return [];
    }
  }


  /**
   * Get client projects
   */
  async getClientProjects(userId: string) {
    const userAccess = await this.getUserAccess(userId);

    try {
      // Fetch real projects from database for this organization
      const projects = await prisma.project.findMany({
        where: {
          organizationId: userAccess.organizationId
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          quotation: {
            select: {
              id: true,
              title: true
            }
          },
          _count: {
            select: {
              templateAssignments: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (projects.length > 0) {
        return projects.map(p => ({
          id: p.id,
          projectNumber: p.projectNumber,
          name: p.name,
          description: p.description,
          status: p.status,
          startDate: p.startDate,
          endDate: p.endDate,
          createdAt: p.createdAt,
          organization: p.organization,
          quotation: p.quotation,
          checklistCount: p._count.templateAssignments
        }));
      }

      // If no projects found, log for debugging
      logger.info(`No projects found for organization ${userAccess.organizationId}`);
      return [];

    } catch (error) {
      logger.error('Error fetching client projects:', error);
      return [];
    }
  }

  /**
   * Get client project statistics
   */
  async getClientProjectStats(userId: string) {
    const userAccess = await this.getUserAccess(userId);

    try {
      // Get real project statistics
      const total = await prisma.project.count({
        where: {
          organizationId: userAccess.organizationId
        }
      });

      const inProgress = await prisma.project.count({
        where: {
          organizationId: userAccess.organizationId,
          status: {
            in: ['CHECKLIST_FINALIZED', 'VERIFICATION_PASSED', 'EXECUTION_IN_PROGRESS', 'DRAFT_PREPARED', 'CLIENT_REVIEW']
          }
        }
      });

      const completed = await prisma.project.count({
        where: {
          organizationId: userAccess.organizationId,
          status: 'COMPLETED'
        }
      });

      const planned = await prisma.project.count({
        where: {
          organizationId: userAccess.organizationId,
          status: 'PLANNED'
        }
      });

      return {
        total,
        inProgress,
        completed,
        planned
      };

    } catch (error) {
      logger.error('Error fetching client project stats:', error);
      return {
        total: 0,
        inProgress: 0,
        completed: 0,
        planned: 0
      };
    }
  }

  /**
   * Get specific client project
   */
  async getClientProject(userId: string, projectId: string) {
    const userAccess = await this.getUserAccess(userId);

    try {
      // Fetch real project from database
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          organizationId: userAccess.organizationId
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          quotation: {
            select: {
              id: true,
              title: true,
              description: true
            }
          },
          templateAssignments: {
            include: {
              templateFile: {
                include: {
                  attachments: true
                }
              },
              submissions: {
                where: {
                  isLatest: true
                },
                include: {
                  uploader: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!project) {
        return null;
      }

      return {
        id: project.id,
        projectNumber: project.projectNumber,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        createdAt: project.createdAt,
        organization: project.organization,
        quotation: project.quotation,
        templateAssignments: project.templateAssignments
      };

    } catch (error) {
      logger.error(`Error fetching client project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Get client project reports
   */
  async getClientProjectReports(userId: string, projectId: string) {
    await this.getUserAccess(userId);
    
    // Return empty array for now
    return [];
  }

  /**
   * Get client meetings
   */
  async getClientMeetings(userId: string, filters: any) {
    const userAccess = await this.getUserAccess(userId);
    
    // Return mock meeting data
    return [
      {
        id: "meeting1",
        title: "Project Kickoff Meeting",
        description: "Initial project discussion",
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: "SCHEDULED",
        lead: {
          id: "lead1",
          organization: userAccess.organization
        }
      }
    ];
  }

  /**
   * Get specific client meeting
   */
  async getClientMeeting(userId: string, meetingId: string) {
    const userAccess = await this.getUserAccess(userId);
    
    // Return mock meeting data
    return {
      id: meetingId,
      title: "Project Kickoff Meeting",
      description: "Initial project discussion",
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: "SCHEDULED",
      lead: {
        id: "lead1",
        organization: userAccess.organization
      }
    };
  }

  /**
   * Request quotation action (accept/reject) with OTP
   */
  async requestQuotationAction(userId: string, quotationId: string, action: 'accept' | 'reject') {
    const userAccess = await this.getUserAccess(userId);

    // Use transaction to create OTP and gather necessary metadata
    const txResult = await prisma.$transaction(async (tx) => {
      // Check if quotation exists and user has access to it
      const quotation = await tx.quotation.findFirst({
        where: {
          id: quotationId,
          lead: {
            organizationId: userAccess.organizationId
          },
          status: 'SENT' // Only SENT quotations can be acted upon
        },
        include: {
          lead: {
            include: {
              organization: true,
              contact: true
            }
          },
          uploader: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      if (!quotation) {
        throw new AppError("Quotation not found or cannot be modified", 404, "QUOTATION_NOT_FOUND");
      }

      // Clean up any existing unused OTPs for this quotation/user
      await tx.quotationOtp.updateMany({
        where: {
          quotationId,
          userId,
          isUsed: false
        },
        data: {
          isUsed: true // Mark as used to invalidate
        }
      });

      // Generate new OTP
      const otpCode = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await tx.quotationOtp.create({
        data: {
          quotationId,
          userId,
          otpCode,
          actionType: action.toUpperCase(),
          expiresAt
        }
      });

      // Get user email for sending OTP
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true }
      });

      if (!user) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
      }

      // Prepare recipients for stakeholder notification
      const recipients: string[] = [];
      if (quotation.uploader?.email) recipients.push(quotation.uploader.email);
      if (quotation.lead?.contact?.email) recipients.push(quotation.lead.contact.email);
      if (quotation.lead?.organization?.email && !quotation.lead?.contact?.email) recipients.push(quotation.lead.organization.email);

      return {
        otpCode,
        expiresAt,
        userEmail: user.email,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        quotationTitle: quotation.title || 'Environmental Assessment Project',
        organizationName: quotation.lead.organization?.name || 'Your Organization',
        recipients: [...new Set(recipients)]
      };
    });

    // Send OTP email to user (outside transaction)
    const emailSent = await this.sendOTPEmail({
      email: txResult.userEmail,
      name: txResult.userName,
      otpCode: txResult.otpCode,
      action,
      quotationTitle: txResult.quotationTitle,
      organizationName: txResult.organizationName
    });

    if (!emailSent) {
      logger.warn(`Failed to send OTP email to ${txResult.userEmail}`);
    }

    // Notify stakeholders about requested action
    try {
      if (txResult.recipients.length > 0) {
        const html = getQuotationActionRequestedTemplate({
          title: txResult.quotationTitle,
          action,
          requestedBy: txResult.userName,
          organizationName: txResult.organizationName
        });

        await this.emailService.sendEmail({
          to: txResult.recipients,
          subject: `Quotation Action Requested: ${txResult.quotationTitle}`,
          html
        });
      }
    } catch (error) {
      logger.error('Failed to send quotation action request notification', {
        quotationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    logger.info(`OTP ${txResult.otpCode} generated for quotation ${quotationId} action ${action} for user ${userId}`);

    return {
      message: emailSent ? 
        "OTP sent to your registered email address" : 
        "OTP generated but email delivery failed. Please contact support.",
      expiresAt: txResult.expiresAt,
      quotationId,
      action: action.toUpperCase()
    };
  }

  /**
   * Confirm quotation action with OTP
   */
  async confirmQuotationAction(userId: string, quotationId: string, otp: string) {
    const userAccess = await this.getUserAccess(userId);

    if (!/^\d{6}$/.test(otp)) {
      throw new AppError("Invalid OTP format", 400, "INVALID_OTP");
    }

    // Store client user details for email sending after transaction
    let newClientUser: { email: string; firstName: string; lastName: string; tempPassword: string } | null = null;

    const result = await prisma.$transaction(async (tx) => {
      // Find valid OTP
      const otpRecord = await tx.quotationOtp.findFirst({
        where: {
          quotationId,
          userId,
          otpCode: otp,
          isUsed: false,
          expiresAt: {
            gt: new Date() // Not expired
          }
        }
      });

      if (!otpRecord) {
        // Increment attempts for tracking
        await tx.quotationOtp.updateMany({
          where: {
            quotationId,
            userId,
            otpCode: otp
          },
          data: {
            attempts: {
              increment: 1
            }
          }
        });
        
        throw new AppError("Invalid or expired OTP", 400, "INVALID_OTP");
      }

      // Mark OTP as used
      await tx.quotationOtp.update({
        where: { id: otpRecord.id },
        data: {
          isUsed: true,
          usedAt: new Date()
        }
      });

      // Determine new status based on action
      const newStatus = otpRecord.actionType === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';

      // Check if quotation exists and user has access
      const quotation = await tx.quotation.findFirst({
        where: {
          id: quotationId,
          lead: {
            organizationId: userAccess.organizationId
          },
          status: 'SENT'
        }
      });

      if (!quotation) {
        throw new AppError("Quotation not found or cannot be modified", 404, "QUOTATION_NOT_FOUND");
      }

      // Update quotation status
      const updatedQuotation = await tx.quotation.update({
        where: { id: quotationId },
        data: {
          status: newStatus,
          statusChangedAt: new Date(),
          statusChangedBy: userId,
          client_notes: `Action: ${otpRecord.actionType} via OTP verification`
        }
      });

      // Create quotation action record for audit trail
      await tx.quotationAction.create({
        data: {
          quotationId,
          userId,
          action: otpRecord.actionType,
          ipAddress: 'client-portal',
          userAgent: 'client-portal'
        }
      });

      // GDP-134: Create a client user at the time of quotation acceptance
      if (otpRecord.actionType === 'ACCEPT') {
        // Get lead and organization details
        const lead = await tx.lead.findUnique({
          where: { id: quotation.leadId },
          include: {
            organization: true,
            contact: true
          }
        });

        if (lead && lead.organization) {
          // Check if client user already exists for this organization
          const existingClientUser = await tx.user.findFirst({
            where: {
              organizationId: lead.organization.id,
              userType: 'CLIENT',
              isActive: true
            }
          });

          if (!existingClientUser) {
            // Use contact details if available, otherwise use lead details
            const contactEmail = lead.contact?.email || lead.contactEmail;
            const contactFirstName = lead.contact?.firstName || lead.contactName?.split(' ')[0] || 'Client';
            const contactLastName = lead.contact?.lastName || lead.contactName?.split(' ').slice(1).join(' ') || 'User';
            const contactPhone = lead.contact?.phone || lead.contactPhone;

            if (contactEmail) {
              // Check if user with this email already exists
              const existingUser = await tx.user.findUnique({
                where: { email: contactEmail }
              });

              if (!existingUser) {
                // Generate temporary password
                const bcrypt = require('bcrypt');
                const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
                const hashedPassword = await bcrypt.hash(tempPassword, 10);

                // Create client user
                const clientUser = await tx.user.create({
                  data: {
                    email: contactEmail,
                    password: hashedPassword,
                    firstName: contactFirstName,
                    lastName: contactLastName,
                    phone: contactPhone,
                    userType: 'CLIENT',
                    organizationId: lead.organization.id,
                    leadId: lead.id,
                    isActive: true,
                    isVerified: false
                  }
                });

                logger.info(`Client user created for organization ${lead.organization.id}: ${clientUser.email}`);

                // Store client user details for email sending after transaction
                newClientUser = {
                  email: clientUser.email,
                  firstName: clientUser.firstName,
                  lastName: clientUser.lastName,
                  tempPassword: tempPassword
                };
              } else {
                logger.info(`User with email ${contactEmail} already exists, skipping client user creation`);
              }
            } else {
              logger.warn(`No contact email found for lead ${lead.id}, cannot create client user`);
            }
          } else {
            logger.info(`Client user already exists for organization ${lead.organization.id}`);
          }
        }
      }

      logger.info(`Quotation ${quotationId} ${otpRecord.actionType.toLowerCase()}ed by user ${userId}`);

      return {
        message: `Quotation ${otpRecord.actionType.toLowerCase()}ed successfully`,
        quotation: {
          id: quotationId,
          status: newStatus,
          statusChangedAt: updatedQuotation.statusChangedAt,
          action: otpRecord.actionType
        }
      };
    });

    // Send welcome email with credentials if a new client user was created
    if (newClientUser) {
      try {
        const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const htmlContent = getUserCreatedTemplate({
          firstName: newClientUser.firstName,
          lastName: newClientUser.lastName,
          email: newClientUser.email,
          password: newClientUser.tempPassword,
          loginUrl: `${loginUrl}/login`
        });

        const textContent = getUserCreatedText({
          firstName: newClientUser.firstName,
          lastName: newClientUser.lastName,
          email: newClientUser.email,
          password: newClientUser.tempPassword,
          loginUrl: `${loginUrl}/login`
        });

        await this.emailService.sendEmail({
          to: newClientUser.email,
          subject: 'Welcome to Greenex - Your Account Credentials',
          html: htmlContent,
          text: textContent
        });

        logger.info(`Welcome email sent to new client user: ${newClientUser.email}`);
      } catch (emailError) {
        logger.error('Failed to send welcome email to client user:', emailError);
        // Don't throw error - user was created successfully, email is secondary
      }
    }

    return result;
  }

  /**
   * Send OTP email to user
   */
  private async sendOTPEmail(data: {
    email: string;
    name: string;
    otpCode: string;
    action: string;
    quotationTitle: string;
    organizationName: string;
  }): Promise<boolean> {
    const subject = `OTP for Quotation ${data.action} - ${data.quotationTitle}`;

    const html = getOTPVerificationTemplate({
      name: data.name,
      otpCode: data.otpCode,
      action: data.action,
      quotationTitle: data.quotationTitle,
      organizationName: data.organizationName,
      expiryMinutes: 10
    });

    const text = getOTPVerificationText({
      name: data.name,
      otpCode: data.otpCode,
      action: data.action,
      quotationTitle: data.quotationTitle,
      organizationName: data.organizationName,
      expiryMinutes: 10
    });

    return this.emailService.sendEmail({
      to: data.email,
      subject,
      html,
      text
    });
  }

  /**
   * Confirm meeting attendance
   */
  async confirmMeetingAttendance(userId: string, meetingId: string, attending: boolean) {
    await this.getUserAccess(userId);
    
    logger.info(`Meeting ${meetingId} attendance response by user ${userId}: ${attending}`);
    
    return {
      message: `Meeting attendance ${attending ? 'confirmed' : 'declined'} successfully`,
      attending
    };
  }
}