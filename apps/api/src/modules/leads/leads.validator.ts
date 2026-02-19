const Joi = require("joi");

// SRS 5.1.1 - Simplified Lead Sources: Mobile App or Manual entry only  
const leadSources = [
  "MOBILE_APP",
  "MANUAL",
];

// SRS 5.1.1 - Simplified Lead Status: Only 3 states
const leadStatuses = [
  "NEW",
  "IN_PROGRESS", 
  "CLOSED",
];

export const validateCreateLeadData = (data: any) => {
  const schema = Joi.object({
    organizationId: Joi.string().trim().min(1),

    contactId: Joi.string().uuid(),

    source: Joi.string()
      .valid(...leadSources)
      .required()
      .messages({
        "any.only": `Source must be one of: ${leadSources.join(", ")}`,
        "any.required": "Lead source is required",
      }),

    title: Joi.string().trim().min(1).max(255).required().messages({
      "string.min": "Title is required",
      "string.max": "Title must be less than 255 characters",
      "any.required": "Title is required",
    }),

    description: Joi.string().trim().max(1000).optional().messages({
      "string.max": "Description must be less than 1000 characters",
    }),

    estimatedValue: Joi.number().positive().optional().messages({
      "number.positive": "Estimated value must be positive",
    }),

    probability: Joi.number().integer().min(0).max(100).optional().messages({
      "number.min": "Probability must be between 0 and 100",
      "number.max": "Probability must be between 0 and 100",
    }),

    expectedCloseDate: Joi.date().greater("now").optional().messages({
      "date.greater": "Expected close date must be in the future",
    }),

    notes: Joi.string().trim().max(1000).optional().messages({
      "string.max": "Notes must be less than 1000 characters",
    }),

    // Fields for mobile app enquiries
    companyName: Joi.string().trim().max(255).optional().messages({
      "string.max": "Company name must be less than 255 characters",
    }),

    contactName: Joi.string().trim().max(100).optional().messages({
      "string.max": "Contact name must be less than 100 characters",
    }),

    contactEmail: Joi.string().trim().email().optional().messages({
      "string.email": "Please provide a valid email address",
    }),

    contactPhone: Joi.string()
      .trim()
      .pattern(/^[\d\s\-+()]{10,20}$/)
      .optional()
      .custom((value, helpers) => {
        const digitsOnly = value.replace(/[\s\-()]/g, "");
        const cleanPhone = digitsOnly.replace(/^\+/, "");
        if (cleanPhone.length < 10) {
          return helpers.error("phone.min");
        }
        if (cleanPhone.length > 15) {
          return helpers.error("phone.max");
        }

        return value;
      })
      .messages({
        "string.pattern.base": "Phone number contains invalid characters",
        "phone.min": "Phone number must be at least 10 digits",
        "phone.max": "Phone number cannot exceed 15 digits",
      }),

    contactPosition: Joi.string().trim().max(100).optional().messages({
      "string.max": "Contact position must be less than 100 characters",
    }),

    serviceRequired: Joi.string().trim().max(255).optional().messages({
      "string.max": "Service required must be less than 255 characters",
    }),

    message: Joi.string().trim().max(1000).optional().messages({
      "string.max": "Message must be less than 1000 characters",
    }),
  })
    .custom((value, helpers) => {
      // Either organizationId or companyName must be provided
      if (!value.organizationId && !value.companyName) {
        return helpers.error("custom.missingOrgInfo");
      }

      // For new companies: if contactName is provided, contactEmail is also required
      // But both can be optional - allow creating leads for companies without contact details
      if (value.companyName && value.contactName && !value.contactEmail) {
        return helpers.error("custom.missingContactEmail");
      }

      return value;
    }, "Custom validation")
    .messages({
      "custom.missingOrgInfo":
        "Either organizationId or companyName is required",
      "custom.missingContactEmail":
        "contactEmail is required when contactName is provided",
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

export const validateUpdateLeadData = (data: any) => {
  const schema = Joi.object({
    organizationId: Joi.string().trim().min(1).optional(),

    contactId: Joi.string().uuid().optional(),

    source: Joi.string()
      .valid(...leadSources)
      .optional(),

    status: Joi.string()
      .valid(...leadStatuses)
      .optional(),

    title: Joi.string().trim().min(1).max(255).optional().messages({
      "string.min": "Title cannot be empty",
      "string.max": "Title must be less than 255 characters",
    }),

    description: Joi.string().trim().max(1000).allow("").optional().messages({
      "string.max": "Description must be less than 1000 characters",
    }),

    estimatedValue: Joi.number().positive().allow(null).optional().messages({
      "number.positive": "Estimated value must be positive",
    }),

    probability: Joi.number()
      .integer()
      .min(0)
      .max(100)
      .allow(null)
      .optional()
      .messages({
        "number.min": "Probability must be between 0 and 100",
        "number.max": "Probability must be between 0 and 100",
      }),

    expectedCloseDate: Joi.date().allow(null).optional(),

    actualCloseDate: Joi.date().allow(null).optional(),

    notes: Joi.string().trim().max(1000).allow("").optional().messages({
      "string.max": "Notes must be less than 1000 characters",
    }),

    // Contact information fields (same as create validator)
    contactName: Joi.string().trim().max(100).allow("").optional().messages({
      "string.max": "Contact name must be less than 100 characters",
    }),

    contactEmail: Joi.string().trim().email().allow("").optional().messages({
      "string.email": "Please provide a valid email address",
    }),

    contactPhone: Joi.string()
      .trim()
      .pattern(/^[\d\s\-+()]{10,20}$/)
      .allow("")
      .optional()
      .custom((value, helpers) => {
        if (!value) return value; // Allow empty strings
        const digitsOnly = value.replace(/[\s\-()]/g, "");
        const cleanPhone = digitsOnly.replace(/^\+/, "");
        if (cleanPhone.length < 10) {
          return helpers.error("phone.min");
        }
        if (cleanPhone.length > 15) {
          return helpers.error("phone.max");
        }
        return value;
      })
      .messages({
        "string.pattern.base": "Phone number contains invalid characters",
        "phone.min": "Phone number must be at least 10 digits",
        "phone.max": "Phone number cannot exceed 15 digits",
      }),

    contactPosition: Joi.string().trim().max(100).allow("").optional().messages({
      "string.max": "Contact position must be less than 100 characters",
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

export const validateLeadQueryParams = (query: any) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),

    pageSize: Joi.number().integer().min(1).max(2000).default(10).optional(),

    search: Joi.string().trim().max(255).optional(),

    status: Joi.string()
      .valid(...leadStatuses)
      .optional(),

    source: Joi.string()
      .valid(...leadSources)
      .optional(),

    organizationId: Joi.string().trim().min(1).optional(),

    createdFrom: Joi.date().optional(),

    createdTo: Joi.date().optional(),
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
