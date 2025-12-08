import {
  API_CONFIG,
  EHttpMethod,
  IApiRequestOptions,
  IApiResponse,
} from "./api.config";

/**
 * Base API Service class
 */
class ApiService {
  /**
   * Thực hiện API request
   * @param {string} baseUrl - Base URL của API
   * @param {string} path - Đường dẫn API
   * @param {IApiRequestOptions} options - Tùy chọn request
   * @returns {Promise<IApiResponse>} - Response từ API
   */
  private async Request<T = any>(
    baseUrl: string,
    path: string,
    options: IApiRequestOptions = {}
  ): Promise<IApiResponse<T>> {
    /** URL đầy đủ */
    const FULL_URL = `${baseUrl}${path}`;
    /** HTTP method */
    const METHOD = options.method || EHttpMethod.POST;
    /** Token xác thực */
    const TOKEN = options.token || localStorage.getItem("auth_token") || "";

    /** Headers mặc định */
    const HEADERS: Record<string, string> = {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: TOKEN } : {}),
      ...options.headers,
    };

    try {
      /** Request config */
      const CONFIG: RequestInit = {
        method: METHOD,
        headers: HEADERS,
        ...(options.body && METHOD !== EHttpMethod.GET
          ? { body: JSON.stringify(options.body) }
          : {}),
      };

      /** Response từ API */
      const RESPONSE = await fetch(FULL_URL, CONFIG);
      /** Dữ liệu JSON */
      const DATA = await RESPONSE.json();

      return {
        data: DATA,
        status: RESPONSE.status,
        raw: RESPONSE,
      };
    } catch (error) {
      console.error("API Request Error:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      };
    }
  }

  /**
   * Manager API - Read Wallet (Billing)
   * @param {string} orgId - Organization ID
   * @param {string} token - Token xác thực
   * @returns {Promise<IApiResponse>}
   */
  async ReadWallet(orgId: string, token?: string): Promise<IApiResponse> {
    return this.Request(API_CONFIG.MANAGER_URL, "/app/wallet/read_wallet", {
      method: EHttpMethod.POST,
      body: { org_id: orgId },
      token,
    });
  }

  /**
   * Manager API - Create Transaction (Billing)
   * @param {object} data - Dữ liệu giao dịch
   * @param {string} token - Token xác thực
   * @returns {Promise<IApiResponse>}
   */
  async CreateTransaction(
    data: {
      org_id: string;
      wallet_id: string;
      txn_amount: number;
      txn_payment_method: string;
      txn_is_issue_invoice: boolean;
      meta: any;
      voucher_code?: string;
    },
    token?: string
  ): Promise<IApiResponse> {
    return this.Request(API_CONFIG.MANAGER_URL, "/app/transaction/create_txn", {
      method: EHttpMethod.POST,
      body: data,
      token,
    });
  }

  /**
   * Manager API - Check Transaction (Billing)
   * @param {object} data - Dữ liệu check transaction
   * @param {string} token - Token xác thực
   * @returns {Promise<IApiResponse>}
   */
  async CheckTransaction(
    data: {
      org_id: string;
      txn_id: string;
      bank_name: string;
      version: string;
    },
    token?: string
  ): Promise<IApiResponse> {
    return this.Request(API_CONFIG.MANAGER_URL, "/app/transaction/check_txn", {
      method: EHttpMethod.POST,
      body: data,
      token,
    });
  }

  /**
   * Manager API - Read Organization
   * @param {object} data - Dữ liệu tìm kiếm
   * @param {string} token - Token xác thực
   * @returns {Promise<IApiResponse>}
   */
  async ReadOrganization(
    data: {
      skip: number;
      limit: number;
      search: string;
      start_date: string | null;
      end_date: string | null;
    },
    token?: string
  ): Promise<IApiResponse> {
    return this.Request(
      API_CONFIG.MANAGER_URL,
      "/manager/organization/read_org",
      {
        method: EHttpMethod.POST,
        body: data,
        token,
      }
    );
  }

  /**
   * App API - Read Current User
   * @param {string} token - Token xác thực
   * @returns {Promise<IApiResponse>}
   */
  async ReadCurrentUser(token?: string): Promise<IApiResponse> {
    return this.Request(
      API_CONFIG.APP_URL,
      "/app/chatbot_user/read_me_chatbot_user",
      {
        method: EHttpMethod.POST,
        body: {},
        token,
      }
    );
  }
}

/** Export singleton instance */
export const apiService = new ApiService();
