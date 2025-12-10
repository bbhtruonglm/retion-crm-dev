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
   * Billing API - Read Wallet
   * @param {string} orgId - Organization ID
   * @param {string} token - Token xác thực
   * @returns {Promise<IApiResponse>}
   */
  async ReadWallet(orgId: string, token?: string): Promise<IApiResponse> {
    return this.Request(API_CONFIG.BILLING_URL, "/manager/wallet/read_wallet", {
      method: EHttpMethod.POST,
      body: { org_id: orgId },
      token,
    });
  }

  /**
   * Billing API - Create Transaction
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
    return this.Request(API_CONFIG.BILLING_URL, "/app/transaction/create_txn", {
      method: EHttpMethod.POST,
      body: data,
      token,
    });
  }

  /**
   * Billing API - Check Transaction
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
    return this.Request(API_CONFIG.BILLING_URL, "/app/transaction/check_txn", {
      method: EHttpMethod.POST,
      body: data,
      token,
    });
  }

  /**
   * Billing API - Read Organization
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
      API_CONFIG.BILLING_URL,
      "/manager/organization/read_org",
      {
        method: EHttpMethod.POST,
        body: data,
        token,
      }
    );
  }

  /**
   * Manager API - Update Organization
   * @param {object} data - Dữ liệu cập nhật
   * @param {string} token - Token xác thực
   * @returns {Promise<IApiResponse>}
   */
  async UpdateOrganization(
    data: {
      org_id: string;
      org_info: {
        org_name?: string;
        org_tax_code?: string;
        org_address?: string;
        org_customer_code?: string;
        org_contract_code?: string;
        org_avatar?: string;
        org_country?: string;
        org_currency?: string;
        [key: string]: any;
      };
    },
    token?: string
  ): Promise<IApiResponse> {
    return this.Request(
      API_CONFIG.MANAGER_URL,
      "/app/organization/update_org",
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

  /**
   * Billing API - Purchase Package
   * @param {object} data - Dữ liệu mua gói
   * @param {string} token - Token xác thực
   * @returns {Promise<IApiResponse>}
   */
  async PurchasePackage(
    data: {
      org_id: string;
      wallet_id: string;
      package_type: string;
      months: number;
      voucher_code?: string;
    },
    token?: string
  ): Promise<IApiResponse> {
    return this.Request(
      API_CONFIG.BILLING_URL,
      "/app/wallet/purchase_package",
      {
        method: EHttpMethod.POST,
        body: data,
        token,
      }
    );
  }

  /**
   * Billing API - Read Membership
   * @param {string} orgId - Organization ID
   * @param {string} token - Token xác thực
   * @returns {Promise<IApiResponse>}
   */
  async ReadMembers(orgId: string, token?: string): Promise<IApiResponse> {
    return this.Request(
      API_CONFIG.BILLING_URL,
      "/manager/member_ship/read_member",
      {
        method: EHttpMethod.POST,
        body: { org_id: orgId },
        token,
      }
    );
  }

  /**
   * Billing API - Generate QR Code
   * @param {object} data - Dữ liệu tạo QR
   * @param {string} token - Token xác thực
   * @returns {Promise<IApiResponse>}
   */
  async GenerateQrCode(
    data: {
      org_id?: string;
      bank_bin?: number;
      consumer_id?: string;
      amount?: number;
      message?: string;
      version: string;
      txn_id: string;
    },
    token?: string
  ): Promise<IApiResponse> {
    return this.Request(API_CONFIG.BILLING_URL, "/app/wallet/qr_code", {
      method: EHttpMethod.POST,
      body: data,
      token,
    });
  }

  /**
   * Billing API - Verify Voucher
   * @param {object} data - Dữ liệu verify voucher
   * @param {string} token - Token xác thực
   * @returns {Promise<IApiResponse>}
   */
  async VerifyVoucher(
    data: {
      org_id: string;
      voucher_code: string;
      txn_amount: number;
    },
    token?: string
  ): Promise<IApiResponse> {
    return this.Request(API_CONFIG.BILLING_URL, "/app/voucher/verify_voucher", {
      method: EHttpMethod.POST,
      body: data,
      token,
    });
  }
}

/** Export singleton instance */
export const apiService = new ApiService();
