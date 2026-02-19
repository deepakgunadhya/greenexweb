const Joi = require("joi");

const organizationTypes = ["CLIENT", "PARTNER", "VENDOR", "PROSPECT"];

export const validateCreateOrganizationData = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(255).required().messages({
      "string.min": "Organization name is required",
      "string.max": "Organization name must be less than 255 characters",
      "any.required": "Organization name is required",
    }),

    type: Joi.string()
      .valid(...organizationTypes)
      .required()
      .messages({
        "any.only": `Type must be one of: ${organizationTypes.join(", ")}`,
        "any.required": "Organization type is required",
      }),

    industry: Joi.string().trim().max(100).optional().messages({
      "string.max": "Industry must be less than 100 characters",
    }),

    website: Joi.string()
      .trim()
      .uri({ scheme: ["http", "https"] })
      .allow("")
      .optional()
      .messages({
        "string.uri": "Website must start with http:// or https://",
      }),

    phone: Joi.string()
      .trim()
      .pattern(/^[\d\s\-+()]{10,20}$/)
      .allow("")
      .optional()
      .custom((value, helpers) => {
        // Remove all non-digit characters to count digits
        const digitsOnly = value.replace(/\D/g, "");

        if (digitsOnly.length < 10) {
          return helpers.error("phone.min");
        }
        if (digitsOnly.length > 15) {
          return helpers.error("phone.max");
        }

        return value;
      })
      .messages({
        "string.pattern.base": "Phone number contains invalid characters",
        "phone.min": "Phone number must be at least 10 digits",
        "phone.max": "Phone number cannot exceed 15 digits",
      }),

    email: Joi.string().trim().email().optional().messages({
      "string.email": "Please provide a valid email address",
    }),

    address: Joi.string().trim().max(500).optional().messages({
      "string.max": "Address must be less than 500 characters",
    }),

    city: Joi.string().trim().max(100).optional().messages({
      "string.max": "City must be less than 100 characters",
    }),

    state: Joi.string().trim().max(100).optional().messages({
      "string.max": "State must be less than 100 characters",
    }),

    country: Joi.string().trim().max(100).optional().messages({
      "string.max": "Country must be less than 100 characters",
    }),

    postalCode: Joi.string()
      .trim()
      .min(3)
      .max(10)
      .allow("")
      .optional()
      .messages({
        "string.min": "Postal code must be at least 3 characters",
        "string.max": "Postal code must be less than 10 characters",
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

export const validateUpdateOrganizationData = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(255).messages({
      "string.empty": "Organization name cannot be empty",
      "string.min": "Organization name is required",
      "string.max": "Organization name must be less than 255 characters",
    }),

    type: Joi.string()
      .valid(...organizationTypes)
      .messages({
        "string.empty": "Organization type cannot be empty",
        "any.only": `Type must be one of: ${organizationTypes.join(", ")}`,
      }),

    industry: Joi.string()
      .trim()
      .max(100)
      .allow("", null)  // Allow empty string and null to clear
      .messages({
        "string.max": "Industry must be less than 100 characters",
      }),

    website: Joi.string()
      .trim()
      .uri({ scheme: ["http", "https"] })
      .allow("", null)  // Allow empty string and null to clear
      .messages({
        "string.uri": "Website must start with http:// or https://",
      }),

    phone: Joi.string()
      .trim()
      .allow("", null)  // Allow empty string and null to clear
      .custom((value, helpers) => {
        // Skip validation if value is empty, null, or whitespace
        if (!value || value.trim() === "") {
          return value;
        }

        // Check for invalid characters
        if (!/^[\d\s\-+()]+$/.test(value)) {
          return helpers.error("phone.invalid");
        }

        // Remove all non-digit characters to count digits
        const digitsOnly = value.replace(/\D/g, "");

        if (digitsOnly.length < 10) {
          return helpers.error("phone.min");
        }
        if (digitsOnly.length > 15) {
          return helpers.error("phone.max");
        }

        return value;
      })
      .messages({
        "phone.invalid": "Phone number contains invalid characters",
        "phone.min": "Phone number must be at least 10 digits",
        "phone.max": "Phone number cannot exceed 15 digits",
      }),

    email: Joi.string()
      .trim()
      .email()
      .allow("", null)  // Allow empty string and null to clear
      .messages({
        "string.email": "Please provide a valid email address",
      }),

    address: Joi.string()
      .trim()
      .max(500)
      .allow("", null)  // Allow empty string and null to clear
      .messages({
        "string.max": "Address must be less than 500 characters",
      }),

    city: Joi.string()
      .trim()
      .max(100)
      .allow("", null)  // Allow empty string and null to clear
      .messages({
        "string.max": "City must be less than 100 characters",
      }),

    state: Joi.string()
      .trim()
      .max(100)
      .allow("", null)  // Allow empty string and null to clear
      .messages({
        "string.max": "State must be less than 100 characters",
      }),

    country: Joi.string()
      .trim()
      .max(100)
      .allow("", null)  // Allow empty string and null to clear
      .messages({
        "string.max": "Country must be less than 100 characters",
      }),

    postalCode: Joi.string()
      .trim()
      .min(3)
      .max(10)
      .allow("", null)  // Allow empty string and null to clear
      .messages({
        "string.min": "Postal code must be at least 3 characters",
        "string.max": "Postal code must be less than 10 characters",
      }),
  })
    .min(1) // At least one field must be provided for update
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

export const validateQueryParams = (query: any) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),

    pageSize: Joi.number().integer().min(1).max(100).default(10).optional(),

    search: Joi.string().trim().max(255).optional(),

    type: Joi.string()
      .valid(...organizationTypes)
      .optional(),

    industry: Joi.string().trim().max(100).optional(),

    isActive: Joi.boolean().optional(),
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
