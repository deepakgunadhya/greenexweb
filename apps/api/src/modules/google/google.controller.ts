import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../config/database";
import { getAuthUrl, exchangeCodeForTokens } from "../meetings/meetings.google";
import { logger } from "../../utils/logger";

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * Initiate Google OAuth flow
 */
export const initiateGoogleAuth = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Log all request details for debugging
    logger.info("Google auth initiation request", {
      hasUser: !!(req as any).user,
      userIdFromUser: (req as any).user?.id,
      queryParams: req.query,
      queryUserId: req.query.userId,
      queryUserIdType: typeof req.query.userId,
      url: req.url,
      originalUrl: req.originalUrl,
      headers: {
        authorization: req.headers.authorization ? "present" : "missing",
      },
    });

    // Try to get userId from authenticated user first
    let userId = (req as any).user?.id;

    // If not authenticated via header, try to get from query parameter (for browser redirects)
    if (!userId) {
      // Try multiple ways to get userId from query
      userId = req.query.userId as string | undefined;
      if (!userId && req.query.user_id) {
        userId = req.query.user_id as string;
      }
      if (userId) {
        logger.info("Got userId from query parameter", {
          userId,
          source: "query.userId",
        });
      }
    }

    // If still no userId, try to authenticate via token in query or cookie
    if (!userId) {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          userId = decoded.userId;
          logger.info("Got userId from JWT token", { userId });
        } catch (tokenError) {
          logger.warn("JWT token verification failed", {
            error: (tokenError as Error).message,
          });
        }
      }
    }

    if (!userId) {
      logger.error("No userId found in request", {
        hasUser: !!(req as any).user,
        queryUserId: req.query.userId,
        hasAuthHeader: !!req.headers.authorization,
      });
      res.status(401).json({
        success: false,
        error: {
          message:
            "User not authenticated. Please provide userId as query parameter or authenticate first.",
        },
      });
      return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: { message: "User not found or inactive" },
      });
      return;
    }

    const url = getAuthUrl(userId);
    res.redirect(url);
  } catch (err) {
    console.error("Error generating Google auth URL:", err);
    res.status(500).json({
      success: false,
      error: { message: "Failed to initiate Google connection" },
    });
  }
};

/**
 * Handle Google OAuth callback
 */
export const handleGoogleCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined; // Contains userId

    if (!code || !state) {
      console.error("Missing authorization code or state");
      res.redirect(`${frontendUrl}/meeting?google=error`);
      return;
    }

    const userId = state; // Extract userId from state parameter

    // Fetch user to get email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      logger.error("User not found for Google OAuth", { userId });
      res.redirect(`${frontendUrl}/meeting?google=error`);
      return;
    }

    const tokens = await exchangeCodeForTokens(code);
    logger.info("Google tokens received", {
      userId,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
    });

    if (!tokens.access_token) {
      logger.error("Failed to obtain access token from Google");
      res.redirect(`${frontendUrl}/meeting?google=error`);
      return;
    }

    // Store per user instead of global
    // id = auto-generated UUID, userId = user's ID (unique)
    try {
      const savedAuth = await prisma.googleAuth.upsert({
        where: { userId: userId },
        create: {
          userId: userId,
          email: user.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          isActive: true,
        },
        update: {
          email: user.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          isActive: true,
        },
      });

      logger.info("Google auth stored successfully", {
        id: savedAuth.id,
        userId: (savedAuth as any).userId,
        email: savedAuth.email,
        hasRefreshToken: !!savedAuth.refreshToken,
      });
    } catch (dbError: any) {
      logger.error("Failed to save Google auth to database", {
        error: dbError.message,
        code: dbError.code,
        stack: dbError.stack,
      });
      throw dbError;
    }

    res.redirect(`${frontendUrl}/meeting?google=connected`);
  } catch (err: any) {
    logger.error("Google OAuth callback error", {
      error: err.message,
      stack: err.stack,
      code: err.code,
    });
    res.redirect(`${frontendUrl}/meeting?google=error`);
  }
};

/**
 * Check Google Calendar connection status
 */
export const getGoogleStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: "User not authenticated" },
      });
      return;
    }

    const googleAuth = await prisma.googleAuth.findUnique({
      where: { userId: userId },
      select: {
        id: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        connected: !!googleAuth,
        isActive: googleAuth?.isActive || false,
      },
    });
  } catch (err: any) {
    logger.error("Google status check error", {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      success: false,
      error: { message: "Failed to check Google Calendar status" },
    });
  }
};

/**
 * Disconnect Google account
 */
export const disconnectGoogle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: "User not authenticated" },
      });
      return;
    }

    const result = await prisma.googleAuth.deleteMany({
      where: { userId: userId },
    });

    logger.info("Google auth disconnected successfully", {
      userId,
      deletedCount: result.count,
    });

    res.json({
      success: true,
      message: "Google account disconnected successfully",
    });
  } catch (err: any) {
    logger.error("Google disconnect error", {
      error: err.message,
      stack: err.stack,
      code: err.code,
    });
    res.status(500).json({
      success: false,
      error: { message: "Failed to disconnect Google account" },
    });
  }
};
