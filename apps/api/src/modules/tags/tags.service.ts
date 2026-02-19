import { AppError } from "../../middleware/error.middleware";
import prisma from "../../config/database";
import { createPaginationMeta } from "../../utils/response";
import { logger } from "../../utils/logger";

export interface CreateTagRequest {
  name: string;
  slug?: string;
}

export interface UpdateTagRequest extends Partial<CreateTagRequest> {}

export interface TagQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  hasContent?: boolean;
}

export class TagsService {
  async create(data: CreateTagRequest) {
    // Generate slug if not provided
    const slug = data.slug || this.generateSlug(data.name);
    
    // Check if tag with same name or slug exists
    const existingTag = await prisma.tag.findFirst({
      where: {
        OR: [
          { name: data.name },
          { slug }
        ]
      }
    });

    if (existingTag) {
      if (existingTag.name === data.name) {
        throw new AppError("Tag with this name already exists", 400, "TAG_NAME_EXISTS");
      }
      if (existingTag.slug === slug) {
        throw new AppError("Tag with this slug already exists", 400, "TAG_SLUG_EXISTS");
      }
    }

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        slug
      },
      include: {
        _count: {
          select: { contentTags: true }
        }
      }
    });

    return tag;
  }

  async findMany(options: TagQueryOptions = {}) {
    const {
      page = 1,
      pageSize = 20,
      search,
      hasContent
    } = options;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } }
      ];
    }

    if (hasContent !== undefined) {
      if (hasContent) {
        where.contentTags = {
          some: {}
        };
      } else {
        where.contentTags = {
          none: {}
        };
      }
    }

    // Get tags with content count
    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { contentTags: true }
          }
        }
      }),
      prisma.tag.count({ where })
    ]);

    const meta = createPaginationMeta(page, pageSize, total);

    return {
      tags,
      meta
    };
  }

  async findAll() {
    return prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { contentTags: true }
        }
      }
    });
  }

  async findById(id: string) {
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contentTags: true }
        }
      }
    });

    if (!tag) {
      throw new AppError("Tag not found", 404, "TAG_NOT_FOUND");
    }

    return tag;
  }

  async findBySlug(slug: string) {
    const tag = await prisma.tag.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { contentTags: true }
        }
      }
    });

    if (!tag) {
      throw new AppError("Tag not found", 404, "TAG_NOT_FOUND");
    }

    return tag;
  }

  async findByIds(ids: string[]) {
    const tags = await prisma.tag.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: { contentTags: true }
        }
      }
    });

    return tags;
  }

  async update(id: string, data: UpdateTagRequest) {
    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id }
    });

    if (!existingTag) {
      throw new AppError("Tag not found", 404, "TAG_NOT_FOUND");
    }

    // Generate new slug if name is being updated
    let slug = data.slug;
    if (data.name && !slug) {
      slug = this.generateSlug(data.name);
    }

    // Check for name/slug conflicts (excluding current tag)
    if (data.name || slug) {
      const conflictWhere: any = {
        id: { not: id }
      };

      if (data.name && slug) {
        conflictWhere.OR = [
          { name: data.name },
          { slug }
        ];
      } else if (data.name) {
        conflictWhere.name = data.name;
      } else if (slug) {
        conflictWhere.slug = slug;
      }

      const conflictingTag = await prisma.tag.findFirst({
        where: conflictWhere
      });

      if (conflictingTag) {
        if (conflictingTag.name === data.name) {
          throw new AppError("Tag with this name already exists", 400, "TAG_NAME_EXISTS");
        }
        if (conflictingTag.slug === slug) {
          throw new AppError("Tag with this slug already exists", 400, "TAG_SLUG_EXISTS");
        }
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (slug !== undefined) updateData.slug = slug;

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { contentTags: true }
        }
      }
    });

    return tag;
  }

  async delete(id: string) {
    // Check if tag exists
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contentTags: true }
        }
      }
    });

    if (!tag) {
      throw new AppError("Tag not found", 404, "TAG_NOT_FOUND");
    }

    // Check if tag is used by content
    if (tag._count.contentTags > 0) {
      throw new AppError(
        "Cannot delete tag that is assigned to content. Please remove the tag from content first.",
        400,
        "TAG_IN_USE"
      );
    }

    await prisma.tag.delete({
      where: { id }
    });

    return { message: "Tag deleted successfully" };
  }

  async getPopularTags(limit: number = 10) {
    return prisma.tag.findMany({
      orderBy: {
        contentTags: {
          _count: "desc"
        }
      },
      take: limit,
      include: {
        _count: {
          select: { contentTags: true }
        }
      }
    });
  }

  async getTagsWithContent(tagIds?: string[]) {
    const where: any = {};

    if (tagIds && tagIds.length > 0) {
      where.id = { in: tagIds };
    }

    return prisma.tag.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        contentTags: {
          include: {
            content: {
              select: {
                id: true,
                type: true,
                title: true,
                slug: true,
                summary: true,
                thumbnailUrl: true,
                publishDate: true,
                status: true,
                isFeatured: true,
                isTraining: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                }
              }
            }
          },
          where: {
            content: {
              isDeleted: false,
              status: "PUBLISHED"
            }
          },
          orderBy: {
            content: {
              publishDate: "desc"
            }
          }
        },
        _count: {
          select: { contentTags: true }
        }
      }
    });
  }

  async getTagStats() {
    const [
      totalTags,
      tagsWithContent,
      unusedTags,
      tagUsageDistribution
    ] = await Promise.all([
      prisma.tag.count(),
      prisma.tag.count({
        where: {
          contentTags: {
            some: {}
          }
        }
      }),
      prisma.tag.count({
        where: {
          contentTags: {
            none: {}
          }
        }
      }),
      prisma.tag.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: { contentTags: true }
          }
        },
        orderBy: {
          contentTags: {
            _count: "desc"
          }
        },
        take: 10
      })
    ]);

    return {
      totalTags,
      tagsWithContent,
      unusedTags,
      topTags: tagUsageDistribution
    };
  }

  async bulkCreate(tagNames: string[]) {
    // Filter out empty names and normalize
    const normalizedNames = tagNames
      .filter(name => name && name.trim().length > 0)
      .map(name => name.trim());

    if (normalizedNames.length === 0) {
      throw new AppError("No valid tag names provided", 400, "NO_VALID_TAGS");
    }

    // Check for existing tags
    const existingTags = await prisma.tag.findMany({
      where: {
        name: { in: normalizedNames }
      }
    });

    const existingNames = existingTags.map(tag => tag.name);
    const newNames = normalizedNames.filter(name => !existingNames.includes(name));

    if (newNames.length === 0) {
      return existingTags;
    }

    // Create new tags
    const newTags = await prisma.tag.createMany({
      data: newNames.map(name => ({
        name,
        slug: this.generateSlug(name)
      }))
    });

    // Return all tags (existing + new)
    return prisma.tag.findMany({
      where: {
        name: { in: normalizedNames }
      },
      include: {
        _count: {
          select: { contentTags: true }
        }
      }
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .trim();
  }
}