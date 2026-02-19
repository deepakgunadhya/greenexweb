// validators/fcm.validator.ts

import Joi from "joi";

export const validateRegisterTokenData = (data: any) => {
  const schema = Joi.object({
    token: Joi.string().trim().min(1).max(500).required().messages({
      "string.empty": "Token is required",
      "string.min": "Token is required",
      "string.max": "Token must be less than 500 characters",
      "any.required": "Token is required",
    }),
    platform: Joi.string()
      .valid("ANDROID", "IOS", "WEB")
      .required()
      .messages({
        "any.only": "Platform must be one of: ANDROID, IOS, WEB",
        "any.required": "Platform is required",
      }),
    type: Joi.string()
      .valid("user", "broadcast", "topic", "scheduled")
      .optional()
      .messages({
        "any.only": "Type must be one of: user, broadcast, topic, scheduled",
      }),
    deviceInfo: Joi.object({
      model: Joi.string().trim().max(100).optional(),
      osVersion: Joi.string().trim().max(50).optional(),
      appVersion: Joi.string().trim().max(50).optional(),
      deviceId: Joi.string().trim().max(100).optional(),
    }).optional(),
    userId: Joi.string().uuid().optional().messages({
      "string.guid": "User ID must be a valid UUID",
    }),
  });

  return schema.validate(data, { abortEarly: false });
};

export const validateSendNotificationData = (data: any) => {
  const schema = Joi.object({
    title: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Title is required",
      "any.required": "Title is required",
    }),
    body: Joi.string().trim().min(1).max(500).required().messages({
      "string.empty": "Body is required",
      "any.required": "Body is required",
    }),
    data: Joi.object().optional(),
    imageUrl: Joi.string().uri().optional(),
    userId: Joi.string().uuid().optional(),
    tokens: Joi.array().items(Joi.string()).optional(),
    topic: Joi.string().optional(),
  });

  return schema.validate(data, { abortEarly: false });
};