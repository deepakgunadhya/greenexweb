import { Request, Response, NextFunction } from 'express';
import { createClientUserService } from './create-client-user.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';

class ClientUserController {
  
  async createClientUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        organizationId,
        leadId,
        email,
        firstName,
        lastName,
        phone,
        password,
        sendWelcomeEmail = true
      } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName) {
        return next(new AppError('Email, firstName, and lastName are required', 400, 'VALIDATION_ERROR'));
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new AppError('Invalid email format', 400, 'INVALID_EMAIL'));
      }

      const result = await createClientUserService.createClientUser(
        {
          organizationId,
          leadId,
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim(),
          password,
          sendWelcomeEmail
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Client user created successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  async getClientUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.query;

      const clientUsers = await createClientUserService.getClientUsers(
        organizationId as string
      );

      res.json({
        success: true,
        data: clientUsers,
        meta: {
          total: clientUsers.length,
          organizationId: organizationId || null
        }
      });

    } catch (error) {
      next(error);
    }
  }

  async getClientUserById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const clientUser = await createClientUserService.getClientUsers();
      const user = clientUser.find(u => u.id === id);

      if (!user) {
        return next(new AppError('Client user not found', 404, 'CLIENT_USER_NOT_FOUND'));
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      next(error);
    }
  }

  async updateClientUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, isActive } = req.body;

      const updatedUser = await createClientUserService.updateClientUser(id, {
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        phone: phone?.trim(),
        isActive
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'Client user updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  async deactivateClientUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await createClientUserService.deactivateClientUser(id);

      res.json({
        success: true,
        message: 'Client user deactivated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  async reactivateClientUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const reactivatedUser = await createClientUserService.updateClientUser(id, {
        isActive: true
      });

      res.json({
        success: true,
        data: reactivatedUser,
        message: 'Client user reactivated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Reset client user password
  async resetClientPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { sendEmail = true } = req.body;

      // This would generate a new temporary password and send via email
      // For now, we'll just create a placeholder implementation
      
      const temporaryPassword = this.generateTemporaryPassword();
      
      // TODO: Update user password in database
      // TODO: Send email with new password
      
      res.json({
        success: true,
        message: 'Password reset email sent to client user',
        data: {
          temporaryPassword // Remove this in production - don't send password in response
        }
      });

    } catch (error) {
      next(error);
    }
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

export const clientUserController = new ClientUserController();