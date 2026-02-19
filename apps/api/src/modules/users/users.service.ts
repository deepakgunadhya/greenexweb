import { AppError } from "../../middleware/error.middleware";
import prisma from "../../config/database";
import { createPaginationMeta } from "../../utils/response";
import * as bcrypt from "bcryptjs";
import { EmailService } from "../email/email.service";
import { logger } from "../../utils/logger";

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleIds: string[];
  organizationId?: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  isVerified?: boolean;
  roleIds?: string[];
}

export interface UserQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export class UsersService {
  private readonly emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async create(data: CreateUserRequest) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError(
        "User already exists with this email",
        409,
        "USER_EXISTS"
      );
    }

    // Validate role IDs
    if (data.roleIds && data.roleIds.length > 0) {
      const validRoles = await prisma.role.count({
        where: { id: { in: data.roleIds } },
      });

      if (validRoles !== data.roleIds.length) {
        throw new AppError(
          "One or more invalid role IDs provided",
          400,
          "INVALID_ROLES"
        );
      }
    }

    // Validate organization ID if provided
    if (data.organizationId) {
      const org = await prisma.organization.findUnique({ where: { id: data.organizationId } });
      if (!org) {
        throw new AppError("Organization not found", 400, "INVALID_ORGANIZATION");
      }
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    // Create user with roles
    const createPayload: any = {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      isActive: true,
      isVerified: false,
      roles: {
        create: data.roleIds.map((roleId) => ({ roleId })),
      },
    };

    // Attach organization and userType for client users
    if (data.organizationId) {
      createPayload.organizationId = data.organizationId;
      createPayload.userType = "CLIENT"; // mark as client user
    }

    const user = await prisma.user.create({
      data: createPayload,
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    // Send credentials email (outside DB operation)
    try {
      // Import templates here to avoid potential circular imports
      const { getUserCreatedTemplate, getUserCreatedText } = require("../email/templates/user.template");
      const html = getUserCreatedTemplate({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        loginUrl: process.env.FRONTEND_URL || undefined,
      });

      const text = getUserCreatedText({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        loginUrl: process.env.FRONTEND_URL || undefined,
      });

      await this.emailService.sendEmail({
        to: data.email,
        subject: "Welcome to Greenex — Your account credentials",
        html,
        text,
      });
    } catch (err) {
      logger.warn("Failed to send user credentials email:", err);
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async findMany(options: UserQueryOptions = {}) {
    const {
      page = 1,
      pageSize = 10,
      search,
      role,
      isActive,
      isVerified,
    } = options;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.roles = {
        some: {
          role: {
            name: { contains: role, mode: "insensitive" },
          },
        },
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    // Get users with roles
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const meta = createPaginationMeta(page, pageSize, total);

    return {
      users,
      meta,
    };
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Extract permissions from roles
    const permissions = new Set<string>();
    user.roles.forEach((userRole) => {
      const rolePermissions = JSON.parse(
        userRole.role.permissions as string
      ) as string[];
      rolePermissions.forEach((permission) => permissions.add(permission));
    });

    return {
      ...user,
      permissions: Array.from(permissions),
    };
  }

  async update(id: string, data: UpdateUserRequest) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    });

    if (!existingUser) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== existingUser.email) {
      const duplicateUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (duplicateUser) {
        throw new AppError("Email already exists", 409, "EMAIL_EXISTS");
      }
    }

    // Validate role IDs if provided
    if (data.roleIds && data.roleIds.length > 0) {
      const validRoles = await prisma.role.count({
        where: { id: { in: data.roleIds } },
      });

      if (validRoles !== data.roleIds.length) {
        throw new AppError(
          "One or more invalid role IDs provided",
          400,
          "INVALID_ROLES"
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;

    // Update user with roles if provided
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        ...(data.roleIds && {
          roles: {
            deleteMany: {},
            create: data.roleIds.map((roleId) => ({ roleId })),
          },
        }),
      },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async delete(id: string) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignedTasks: true,
            createdTasks: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Check if user has dependencies
    if (user._count.assignedTasks > 0 || user._count.createdTasks > 0) {
      throw new AppError(
        "Cannot delete user with assigned tasks or created content",
        400,
        "USER_HAS_DEPENDENCIES"
      );
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: user.isActive ? false : true },
    });

    return { message: "User deleted successfully" };
  }

  async assignRoles(userId: string, roleIds: string[]) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Validate role IDs
    const validRoles = await prisma.role.count({
      where: { id: { in: roleIds } },
    });

    if (validRoles !== roleIds.length) {
      throw new AppError(
        "One or more invalid role IDs provided",
        400,
        "INVALID_ROLES"
      );
    }

    // Replace existing roles
    await prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          deleteMany: {},
          create: roleIds.map((roleId) => ({ roleId })),
        },
      },
    });

    return { message: "Roles assigned successfully" };
  }

  async getStats() {
    const [totalUsers, activeUsers, verifiedUsers, recentUsers, usersByRole] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isVerified: true } }),
        prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
            roles: {
              include: {
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        }),
        prisma.role.findMany({
          include: {
            _count: {
              select: {
                users: true,
              },
            },
          },
        }),
      ]);

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      inactiveUsers: totalUsers - activeUsers,
      unverifiedUsers: totalUsers - verifiedUsers,
      recentUsers,
      usersByRole: usersByRole.map((role) => ({
        roleName: role.name,
        userCount: role._count.users,
      })),
    };
  }
}
