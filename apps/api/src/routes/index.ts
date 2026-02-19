import { Router } from "express";
import authRoutes from "../modules/auth/routes";
import googleAuthRoutes from "../modules/google/google.routes";
import organizationRoutes from "../modules/organizations/routes";
import leadRoutes from "../modules/leads/routes";
import userRoutes from "../modules/users/routes";
import roleRoutes from "../modules/roles/routes";
import serviceRoutes from "../modules/services/routes";
import projectRoutes from "../modules/projects/routes";
// import checklistRoutes from "../modules/checklists/checklists.routes"; // OLD - Form-based checklists (disabled)
import templateFilesRoutes from "../modules/checklists/template-files.routes";
import clientSubmissionsRoutes from "../modules/checklists/client-submissions.routes";
import contentRoutes from "../modules/cms/content.routes";
import categoriesRoutes from "../modules/categories/categories.routes";
import meetingRoutes from "../modules/meetings/meetings.routes";
import tagsRoutes from "../modules/tags/tags.routes";
import uploadRoutes from "../modules/uploads/uploads.routes";
import quotationRoutes from "../modules/quotations/quotations.routes";
import clientRoutes from "../modules/client/client.routes";
import chatRoutes from "../modules/chat/routes";
// import fcmRoutes from "../modules/fcm/fcm.routes"; // Temporarily disabled
import fcmRoutes from "../modules/fcm/fcm.routes";
import projectTasksRoutes from "../modules/tasks/project-tasks.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import cronRoutes from "../modules/cron/routes";

const router: Router = Router();

/**
 * @swagger
 * /api/v1:
 *   get:
 *     summary: API status
 *     description: Returns the status of the Greenex API
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      message: "Greenex API v1.0.0",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
  });
});

// Module routes
router.use("/auth", authRoutes);
router.use("/auth", googleAuthRoutes);
router.use("/organizations", organizationRoutes);
router.use("/leads", leadRoutes);
router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/services", serviceRoutes);
router.use("/projects", projectRoutes);
// router.use("/checklists", checklistRoutes); // OLD - Form-based checklists (disabled)
router.use("/template-files", templateFilesRoutes);
router.use("/client-submissions", clientSubmissionsRoutes);

// CMS routes
router.use("/content", contentRoutes);
router.use("/categories", categoriesRoutes);
router.use("/tags", tagsRoutes);
router.use("/uploads", uploadRoutes);

// Meeting routes
router.use("/meetings", meetingRoutes);

//FCM routes
router.use("/fcm", fcmRoutes);

// Quotation routes
router.use("/quotations", quotationRoutes);

// Client portal routes
router.use("/client", clientRoutes);

// Chat module routes
router.use("/chat-module", chatRoutes);

// Task management routes
router.use("/tasks", projectTasksRoutes);

// Dashboard routes
router.use("/dashboard", dashboardRoutes);

// Cron job routes (externally triggered, no JWT auth)
router.use("/cron", cronRoutes);

export default router;
