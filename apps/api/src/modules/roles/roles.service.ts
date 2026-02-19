import { AppError } from "../../middleware/error.middleware";
import prisma from "../../config/database";

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

// Define all available permissions in the system
export const AVAILABLE_PERMISSIONS = [
  // User management
  "users:read",
  "users:create",
  "users:update",
  "users:delete",

  // Role management
  "roles:read",
  "roles:create",
  "roles:update",
  "roles:delete",

  // Organization & CRM
  "organizations:read",
  "organizations:create",
  "organizations:update",
  "organizations:delete",
  "leads:read",
  "leads:create",
  "leads:update",
  "leads:delete",

  // Services & Projects
  "services:read",
  "services:create",
  "services:update",
  "services:delete",
  "quotations:read",
  "quotations:create",
  "quotations:update",
  "quotations:delete",
  "projects:read",
  "projects:create",
  "projects:update",
  "projects:delete",

  // Tasks & Checklists
  "tasks:read",
  "tasks:read-all",
  "tasks:create",
  "tasks:update",
  "tasks:delete",
  "tasks:assign",
  "tasks:manage-locks",
  "checklists:read",
  "checklists:create",
  "checklists:update",
  "checklists:delete",
  "checklists:verify",
  "checklists:submit",
  "checklists:review",

  // Reports & Documents
  "reports:read",
  "reports:create",
  "reports:update",
  "reports:delete",
  "comments:read",
  "comments:create",
  "comments:update",
  "comments:delete",

  // Payments & Invoicing
  "payments:read",
  "payments:create",
  "payments:update",
  "payments:delete",

  // System & Settings
  "system:read",
  "system:update",

  // CMS Permission
  "cms:read",
  "cms:create",
  "cms:update",
  "cms:delete",

  // Notifications
  "notifications:read",
  "notifications:create",

  // Analytics & Reports
  "analytics:read",
  "exports:create",

  //Meting Roles
  "meetings:read",
  "meetings:create",
  "meetings:update",
  "meetings:delete",

  //CHATModule Access
  "chat-module:access",
];

export class RolesService {
  async create(data: CreateRoleRequest) {
    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existingRole) {
      throw new AppError(
        "Role with this name already exists",
        409,
        "ROLE_EXISTS"
      );
    }

    // Validate permissions
    const invalidPermissions = data.permissions.filter(
      (permission) => !AVAILABLE_PERMISSIONS.includes(permission)
    );

    if (invalidPermissions.length > 0) {
      throw new AppError(
        `Invalid permissions: ${invalidPermissions.join(", ")}`,
        400,
        "INVALID_PERMISSIONS"
      );
    }

    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: JSON.stringify(data.permissions),
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return role;
  }

  async lookup() {
    return prisma.role.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: "asc" },
    });
  }

  async findMany() {
    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return roles;
  }

  async findById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new AppError("Role not found", 404, "ROLE_NOT_FOUND");
    }

    return role;
  }

  async update(id: string, data: UpdateRoleRequest) {
    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      throw new AppError("Role not found", 404, "ROLE_NOT_FOUND");
    }

    // Check name uniqueness if name is being updated
    if (data.name && data.name !== existingRole.name) {
      const duplicateRole = await prisma.role.findUnique({
        where: { name: data.name },
      });

      if (duplicateRole) {
        throw new AppError(
          "Role with this name already exists",
          409,
          "ROLE_EXISTS"
        );
      }
    }

    // Validate permissions if provided
    if (data.permissions) {
      const invalidPermissions = data.permissions.filter(
        (permission) => !AVAILABLE_PERMISSIONS.includes(permission)
      );

      if (invalidPermissions.length > 0) {
        throw new AppError(
          `Invalid permissions: ${invalidPermissions.join(", ")}`,
          400,
          "INVALID_PERMISSIONS"
        );
      }
    }

    // If permissions aren't being updated, keep the existing ones
    const permissions = data.permissions
      ? JSON.stringify(data.permissions)
      : existingRole.permissions;
    const updateData = {
      ...data,
      permissions,
    };
    // Remove undefined values to prevent overwriting with null
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const role = await prisma.role.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return role;
  }

  async delete(id: string) {
    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new AppError("Role not found", 404, "ROLE_NOT_FOUND");
    }

    // Check if role has users assigned
    if (role._count.users > 0) {
      throw new AppError(
        "Cannot delete role with assigned users",
        400,
        "ROLE_HAS_USERS"
      );
    }

    await prisma.role.delete({
      where: { id },
    });

    return { message: "Role deleted successfully" };
  }

  async getAvailablePermissions() {
    // Group permissions by module for better UI organization
    const permissionGroups: Record<string, string[]> = {};

    AVAILABLE_PERMISSIONS.forEach((permission) => {
      const [module] = permission.split(":");
      if (!permissionGroups[module]) {
        permissionGroups[module] = [];
      }
      permissionGroups[module].push(permission);
    });

    return {
      permissions: AVAILABLE_PERMISSIONS,
      permissionGroups,
    };
  }

  async getStats() {
    const [totalRoles, rolesWithUsers, topRoles] = await Promise.all([
      prisma.role.count(),
      prisma.role.count({
        where: {
          users: {
            some: {},
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
        orderBy: {
          users: {
            _count: "desc",
          },
        },
        take: 5,
      }),
    ]);

    return {
      totalRoles,
      rolesWithUsers,
      unusedRoles: totalRoles - rolesWithUsers,
      topRoles: topRoles.map((role) => ({
        name: role.name,
        userCount: role._count.users,
      })),
    };
  }
}
