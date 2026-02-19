import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/auth.middleware";
import { asyncHandler } from "../../../middleware/error.middleware";
import { errorResponse, successResponse } from "../../../utils/response";
import prisma from "../../../config/database";

export class MessageController {
  sendMessage = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const senderId = req.user?.id;
      if (!senderId) {
        res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
        return;
      }

      const { type, to_user_id, group_id, content } = req.body || {};
      const attachment = req.file ? req.file.filename : null;
      const attachment_type = req.file
        ? req.file.mimetype.startsWith("image/")
          ? "image"
          : "file"
        : null;

      if (!type || !["DIRECT", "GROUP"].includes(type)) {
        res
          .status(400)
          .json(errorResponse("INVALID_TYPE", "Type must be DIRECT or GROUP"));
        return;
      }

      // Validate content or attachment
      if (!content && !attachment) {
        res
          .status(400)
          .json(
            errorResponse(
              "VALIDATION_ERROR",
              "Message must have content or attachment"
            )
          );
        return;
      }

      // Handle DIRECT message
      if (type === "DIRECT") {
        if (!to_user_id) {
          res
            .status(400)
            .json(
              errorResponse(
                "VALIDATION_ERROR",
                "to_user_id is required for direct messages"
              )
            );
          return;
        }

        if (to_user_id === senderId) {
          res
            .status(400)
            .json(
              errorResponse(
                "VALIDATION_ERROR",
                "Cannot send message to yourself"
              )
            );
          return;
        }

        // Check if recipient exists and is active
        const recipient = await prisma.user.findUnique({
          where: { id: to_user_id, isActive: true },
          select: { id: true },
        });

        if (!recipient) {
          res
            .status(404)
            .json(
              errorResponse(
                "USER_NOT_FOUND",
                "Recipient user not found or inactive"
              )
            );
          return;
        }

        let isNewConversation = false;

        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
          where: {
            type: "DIRECT",
            OR: [
              { userOneId: senderId, userTwoId: to_user_id },
              { userOneId: to_user_id, userTwoId: senderId },
            ],
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              type: "DIRECT",
              userOneId: senderId,
              userTwoId: to_user_id,
            },
          });
          isNewConversation = true;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: senderId,
            content: content || null,
            attachmentUrl: attachment || null,
            attachmentType: attachment_type as "image" | "file" | null,
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            updatedAt: new Date(),
          },
        });

        if (isNewConversation) {
          const payload = {
            conversationId: conversation.id,
            type: "DIRECT",
            users: [senderId, to_user_id],
            lastMessage: message,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          };

          req.io.to(senderId.toString()).emit("conversationCreated", payload);
          req.io.to(to_user_id.toString()).emit("conversationCreated", payload);
        }

        // 🔥 REAL-TIME EVENTS
        req.io.to(to_user_id.toString()).emit("newMessage", message);
        req.io.to(senderId.toString()).emit("newMessage", message);

        if (!isNewConversation) {
          req.io.to(to_user_id.toString()).emit("conversationUpdated", {
            conversationId: conversation.id,
            lastMessage: message,
            updatedAt: new Date(),
          });

          req.io.to(senderId.toString()).emit("conversationUpdated", {
            conversationId: conversation.id,
            lastMessage: message,
            updatedAt: new Date(),
          });
        }

        return res.status(201).json(successResponse(message));
      }

      // Handle GROUP message
      if (type === "GROUP") {
        if (!group_id) {
          res
            .status(400)
            .json(
              errorResponse(
                "VALIDATION_ERROR",
                "group_id is required for group messages"
              )
            );
          return;
        }

        // Check if group exists and is not deleted
        const group = await prisma.group.findUnique({
          where: { id: group_id, isDeleted: false },
          select: { id: true },
        });

        if (!group) {
          res
            .status(404)
            .json(
              errorResponse("GROUP_NOT_FOUND", "Group not found or deleted")
            );
          return;
        }

        // Check if sender is a member of the group
        const membership = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: group_id,
              userId: senderId,
            },
          },
          select: { id: true },
        });

        if (!membership) {
          res
            .status(403)
            .json(
              errorResponse(
                "UNAUTHORIZED",
                "You are not a member of this group"
              )
            );
          return;
        }

        let isNewConversation = false;

        // Find or create group conversation
        let conversation = await prisma.conversation.findFirst({
          where: {
            type: "GROUP",
            groupId: group_id,
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              type: "GROUP",
              groupId: group_id,
            },
          });

          isNewConversation = true;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: senderId,
            content: content || null,
            attachmentUrl: attachment || null,
            attachmentType: attachment_type as "image" | "file" | null,
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            updatedAt: new Date(),
          },
        });

        // Emit live message to group room
        req.io.to(`group:${group_id}`).emit("newMessage", message);

        if (isNewConversation) {
          req.io.to(`group:${group_id}`).emit("conversationCreated", {
            conversationId: conversation.id,
            type: "GROUP",
            groupId: group_id,
            lastMessage: message,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          });
        } else {
          // Update group conversation list
          req.io.to(`group:${group_id}`).emit("conversationUpdated", {
            conversationId: conversation.id,
            lastMessage: message,
            updatedAt: new Date(),
          });
        }

        return res.status(201).json(successResponse(message));
      }
    }
  );

  getMessages = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
        return;
      }

      const { conversationId } = req.params;
      const { limit = 50, cursor } = req.query;

      if (!conversationId) {
        res
          .status(400)
          .json(
            errorResponse("VALIDATION_ERROR", "conversationId is required")
          );
        return;
      }

      // Check if user has access to this conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          group: {
            include: {
              members: {
                where: { userId: userId },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!conversation) {
        res
          .status(404)
          .json(
            errorResponse("CONVERSATION_NOT_FOUND", "Conversation not found")
          );
        return;
      }

      // Verify access
      const hasAccess =
        conversation.type === "DIRECT"
          ? conversation.userOneId === userId ||
            conversation.userTwoId === userId
          : conversation.group && conversation.group.members.length > 0;

      if (!hasAccess) {
        res
          .status(403)
          .json(
            errorResponse(
              "UNAUTHORIZED",
              "You don't have access to this conversation"
            )
          );
        return;
      }

      // Fetch messages with pagination
      const messages = await prisma.message.findMany({
        where: { conversationId },
        take: Number(limit),
        ...(cursor && {
          cursor: { id: cursor as string },
          skip: 1,
        }),
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Update last read
      await prisma.conversationRead.upsert({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        update: {
          lastReadAt: new Date(),
        },
        create: {
          conversationId,
          userId,
          lastReadAt: new Date(),
        },
      });

      return res.status(200).json(
        successResponse({
          messages: messages.reverse(),
          nextCursor: messages.length === Number(limit) ? messages[0].id : null,
        })
      );
    }
  );

  getConversations = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
        return;
      }

      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [
            { userOneId: userId },
            { userTwoId: userId },
            {
              group: {
                members: {
                  some: { userId },
                },
                isDeleted: false,
              },
            },
          ],
        },
        include: {
          userOne: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          userTwo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              description: true,
              avatar: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          reads: {
            where: { userId },
            select: {
              lastReadAt: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      // Calculate unread count for each conversation
      const conversationsWithUnread = await Promise.all(
        conversations.map(async (conv) => {
          const lastRead = conv.reads[0]?.lastReadAt || new Date(0);
          const unreadCount = await prisma.message.count({
            where: {
              conversationId: conv.id,
              createdAt: { gt: lastRead },
              senderId: { not: userId },
            },
          });

          return {
            id: conv.id,
            type: conv.type,
            lastMessage: conv.messages[0] || null,
            unreadCount,
            totalMessages: conv._count.messages,
            ...(conv.type === "DIRECT" && {
              participant:
                conv.userOneId === userId ? conv.userTwo : conv.userOne,
            }),
            ...(conv.type === "GROUP" && {
              group: conv.group,
            }),
            updatedAt: conv.updatedAt,
          };
        })
      );

      return res.status(200).json(successResponse(conversationsWithUnread));
    }
  );

  markAsRead = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
        return;
      }

      const { conversationId } = req.params;

      if (!conversationId) {
        res
          .status(400)
          .json(
            errorResponse("VALIDATION_ERROR", "conversationId is required")
          );
        return;
      }

      const conversationRead = await prisma.conversationRead.upsert({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        update: {
          lastReadAt: new Date(),
        },
        create: {
          conversationId,
          userId,
          lastReadAt: new Date(),
        },
      });

      return res.status(200).json(successResponse(conversationRead));
    }
  );

  deleteMessage = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
        return;
      }

      const { messageId } = req.params;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { senderId: true },
      });

      if (!message) {
        res
          .status(404)
          .json(errorResponse("MESSAGE_NOT_FOUND", "Message not found"));
        return;
      }

      if (message.senderId !== userId) {
        res
          .status(403)
          .json(
            errorResponse(
              "UNAUTHORIZED",
              "You can only delete your own messages"
            )
          );
        return;
      }

      await prisma.message.delete({
        where: { id: messageId },
      });

      return res
        .status(200)
        .json(successResponse({ message: "Message deleted successfully" }));
    }
  );
}
