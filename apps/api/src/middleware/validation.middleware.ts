import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { AppError } from "./error.middleware";
import { logger } from "../utils/logger";

/**
 * Middleware for validating request data using Joi schemas
 */
export const validateSchema = (
  schema: Joi.ObjectSchema,
  target: "body" | "query" | "params" = "body"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      let dataToValidate: any;

      switch (target) {
        case "body":
          dataToValidate = req.body;
          break;
        case "query":
          dataToValidate = req.query;
          break;
        case "params":
          dataToValidate = req.params;
          break;
        default:
          dataToValidate = req.body;
      }

      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false, // Return all validation errors
        stripUnknown: true, // Remove unknown keys
        allowUnknown: false, // Don't allow unknown keys
      });

      if (error) {
        const validationErrors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
          value: detail.context?.value,
        }));

        logger.warn("Validation failed", {
          target,
          errors: validationErrors,
          path: req.path,
          method: req.method,
        });

        // Convert to the format expected by AppError
        const detailsMap: Record<string, string[]> = {};
        validationErrors.forEach(error => {
          if (!detailsMap[error.field]) {
            detailsMap[error.field] = [];
          }
          detailsMap[error.field].push(error.message);
        });

        throw new AppError("Validation failed", 400, "VALIDATION_ERROR", detailsMap);
      }

      // Replace the original data with validated and cleaned data
      switch (target) {
        case "body":
          req.body = value;
          break;
        case "query":
          req.query = value;
          break;
        case "params":
          req.params = value;
          break;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware for validating multiple request parts at once
 */
export const validateMultiple = (
  validations: Array<{
    schema: Joi.ObjectSchema;
    target: "body" | "query" | "params";
  }>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const allErrors: any[] = [];

      for (const validation of validations) {
        let dataToValidate: any;

        switch (validation.target) {
          case "body":
            dataToValidate = req.body;
            break;
          case "query":
            dataToValidate = req.query;
            break;
          case "params":
            dataToValidate = req.params;
            break;
          default:
            dataToValidate = req.body;
        }

        const { error, value } = validation.schema.validate(dataToValidate, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false,
        });

        if (error) {
          const validationErrors = error.details.map((detail) => ({
            field: `${validation.target}.${detail.path.join(".")}`,
            message: detail.message,
            value: detail.context?.value,
          }));

          allErrors.push(...validationErrors);
        } else {
          // Replace with validated data
          switch (validation.target) {
            case "body":
              req.body = value;
              break;
            case "query":
              req.query = value;
              break;
            case "params":
              req.params = value;
              break;
          }
        }
      }

      if (allErrors.length > 0) {
        logger.warn("Validation failed", {
          errors: allErrors,
          path: req.path,
          method: req.method,
        });

        throw new AppError("Validation failed", 400, "VALIDATION_ERROR", {
          errors: allErrors,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
