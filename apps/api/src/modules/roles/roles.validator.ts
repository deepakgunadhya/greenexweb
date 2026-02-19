const Joi = require('joi');
import { AVAILABLE_PERMISSIONS } from './roles.service';

export const validateCreateRoleData = (data: any) => {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.min': 'Role name is required',
        'string.max': 'Role name must be less than 50 characters',
        'any.required': 'Role name is required'
      }),
    
    description: Joi.string()
      .trim()
      .max(255)
      .optional()
      .messages({
        'string.max': 'Description must be less than 255 characters'
      }),
    
    permissions: Joi.array()
      .items(Joi.string().valid(...AVAILABLE_PERMISSIONS))
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one permission must be assigned',
        'any.required': 'Permissions are required',
        'any.only': `Permission must be one of the available permissions`
      })
  });

  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const details: Record<string, string[]> = {};
    error.details.forEach(detail => {
      const field = detail.path.join('.');
      if (!details[field]) {
        details[field] = [];
      }
      details[field].push(detail.message);
    });
    return { error: { details }, value: null };
  }
  
  return { error: null, value };
};

export const validateUpdateRoleData = (data: any) => {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Role name cannot be empty',
        'string.max': 'Role name must be less than 50 characters'
      }),
    
    description: Joi.string()
      .trim()
      .max(255)
      .allow('')
      .optional()
      .messages({
        'string.max': 'Description must be less than 255 characters'
      }),
    
    permissions: Joi.array()
      .items(Joi.string().valid(...AVAILABLE_PERMISSIONS))
      .min(1)
      .optional()
      .messages({
        'array.min': 'At least one permission must be assigned',
        'any.only': `Permission must be one of the available permissions`
      })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  });

  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const details: Record<string, string[]> = {};
    error.details.forEach(detail => {
      const field = detail.path.join('.');
      if (!details[field]) {
        details[field] = [];
      }
      details[field].push(detail.message);
    });
    return { error: { details }, value: null };
  }
  
  return { error: null, value };
};