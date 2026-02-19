const Joi = require("joi");

export const validateCreateGroupData = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(50).required().messages({
      "string.min": "Group name is required",
      "string.max": "Group name must be less than 50 characters",
      "any.required": "Group name is required",
    }),

    description: Joi.string().trim().min(1).max(500).required().messages({
      "string.min": "Group description is required",
      "string.max": "Group description must be less than 50 characters",
      "any.required": "Group description is required",
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
