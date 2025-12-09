/**
 * Cấu hình API URLs từ environment variables
 */
export const API_CONFIG = {
  /** App API URL - Dùng cho chatbot_user, conversation, etc */
  APP_URL: import.meta.env.VITE_APP_URL,
  /** Manager API URL - Dùng cho organization management */
  MANAGER_URL: import.meta.env.VITE_MANAGER_URL,
  /** Billing API URL - Dùng cho billing, wallet, transaction */
  BILLING_URL:
    import.meta.env.VITE_BILLING_URL || import.meta.env.VITE_MANAGER_URL,
};

/**
 * HTTP Methods
 */
export enum EHttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

/**
 * Interface cho API request options
 */
export interface IApiRequestOptions {
  /** HTTP method */
  method?: EHttpMethod;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: any;
  /** Token xác thực */
  token?: string;
}

/**
 * Interface cho API response
 */
export interface IApiResponse<T = any> {
  /** Dữ liệu trả về */
  data?: T;
  /** Thông báo lỗi */
  error?: string;
  /** Status code */
  status: number;
  /** Response thô */
  raw?: Response;
}
