// ==================== FCM ROUTES ====================
// routes/fcm/fcm.routes.ts

import { Router } from "express";
import { FCMController } from "./fcm.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router: Router = Router();
const fcmController = new FCMController();

/**
 * @swagger
 * tags:
 *   name: FCM
 *   description: Firebase Cloud Messaging token management
 */

// Public endpoint - Register device token (no authentication required)
router.post("/register", fcmController.registerToken);

// Protected endpoint - Validate tokens (authentication required - admin only)
router.post("/validate", authenticateToken, fcmController.validateToken);

export default router;

// ==================== PRISMA SCHEMA UPDATE ====================
// Add this to your schema.prisma file:

/*
enum Platform {
  ANDROID
  IOS
  WEB
}

model DeviceToken {
  id         String   @id @default(uuid())
  userId     String?  @map("user_id")
  token      String   @unique
  platform   Platform
  deviceInfo Json?    @map("device_info")
  isActive   Boolean  @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  lastUsedAt DateTime @default(now()) @map("last_used_at")

  @@index([userId])
  @@index([token])
  @@index([isActive])
  @@map("device_tokens")
}
*/

// ==================== INTEGRATION EXAMPLE ====================
// Example: Integrate with leads module to send notifications

// In leads.service.ts, add after lead creation:

/*
import FCMService from "../fcm/fcm.service";

// Inside create method after lead creation:
if (data.source === "MOBILE_APP" && data.contactName && data.contactEmail) {
  // ... existing email notification code ...
  
  // Send push notification to admin/sales team
  try {
    const fcmService = new FCMService();
    await fcmService.sendToAllDevices({
      title: "🔔 New Mobile App Enquiry",
      body: `${data.contactName} from ${data.companyName}`,
      data: {
        type: "lead_created",
        leadId: lead.id,
        source: "MOBILE_APP",
        action: "view_lead"
      }
    });
    
    logger.info("Push notification sent for new lead", { leadId: lead.id });
  } catch (error) {
    logger.error("Failed to send push notification for new lead", {
      leadId: lead.id,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
*/

// ==================== USAGE EXAMPLES ====================

/**
 * 1. Register Device Token (Public API - No Auth)
 * 
 * POST /api/v1/fcm/register
 * Content-Type: application/json
 * 
 * {
 *   "token": "fcm-device-token-here",
 *   "platform": "ANDROID",
 *   "deviceInfo": {
 *     "model": "Pixel 7",
 *     "osVersion": "Android 14",
 *     "appVersion": "1.0.0",
 *     "deviceId": "unique-device-id"
 *   },
 *   "userId": "uuid-of-user" // Optional - only if user is logged in
 * }
 * 
 * Response 201:
 * {
 *   "success": true,
 *   "message": "Device token registered successfully",
 *   "data": {
 *     "id": "uuid",
 *     "token": "fcm-device-token-here",
 *     "platform": "ANDROID",
 *     "userId": "uuid-of-user",
 *     "isActive": true,
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "lastUsedAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */

/**
 * 2. Validate Specific Token (Admin Only - Auth Required)
 * 
 * POST /api/v1/fcm/validate
 * Authorization: Bearer <admin-jwt-token>
 * Content-Type: application/json
 * 
 * {
 *   "token": "fcm-device-token-to-validate"
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Token validation completed successfully",
 *   "data": {
 *     "token": "fcm-device-token-to-validate",
 *     "tokenId": "uuid",
 *     "isValid": false,
 *     "isActive": false,
 *     "errorMessage": "Requested entity was not found.",
 *     "validatedAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */

/**
 * 3. Validate All Tokens (Admin Only - Auth Required)
 * 
 * POST /api/v1/fcm/validate
 * Authorization: Bearer <admin-jwt-token>
 * Content-Type: application/json
 * 
 * {
 *   "cleanupAll": true
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Token validation completed successfully",
 *   "data": {
 *     "totalTokens": 150,
 *     "validTokens": 145,
 *     "invalidTokens": 5,
 *     "errors": 0,
 *     "invalidTokensList": ["token1", "token2", "token3", "token4", "token5"],
 *     "validatedAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */

// ==================== MOBILE APP INTEGRATION ====================

/**
 * Android Integration:
 * 
 * After getting FCM token in MyFirebaseMessagingService.kt:
 * 
 * private fun sendTokenToServer(token: String) {
 *   val deviceInfo = mapOf(
 *     "model" to android.os.Build.MODEL,
 *     "osVersion" to "Android ${android.os.Build.VERSION.RELEASE}",
 *     "appVersion" to getAppVersion(),
 *     "deviceId" to Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
 *   )
 *   
 *   val response = apiService.registerFCMToken(
 *     token = token,
 *     platform = "ANDROID",
 *     deviceInfo = deviceInfo,
 *     userId = getUserId() // null if not logged in
 *   )
 * }
 */

/**
 * iOS Integration:
 * 
 * In NotificationService.swift:
 * 
 * func registerToken(_ token: String) {
 *   let deviceInfo = [
 *     "model": UIDevice.current.model,
 *     "osVersion": "iOS \(UIDevice.current.systemVersion)",
 *     "appVersion": getAppVersion(),
 *     "deviceId": UIDevice.current.identifierForVendor?.uuidString ?? "Unknown"
 *   ]
 *   
 *   APIService.shared.registerFCMToken(
 *     token: token,
 *     platform: "IOS",
 *     deviceInfo: deviceInfo,
 *     userId: getUserId() // nil if not logged in
 *   )
 * }
 */