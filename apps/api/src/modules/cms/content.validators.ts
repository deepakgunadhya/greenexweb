const Joi = require("joi");

// -------------------- CREATE CONTENT --------------------
export const validateCreateContentData = (data: any) => {
  const schema = Joi.object({
    type: Joi.string().valid("BLOG", "GRAPHIC", "VIDEO").required(),

    title: Joi.string().min(1).max(255).required(),

    slug: Joi.string().min(1).max(255).optional(),

    summary: Joi.string().max(500).optional().allow(""),

    content: Joi.string().optional().allow(""),

    categoryId: Joi.string().uuid().required(),

    authorName: Joi.string().min(1).max(100).required(),

    publishDate: Joi.date().iso().optional(),

    status: Joi.string()
      .valid("DRAFT", "PUBLISHED", "ARCHIVED")
      .default("DRAFT"),

    isPublic: Joi.boolean().default(true),
    isFeatured: Joi.boolean().default(false),
    showInApp: Joi.boolean().default(true),
    thumbnailUrl: Joi.string().optional().allow("", null),
    imageUrl: Joi.string().optional().allow("", null),
    videoUrl: Joi.string().optional().allow("", null),
    eventLink: Joi.string().optional().allow("", null),

    isTraining: Joi.boolean().default(false),
    eventDate: Joi.date().iso().optional(),

    tagIds: Joi.array().items(Joi.string().uuid()).optional(),
  })
    .custom((value, helpers) => {
      switch (value.type) {
        case "BLOG":
          if (!value.content || value.content.trim().length === 0) {
            return helpers.error("content.blog.required");
          }
          break;

        case "GRAPHIC":
          // Only require imageUrl for GRAPHIC type, allow empty string for other types
          if (!value.imageUrl || (typeof value.imageUrl === 'string' && value.imageUrl.trim().length === 0)) {
            return helpers.error("content.graphic.required");
          }
          break;

        case "VIDEO":
          if (!value.videoUrl || value.videoUrl.trim().length === 0) {
            return helpers.error("content.video.required");
          }

          const youtubeRegex =
            /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;

          if (!youtubeRegex.test(value.videoUrl)) {
            return helpers.error("content.video.invalid");
          }
          break;
      }

      if (value.isTraining && value.type === "VIDEO") {
        if (!value.eventDate) {
          return helpers.error("content.training.eventDate.required");
        }
        if (!value.eventLink) {
          return helpers.error("content.training.eventLink.required");
        }
      }

      return value;
    })
    .messages({
      "content.blog.required": "Blog content is required for blog posts",
      "content.graphic.required": "Image URL is required for graphic content",
      "content.video.required": "Video URL is required for video content",
      "content.video.invalid": "Invalid YouTube URL format",
      "content.training.eventDate.required":
        "Event date is required for training content",
      "content.training.eventLink.required":
        "Event link is required for training content",
    });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const details: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const field = detail.path.join(".");
      if (!details[field]) details[field] = [];
      details[field].push(detail.message);
    });
    return { error: { details }, value: null };
  }

  return { error: null, value };
};

// -------------------- UPDATE CONTENT --------------------
export const validateUpdateContentData = (data: any) => {
  const schema = Joi.object({
    type: Joi.string().valid("BLOG", "GRAPHIC", "VIDEO").optional(),
    title: Joi.string().min(1).max(255).optional(),
    slug: Joi.string().min(1).max(255).optional(),
    summary: Joi.string().max(500).optional().allow(""),
    content: Joi.string().optional().allow(""),
    categoryId: Joi.string().uuid().optional(),
    authorName: Joi.string().min(1).max(100).optional(),
    publishDate: Joi.date().iso().optional().allow(null),
    status: Joi.string().valid("DRAFT", "PUBLISHED", "ARCHIVED").optional(),

    isPublic: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    showInApp: Joi.boolean().optional(),

    thumbnailUrl: Joi.string().optional().allow("", null),
    imageUrl: Joi.string().optional().allow("", null),
    videoUrl: Joi.string().optional().allow("", null),

    isTraining: Joi.boolean().optional(),
    eventDate: Joi.date().iso().optional().allow(null),
    eventLink: Joi.string().optional().allow("", null),

    tagIds: Joi.array().items(Joi.string().uuid()).optional(),
  })
    .min(1)
    .custom((value, helpers) => {
      if (value.type) {
        switch (value.type) {
          case "BLOG":
            if (
              value.content !== undefined &&
              (!value.content || value.content.trim().length === 0)
            ) {
              return helpers.error("content.blog.required");
            }
            break;

          case "GRAPHIC":
            // Only require imageUrl when type is GRAPHIC and it's being updated
            if (
              value.imageUrl !== undefined &&
              (!value.imageUrl || (typeof value.imageUrl === 'string' && value.imageUrl.trim().length === 0))
            ) {
              return helpers.error("content.graphic.required");
            }
            break;

          case "VIDEO":
            if (
              value.videoUrl !== undefined &&
              (!value.videoUrl || value.videoUrl.trim().length === 0)
            ) {
              return helpers.error("content.video.required");
            }

            if (value.videoUrl) {
              const youtubeRegex =
                /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
              if (!youtubeRegex.test(value.videoUrl)) {
                return helpers.error("content.video.invalid");
              }
            }
            break;
        }
      }

      return value;
    })
    .messages({
      "object.min": "At least one field must be provided for update",
      "content.blog.required": "Blog content is required for blog posts",
      "content.graphic.required": "Image URL is required for graphic content",
      "content.video.required": "Video URL is required for video content",
      "content.video.invalid": "Invalid YouTube URL format",
    });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const details: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const field = detail.path.join(".");
      if (!details[field]) details[field] = [];
      details[field].push(detail.message);
    });
    return { error: { details }, value: null };
  }

  return { error: null, value };
};

// -------------------- QUERY PARAMS --------------------
export const validateContentQueryParams = (query: any) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    pageSize: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().max(255).optional(),
    type: Joi.string().valid("BLOG", "GRAPHIC", "VIDEO").optional(),
    categoryId: Joi.string().uuid().optional(),
    status: Joi.string().valid("DRAFT", "PUBLISHED", "ARCHIVED").optional(),
    isPublic: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    isTraining: Joi.boolean().optional(),
    showInApp: Joi.boolean().optional(),
    publishedAfter: Joi.date().iso().optional(),
    publishedBefore: Joi.date().iso().optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
  });

  const { error, value } = schema.validate(query, { abortEarly: false });

  if (error) {
    const details: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const field = detail.path.join(".");
      if (!details[field]) details[field] = [];
      details[field].push(detail.message);
    });
    return { error: { details }, value: null };
  }

  return { error: null, value };
};

// -------------------- PARAMS --------------------
export const validateContentParams = (params: any) => {
  const schema = Joi.object({
    id: Joi.string().uuid().optional(),
    slug: Joi.string().min(1).max(255).optional(),
  });

  const { error, value } = schema.validate(params, { abortEarly: false });

  if (error) {
    const details: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const field = detail.path.join(".");
      if (!details[field]) details[field] = [];
      details[field].push(detail.message);
    });
    return { error: { details }, value: null };
  }

  return { error: null, value };
};

// -------------------- BULK OPERATIONS --------------------
export const validateBulkContentData = (data: any) => {
  const schema = Joi.object({
    ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
    action: Joi.string()
      .valid("publish", "archive", "delete", "feature", "unfeature")
      .required(),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const details: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const field = detail.path.join(".");
      if (!details[field]) details[field] = [];
      details[field].push(detail.message);
    });
    return { error: { details }, value: null };
  }

  return { error: null, value };
};
