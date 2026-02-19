import { Router } from "express";
import { LeadsController } from "./leads.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import {
  requireLeadAccess,
  CRM_PERMISSIONS,
  requireCrmPermission,
} from "../../middleware/crm.middleware";

const router: Router = Router();
const leadsController = new LeadsController();

// Public route for mobile app enquiry (no authentication required per SRS 5.1.1)
router.post("/mobile-enquiry", leadsController.createMobileEnquiry);

// All other routes require authentication
router.use(authenticateToken);

// GET /leads/stats - Lead statistics (SRS 5.1.4 - Sales Executive, Ops Manager, Accounts, Super Admin)
router.get(
  "/stats",
  requireCrmPermission(CRM_PERMISSIONS.LEADS_VIEW),
  leadsController.getStats
);

// POST /leads - Create lead (SRS 5.1.4 - Sales Executive, Super Admin only)
router.post(
  "/",
  requireCrmPermission(CRM_PERMISSIONS.LEADS_CREATE),
  leadsController.create
);

// GET /leads - List leads with filtering/pagination (SRS 5.1.4 - Sales Executive, Ops Manager, Accounts, Super Admin)
router.get(
  "/",
  requireCrmPermission(CRM_PERMISSIONS.LEADS_VIEW),
  leadsController.findMany
);

// GET /leads/lookup - Lightweight lead list for dropdowns (auth-only, no permission required)
router.get("/lookup", leadsController.lookup);

// GET /leads/:id - Get lead by ID (SRS 5.1.4 - Sales Executive, Ops Manager, Accounts, Super Admin)
router.get(
  "/:id",
  requireCrmPermission(CRM_PERMISSIONS.LEADS_VIEW),
  leadsController.findById
);

// PUT /leads/:id - Update lead (SRS 5.1.4 - Sales Executive, Super Admin only)
router.put(
  "/:id",
  requireCrmPermission(CRM_PERMISSIONS.LEADS_UPDATE),
  leadsController.update
);

// DELETE /leads/:id - Delete lead (SRS 5.1.4 - Sales Executive, Super Admin only)
router.delete(
  "/:id",
  requireCrmPermission(CRM_PERMISSIONS.LEADS_DELETE),
  leadsController.delete
);

export default router;
