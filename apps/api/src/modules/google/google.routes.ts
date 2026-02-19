import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware";
import {
  initiateGoogleAuth,
  handleGoogleCallback,
  getGoogleStatus,
  disconnectGoogle,
} from "./google.controller";

const router: Router = Router();

// OAuth callback – Google redirects here with ?code=... (NO AUTH - Google redirects here)
router.get("/google/callback", handleGoogleCallback);

// Start Google OAuth flow - can work with or without auth header (for browser redirects)
router.get("/google", initiateGoogleAuth);

// All other Google routes require authentication
router.use(authenticateToken);

// Check Google Calendar connection status
router.get("/google/status", getGoogleStatus);

// Disconnect Google account
router.post("/google/disconnect", disconnectGoogle);

export default router;
