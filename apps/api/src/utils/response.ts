export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const createResponse = <T>(
  success: boolean,
  data: T | null = null,
  error: any = null,
  meta: any = null
): ApiResponse<T> => ({
  success,
  ...(data !== null && { data }),
  ...(error && { error }),
  ...(meta && { meta }),
});

export const successResponse = <T>(data: T, meta?: any): ApiResponse<T> =>
  createResponse(true, data, null, meta);

export const errorResponse = (
  code: string,
  message: string,
  details?: Record<string, string[]>
): ApiResponse => createResponse(false, null, { code, message, details });

export const createPaginationMeta = (
  page: number,
  pageSize: number,
  total: number
) => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
});

export default {
  createResponse,
  successResponse,
  errorResponse,
  createPaginationMeta,
};
