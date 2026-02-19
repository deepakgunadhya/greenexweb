import prisma from "../config/database";

export const getGroupOfUser = async (userId: string) => {
  if (!userId) {
    return [];
  }

  const groups = await prisma.group.findMany({
    where: {
      isDeleted: false,
      members: {
        some: {
          userId,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  // Always return an array
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    avatar: g.avatar,
    created_by: g.createdBy,
    owner: g.owner,
    members: g.members.map((gm) => ({
      id: gm.user?.id,
      firstName: gm.user?.firstName,
      lastName: gm.user?.lastName,
      email: gm.user?.email,
      role: gm.role,
    })),
  }));
};
