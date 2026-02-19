import { AppError } from "../../middleware/error.middleware";
import prisma from "../../config/database";
import { createPaginationMeta } from "../../utils/response";
import { EmailService } from "../email/email.service";
import { logger } from "../../utils/logger";

export interface CreateLeadRequest {
  organizationId?: string;
  contactId?: string;
  // SRS 5.1.1 - Simplified Lead Sources: Mobile App or Manual entry only
  source: "MOBILE_APP" | "MANUAL";
  title: string;
  description?: string;
  estimatedValue?: number;
  probability?: number;
  expectedCloseDate?: Date;
  notes?: string;
  // For leads from mobile app without existing organization
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPosition?: string;
  serviceRequired?: string;
  message?: string;
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {
  // SRS 5.1.1 - Simplified Lead Status: Only 3 states
  status?: "NEW" | "IN_PROGRESS" | "CLOSED";
  actualCloseDate?: Date;
}

export interface LeadQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  source?: string;
  organizationId?: string;
  assignedTo?: number;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface DeleteLeadOptions {
  deletedById?: string;
}

export class LeadsService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async create(data: CreateLeadRequest) {
    let organizationId = data.organizationId;
    let contactId = data.contactId;

    // If lead comes from mobile app without existing organization/contact
    if (!organizationId && data.companyName) {
      // Check if organization exists
      const existingOrg = await prisma.organization.findFirst({
        where: {
          name: data.companyName,
          isActive: true,
          isDeleted: false,
        },
      });

      if (existingOrg) {
        organizationId = existingOrg.id;
      } else {
        // Create new organization
        const newOrg = await prisma.organization.create({
          data: {
            name: data.companyName,
            type: "PROSPECT",
            email: data.contactEmail,
            phone: data.contactPhone,
            isActive: true,
            isDeleted: false,
          },
        });
        organizationId = newOrg.id;
      }
    }

    // Create contact if contact information is provided (regardless of organizationId source)
    if (organizationId && data.contactName && data.contactEmail) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          organizationId,
          email: data.contactEmail,
          isActive: true,
          isDeleted: false,
        },
      });

      if (!existingContact) {
        const nameParts = data.contactName.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const newContact = await prisma.contact.create({
          data: {
            organizationId,
            firstName,
            lastName,
            email: data.contactEmail,
            phone: data.contactPhone,
            position: data.contactPosition || undefined, // Add position if provided
            isPrimary: true,
            isActive: true,
            isDeleted: false,
          },
        });
        contactId = newContact.id;
      } else {
        contactId = existingContact.id;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId: organizationId!,
        contactId: contactId || null, // contactId can be null if no contact created
        source: data.source,
        status: "NEW",
        title: data.title,
        description: data.description || data.message,
        estimatedValue: data.estimatedValue
          ? Number(data.estimatedValue)
          : null,
        probability: data.probability,
        expectedCloseDate: data.expectedCloseDate,
        notes: data.notes,
        isDeleted: false,
        // Store contact info directly on Lead as well (for fallback when no Contact record)
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        contactPosition: data.contactPosition,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
            email: true,
            phone: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // SRS 5.1.5 - Send email notifications for mobile app enquiries
    if (data.source === "MOBILE_APP" && data.contactName && data.contactEmail) {
      const enquiryData = {
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        companyName: data.companyName,
        serviceRequired: data.serviceRequired,
        message: data.message || data.description,
        submittedAt: new Date(),
      };

      try {
        // Send notification to sales team
        await this.emailService.notifySalesTeamOfEnquiry(enquiryData);

        // Send acknowledgment to client
        await this.emailService.sendEnquiryAcknowledgment(enquiryData);

        logger.info("Email notifications sent for mobile app enquiry", {
          leadId: lead.id,
          contactEmail: data.contactEmail,
        });
      } catch (error) {
        logger.error(
          "Failed to send email notifications for mobile app enquiry",
          {
            leadId: lead.id,
            contactEmail: data.contactEmail,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        );
        // Don't fail the lead creation if email fails
      }
    }

    return lead;
  }

  async lookup() {
    return prisma.lead.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        title: true,
        status: true,
        organization: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { title: "asc" },
    });
  }

  async findMany(options: LeadQueryOptions = {}) {
    const {
      page = 1,
      pageSize = 10,
      search,
      status,
      source,
      organizationId,
      createdFrom,
      createdTo,
    } = options;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: any = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        {
          organization: {
            name: { contains: search, mode: "insensitive" },
            isDeleted: false,
          },
        },
        {
          contact: {
            isDeleted: false,
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) {
        where.createdAt.gte = createdFrom;
      }
      if (createdTo) {
        where.createdAt.lte = createdTo;
      }
    }

    // Get leads with related data
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              type: true,
              industry: true,
              email: true,
              phone: true,
            },
          },
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              position: true,
            },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    const meta = createPaginationMeta(page, pageSize, total);

    return {
      leads,
      meta,
    };
  }

  async findById(id: string) {
    const lead = await prisma.lead.findFirst({
      where: { id, isDeleted: false },
      include: {
        organization: {
          include: {
            contacts: {
              where: { isActive: true, isDeleted: false },
              orderBy: { isPrimary: "desc" },
            },
          },
        },
        contact: true,
      },
    });

    if (!lead) {
      throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
    }

    return lead;
  }

  async update(id: string, data: UpdateLeadRequest) {
    // Check if lead exists
    const existingLead = await prisma.lead.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingLead) {
      throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
    }

    // Validate status transition if status is being updated
    if (data.status && data.status !== existingLead.status) {
      this.validateStatusTransition(existingLead.status, data.status);
    }

    // Extract valid lead fields only (exclude contact and organization fields)
    const leadUpdateData: any = {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status && { status: data.status }),
      ...(data.source && { source: data.source }),
      ...(data.probability !== undefined && {
        probability: data.probability ? Number(data.probability) : null,
      }),
      ...(data.expectedCloseDate !== undefined && {
        expectedCloseDate: data.expectedCloseDate,
      }),
      ...(data.actualCloseDate !== undefined && {
        actualCloseDate: data.actualCloseDate,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    };

    // Convert estimatedValue to number if provided
    if (data.estimatedValue !== undefined) {
      leadUpdateData.estimatedValue = data.estimatedValue
        ? Number(data.estimatedValue)
        : null;
    }

    // Set actual close date if status is being closed
    if (data.status && data.status === "CLOSED") {
      leadUpdateData.actualCloseDate = data.actualCloseDate || new Date();
    }

    // Handle organization change if organizationId is provided
    if (
      data.organizationId &&
      data.organizationId !== existingLead.organizationId
    ) {
      leadUpdateData.organizationId = data.organizationId;
      leadUpdateData.contactId = null; // Reset contact when organization changes
    }

    // Update contact information if provided
    let contactId = existingLead.contactId;
    if (
      existingLead.organizationId &&
      (data.contactName || data.contactEmail)
    ) {
      // Update or create contact for the existing organization
      if (data.contactName && data.contactEmail) {
        const contactData = {
          organizationId: data.organizationId || existingLead.organizationId,
          firstName: data.contactName.split(" ")[0] || "",
          lastName: data.contactName.split(" ").slice(1).join(" ") || "",
          email: data.contactEmail,
          phone: data.contactPhone || null,
          position: data.contactPosition || null,
          isPrimary: true,
          isActive: true,
          isDeleted: false,
        };

        if (contactId) {
          // Update existing contact
          await prisma.contact.update({
            where: { id: contactId },
            data: contactData,
          });
        } else {
          // Create new contact
          const newContact = await prisma.contact.create({
            data: contactData,
          });
          contactId = newContact.id;
          leadUpdateData.contactId = contactId;
        }
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: leadUpdateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
            email: true,
            phone: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return lead;
  }

  async delete(id: string, options: DeleteLeadOptions = {}) {
    // Check if lead exists
    const lead = await prisma.lead.findFirst({
      where: { id, isDeleted: false },
    });

    if (!lead) {
      throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
    }

    await prisma.lead.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: options.deletedById ?? null,
      },
    });

    return { message: "Lead deleted successfully" };
  }

  async getStats() {
    const [
      totalLeads,
      newLeads,
      inProgressLeads,
      closedLeads,
      conversionRate,
      avgDealSize,
      recentLeads,
      leadsBySource,
    ] = await Promise.all([
      prisma.lead.count({ where: { isDeleted: false } }),
      prisma.lead.count({ where: { status: "NEW", isDeleted: false } }),
      prisma.lead.count({ where: { status: "IN_PROGRESS", isDeleted: false } }),
      prisma.lead.count({ where: { status: "CLOSED", isDeleted: false } }),
      // Calculate conversion rate (closed leads as a percentage of total leads)
      prisma.lead
        .count({ where: { status: "CLOSED", isDeleted: false } })
        .then((closed) => {
          return prisma.lead
            .count({ where: { isDeleted: false } })
            .then((total) =>
              total > 0 ? Math.round((closed / total) * 100) : 0
            );
        }),

      // Calculate average deal size for closed leads
      prisma.lead
        .aggregate({
          where: {
            status: "CLOSED",
            estimatedValue: { not: null },
            isDeleted: false,
          },
          _avg: {
            estimatedValue: true,
          },
        })
        .then((result) => result._avg.estimatedValue || 0),

      // Recent leads
      prisma.lead.findMany({
        where: { isDeleted: false },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      }),

      // Leads by source
      prisma.lead.groupBy({
        by: ["source"],
        where: { isDeleted: false },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      }),
    ]);

    return {
      totalLeads,
      byStatus: {
        new: newLeads,
        inProgress: inProgressLeads,
        closed: closedLeads,
      },
      conversionRate,
      avgDealSize,
      recentLeads,
      leadsBySource,
    };
  }

  private validateStatusTransition(currentStatus: any, newStatus: string) {
    // SRS 5.1.1 - Simplified 3-status transition logic
    const allowedTransitions: Record<string, string[]> = {
      NEW: ["IN_PROGRESS", "CLOSED"],
      IN_PROGRESS: ["CLOSED"],
      CLOSED: ["IN_PROGRESS"], // Allow reopening closed leads if needed
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new AppError(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
        400,
        "INVALID_STATUS_TRANSITION"
      );
    }
  }
}