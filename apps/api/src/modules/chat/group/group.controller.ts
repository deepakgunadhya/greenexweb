import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/auth.middleware";
import { asyncHandler } from "../../../middleware/error.middleware";
import { errorResponse, successResponse } from "../../../utils/response";
import { validateCreateGroupData } from "./group.validator";
import prisma from "../../../config/database";

const isOwner = async (groupId: string, userId: string) => {
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      createdBy: userId,
    },
    select: { id: true },
  });

  return !!group;
};

const isAdmin = async (groupId: string, userId: string) => {
  const member = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      role: "ADMIN",
    },
    select: { id: true },
  });

  return !!member;
};

export class GroupController {
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const ownerId = req.user?.id;
    if (!ownerId) {
      res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
      return;
    }

    const { error, value } = validateCreateGroupData(req.body);
    if (error) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Validation failed", error.details)
        );
    }

    const { name, description } = value;

    const group = await prisma.group.create({
      data: {
        name,
        description,
        createdBy: ownerId,
        members: {
          create: {
            userId: ownerId,
            role: "ADMIN",
          },
        },
      },
    });

    res.status(201).json(successResponse(group));
  });

  update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
      return;
    }
    const { groupId } = req.params;
    const { name, description } = req.body || {};

    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
        isDeleted: false,
      },
    });

    if (!group) {
      res
        .status(400)
        .json(errorResponse("GROUP_NOT-FOUND", "Group not found!"));
      return;
    }

    const owner = await isOwner(groupId, userId);
    const admin = await isAdmin(groupId, userId);

    if (!(owner || admin)) {
      res
        .status(400)
        .json(
          errorResponse(
            "UNAUTHORIZED",
            "You are not authorized to update the group!"
          )
        );
      return;
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });

    return res.status(200).json(successResponse(200, updatedGroup));
  });

  delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
      return;
    }
    const { groupId } = req.params;
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
    });

    if (!group) {
      res
        .status(400)
        .json(errorResponse("GROUP_NOT-FOUND", "Group not found!"));
      return;
    }

    const owner = await isOwner(groupId, userId);

    if (!owner) {
      res
        .status(400)
        .json(
          errorResponse(
            "UNAUTHORIZED",
            "You are not authorized to delete the group only owner can delete it!"
          )
        );
      return;
    }

    const deletedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        isDeleted: true,
        deletedById: userId,
        deletedAt: new Date(),
      },
    });

    return res.status(200).json(successResponse(200, deletedGroup));
  });

  addMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.user?.id;
    if (!adminId) {
      res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
      return;
    }

    const { groupId } = req.params;
    const { user_id } = req.body || {};

    if (!user_id) {
      res
        .status(400)
        .json(errorResponse("USER_ID_NOT_FOUND", "please provide user id!"));
      return;
    }
    if (user_id === adminId) {
      res
        .status(400)
        .json(errorResponse("Conflict", "User already exists in the group"));
      return;
    }

    if (!groupId) {
      res
        .status(400)
        .json(errorResponse("GROUP_ID_NOT-FOUND", "Group Id not found!"));
      return;
    }

    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
        isDeleted: false,
      },
    });

    if (!group) {
      res
        .status(400)
        .json(errorResponse("GROUP_NOT-FOUND", "Group not found!"));
      return;
    }

    const owner = await isOwner(groupId, adminId);
    const admin = await isAdmin(groupId, adminId);

    if (!(owner || admin)) {
      res
        .status(400)
        .json(
          errorResponse(
            "UNAUTHORIZED",
            "You are not authorized to add member the group!"
          )
        );
      return;
    }

    const target = await prisma.user.findUnique({
      where: {
        id: user_id,
        isActive: true,
      },
    });

    if (!target) {
      res
        .status(400)
        .json(
          errorResponse(
            "USER_NOT_FOUND",
            "the user you are trying to add in group is not active or not exist!"
          )
        );
      return;
    }
    const existing = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: user_id,
        },
      },
    });
    if (existing) {
      res
        .status(400)
        .json(errorResponse("Conflict", "User already exists in the group"));
      return;
    }
    const member = await prisma.groupMember.create({
      data: {
        groupId: groupId,
        userId: user_id,
      },
    });
    res.status(201).json(successResponse(member));
  });

  removeMember = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
        return;
      }

      const { groupId, userId } = req.params;

      if (!userId) {
        res
          .status(400)
          .json(errorResponse("USER_ID_NOT_FOUND", "please provide user id!"));
        return;
      }
      if (userId === adminId) {
        res
          .status(400)
          .json(errorResponse("Conflict", "cannot remove owner from group"));
        return;
      }

      if (!groupId) {
        res
          .status(400)
          .json(errorResponse("GROUP_ID_NOT-FOUND", "Group Id not found!"));
        return;
      }

      const group = await prisma.group.findUnique({
        where: {
          id: groupId,
          isDeleted: false,
        },
      });

      if (!group) {
        res
          .status(400)
          .json(errorResponse("GROUP_NOT-FOUND", "Group not found!"));
        return;
      }

      const owner = await isOwner(groupId, adminId);
      const admin = await isAdmin(groupId, adminId);

      if (!(owner || admin)) {
        res
          .status(400)
          .json(
            errorResponse(
              "UNAUTHORIZED",
              "You are not authorized to remove member the group!"
            )
          );
        return;
      }

      try {
        await prisma.groupMember.delete({
          where: {
            groupId_userId: {
              groupId,
              userId: userId,
            },
          },
        });
        res.status(201).json(successResponse(group));
        return;
      } catch (error) {
        res
          .status(400)
          .json(
            errorResponse("MEMBER_NOT_FOUND", "Member not found in this group!")
          );
        return;
      }
    }
  );

  setMemberRole = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
        return;
      }

      const { groupId, userId } = req.params;
      const { role } = req.body || {};

      if (!role || !["MEMBER", "ADMIN"].includes(role)) {
        return res
          .status(400)
          .json(
            errorResponse("INVALID_ROLE", "Role must be either MEMBER or ADMIN")
          );
      }

      const group = await prisma.group.findUnique({
        where: {
          id: groupId,
          isDeleted: false,
        },
      });

      if (!group) {
        res
          .status(400)
          .json(errorResponse("GROUP_NOT-FOUND", "Group not found!"));
        return;
      }

      if (group.createdBy !== adminId) {
        res
          .status(400)
          .json(
            errorResponse("CONFLICT", "Only owner can change role in group!")
          );
        return;
      }
      const existing = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: groupId,
            userId: userId,
          },
        },
      });

      if (!existing) {
        return res
          .status(400)
          .json(
            errorResponse("GROUP_Member_NOT_FOUND", "Group member not found!")
          );
      }
      if (userId === group.createdBy) {
        res
          .status(400)
          .json(errorResponse("CONFLICT", "Owner role cannot be changed!"));
        return;
      }
      const gm = await prisma.groupMember.update({
        where: {
          groupId_userId: {
            groupId,
            userId: userId,
          },
        },
        data: {
          role: role,
        },
      });

      res.status(201).json(successResponse(gm));
    }
  );

  getMyGroups = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(400).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
        return;
      }

      const groups = await prisma.group.findMany({
        where: {
          isDeleted: false,
          members: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (groups.length === 0) {
        return res.status(200).json(successResponse([]));
      }

      const normalized = groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        avatar: g.avatar,
        created_by: g.createdBy,
        owner: g.owner,
        members: g.members.map((gm) => ({
          id: gm.user.id,
          firstName: gm.user.firstName,
          lastName: gm.user.lastName,
          email: gm.user.email,
          role: gm.role,
        })),
      }));

      return res.status(200).json(successResponse(normalized));
    }
  );
}
