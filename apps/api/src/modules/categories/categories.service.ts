import { AppError } from "../../middleware/error.middleware";
import prisma from "../../config/database";
import { createPaginationMeta } from "../../utils/response";
import { logger } from "../../utils/logger";

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  slug?: string;
  isActive?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export interface CategoryQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export class CategoriesService {
  async create(data: CreateCategoryRequest) {
    // Generate slug if not provided
    const slug = data.slug || this.generateSlug(data.name);

    // Check if category with same name or slug exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [{ name: data.name }, { slug }],
      },
    });

    if (existingCategory) {
      if (existingCategory.name === data.name) {
        throw new AppError(
          "Category with this name already exists",
          400,
          "CATEGORY_NAME_EXISTS"
        );
      }
      if (existingCategory.slug === slug) {
        throw new AppError(
          "Category with this slug already exists",
          400,
          "CATEGORY_SLUG_EXISTS"
        );
      }
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        slug,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        _count: {
          select: { content: true },
        },
      },
    });

    return category;
  }

  async findMany(options: CategoryQueryOptions = {}) {
    const { page = 1, pageSize = 20, search, isActive } = options;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Get categories with content count
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { content: true },
          },
        },
      }),
      prisma.category.count({ where }),
    ]);

    const meta = createPaginationMeta(page, pageSize, total);

    return {
      categories,
      meta,
    };
  }

  async findAll() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { content: true },
        },
      },
    });
  }

  async findById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { content: true },
        },
      },
    });

    if (!category) {
      throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { content: true },
        },
      },
    });

    if (!category) {
      throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
    }

    return category;
  }

  async update(id: string, data: UpdateCategoryRequest) {
    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
    }

    // Generate new slug if name is being updated
    let slug = data.slug;
    if (data.name && !slug) {
      slug = this.generateSlug(data.name);
    }

    // Check for name/slug conflicts (excluding current category)
    if (data.name || slug) {
      const conflictWhere: any = {
        id: { not: id },
      };

      if (data.name && slug) {
        conflictWhere.OR = [{ name: data.name }, { slug }];
      } else if (data.name) {
        conflictWhere.name = data.name;
      } else if (slug) {
        conflictWhere.slug = slug;
      }

      const conflictingCategory = await prisma.category.findFirst({
        where: conflictWhere,
      });

      if (conflictingCategory) {
        if (conflictingCategory.name === data.name) {
          throw new AppError(
            "Category with this name already exists",
            400,
            "CATEGORY_NAME_EXISTS"
          );
        }
        if (conflictingCategory.slug === slug) {
          throw new AppError(
            "Category with this slug already exists",
            400,
            "CATEGORY_SLUG_EXISTS"
          );
        }
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (slug !== undefined) updateData.slug = slug;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { content: true },
        },
      },
    });

    return category;
  }

  async delete(id: string) {
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { content: true },
        },
      },
    });

    if (!category) {
      throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
    }

    // Check if category has content
    if (category._count.content > 0) {
      throw new AppError(
        "Cannot delete category with existing content. Please move or delete the content first.",
        400,
        "CATEGORY_HAS_CONTENT"
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return { message: "Category deleted successfully" };
  }

  async getCategoriesWithContent() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        content: {
          where: {
            isDeleted: false,
            status: "PUBLISHED",
          },
          select: {
            id: true,
            type: true,
            title: true,
            slug: true,
            summary: true,
            thumbnailUrl: true,
            publishDate: true,
            isFeatured: true,
            isTraining: true,
          },
          orderBy: [{ isFeatured: "desc" }, { publishDate: "desc" }],
          take: 5, // Limit to 5 most recent items per category
        },
        _count: {
          select: { content: true },
        },
      },
    });
  }

  async getCategoryStats() {
    const [
      totalCategories,
      activeCategories,
      categoriesWithContent,
      categoryDistribution,
    ] = await Promise.all([
      prisma.category.count(),
      prisma.category.count({ where: { isActive: true } }),
      prisma.category.count({
        where: {
          content: {
            some: {
              isDeleted: false,
            },
          },
        },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: { content: true },
          },
        },
        orderBy: {
          content: {
            _count: "desc",
          },
        },
      }),
    ]);

    return {
      totalCategories,
      activeCategories,
      categoriesWithContent,
      categoryDistribution,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/--+/g, "-") // Replace multiple hyphens with single
      .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
      .trim();
  }
}
