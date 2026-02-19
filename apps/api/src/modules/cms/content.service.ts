import { AppError } from "../../middleware/error.middleware";
import prisma from "../../config/database";
import { createPaginationMeta } from "../../utils/response";
import { logger } from "../../utils/logger";

export interface CreateContentRequest {
  type: "BLOG" | "GRAPHIC" | "VIDEO";
  title: string;
  slug?: string;
  summary?: string;
  content?: string; // For blog posts
  categoryId: string;
  authorName: string;
  publishDate?: Date;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isPublic?: boolean;
  isFeatured?: boolean;
  showInApp?: boolean;
  
  // Media fields
  thumbnailUrl?: string;
  imageUrl?: string; // For graphics
  videoUrl?: string; // YouTube URL for videos
  
  // Training/Workshop fields
  isTraining?: boolean;
  eventDate?: Date;
  eventLink?: string;
  
  // Tags
  tagIds?: string[];
}

export interface UpdateContentRequest extends Partial<CreateContentRequest> {}

export interface ContentQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: "BLOG" | "GRAPHIC" | "VIDEO";
  categoryId?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isPublic?: boolean;
  isFeatured?: boolean;
  isTraining?: boolean;
  showInApp?: boolean;
  publishedAfter?: Date;
  publishedBefore?: Date;
}

export class ContentService {
  async create(data: CreateContentRequest) {
    // Use transaction to ensure data consistency
    return await prisma.$transaction(async (tx) => {
      // Validate category exists
      const category = await tx.category.findFirst({
        where: { id: data.categoryId, isActive: true }
      });

      if (!category) {
        throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
      }

      // Generate slug if not provided
      const slug = data.slug || this.generateSlug(data.title);
      
      // Check slug uniqueness
      const existingContent = await tx.content.findFirst({
        where: { slug, isDeleted: false }
      });

      if (existingContent) {
        throw new AppError("Content with this slug already exists", 400, "SLUG_EXISTS");
      }

      // Validate content type specific fields
      this.validateContentTypeFields(data);

      // Validate tags if provided
      if (data.tagIds && data.tagIds.length > 0) {
        const tags = await tx.tag.findMany({
          where: { id: { in: data.tagIds } }
        });

        if (tags.length !== data.tagIds.length) {
          throw new AppError("One or more tags not found", 404, "TAGS_NOT_FOUND");
        }
      }

      // Create content
      const content = await tx.content.create({
        data: {
          type: data.type,
          title: data.title,
          slug,
          summary: data.summary,
          content: data.content,
          categoryId: data.categoryId,
          authorName: data.authorName,
          publishDate: data.publishDate || (data.status === "PUBLISHED" ? new Date() : null),
          status: data.status || "DRAFT",
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
          isFeatured: data.isFeatured || false,
          showInApp: data.showInApp !== undefined ? data.showInApp : true,
          thumbnailUrl: data.thumbnailUrl,
          imageUrl: data.imageUrl,
          videoUrl: data.videoUrl,
          isTraining: data.isTraining || false,
          eventDate: data.eventDate,
          eventLink: data.eventLink,
          isDeleted: false
        }
      });

      // Create tag associations if provided
      if (data.tagIds && data.tagIds.length > 0) {
        await tx.contentTag.createMany({
          data: data.tagIds.map(tagId => ({
            contentId: content.id,
            tagId
          }))
        });
      }

      // Fetch content with relations
      return await tx.content.findUnique({
        where: { id: content.id },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          contentTags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        }
      });
    });
  }

  async findMany(options: ContentQueryOptions = {}) {
    const {
      page = 1,
      pageSize = 10,
      search,
      type,
      categoryId,
      status,
      isPublic,
      isFeatured,
      isTraining,
      showInApp,
      publishedAfter,
      publishedBefore
    } = options;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: any = {
      isDeleted: false
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { authorName: { contains: search, mode: "insensitive" } }
      ];
    }

    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (isPublic !== undefined) where.isPublic = isPublic;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (isTraining !== undefined) where.isTraining = isTraining;
    if (showInApp !== undefined) where.showInApp = showInApp;

    if (publishedAfter || publishedBefore) {
      where.publishDate = {};
      if (publishedAfter) where.publishDate.gte = publishedAfter;
      if (publishedBefore) where.publishDate.lte = publishedBefore;
    }

    // Get content with related data
    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip,
        take,
        orderBy: [
          { isFeatured: "desc" },
          { publishDate: "desc" },
          { createdAt: "desc" }
        ],
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          contentTags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        }
      }),
      prisma.content.count({ where })
    ]);

    const meta = createPaginationMeta(page, pageSize, total);

    return {
      content,
      meta
    };
  }

  async findById(id: string) {
    const content = await prisma.content.findFirst({
      where: { id, isDeleted: false },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true
          }
        },
        contentTags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      }
    });

    if (!content) {
      throw new AppError("Content not found", 404, "CONTENT_NOT_FOUND");
    }

    return content;
  }

  async findBySlug(slug: string) {
    const content = await prisma.content.findFirst({
      where: { 
        slug, 
        isDeleted: false,
        status: "PUBLISHED" // Only return published content for public access
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true
          }
        },
        contentTags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      }
    });

    if (!content) {
      throw new AppError("Content not found", 404, "CONTENT_NOT_FOUND");
    }

    return content;
  }

  async update(id: string, data: UpdateContentRequest) {
    return await prisma.$transaction(async (tx) => {
      // Check if content exists
      const existingContent = await tx.content.findFirst({
        where: { id, isDeleted: false }
      });

      if (!existingContent) {
        throw new AppError("Content not found", 404, "CONTENT_NOT_FOUND");
      }

      // Validate category if being updated
      if (data.categoryId) {
        const category = await tx.category.findFirst({
          where: { id: data.categoryId, isActive: true }
        });

        if (!category) {
          throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
        }
      }

      // Generate new slug if title is being updated
      let slug = data.slug;
      if (data.title && !slug) {
        slug = this.generateSlug(data.title);
      }

      // Check slug uniqueness if slug is being updated
      if (slug && slug !== existingContent.slug) {
        const existingWithSlug = await tx.content.findFirst({
          where: { slug, isDeleted: false, id: { not: id } }
        });

        if (existingWithSlug) {
          throw new AppError("Content with this slug already exists", 400, "SLUG_EXISTS");
        }
      }

      // Validate tags if provided
      if (data.tagIds && data.tagIds.length > 0) {
        const tags = await tx.tag.findMany({
          where: { id: { in: data.tagIds } }
        });

        if (tags.length !== data.tagIds.length) {
          throw new AppError("One or more tags not found", 404, "TAGS_NOT_FOUND");
        }
      }

      // Validate content type specific fields if type is being updated
      if (data.type || data.imageUrl || data.videoUrl || data.content) {
        this.validateContentTypeFields({
          ...existingContent,
          ...data
        } as CreateContentRequest);
      }

      // Prepare update data
      const updateData: any = {};
      
      // Only update provided fields
      if (data.type !== undefined) updateData.type = data.type;
      if (data.title !== undefined) updateData.title = data.title;
      if (slug !== undefined) updateData.slug = slug;
      if (data.summary !== undefined) updateData.summary = data.summary;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.authorName !== undefined) updateData.authorName = data.authorName;
      if (data.publishDate !== undefined) updateData.publishDate = data.publishDate;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
      if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
      if (data.showInApp !== undefined) updateData.showInApp = data.showInApp;
      if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
      if (data.isTraining !== undefined) updateData.isTraining = data.isTraining;
      if (data.eventDate !== undefined) updateData.eventDate = data.eventDate;
      if (data.eventLink !== undefined) updateData.eventLink = data.eventLink;

      // Set publish date if status is being changed to published
      if (data.status === "PUBLISHED" && !existingContent.publishDate) {
        updateData.publishDate = new Date();
      }

      // Update content
      const content = await tx.content.update({
        where: { id },
        data: updateData
      });

      // Update tag associations if provided
      if (data.tagIds !== undefined) {
        // Remove existing tag associations
        await tx.contentTag.deleteMany({
          where: { contentId: id }
        });

        // Create new associations if tags provided
        if (data.tagIds.length > 0) {
          await tx.contentTag.createMany({
            data: data.tagIds.map(tagId => ({
              contentId: id,
              tagId
            }))
          });
        }
      }

      // Fetch updated content with relations
      return await tx.content.findUnique({
        where: { id },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          contentTags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        }
      });
    });
  }

  async delete(id: string) {
    // Check if content exists
    const content = await prisma.content.findFirst({
      where: { id, isDeleted: false }
    });

    if (!content) {
      throw new AppError("Content not found", 404, "CONTENT_NOT_FOUND");
    }

    // Soft delete
    await prisma.content.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    return { message: "Content deleted successfully" };
  }

  async getFeaturedContent(limit: number = 5) {
    return prisma.content.findMany({
      where: {
        isDeleted: false,
        status: "PUBLISHED",
        isFeatured: true
      },
      take: limit,
      orderBy: { publishDate: "desc" },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
  }

  async getPublicContent(options: ContentQueryOptions = {}) {
    return this.findMany({
      ...options,
      status: "PUBLISHED",
      isPublic: true
    });
  }

  async getTrainingContent(options: ContentQueryOptions = {}) {
    return this.findMany({
      ...options,
      status: "PUBLISHED",
      isTraining: true
    });
  }

  async getContentStats() {
    const [
      totalContent,
      publishedContent,
      draftContent,
      featuredContent,
      blogCount,
      graphicCount,
      videoCount,
      trainingContent
    ] = await Promise.all([
      prisma.content.count({ where: { isDeleted: false } }),
      prisma.content.count({ where: { isDeleted: false, status: "PUBLISHED" } }),
      prisma.content.count({ where: { isDeleted: false, status: "DRAFT" } }),
      prisma.content.count({ where: { isDeleted: false, isFeatured: true } }),
      prisma.content.count({ where: { isDeleted: false, type: "BLOG" } }),
      prisma.content.count({ where: { isDeleted: false, type: "GRAPHIC" } }),
      prisma.content.count({ where: { isDeleted: false, type: "VIDEO" } }),
      prisma.content.count({ where: { isDeleted: false, isTraining: true } })
    ]);

    return {
      totalContent,
      byStatus: {
        published: publishedContent,
        draft: draftContent
      },
      byType: {
        blog: blogCount,
        graphic: graphicCount,
        video: videoCount
      },
      featured: featuredContent,
      training: trainingContent
    };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single
      .trim();
  }

  private validateContentTypeFields(data: CreateContentRequest) {
    switch (data.type) {
      case "BLOG":
        if (!data.content || data.content.trim().length === 0) {
          throw new AppError("Blog content is required", 400, "BLOG_CONTENT_REQUIRED");
        }
        break;
      
      case "GRAPHIC":
        // Only require imageUrl for GRAPHIC type
        if (!data.imageUrl || (typeof data.imageUrl === 'string' && data.imageUrl.trim().length === 0)) {
          throw new AppError("Image URL is required for graphic content", 400, "IMAGE_URL_REQUIRED");
        }
        break;
      
      case "VIDEO":
        if (!data.videoUrl || data.videoUrl.trim().length === 0) {
          throw new AppError("Video URL is required for video content", 400, "VIDEO_URL_REQUIRED");
        }
        // Basic YouTube URL validation
        if (!this.isValidYouTubeUrl(data.videoUrl)) {
          throw new AppError("Invalid YouTube URL", 400, "INVALID_YOUTUBE_URL");
        }
        break;
    }
  }

  private isValidYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}$/;
    return youtubeRegex.test(url);
  }

  private async associateTags(contentId: string, tagIds: string[]) {
    // Validate all tags exist
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } }
    });

    if (tags.length !== tagIds.length) {
      throw new AppError("One or more tags not found", 404, "TAGS_NOT_FOUND");
    }

    // Create associations
    await prisma.contentTag.createMany({
      data: tagIds.map(tagId => ({
        contentId,
        tagId
      }))
    });
  }
}