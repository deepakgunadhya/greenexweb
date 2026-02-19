import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import { AppError } from "./error.middleware";

/**
 * SRS 5.1.4 - CRM Module Permission-Based Access Control
 *
 * Access is determined dynamically from the user's permissions
 * (populated by auth middleware from role-permission data in the database).
 * No hardcoded role names are used.
 */

// CRM Permission Constants - mapped to actual seeded permission strings
export const CRM_PERMISSIONS = {
  // Lead permissions
  LEADS_VIEW: 'leads:read',
  LEADS_CREATE: 'leads:create',
  LEADS_UPDATE: 'leads:update',
  LEADS_DELETE: 'leads:delete',

  // Organization permissions
  ORGANIZATIONS_VIEW: 'organizations:read',
  ORGANIZATIONS_CREATE: 'organizations:create',
  ORGANIZATIONS_UPDATE: 'organizations:update',
  ORGANIZATIONS_DELETE: 'organizations:delete',

  // Contact permissions
  CONTACTS_VIEW: 'contacts:read',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_UPDATE: 'contacts:update',
  CONTACTS_DELETE: 'contacts:delete',
};

// All CRM permissions for checking general CRM access
const ALL_CRM_PERMISSIONS = Object.values(CRM_PERMISSIONS);

/**
 * Check if user has any CRM access at all
 */
export const requireCrmAccess = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401, "UNAUTHORIZED"));
    }

    const userPermissions = req.user.permissions || [];

    const hasAnyCrmAccess = ALL_CRM_PERMISSIONS.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAnyCrmAccess) {
      return next(
        new AppError(
          "Access denied. You do not have permission to access CRM modules.",
          403,
          "CRM_ACCESS_DENIED"
        )
      );
    }

    next();
  };
};

/**
 * Check specific CRM permission using the user's permissions from login
 */
export const requireCrmPermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401, "UNAUTHORIZED"));
    }

    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(permission)) {
      return next(
        new AppError(
          `Access denied. Required permission: ${permission}`,
          403,
          "INSUFFICIENT_CRM_PERMISSION"
        )
      );
    }

    next();
  };
};

/**
 * Middleware for Lead operations based on HTTP method
 */
export const requireLeadAccess = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const method = req.method.toLowerCase();

    let requiredPermission: string;

    switch (method) {
      case 'get':
        requiredPermission = CRM_PERMISSIONS.LEADS_VIEW;
        break;
      case 'post':
        requiredPermission = CRM_PERMISSIONS.LEADS_CREATE;
        break;
      case 'put':
      case 'patch':
        requiredPermission = CRM_PERMISSIONS.LEADS_UPDATE;
        break;
      case 'delete':
        requiredPermission = CRM_PERMISSIONS.LEADS_DELETE;
        break;
      default:
        return next(new AppError("Unsupported HTTP method", 405, "METHOD_NOT_ALLOWED"));
    }

    return requireCrmPermission(requiredPermission)(req, res, next);
  };
};

/**
 * Middleware for Organization operations based on HTTP method
 */
export const requireOrganizationAccess = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const method = req.method.toLowerCase();

    let requiredPermission: string;

    switch (method) {
      case 'get':
        requiredPermission = CRM_PERMISSIONS.ORGANIZATIONS_VIEW;
        break;
      case 'post':
        requiredPermission = CRM_PERMISSIONS.ORGANIZATIONS_CREATE;
        break;
      case 'put':
      case 'patch':
        requiredPermission = CRM_PERMISSIONS.ORGANIZATIONS_UPDATE;
        break;
      case 'delete':
        requiredPermission = CRM_PERMISSIONS.ORGANIZATIONS_DELETE;
        break;
      default:
        return next(new AppError("Unsupported HTTP method", 405, "METHOD_NOT_ALLOWED"));
    }

    return requireCrmPermission(requiredPermission)(req, res, next);
  };
};

/**
 * Middleware for Contact operations based on HTTP method
 */
export const requireContactAccess = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const method = req.method.toLowerCase();

    let requiredPermission: string;

    switch (method) {
      case 'get':
        requiredPermission = CRM_PERMISSIONS.CONTACTS_VIEW;
        break;
      case 'post':
        requiredPermission = CRM_PERMISSIONS.CONTACTS_CREATE;
        break;
      case 'put':
      case 'patch':
        requiredPermission = CRM_PERMISSIONS.CONTACTS_UPDATE;
        break;
      case 'delete':
        requiredPermission = CRM_PERMISSIONS.CONTACTS_DELETE;
        break;
      default:
        return next(new AppError("Unsupported HTTP method", 405, "METHOD_NOT_ALLOWED"));
    }

    return requireCrmPermission(requiredPermission)(req, res, next);
  };
};
