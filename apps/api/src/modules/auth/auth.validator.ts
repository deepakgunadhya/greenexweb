const Joi = require('joi');

export const validateRegisterData = (data: any) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required'
      }),
    
    firstName: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.min': 'First name is required',
        'string.max': 'First name must be less than 50 characters',
        'any.required': 'First name is required'
      }),
    
    lastName: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.min': 'Last name is required',
        'string.max': 'Last name must be less than 50 characters',
        'any.required': 'Last name is required'
      }),
    
    phone: Joi.string()
      .pattern(new RegExp('^[+]?[1-9][\\d\\s\\-()]{7,15}$'))
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
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

export const validateLoginData = (data: any) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
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

export const validateChangePasswordData = (data: any) => {
  const schema = Joi.object({
    oldPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    
    newPassword: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'New password is required'
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