/**
 * Formats validation error messages from backend API responses
 * @param error - Error object from API response or Redux thunk rejection
 * @returns Formatted error message string
 */
export const formatValidationError = (error: any): string => {
  // Handle Redux thunk rejection with structured error
  if (error?.code === 'VALIDATION_ERROR' && error?.details) {
    const details = error.details;
    const fieldErrors = Object.entries(details)
      .map(([field, messages]: [string, any]) => {
        // Format field name: convert camelCase to Title Case
        const fieldName = field
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        
        // Handle array of messages or single message
        const messageList = Array.isArray(messages) 
          ? messages.join(', ') 
          : String(messages);
        
        return `${fieldName}: ${messageList}`;
      })
      .join(' | ');
    
    return `Validation Error: ${fieldErrors}`;
  }

  // Handle axios error response with validation details
  if (error?.response?.data?.error?.code === 'VALIDATION_ERROR' && error?.response?.data?.error?.details) {
    const details = error.response.data.error.details;
    const fieldErrors = Object.entries(details)
      .map(([field, messages]: [string, any]) => {
        const fieldName = field
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        
        const messageList = Array.isArray(messages) 
          ? messages.join(', ') 
          : String(messages);
        
        return `${fieldName}: ${messageList}`;
      })
      .join(' | ');
    
    return `Validation Error: ${fieldErrors}`;
  }

  // Handle simple error message
  if (error?.message) {
    return error.message;
  }

  // Handle error object with message property
  if (typeof error === 'string') {
    return error;
  }

  // Fallback
  return 'An error occurred';
};

/**
 * Extracts validation error details for field-specific display
 * @param error - Error object from API response or Redux thunk rejection
 * @returns Object with field names as keys and error messages as values
 */
export const extractValidationErrors = (error: any): Record<string, string> => {
  const fieldErrors: Record<string, string> = {};

  // Handle Redux thunk rejection
  if (error?.code === 'VALIDATION_ERROR' && error?.details) {
    Object.entries(error.details).forEach(([field, messages]: [string, any]) => {
      fieldErrors[field] = Array.isArray(messages) 
        ? messages.join(', ') 
        : String(messages);
    });
  }

  // Handle axios error response
  if (error?.response?.data?.error?.code === 'VALIDATION_ERROR' && error?.response?.data?.error?.details) {
    Object.entries(error.response.data.error.details).forEach(([field, messages]: [string, any]) => {
      fieldErrors[field] = Array.isArray(messages) 
        ? messages.join(', ') 
        : String(messages);
    });
  }

  return fieldErrors;
};

