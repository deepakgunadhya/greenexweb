const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
import { AppError } from "../../middleware/error.middleware";
import prisma from "../../config/database";
import { logger } from "../../utils/logger";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  user: {
    id: String;
    email: string;
    firstName: string;
    lastName: string;
    userType?: string;
    organizationId?: string;
    roles: string[];
    permissions: string[];
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || "development-secret-key-change-in-production";
  private readonly jwtExpiresIn = process.env.JWT_EXPIRES_IN || "15m";
  private readonly refreshExpiresIn =
    process.env.JWT_REFRESH_EXPIRES_IN || "7d";

  async register(data: RegisterRequest): Promise<AuthResponse> {
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

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        isVerified: false, // Email verification can be implemented later
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Assign default role if no roles assigned
    if (user.roles.length === 0) {
      const defaultRole = await prisma.role.findFirst({
        where: { name: "User" },
      });

      if (defaultRole) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: defaultRole.id,
          },
        });

        // Refetch user with roles
        const userWithRoles = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        });

        if (userWithRoles) {
          return this.generateAuthResponse(userWithRoles);
        }
      }
    }

    logger.info(`New user registered: ${data.email}`);
    return this.generateAuthResponse(user);
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    // Find user with roles
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new AppError("Account is deactivated", 403, "ACCOUNT_DEACTIVATED");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`User logged in: ${data.email}`);
    return this.generateAuthResponse(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as any;

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

      return this.generateAuthResponse(user);
    } catch (error) {
      throw new AppError("Invalid refresh token", 401, "INVALID_TOKEN");
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new AppError("Invalid current password", 400, "INVALID_PASSWORD");
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    logger.info(`Password changed for user ID: ${userId}`);
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        userType: true,
        organizationId: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
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
    const roles: string[] = [];

    user.roles.forEach((userRole) => {
      roles.push(userRole.role.name);
      const rolePermissions = JSON.parse(
        userRole.role.permissions as string
      ) as string[];
      rolePermissions.forEach((permission) => permissions.add(permission));
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      organizationId: user.organizationId,
      phone: user.phone,
      isActive: user.isActive,
      isVerified: user.isVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles: user.roles.map((ur) => ur.role),
      permissions: Array.from(permissions),
    };
  }

  private generateAuthResponse(user: any): AuthResponse {
    // Extract permissions from all roles
    const permissions = new Set<string>();
    const roles: string[] = [];

    user.roles.forEach((userRole: any) => {
      roles.push(userRole.role.name);
      const rolePermissions = JSON.parse(
        userRole.role.permissions as string
      ) as string[];
      rolePermissions.forEach((permission) => permissions.add(permission));
    });

    // Generate tokens
    const accessTokenPayload = {
      userId: user.id,
      email: user.email,
      type: "access",
    };

    const refreshTokenPayload = {
      userId: user.id,
      email: user.email,
      type: "refresh",
    };

    const accessToken = jwt.sign(accessTokenPayload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as any);
    const refreshToken = jwt.sign(refreshTokenPayload, this.jwtSecret, {
      expiresIn: this.refreshExpiresIn,
    } as any);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        organizationId: user.organizationId,
        roles,
        permissions: Array.from(permissions),
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
}
