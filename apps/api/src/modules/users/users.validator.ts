const Joi = require("joi");

export const validateCreateUserData = (data: any) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),

    password: Joi.string()
      .min(8)
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"))
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        "any.required": "Password is required",
      }),

    firstName: Joi.string().trim().min(1).max(50).required().messages({
      "string.min": "First name is required",
      "string.max": "First name must be less than 50 characters",
      "any.required": "First name is required",
    }),

    lastName: Joi.string().trim().min(1).max(50).required().messages({
      "string.min": "Last name is required",
      "string.max": "Last name must be less than 50 characters",
      "any.required": "Last name is required",
    }),

    phone: Joi.string()
      .pattern(new RegExp("^[+]?[1-9][\\d\\s\\-()]{7,15}$"))
      .optional()
      .messages({
        "string.pattern.base": "Please provide a valid phone number",
      }),

    roleIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
      "array.min": "At least one role must be assigned",
      "any.required": "Role IDs are required",
    }),

    organizationId: Joi.string().guid({ version: 'uuidv4' }).optional().messages({
      'string.guid': 'Invalid organization ID',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const details: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const field = detail.path.join(".");
      if (!details[field]) {
        details[field] = [];
      }
      details[field].push(detail.message);
    });
    return { error: { details }, value: null };
  }

  return { error: null, value };
};

export const validateUpdateUserData = (data: any) => {
  const schema = Joi.object({
    email: Joi.string().email().optional().messages({
      "string.email": "Please provide a valid email address",
    }),

    firstName: Joi.string().trim().min(1).max(50).optional().messages({
      "string.min": "First name cannot be empty",
      "string.max": "First name must be less than 50 characters",
    }),

    lastName: Joi.string().trim().min(1).max(50).optional().messages({
      "string.min": "Last name cannot be empty",
      "string.max": "Last name must be less than 50 characters",
    }),

    phone: Joi.string()
      .pattern(new RegExp("^[+]?[1-9][\\d\\s\\-()]{7,15}$"))
      .allow("")
      .optional()
      .messages({
        "string.pattern.base": "Please provide a valid phone number",
      }),

    isActive: Joi.boolean().optional(),

    isVerified: Joi.boolean().optional(),

    roleIds: Joi.array().items(Joi.string().uuid()).min(1).optional().messages({
      "array.min": "At least one role must be assigned",
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
      if (!details[field]) {
        details[field] = [];
      }
      details[field].push(detail.message);
    });
    return { error: { details }, value: null };
  }

  return { error: null, value };
};

export const validateUserQueryParams = (query: any) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),

    pageSize: Joi.number().integer().min(1).max(100).default(10).optional(),

    search: Joi.string().trim().max(255).optional(),

    role: Joi.string().trim().max(50).optional(),

    isActive: Joi.boolean().optional(),

    isVerified: Joi.boolean().optional(),
  });

  const { error, value } = schema.validate(query, { abortEarly: false });

  if (error) {
    const details: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const field = detail.path.join(".");
      if (!details[field]) {
        details[field] = [];
      }
      details[field].push(detail.message);
    });
    return { error: { details }, value: null };
  }

  return { error: null, value };
};

export const validateAssignRolesData = (data: any) => {
  const schema = Joi.object({
    roleIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
      "array.min": "At least one role must be assigned",
      "any.required": "Role IDs are required",
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const details: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const field = detail.path.join(".");
      if (!details[field]) {
        details[field] = [];
      }
      details[field].push(detail.message);
    });
    return { error: { details }, value: null };
  }

  return { error: null, value };
};
