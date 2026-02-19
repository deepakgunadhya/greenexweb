// ==================== FCM CONTROLLER ====================
// controllers/fcm/fcm.controller.ts

import { Response, Request } from "express";
import { FCMService } from "./fcm.service";
import { successResponse, errorResponse } from "../../utils/response";
import { asyncHandler } from "../../middleware/error.middleware";
import { validateRegisterTokenData } from "./fcm.validator";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";

export class FCMController {
  private fcmService: FCMService;

  constructor() {
    this.fcmService = new FCMService();
  }
/**
 * @swagger
 * /api/v1/fcm/register:
 *   post:
 *     summary: Register device token (public - no auth required)
 *     tags: [FCM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - platform
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device token
 *               platform:
 *                 type: string
 *                 enum: [ANDROID, IOS, WEB]
 *               type:
 *                 type: string
 *                 enum: [user, broadcast, topic, scheduled]
 *                 default: broadcast
 *               deviceId:
 *                 type: string
 *                 description: Unique device identifier
 *               deviceInfo:
 *                 type: object
 *                 properties:
 *                   model:
 *                     type: string
 *                   osVersion:
 *                     type: string
 *                   appVersion:
 *                     type: string
 *               userId:
 *                 type: string
 *                 description: Optional - link to user if logged in
 *     responses:
 *       201:
 *         description: Device token registered successfully
 *       400:
 *         description: Validation error
 */
registerToken = asyncHandler(async (req: Request, res: Response) => {
  console.log("==== FCM TOKEN REGISTRATION DEBUG ====");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  // const { error, value } = validateRegisterTokenData(req.body);

  // if (error) {
  //   console.log("==== VALIDATION ERRORS ====");
  //   console.log(error.details);
  //   return res
  //     .status(400)
  //     .json(errorResponse("VALIDATION_ERROR", "Validation failed", error.details));
  // }

  try {
    // console.log("Registering device token:", value);
    const deviceToken = await this.fcmService.registerToken(req.body);
    console.log("Device token registered successfully:", deviceToken);

    return res.status(201).json(successResponse(deviceToken, "Device token registered successfully"));
  } catch (err: any) {
    console.error("==== FCM SERVICE ERROR ====");
    console.error(err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", err.message || "Internal server error"));
  }
});



  /**
   * @swagger
   * /api/v1/fcm/validate:
   *   post:
   *     summary: Validate and cleanup invalid tokens (admin only)
   *     tags: [FCM]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               token:
   *                 type: string
   *                 description: Specific token to validate (optional)
   *               cleanupAll:
   *                 type: boolean
   *                 description: Validate and cleanup all tokens
   *                 default: false
   *     responses:
   *       200:
   *         description: Token validation completed successfully
   *       400:
   *         description: Validation error
   */
  validateToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    console.log("==== FCM TOKEN VALIDATION DEBUG ====");
    console.log("Request body:", req.body);
    console.log("User:", req.user?.id);

    const { token, cleanupAll } = req.body;

    let result;

    if (token) {
      // Validate specific token
      result = await this.fcmService.validateAndCleanupToken(token);
    } else if (cleanupAll) {
      // Validate all tokens
      result = await this.fcmService.validateAndCleanupAllTokens();
    } else {
      return res
        .status(400)
        .json(
          errorResponse(
            "INVALID_REQUEST",
            "Please provide either 'token' or set 'cleanupAll' to true"
          )
        );
    }

    res.json(successResponse(result, "Token validation completed successfully"));
  });
}