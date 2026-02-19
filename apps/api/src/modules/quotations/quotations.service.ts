import { PrismaClient, Quotation, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';
import prisma from '../../config/database';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EmailService } from '../email/email.service';
import {
  getQuotationCreatedTemplate,
  getQuotationStatusUpdatedTemplate,
  getQuotationActionRequestedTemplate,
  getQuotationDeletedTemplate,
} from '../email/templates/quotation.template';

export class QuotationsService {
  private emailService = new EmailService();
  constructor(private prisma: PrismaClient) {}

  /**
   * Extract contact information from quotation
   * Handles both Contact relation and embedded Lead contact fields
   * Also handles incomplete data by filling missing fields
   */
  private extractContactInfo(quotation: any): {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  } {
    const lead = quotation.lead;

    // Debug: Log all available lead fields
    logger.info('DEBUG: extractContactInfo - Lead data', {
      quotationId: quotation.id,
      hasLead: !!lead,
      hasContactRelation: !!lead?.contact,
      contactRelationEmail: lead?.contact?.email || 'N/A',
      contactRelationFirstName: lead?.contact?.firstName || 'N/A',
      contactRelationLastName: lead?.contact?.lastName || 'N/A',
      embeddedContactEmail: lead?.contactEmail || 'N/A',
      embeddedContactName: lead?.contactName || 'N/A',
      embeddedContactPhone: lead?.contactPhone || 'N/A'
    });

    // Collect data from all available sources
    let email: string | null = null;
    let firstName: string | null = null;
    let lastName: string | null = null;
    let phone: string | null = null;

    // Priority 1: Use Contact relation if available
    if (lead?.contact?.email) {
      logger.info('DEBUG: Contact relation has email, using it as primary source');
      email = lead.contact.email;
      firstName = lead.contact.firstName || null;
      lastName = lead.contact.lastName || null;
      phone = lead.contact.phone || null;
    }

    // Priority 2: Fill missing fields from embedded Lead contact fields
    if (lead?.contactEmail && !email) {
      email = lead.contactEmail;
    }
    if (lead?.contactPhone && !phone) {
      phone = lead.contactPhone;
    }

    // If firstName or lastName is missing, try to get from embedded contactName
    if ((!firstName || !lastName) && lead?.contactName) {
      const nameParts = lead.contactName.trim().split(/\s+/);
      logger.info('DEBUG: Parsing contactName to fill missing name fields', {
        contactName: lead.contactName,
        nameParts,
        currentFirstName: firstName,
        currentLastName: lastName
      });

      if (nameParts.length >= 2) {
        if (!firstName) firstName = nameParts[0];
        if (!lastName) lastName = nameParts.slice(1).join(' ');
      } else if (nameParts.length === 1 && nameParts[0]) {
        if (!firstName) firstName = nameParts[0];
        if (!lastName) lastName = nameParts[0]; // Use same name for both if only one provided
      }
    }

    // Final fallback: If we still have firstName but no lastName, use firstName as lastName
    if (firstName && !lastName) {
      logger.info('DEBUG: Using firstName as lastName fallback', { firstName });
      lastName = firstName;
    }

    logger.info('DEBUG: Final extracted contact info', {
      email,
      firstName,
      lastName,
      phone
    });

    return { email, firstName, lastName, phone };
  }

  /**
   * Validate if client user can be created for a quotation
   * Returns validation result with reason if not possible
   */
  private async validateClientUserCreation(
    quotation: any,
    tx: any
  ): Promise<{ canCreate: boolean; reason?: string; existingUser?: any; contactInfo?: any; clientRole?: any }> {
    // Extract contact info from quotation (handles both Contact relation and embedded fields)
    const contactInfo = this.extractContactInfo(quotation);

    // Check if contact has email
    if (!contactInfo.email) {
      return {
        canCreate: false,
        reason: 'Contact does not have an email address'
      };
    }

    const organizationId = quotation.lead.organizationId;

    // Check if client user already exists for this organization
    const existingClientUser = await tx.user.findFirst({
      where: {
        organizationId,
        userType: 'CLIENT',
        isActive: true
      }
    });

    if (existingClientUser) {
      return {
        canCreate: false,
        reason: 'Client user already exists for this organization',
        existingUser: existingClientUser
      };
    }

    // Check if user with this email already exists
    const existingUserByEmail = await tx.user.findUnique({
      where: { email: contactInfo.email }
    });

    if (existingUserByEmail) {
      return {
        canCreate: false,
        reason: `User with email ${contactInfo.email} already exists`
      };
    }

    // Check if Client User role exists - try multiple name variations for robustness
    let clientRole = await tx.role.findUnique({
      where: { name: 'Client User' }
    });

    // Fallback: Try case-insensitive search if exact match not found
    if (!clientRole) {
      logger.info('DEBUG: "Client User" role not found with exact match, trying case-insensitive search');
      const allRoles = await tx.role.findMany({
        where: {
          OR: [
            { name: { contains: 'client', mode: 'insensitive' } },
            { name: { contains: 'Client', mode: 'insensitive' } },
          ]
        }
      });

      logger.info('DEBUG: Found roles containing "client"', {
        roles: allRoles.map(r => ({ id: r.id, name: r.name }))
      });

      // Find the best match - prioritize "Client User" variations
      clientRole = allRoles.find(r =>
        r.name.toLowerCase() === 'client user' ||
        r.name.toLowerCase() === 'client_user' ||
        r.name.toLowerCase() === 'clientuser'
      ) || allRoles.find(r => r.name.toLowerCase().includes('client'));
    }

    if (!clientRole) {
      // Log all available roles for debugging
      const allRoles = await tx.role.findMany({
        select: { id: true, name: true }
      });
      logger.error('❌ Client User role not found in production database', {
        quotationId: quotation.id,
        availableRoles: allRoles.map(r => r.name),
        searchedFor: ['Client User', 'client user', 'client_user', 'clientuser']
      });
      return {
        canCreate: false,
        reason: `Client User role not found in the system. Available roles: ${allRoles.map(r => r.name).join(', ')}`
      };
    }

    logger.info('DEBUG: Found client role', { roleId: clientRole.id, roleName: clientRole.name });

    // Validate contact has required fields
    if (!contactInfo.firstName || !contactInfo.lastName) {
      return {
        canCreate: false,
        reason: `Contact must have first name and last name. Got: firstName="${contactInfo.firstName}", lastName="${contactInfo.lastName}"`
      };
    }

    return { canCreate: true, contactInfo, clientRole };
  }

  /**
   * Create client user when quotation is accepted (inside transaction)
   * IMPORTANT: This method is called inside a transaction and will throw errors
   * to ensure atomicity - if user creation fails, the quotation status update will be rolled back
   */
  private async createClientUserInTransaction(
    quotation: any,
    userId: string,
    tx: any
  ): Promise<{ user: any; temporaryPassword: string } | null> {
    // Extract contact info first for logging
    const contactInfo = this.extractContactInfo(quotation);

    logger.info('Starting client user creation on quotation acceptance', {
      quotationId: quotation.id,
      leadId: quotation.leadId,
      hasLead: !!quotation.lead,
      hasContactRelation: !!quotation.lead?.contact,
      hasEmbeddedContact: !!quotation.lead?.contactEmail,
      contactEmail: contactInfo.email || 'N/A',
      contactFirstName: contactInfo.firstName || 'N/A',
      contactLastName: contactInfo.lastName || 'N/A'
    });

    // Validate if client user can be created
    const validation = await this.validateClientUserCreation(quotation, tx);

    if (!validation.canCreate) {
      if (validation.existingUser) {
        // Non-critical: user already exists — this is acceptable
        logger.info('Client user already exists for organization, skipping creation', {
          quotationId: quotation.id,
          organizationId: quotation.lead.organizationId,
          existingUserId: validation.existingUser.id,
          existingUserEmail: validation.existingUser.email
        });
        return null;
      }

      // Critical failures: missing role, missing email, missing name
      // These indicate broken config or bad data — log as errors and throw
      // so the transaction rolls back and quotation does NOT get marked ACCEPTED
      logger.error('❌ CRITICAL: Client user creation failed validation on quotation acceptance', {
        quotationId: quotation.id,
        leadId: quotation.leadId,
        organizationId: quotation.lead?.organizationId,
        reason: validation.reason,
        contactEmail: contactInfo.email || 'MISSING',
        contactFirstName: contactInfo.firstName || 'MISSING',
        contactLastName: contactInfo.lastName || 'MISSING',
      });
      throw new Error(
        `Cannot accept quotation: client user creation failed — ${validation.reason}`
      );
    }

    // Use validated contact info and role from validation
    const validatedContactInfo = validation.contactInfo!;
    const clientRole = validation.clientRole!;
    const organizationId = quotation.lead.organizationId;

    // Generate temporary password
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let temporaryPassword = '';
    for (let i = 0; i < 12; i++) {
      temporaryPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    logger.info('Creating client user inside transaction', {
      organizationId,
      leadId: quotation.leadId,
      email: validatedContactInfo.email,
      firstName: validatedContactInfo.firstName,
      lastName: validatedContactInfo.lastName,
      roleId: clientRole.id,
      roleName: clientRole.name
    });

    try {
      // Create the client user inside the same transaction
      const newUser = await tx.user.create({
        data: {
          email: validatedContactInfo.email,
          password: hashedPassword,
          firstName: validatedContactInfo.firstName,
          lastName: validatedContactInfo.lastName,
          phone: validatedContactInfo.phone,
          userType: 'CLIENT',
          organizationId: organizationId,
          leadId: quotation.leadId,
          isActive: true,
          isVerified: true,
        },
        include: {
          organization: true,
          lead: true,
        }
      });

      // Assign client role
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: clientRole.id,
        }
      });

      logger.info('✅ CLIENT USER CREATED SUCCESSFULLY on quotation acceptance', {
        quotationId: quotation.id,
        userId: newUser.id,
        userEmail: newUser.email,
        organizationId,
        temporaryPassword: 'Generated'
      });

      return { user: newUser, temporaryPassword };
    } catch (error) {
      // Log detailed error information for debugging production issues
      logger.error('❌ FAILED TO CREATE CLIENT USER in transaction', {
        quotationId: quotation.id,
        organizationId,
        leadId: quotation.leadId,
        email: validatedContactInfo.email,
        firstName: validatedContactInfo.firstName,
        lastName: validatedContactInfo.lastName,
        roleId: clientRole.id,
        roleName: clientRole.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      // Re-throw to ensure transaction is rolled back
      throw error;
    }
  }

  /**
   * Send welcome email to newly created client user (outside transaction)
   */
  private async sendClientWelcomeEmail(
    user: any,
    temporaryPassword: string,
    quotationId: string
  ): Promise<void> {
    try {
      const { getUserCreatedTemplate, getUserCreatedText } = require('../email/templates/user.template');

      const loginUrl = process.env.FRONTEND_URL || 'https://app.greenex.com';

      logger.info('Preparing welcome email for client user', {
        quotationId,
        userId: user.id,
        userEmail: user.email,
        loginUrl,
      });

      const html = getUserCreatedTemplate({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: temporaryPassword,
        loginUrl,
      });

      const text = getUserCreatedText({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: temporaryPassword,
        loginUrl,
      });

      const emailSent = await this.emailService.sendEmail({
        to: user.email,
        subject: 'Welcome to Greenex Client Portal - Your Login Credentials',
        html,
        text
      });

      if (emailSent) {
        logger.info('✅ Welcome email sent to client user', {
          quotationId,
          userId: user.id,
          userEmail: user.email,
        });
      } else {
        // sendEmail returned false — it logged the error internally
        logger.error('❌ Welcome email failed to send (sendEmail returned false)', {
          quotationId,
          userId: user.id,
          userEmail: user.email,
          smtpHost: process.env.SMTP_HOST || 'NOT_SET',
          smtpUser: process.env.SMTP_USER ? 'SET' : 'NOT_SET',
        });
      }
    } catch (error) {
      // Log error but don't fail - email is non-critical
      logger.error('❌ Exception while sending welcome email to client user', {
        quotationId,
        userId: user.id,
        userEmail: user.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  // SRS 5.2.1 - Upload Quotation PDF
  async uploadQuotation(
    leadId: string,
    uploadedBy: string,
    quotationData: {
      title: string;
      amount?: number;
      notes?: string;
      file?: {
        filename: string;
        originalname: string;
        size: number;
        path: string;
      };
    }
  ): Promise<Quotation> {
    return await this.prisma.$transaction(async (tx) => {
      // Verify lead exists and is active
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
        include: { organization: true }
      });

      if (!lead || lead.isDeleted) {
        throw new Error('Lead not found or inactive');
      }

      if (lead.businessStage === 'COMPLETED' || lead.businessStage === 'REJECTED') {
        throw new Error('Cannot upload quotation for completed or rejected leads');
      }

      // Create quotation record
      const quotation = await tx.quotation.create({
        data: {
          lead: { connect: { id: leadId } },
          quotation_number: `QUO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: quotationData.title,
          amount: quotationData.amount ? new Prisma.Decimal(quotationData.amount) : null,
          notes: quotationData.notes,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          documentPath: quotationData.file?.path,
          originalFileName: quotationData.file?.originalname,
          fileSize: quotationData.file?.size,
          uploader: uploadedBy ? { connect: { id: uploadedBy } } : undefined,
          status: 'UPLOADED',
        },
        include: {
          lead: {
            include: {
              organization: true,
              contact: true
            }
          },
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Update lead stage if this is first quotation
      const quotationCount = await tx.quotation.count({
        where: { 
          leadId,
          isDeleted: false 
        }
      });

      if (quotationCount === 1) {
        await tx.lead.update({
          where: { id: leadId },
          data: {
            businessStage: 'QUOTATION_SENT',
            stageChangedAt: new Date(),
            stageChangedById: uploadedBy
          }
        });
      }

      logger.info('Quotation uploaded successfully', {
        quotationId: quotation.id,
        leadId,
        uploadedBy,
        title: quotationData.title
      });

      // Send notification to lead/contact/organization about new quotation
      try {
        const recipients: string[] = [];
        if (quotation.lead?.contact?.email) recipients.push(quotation.lead.contact.email);
        if (quotation.lead?.organization?.email && !quotation.lead?.contact?.email) recipients.push(quotation.lead.organization.email);

        const uniqueRecipients = [...new Set(recipients)];

        if (uniqueRecipients.length > 0) {
          const html = getQuotationCreatedTemplate({
            title: quotation.title,
            amount: quotation.amount ? quotation.amount.toString() : null,
            currency: quotation.currency || undefined,
            validUntil: quotation.valid_until || undefined,
            uploaderName: quotation.uploader ? `${quotation.uploader.firstName || ''} ${quotation.uploader.lastName || ''}`.trim() : undefined
          });

          await this.emailService.sendEmail({
            to: uniqueRecipients,
            subject: `New Quotation: ${quotation.title}`,
            html
          });
        }
      } catch (error) {
        logger.error('Failed to send quotation uploaded email', {
          quotationId: quotation.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return quotation;
    });
  }

  // SRS 5.2.3 - Update quotation status
  async updateQuotationStatus(
    quotationId: string,
    newStatus: 'SENT' | 'ACCEPTED' | 'REJECTED',
    userId: string,
    notes?: string
  ): Promise<Quotation> {
    // Store created client user info for welcome email (sent after transaction)
    let createdClientUser: { user: any; temporaryPassword: string } | null = null;

    // ATOMIC TRANSACTION: Update quotation status AND create client user together
    // If client user creation fails, the entire transaction will be rolled back
    const updatedQuotation = await this.prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({
        where: { id: quotationId },
        include: {
          lead: {
            include: {
              organization: true,
              contact: true  // Include contact for client user creation validation
            }
          }
        }
      });

      if (!quotation || quotation.isDeleted) {
        throw new Error('Quotation not found');
      }

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        'UPLOADED': ['SENT', 'ACCEPTED', 'REJECTED'],
        'SENT': ['ACCEPTED', 'REJECTED'],
        'ACCEPTED': [], // Final state
        'REJECTED': []  // Final state
      };

      if (!validTransitions[quotation.status]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${quotation.status} to ${newStatus}`);
      }

      // Update quotation
      const updatedQuotation = await tx.quotation.update({
        where: { id: quotationId },
        data: {
          status: newStatus,
          statusChangedBy: userId,
          statusChangedAt: new Date(),
          sentAt: newStatus === 'SENT' ? new Date() : quotation.sentAt,
          notes: notes ? `${quotation.notes || ''}\n\nStatus Update: ${notes}`.trim() : quotation.notes
        },
        include: {
          lead: {
            include: {
              organization: true,
              contact: true
            }
          },
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          statusChanger: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Update lead stage based on quotation status
      let leadStage = quotation.lead.businessStage;
      if (newStatus === 'ACCEPTED') {
        leadStage = 'QUOTATION_ACCEPTED';
      } else if (newStatus === 'REJECTED') {
        leadStage = 'QUOTATION_REJECTED';
      } else if (newStatus === 'SENT') {
        leadStage = 'QUOTATION_SENT';
      }

      await tx.lead.update({
        where: { id: quotation.leadId },
        data: {
          businessStage: leadStage,
          stageChangedAt: new Date(),
          stageChangedById: userId
        }
      });

      // SRS 5.2.3 - Create client user when quotation is accepted (INSIDE TRANSACTION for atomicity)
      // If client user creation fails due to missing data/config, the entire transaction rolls back
      // If client user already exists, creation is skipped gracefully (returns null)
      if (newStatus === 'ACCEPTED') {
        logger.info('Quotation ACCEPTED — attempting client user creation', {
          quotationId,
          leadId: quotation.leadId,
          organizationId: quotation.lead?.organizationId,
          contactEmail: quotation.lead?.contact?.email || quotation.lead?.contactEmail || 'NONE',
        });
        createdClientUser = await this.createClientUserInTransaction(updatedQuotation, userId, tx);
      }

      logger.info('Quotation status updated successfully', {
        quotationId,
        oldStatus: quotation.status,
        newStatus,
        leadId: quotation.leadId,
        updatedBy: userId,
        clientUserCreated: !!createdClientUser,
        clientUserEmail: createdClientUser?.user?.email || null,
      });

      return updatedQuotation;
    });

    // After transaction completes successfully, send emails (non-critical operations)
    // Email failures should NOT affect the transaction result

    // Send notification about status change
    try {
      const recipients: string[] = [];
      if (updatedQuotation.uploader?.email) recipients.push(updatedQuotation.uploader.email);
      if (updatedQuotation.lead?.contact?.email) recipients.push(updatedQuotation.lead.contact.email);
      if (updatedQuotation.lead?.organization?.email && !updatedQuotation.lead?.contact?.email) recipients.push(updatedQuotation.lead.organization.email);

      const uniqueRecipients = [...new Set(recipients)];

      if (uniqueRecipients.length > 0) {
        const html = getQuotationStatusUpdatedTemplate({
          title: updatedQuotation.title,
          oldStatus: updatedQuotation.status, // This will be the old status from the quotation object
          newStatus: newStatus,
          changedBy: updatedQuotation.statusChanger ? `${updatedQuotation.statusChanger.firstName || ''} ${updatedQuotation.statusChanger.lastName || ''}`.trim() : undefined,
          notes: updatedQuotation.notes || undefined
        });

        await this.emailService.sendEmail({
          to: uniqueRecipients,
          subject: `Quotation ${newStatus}: ${updatedQuotation.title}`,
          html
        });
      }
    } catch (error) {
      logger.error('Failed to send quotation status email', {
        quotationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Send welcome email to newly created client user (outside transaction, non-critical)
    if (createdClientUser) {
      await this.sendClientWelcomeEmail(
        createdClientUser.user,
        createdClientUser.temporaryPassword,
        quotationId
      );
    }

    return updatedQuotation;
  }

  // Get all quotations with filters (SRS 5.2.7)
  async getAllQuotations(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    leadId?: string;
    organizationId?: string;
    uploadedBy?: string;
    fromDate?: Date;
    toDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    userId?: string; // For data isolation
    userOrganizationId?: string; // For client data isolation
  }): Promise<{ quotations: Quotation[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      status,
      leadId,
      organizationId,
      uploadedBy,
      fromDate,
      toDate,
      minAmount,
      maxAmount,
      userId,
      userOrganizationId
    } = options;

    const skip = (page - 1) * pageSize;

    const where: Prisma.QuotationWhereInput = {
      isDeleted: false,
      ...(status && { status }),
      ...(leadId && { leadId }),
      ...(uploadedBy && { uploadedBy }),
      ...(organizationId && {
        lead: { organizationId }
      }),
      // Data isolation: Client users can only see quotations for their organization
      ...(userOrganizationId && {
        lead: { organizationId: userOrganizationId }
      }),
      ...(fromDate || toDate) && {
        createdAt: {
          ...(fromDate && { gte: fromDate }),
          ...(toDate && { lte: toDate })
        }
      },
      ...(minAmount !== undefined || maxAmount !== undefined) && {
        amount: {
          ...(minAmount !== undefined && { gte: new Prisma.Decimal(minAmount) }),
          ...(maxAmount !== undefined && { lte: new Prisma.Decimal(maxAmount) })
        }
      }
    };

    const [quotations, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        include: {
          lead: {
            include: {
              organization: {
                select: { id: true, name: true, type: true }
              },
              contact: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          },
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          statusChanger: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.quotation.count({ where })
    ]);

    return { quotations, total };
  }

  // Get quotation by ID
  async getQuotationById(id: string, userOrganizationId?: string): Promise<Quotation | null> {
    const where: Prisma.QuotationWhereInput = {
      id,
      isDeleted: false,
      // Data isolation: Client users can only see quotations for their organization
      ...(userOrganizationId && {
        lead: { organizationId: userOrganizationId }
      })
    };

    return await this.prisma.quotation.findFirst({
      where,
      include: {
        lead: {
          include: {
            organization: true,
            contact: true
          }
        },
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        statusChanger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  // Get quotations by lead ID
  async getQuotationsByLead(leadId: string, userOrganizationId?: string): Promise<Quotation[]> {
    const where: Prisma.QuotationWhereInput = {
      leadId,
      isDeleted: false,
      // Data isolation: Client users can only see quotations for leads in their organization
      ...(userOrganizationId && {
        lead: { organizationId: userOrganizationId }
      })
    };

    return await this.prisma.quotation.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        statusChanger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Update quotation metadata (title, amount, notes)
  async updateQuotationMetadata(
    quotationId: string,
    userId: string,
    updates: {
      title?: string;
      amount?: number;
      notes?: string;
    }
  ): Promise<Quotation> {
    return await this.prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({
        where: { id: quotationId }
      });

      if (!quotation || quotation.isDeleted) {
        throw new Error('Quotation not found');
      }

      if (quotation.status === 'ACCEPTED' || quotation.status === 'REJECTED') {
        throw new Error('Cannot modify completed quotation');
      }

      const updatedQuotation = await tx.quotation.update({
        where: { id: quotationId },
        data: {
          ...(updates.title && { title: updates.title }),
          ...(updates.amount !== undefined && { 
            amount: updates.amount ? new Prisma.Decimal(updates.amount) : null 
          }),
          ...(updates.notes !== undefined && { notes: updates.notes }),
          updatedAt: new Date()
        },
        include: {
          lead: {
            include: {
              organization: true,
              contact: true
            }
          },
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      logger.info('Quotation metadata updated', {
        quotationId,
        updates,
        updatedBy: userId
      });

      return updatedQuotation;
    });
  }

  // Delete quotation (soft delete)
  async deleteQuotation(quotationId: string, userId: string): Promise<void> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        lead: { include: { organization: true, contact: true } },
        uploader: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    if (!quotation || quotation.isDeleted) {
      throw new Error('Quotation not found');
    }

    if (quotation.status === 'ACCEPTED') {
      throw new Error('Cannot delete accepted quotation');
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete quotation
      await tx.quotation.update({
        where: { id: quotationId },
        data: {
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      // Delete file if exists
      if (quotation.documentPath) {
        try {
          await fs.unlink(quotation.documentPath);
        } catch (error) {
          logger.warn('Failed to delete quotation file', {
            quotationId,
            filePath: quotation.documentPath,
            error: error
          });
        }
      }

      logger.info('Quotation deleted', {
        quotationId,
        leadId: quotation.leadId,
        deletedBy: userId
      });

      // Send notification email about deletion
      try {
        const recipients: string[] = [];
        if (quotation.uploader?.email) recipients.push(quotation.uploader.email);
        if (quotation.lead?.contact?.email) recipients.push(quotation.lead.contact.email);
        if (quotation.lead?.organization?.email && !quotation.lead?.contact?.email) recipients.push(quotation.lead.organization.email);

        const uniqueRecipients = [...new Set(recipients)];

        if (uniqueRecipients.length > 0) {
          const html = getQuotationDeletedTemplate({
            title: quotation.title,
            status: quotation.status
          });

          await this.emailService.sendEmail({
            to: uniqueRecipients,
            subject: `Quotation Deleted: ${quotation.title}`,
            html
          });
        }
      } catch (error) {
        logger.error('Failed to send quotation deletion email', {
          quotationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  // Get quotation statistics
  async getQuotationStats(userId?: string): Promise<{
    total: number;
    uploaded: number;
    sent: number;
    accepted: number;
    rejected: number;
    totalValue: number;
    acceptedValue: number;
  }> {
    const whereCondition: Prisma.QuotationWhereInput = {
      isDeleted: false,
      ...(userId && { uploadedBy: userId })
    };

    const [
      total,
      uploaded,
      sent,
      accepted,
      rejected,
      valueStats
    ] = await Promise.all([
      this.prisma.quotation.count({ where: whereCondition }),
      this.prisma.quotation.count({ where: { ...whereCondition, status: 'UPLOADED' } }),
      this.prisma.quotation.count({ where: { ...whereCondition, status: 'SENT' } }),
      this.prisma.quotation.count({ where: { ...whereCondition, status: 'ACCEPTED' } }),
      this.prisma.quotation.count({ where: { ...whereCondition, status: 'REJECTED' } }),
      this.prisma.quotation.aggregate({
        where: whereCondition,
        _sum: { amount: true }
      })
    ]);

    const acceptedValueStats = await this.prisma.quotation.aggregate({
      where: { ...whereCondition, status: 'ACCEPTED' },
      _sum: { amount: true }
    });

    return {
      total,
      uploaded,
      sent,
      accepted,
      rejected,
      totalValue: Number(valueStats._sum.amount || 0),
      acceptedValue: Number(acceptedValueStats._sum.amount || 0)
    };
  }
}

export default QuotationsService;