import { Request, Response, NextFunction } from "express";
const jwt = require("jsonwebtoken");
import { AppError } from "./error.middleware";
import prisma from "../config/database";
import { Server } from "socket.io";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    permissions: string[];
    roles: string[];
    userType?: string; // INTERNAL, CLIENT
    organizationId?: string; // For data isolation
    leadId?: string; // For lead-specific client users
  };
  io: Server;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for token in Authorization header first
    const authHeader = req.headers["authorization"];
    let token = authHeader && authHeader.split(" ")[1];

    // Fallback to cookie-based authentication (for client portal)
    if (!token && req.cookies) {
      token = req.cookies.accessToken || req.cookies.refreshToken;
    }

    if (!token) {
      throw new AppError("Access token required", 401, "UNAUTHORIZED");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Fetch user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError("User not found or inactive", 403, "FORBIDDEN");
    }

    // Extract permissions from all user roles
    const permissions = new Set<string>();
    const roles: string[] = [];

    user.roles.forEach((userRole) => {
      roles.push(userRole.role.name);
      const rolePermissions = JSON.parse(
        userRole.role.permissions as string
      ) as string[];
      rolePermissions.forEach((permission) => permissions.add(permission));
    });

    req.user = {
      id: user.id,
      email: user.email,
      permissions: Array.from(permissions),
      roles,
      userType: user.userType || "INTERNAL", // Include userType for routing
      organizationId: user.organizationId || undefined, // Include organizationId for data isolation
      leadId: user.leadId || undefined, // Include leadId for lead-specific access
    };

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError("Invalid token", 401, "INVALID_TOKEN"));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError("Token has expired", 401, "TOKEN_EXPIRED"));
    } else {
      next(error);
    }
  }
};

export const requirePermissions = (permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401, "UNAUTHORIZED"));
    }

    const userPermissions = req.user.permissions;
    const hasAllPermissions = permissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return next(new AppError("Insufficient permissions", 403, "FORBIDDEN"));
    }

    next();
  };
};

export const requireAnyPermission = (permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401, "UNAUTHORIZED"));
    }

    const userPermissions = req.user.permissions;
    const hasAnyPermission = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAnyPermission) {
      return next(new AppError("Insufficient permissions", 403, "FORBIDDEN"));
    }

    next();
  };
};

export const requireRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401, "UNAUTHORIZED"));
    }

    const userRoles = req.user.roles;
    const hasRequiredRole = roles.some((role) => userRoles.includes(role));

    if (!hasRequiredRole) {
      return next(
        new AppError("Insufficient role privileges", 403, "FORBIDDEN")
      );
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (user && user.isActive) {
        const permissions = new Set<string>();
        const roles: string[] = [];

        user.roles.forEach((userRole) => {
          roles.push(userRole.role.name);
          const rolePermissions = JSON.parse(
            userRole.role.permissions as string
          ) as string[];
          rolePermissions.forEach((permission) => permissions.add(permission));
        });

        req.user = {
          id: user.id,
          email: user.email,
          permissions: Array.from(permissions),
          roles,
          userType: user.userType || "INTERNAL", // Include userType for routing
          organizationId: user.organizationId || undefined, // Include organizationId for data isolation
          leadId: user.leadId || undefined, // Include leadId for lead-specific access
        };
      }
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};
