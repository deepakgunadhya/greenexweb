import { Request, Response, NextFunction } from "express";
import { ClientService } from "./client.service";
import { successResponse, errorResponse } from "../../utils/response";
import { logger } from "../../utils/logger";

export class ClientController {
  private clientService = new ClientService();

  /**
   * Get client quotations
   */
  getQuotations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const quotations = await this.clientService.getClientQuotations(userId);
      res.json(successResponse(quotations));
    } catch (error) {
      logger.error("Error fetching client quotations:", error);
      next(error);
    }
  };

  /**
   * Get client projects
   */
  getProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const projects = await this.clientService.getClientProjects(userId);
      res.json(successResponse(projects));
    } catch (error) {
      logger.error("Error fetching client projects:", error);
      next(error);
    }
  };

  /**
   * Get client project stats
   */
  getProjectStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const stats = await this.clientService.getClientProjectStats(userId);
      res.json(successResponse(stats));
    } catch (error) {
      logger.error("Error fetching client project stats:", error);
      next(error);
    }
  };

  /**
   * Get specific project details
   */
  getProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const project = await this.clientService.getClientProject(userId, id);
      if (!project) {
        return res.status(404).json(errorResponse("NOT_FOUND", "Project not found or access denied"));
      }

      res.json(successResponse(project));
    } catch (error) {
      logger.error("Error fetching client project:", error);
      next(error);
    }
  };

  /**
   * Get project reports
   */
  getProjectReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { projectId } = req.params;

      if (!userId) {
        return res.status(401).json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const reports = await this.clientService.getClientProjectReports(userId, projectId);
      res.json(successResponse(reports));
    } catch (error) {
      logger.error("Error fetching client project reports:", error);
      next(error);
    }
  };

  /**
   * Get client meetings
   */
  getMeetings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { status, upcoming, recent, limit } = req.query;

      if (!userId) {
        return res.status(401).json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const filters = {
        status: status as string,
        upcoming: upcoming === 'true',
        recent: recent === 'true',
        limit: limit ? parseInt(limit as string) : undefined
      };

      const meetings = await this.clientService.getClientMeetings(userId, filters);
      res.json(successResponse(meetings));
    } catch (error) {
      logger.error("Error fetching client meetings:", error);
      next(error);
    }
  };

  /**
   * Get specific meeting details
   */
  getMeeting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const meeting = await this.clientService.getClientMeeting(userId, id);
      if (!meeting) {
        return res.status(404).json(errorResponse("NOT_FOUND", "Meeting not found or access denied"));
      }

      res.json(successResponse(meeting));
    } catch (error) {
      logger.error("Error fetching client meeting:", error);
      next(error);
    }
  };

  /**
   * Request quotation action (accept/reject)
   */
  requestQuotationAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { quotationId } = req.params;
      const { action } = req.body;

      if (!userId) {
        return res.status(401).json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      if (!['accept', 'reject', 'ACCEPT', 'REJECT'].includes(action)) {
        return res.status(400).json(errorResponse("INVALID_ACTION", "Action must be 'accept' or 'reject'"));
      }

      // Normalize action to lowercase for service layer
      const normalizedAction = action.toLowerCase();
      const result = await this.clientService.requestQuotationAction(userId, quotationId, normalizedAction);
      res.json(successResponse(result));
    } catch (error) {
      logger.error("Error requesting quotation action:", error);
      next(error);
    }
  };

  /**
   * Confirm quotation action with OTP
   */
  confirmQuotationAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { quotationId } = req.params;
      const { otp } = req.body;

      if (!userId) {
        return res.status(401).json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const result = await this.clientService.confirmQuotationAction(userId, quotationId, otp);
      res.json(successResponse(result));
    } catch (error) {
      logger.error("Error confirming quotation action:", error);
      next(error);
    }
  };

  /**
   * Confirm meeting attendance
   */
  confirmMeeting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { meetingId } = req.params;
      const { attending } = req.body;

      if (!userId) {
        return res.status(401).json(errorResponse("UNAUTHORIZED", "User not authenticated"));
      }

      const result = await this.clientService.confirmMeetingAttendance(userId, meetingId, attending);
      res.json(successResponse(result));
    } catch (error) {
      logger.error("Error confirming meeting attendance:", error);
      next(error);
    }
  };
}