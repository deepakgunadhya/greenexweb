import { Router, Response, NextFunction } from "express";
import { GroupController } from "./group/group.controller";
import { MessageController } from "./messages/message.controller";
import { uploadSingle } from "../../middleware/upload.middleware";
import {
  authenticateToken,
  requirePermissions,
  AuthenticatedRequest,
} from "../../middleware/auth.middleware";
import { AppError } from "../../middleware/error.middleware";

const router: Router = Router();
const groupController = new GroupController();
const messageController = new MessageController();

/** Block client users from group management (create/edit/delete) */
const requireInternalUser = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (req.user?.userType === "CLIENT") {
    return next(
      new AppError(
        "Client users cannot manage groups",
        403,
        "FORBIDDEN"
      )
    );
  }
  next();
};

router.use(authenticateToken);

// Groups CRUD (create/update/delete restricted to internal users)
router.post(
  "/group",
  requirePermissions(["chat-module:access"]),
  requireInternalUser,
  groupController.create
);
router.get(
  "/group/my",
  requirePermissions(["chat-module:access"]),
  groupController.getMyGroups
);
router.put(
  "/group/:groupId",
  requirePermissions(["chat-module:access"]),
  requireInternalUser,
  groupController.update
);
router.delete(
  "/group/:groupId",
  requirePermissions(["chat-module:access"]),
  requireInternalUser,
  groupController.delete
);
// Members management
router.post(
  "/group/:groupId/members",
  requirePermissions(["chat-module:access"]),
  groupController.addMember
);
router.delete(
  "/group/:groupId/members/:userId",
  requirePermissions(["chat-module:access"]),
  groupController.removeMember
);
router.patch(
  "/group/:groupId/members/:userId/role",
  requirePermissions(["chat-module:access"]),
  groupController.setMemberRole
);

//====================================== Message route ====================================
router.post(
  "/message",
  uploadSingle,
  requirePermissions(["chat-module:access"]),
  messageController.sendMessage
);
router.get(
  "/messages/:conversationId",
  requirePermissions(["chat-module:access"]),
  messageController.getMessages
);
router.delete(
  "/message/:messageId",
  requirePermissions(["chat-module:access"]),
  messageController.deleteMessage
);
router.get(
  "/conversations",
  requirePermissions(["chat-module:access"]),
  messageController.getConversations
);
router.post(
  "/conversations/:conversationId/read",
  requirePermissions(["chat-module:access"]),
  messageController.markAsRead
);

export default router;
