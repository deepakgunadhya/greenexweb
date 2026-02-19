import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { successResponse, errorResponse } from "../../utils/response";
import { asyncHandler } from "../../middleware/error.middleware";
import {
  validateLoginData,
  validateRegisterData,
  validateChangePasswordData,
} from "./auth.validator";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * @swagger
   * /api/v1/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *               - firstName
   *               - lastName
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 8
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               phone:
   *                 type: string
   *     responses:
   *       201:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validateRegisterData(req.body);

    if (error) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const result = await this.authService.register(value);

    // Set refresh token in httpOnly cookie
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json(
      successResponse({
        user: result.user,
        accessToken: result.tokens.accessToken,
      })
    );
  });

  /**
   * @swagger
   * /api/v1/auth/login:
   *   post:
   *     summary: User login
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validateLoginData(req.body);

    if (error) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const result = await this.authService.login(value);

    // Set refresh token in httpOnly cookie
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json(
      successResponse({
        user: result.user,
        accessToken: result.tokens.accessToken,
      })
    );
  });

  /**
   * @swagger
   * /api/v1/auth/refresh:
   *   post:
   *     summary: Refresh access token
   *     tags: [Authentication]
   *     responses:
   *       200:
   *         description: Token refreshed successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res
        .status(401)
        .json(errorResponse("UNAUTHORIZED", "Refresh token required"));
    }

    const result = await this.authService.refreshToken(refreshToken);

    // Set new refresh token in cookie
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json(
      successResponse({
        user: result.user,
        accessToken: result.tokens.accessToken,
      })
    );
  });

  /**
   * @swagger
   * /api/v1/auth/logout:
   *   post:
   *     summary: User logout
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    res.json(
      successResponse({
        message: "Logged out successfully",
      })
    );
  });

  /**
   * @swagger
   * /api/v1/auth/me:
   *   get:
   *     summary: Get current user profile
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   */
  getProfile = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const profile = await this.authService.getProfile(req.user!.id);
      res.json(successResponse(profile));
    }
  );

  /**
   * @swagger
   * /api/v1/auth/change-password:
   *   post:
   *     summary: Change user password
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - oldPassword
   *               - newPassword
   *             properties:
   *               oldPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *                 minLength: 8
   *     responses:
   *       200:
   *         description: Password changed successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   */
  changePassword = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { error, value } = validateChangePasswordData(req.body);

      if (error) {
        return res
          .status(400)
          .json(
            errorResponse(
              "VALIDATION_ERROR",
              "Validation failed",
              error.details
            )
          );
      }

      await this.authService.changePassword(
        req.user!.id,
        value.oldPassword,
        value.newPassword
      );

      res.json(
        successResponse({
          message: "Password changed successfully",
        })
      );
    }
  );
}
