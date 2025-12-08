/**
 * Cấu hình API URLs từ environment variables
 */
export const API_CONFIG = {
  /** App API URL - Dùng cho chatbot_user, conversation, etc */
  APP_URL:
    import.meta.env.VITE_API_APP_TARGET ||
    "https://chatbox-service-v3.botbanhang.vn",
  /** Manager API URL - Dùng cho billing và organization */
  MANAGER_URL:
    import.meta.env.VITE_API_MANAGER_TARGET ||
    "https://chatbox-billing.botbanhang.vn",
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
