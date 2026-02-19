import { AppError } from "../../middleware/error.middleware";
import prisma from "../../config/database";
import { createPaginationMeta } from "../../utils/response";
import { EmailService } from "../email/email.service";
import { getOrganizationCreatedTemplate } from "../email/templates/quotation.template";
import { logger } from "../../utils/logger";

export interface CreateOrganizationRequest {
  name: string;
  type: "CLIENT" | "PARTNER" | "VENDOR" | "PROSPECT";
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface UpdateOrganizationRequest extends Partial<CreateOrganizationRequest> {}

export interface OrganizationQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  industry?: string;
  isActive?: boolean;
}
export interface DeleteOrganizationOptions {
  deletedById?: string;
}

export class OrganizationsService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async create(data: CreateOrganizationRequest, createdById?: string) {
    // Check if organization with same name already exists
    const existingOrg = await prisma.organization.findFirst({
      where: {
        name: data.name,
        isActive: true,
        isDeleted: false,
      },
    });

    if (existingOrg) {
      throw new AppError(
        "Organization with this name already exists",
        409,
        "DUPLICATE_ORGANIZATION"
      );
    }

    const organization = await prisma.organization.create({
      data: {
        ...data,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
      },
      include: {
        _count: {
          select: {
            contacts: true,
            leads: true,
            projects: true,
          },
        },
      },
    });

    // Send organization created email to the provided organization email (if any)
    try {
      if (organization && organization.email) {
        const html = getOrganizationCreatedTemplate({
          name: organization.name,
          type: organization.type,
          industry: organization.industry,
          email: organization.email,
          phone: organization.phone,
          website: organization.website,
          city: organization.city,
          country: organization.country,
          isActive: organization.isActive
        });

        await this.emailService.sendEmail({
          to: [organization.email],
          subject: `Welcome to Greenex: ${organization.name}`,
          html
        });
      }
    } catch (error) {
      logger.error('Failed to send organization created email', {
        organizationId: organization.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return organization;
  }

  async lookup() {
    return prisma.organization.findMany({
      where: { isActive: true, isDeleted: false },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    });
  }

  async findMany(options: OrganizationQueryOptions = {}) {
    const {
      page = 1,
      pageSize = 10,
      search,
      type,
      industry,
      isActive = true,
    } = options;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: any = {
      isActive,
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (industry) {
      where.industry = { contains: industry, mode: "insensitive" };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Get organizations with counts
    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              contacts: true,
              leads: true,
              projects: true,
            },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    const meta = createPaginationMeta(page, pageSize, total);

    return {
      organizations,
      meta,
    };
  }

  async findById(id: string) {
    const organization = await prisma.organization.findFirst({
      where: { id, isActive: true, isDeleted: false },
      include: {
        contacts: {
          where: { isActive: true, isDeleted: false },
          orderBy: { isPrimary: "desc" },
        },
        _count: {
          select: {
            leads: true,
            projects: true,
          },
        },
      },
    });

    if (!organization) {
      throw new AppError(
        "Organization not found",
        404,
        "ORGANIZATION_NOT_FOUND"
      );
    }

    return organization;
  }

  async update(id: string, data: UpdateOrganizationRequest) {
    // Check if organization exists
    const existingOrg = await prisma.organization.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingOrg) {
      throw new AppError(
        "Organization not found",
        404,
        "ORGANIZATION_NOT_FOUND"
      );
    }

    // If name is being updated, check for duplicates
    if (data.name && data.name !== existingOrg.name) {
      const duplicateOrg = await prisma.organization.findFirst({
        where: {
          name: data.name,
          isActive: true,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (duplicateOrg) {
        throw new AppError(
          "Organization with this name already exists",
          409,
          "DUPLICATE_ORGANIZATION"
        );
      }
    }

    const organization = await prisma.organization.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            contacts: true,
            leads: true,
            projects: true,
          },
        },
      },
    });

    return organization;
  }

  async delete(id: string, options: { deletedById?: string }) {
    // Check if organization exists
    const organization = await prisma.organization.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: {
          select: {
            projects: { where: { status: { not: "COMPLETED" } } },
            leads: {
              where: { status: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new AppError(
        "Organization not found",
        404,
        "ORGANIZATION_NOT_FOUND"
      );
    }

    // Check if organization has active projects or leads
    if (organization._count.projects > 0 || organization._count.leads > 0) {
      throw new AppError(
        "Cannot delete organization with active projects or leads",
        400,
        "ORGANIZATION_HAS_DEPENDENCIES"
      );
    }

    // Soft delete by setting isActive to false
    await prisma.organization.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: options.deletedById ?? null,
        isActive: false,
      },
    });

    return { message: "Organization deleted successfully" };
  }

  async getStats() {
    const [
      totalOrganizations,
      clientCount,
      prospectCount,
      partnerCount,
      vendorCount,
      activeProjects,
      recentOrganizations,
    ] = await Promise.all([
      prisma.organization.count({
        where: { isActive: true, isDeleted: false },
      }),
      prisma.organization.count({
        where: { type: "CLIENT", isActive: true, isDeleted: false },
      }),
      prisma.organization.count({
        where: { type: "PROSPECT", isActive: true, isDeleted: false },
      }),
      prisma.organization.count({
        where: { type: "PARTNER", isActive: true, isDeleted: false },
      }),
      prisma.organization.count({
        where: { type: "VENDOR", isActive: true, isDeleted: false },
      }),
      prisma.project.count({
        where: {
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          organization: { isActive: true, isDeleted: false },
        },
      }),
      prisma.organization.findMany({
        where: { isActive: true, isDeleted: false },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          type: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalOrganizations,
      byType: {
        clients: clientCount,
        prospects: prospectCount,
        partners: partnerCount,
        vendors: vendorCount,
      },
      activeProjects,
      recentOrganizations,
    };
  }
}
