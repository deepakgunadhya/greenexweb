const Joi = require("joi");

// -------------------- CREATE TAG --------------------
export const validateCreateTagData = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(50).required().messages({
      "string.empty": "Tag name is required",
      "string.min": "Tag name must be at least 1 character",
      "string.max": "Tag name must not exceed 50 characters",
      "any.required": "Tag name is required",
    }),

    slug: Joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-z0-9-]+$/)
      .optional()
      .messages({
        "string.pattern.base":
          "Slug can only contain lowercase letters, numbers, and hyphens",
        "string.min": "Slug must be at least 1 character",
        "string.max": "Slug must not exceed 50 characters",
      }),
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

// -------------------- UPDATE TAG --------------------
export const validateUpdateTagData = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(50).optional().messages({
      "string.empty": "Tag name cannot be empty",
      "string.min": "Tag name must be at least 1 character",
      "string.max": "Tag name must not exceed 50 characters",
    }),

    slug: Joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-z0-9-]+$/)
      .optional()
      .messages({
        "string.pattern.base":
          "Slug can only contain lowercase letters, numbers, and hyphens",
        "string.min": "Slug must be at least 1 character",
        "string.max": "Slug must not exceed 50 characters",
      }),
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

// -------------------- TAG QUERY PARAMS --------------------
export const validateTagQueryParams = (query: any) => {
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

    hasContent: Joi.boolean().optional().messages({
      "boolean.base": "hasContent must be a boolean value",
    }),

    limit: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(10)
      .optional()
      .messages({
        "number.base": "Limit must be a number",
        "number.integer": "Limit must be an integer",
        "number.min": "Limit must be at least 1",
        "number.max": "Limit must not exceed 50",
      }),

    tagIds: Joi.array().items(Joi.string().uuid()).optional().messages({
      "array.base": "tagIds must be an array",
      "string.guid": "Each tag ID must be a valid UUID",
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

// -------------------- TAG PARAMS --------------------
export const validateTagParams = (params: any) => {
  const schema = Joi.object({
    id: Joi.string().uuid().optional().messages({
      "string.guid": "Tag ID must be a valid UUID",
    }),

    slug: Joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-z0-9-]+$/)
      .optional()
      .messages({
        "string.pattern.base":
          "Slug can only contain lowercase letters, numbers, and hyphens",
        "string.min": "Slug must be at least 1 character",
        "string.max": "Slug must not exceed 50 characters",
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

// -------------------- BULK CREATE TAGS --------------------
export const validateBulkCreateTagsData = (data: any) => {
  const schema = Joi.object({
    tagNames: Joi.array()
      .items(
        Joi.string().min(1).max(50).required().messages({
          "string.empty": "Tag name cannot be empty",
          "string.min": "Tag name must be at least 1 character",
          "string.max": "Tag name must not exceed 50 characters",
        })
      )
      .min(1)
      .max(20)
      .unique()
      .required()
      .messages({
        "array.base": "tagNames must be an array",
        "array.min": "At least one tag name is required",
        "array.max": "Cannot create more than 20 tags at once",
        "array.unique": "Tag names must be unique",
        "any.required": "tagNames is required",
      }),
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
