const Joi = require("joi");

// CREATE CATEGORY
export const validateCreateCategoryData = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(100).required().messages({
      "string.empty": "Category name is required",
      "string.min": "Category name must be at least 1 character",
      "string.max": "Category name must not exceed 100 characters",
      "any.required": "Category name is required",
    }),

    description: Joi.string().max(500).optional().allow("").messages({
      "string.max": "Category description must not exceed 500 characters",
    }),

    slug: Joi.string()
      .min(1)
      .max(100)
      .pattern(/^[a-z0-9-]+$/)
      .optional()
      .messages({
        "string.pattern.base":
          "Slug can only contain lowercase letters, numbers, and hyphens",
        "string.min": "Slug must be at least 1 character",
        "string.max": "Slug must not exceed 100 characters",
      }),

    isActive: Joi.boolean().default(true),
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

// UPDATE CATEGORY
export const validateUpdateCategoryData = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(100).optional().messages({
      "string.empty": "Category name cannot be empty",
      "string.min": "Category name must be at least 1 character",
      "string.max": "Category name must not exceed 100 characters",
    }),

    description: Joi.string().max(500).optional().allow("").messages({
      "string.max": "Category description must not exceed 500 characters",
    }),

    slug: Joi.string()
      .min(1)
      .max(100)
      .pattern(/^[a-z0-9-]+$/)
      .optional()
      .messages({
        "string.pattern.base":
          "Slug can only contain lowercase letters, numbers, and hyphens",
        "string.min": "Slug must be at least 1 character",
        "string.max": "Slug must not exceed 100 characters",
      }),

    isActive: Joi.boolean().optional(),
  })
    .min(1)
    .messages({
      "object.min": "At least one field must be provided for update",
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

// CATEGORY QUERY PARAMS
export const validateCategoryQueryParams = (query: any) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1).optional().messages({
      "number.base": "Page must be a number",
      "number.integer": "Page must be an integer",
      "number.min": "Page must be at least 1",
    }),

    pageSize: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .optional()
      .messages({
        "number.base": "Page size must be a number",
        "number.integer": "Page size must be an integer",
        "number.min": "Page size must be at least 1",
        "number.max": "Page size must not exceed 100",
      }),

    search: Joi.string().max(255).optional().messages({
      "string.max": "Search term must not exceed 255 characters",
    }),

    isActive: Joi.boolean().optional().messages({
      "boolean.base": "isActive must be a boolean value",
    }),
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

// CATEGORY PARAMS
export const validateCategoryParams = (params: any) => {
  const schema = Joi.object({
    id: Joi.string().uuid().optional().messages({
      "string.guid": "Category ID must be a valid UUID",
    }),

    slug: Joi.string()
      .min(1)
      .max(100)
      .pattern(/^[a-z0-9-]+$/)
      .optional()
      .messages({
        "string.pattern.base":
          "Slug can only contain lowercase letters, numbers, and hyphens",
        "string.min": "Slug must be at least 1 character",
        "string.max": "Slug must not exceed 100 characters",
      }),
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
