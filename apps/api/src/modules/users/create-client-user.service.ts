import prisma from '../../config/database';
import * as bcrypt from 'bcryptjs';
import { AppError } from '../../middleware/error.middleware';

interface CreateClientUserRequest {
  organizationId?: string;
  leadId?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password?: string; // Optional - will generate if not provided
  sendWelcomeEmail?: boolean;
}

interface CreateClientUserResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    userType: string;
    organizationId?: string;
    leadId?: string;
    organization?: {
      id: string;
      name: string;
      type: string;
    };
    lead?: {
      id: string;
      title: string;
    };
  };
  temporaryPassword?: string;
}

class CreateClientUserService {

  /**
   * Check if a client user already exists for an organization
   * Returns existing user if found, null otherwise
   */
  async findExistingClientUser(organizationId: string): Promise<any | null> {
    return await prisma.user.findFirst({
      where: {
        organizationId,
        userType: 'CLIENT',
        isActive: true
      },
      include: {
        organization: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });
  }

  async createClientUser(
    data: CreateClientUserRequest,
    createdByUserId: string
  ): Promise<CreateClientUserResponse> {
    // Validate that either organizationId or leadId is provided
    if (!data.organizationId && !data.leadId) {
      throw new AppError('Either organizationId or leadId must be provided', 400, 'VALIDATION_ERROR');
    }

    // Check if user already exists by email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 400, 'USER_EXISTS');
    }

    // Validate organization exists if organizationId provided
    let organization = null;
    if (data.organizationId) {
      organization = await prisma.organization.findUnique({
        where: { id: data.organizationId }
      });

      if (!organization) {
        throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
      }
    }

    // Validate lead exists and get its organization if leadId provided
    let lead = null;
    if (data.leadId) {
      lead = await prisma.lead.findUnique({
        where: { id: data.leadId },
        include: { organization: true }
      });

      if (!lead) {
        throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
      }

      // If both leadId and organizationId provided, ensure they match
      if (data.organizationId && lead.organizationId !== data.organizationId) {
        throw new AppError('Lead does not belong to the specified organization', 400, 'LEAD_ORGANIZATION_MISMATCH');
      }

      organization = lead.organization;
    }

    // Generate password if not provided
    const temporaryPassword = data.password || this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Get client role
    const clientRole = await prisma.role.findUnique({
      where: { name: 'Client User' }
    });

    if (!clientRole) {
      throw new AppError('Client User role not found', 500, 'ROLE_NOT_FOUND');
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the client user
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          userType: 'CLIENT',
          organizationId: data.organizationId || lead?.organizationId,
          leadId: data.leadId,
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

      // Log the creation
      console.log(`✅ Client user created: ${newUser.email} for organization: ${organization?.name || 'Unknown'}`);

      return newUser;
    });

    // Prepare response
    const response: CreateClientUserResponse = {
      user: {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        phone: result.phone || undefined,
        userType: result.userType,
        organizationId: result.organizationId || undefined,
        leadId: result.leadId || undefined,
        organization: result.organization ? {
          id: result.organization.id,
          name: result.organization.name,
          type: result.organization.type,
        } : undefined,
        lead: result.lead ? {
          id: result.lead.id,
          title: result.lead.title,
        } : undefined,
      }
    };

    // Include temporary password if it was generated
    if (!data.password) {
      response.temporaryPassword = temporaryPassword;
    }

    // TODO: Send welcome email if requested
    if (data.sendWelcomeEmail) {
      await this.sendWelcomeEmail(result, temporaryPassword);
    }

    return response;
  }

  private generateTemporaryPassword(): string {
    // Generate a secure temporary password
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private async sendWelcomeEmail(user: any, temporaryPassword: string): Promise<void> {
    try {
      // Import email service and template
      const { EmailService } = require('../email/email.service');
      const { getUserCreatedTemplate, getUserCreatedText } = require('../email/templates/user.template');

      const emailService = new EmailService();

      const html = getUserCreatedTemplate({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: temporaryPassword,
        loginUrl: process.env.FRONTEND_URL || 'https://app.greenex.com'
      });

      const text = getUserCreatedText({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: temporaryPassword,
        loginUrl: process.env.FRONTEND_URL || 'https://app.greenex.com'
      });

      await emailService.sendEmail({
        to: user.email,
        subject: 'Welcome to Greenex Client Portal - Your Login Credentials',
        html,
        text
      });

      console.log(`✅ Welcome email sent to ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${user.email}:`, error);
      throw error; // Re-throw to let caller handle it
    }
  }

  async getClientUsers(organizationId?: string): Promise<any[]> {
    const where: any = {
      userType: 'CLIENT',
      isActive: true,
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return await prisma.user.findMany({
      where,
      include: {
        organization: true,
        lead: {
          select: {
            id: true,
            title: true,
          }
        },
        roles: {
          include: {
            role: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async updateClientUser(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      isActive?: boolean;
    }
  ): Promise<any> {
    // Verify user is a client user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser || existingUser.userType !== 'CLIENT') {
      throw new AppError('Client user not found', 404, 'CLIENT_USER_NOT_FOUND');
    }

    return await prisma.user.update({
      where: { id: userId },
      data,
      include: {
        organization: true,
        lead: true,
      }
    });
  }

  async deactivateClientUser(userId: string): Promise<void> {
    // Verify user is a client user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser || existingUser.userType !== 'CLIENT') {
      throw new AppError('Client user not found', 404, 'CLIENT_USER_NOT_FOUND');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      }
    });

    console.log(`✅ Client user deactivated: ${existingUser.email}`);
  }
}

export const createClientUserService = new CreateClientUserService();