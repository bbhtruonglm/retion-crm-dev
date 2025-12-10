import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Header from "./components/Header";
import CustomerInfo from "./components/CustomerInfo";
import OrderTabs from "./components/OrderTabs";
import PaymentOverlay from "./components/PaymentOverlay";
import { Search } from "lucide-react";
import { MOCK_DB } from "./constants";
import {
  IOrganization,
  IBankAccount,
  IPaymentDetails,
  IPaymentStep,
} from "./types";
import { apiService } from "./services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "lucide-react";

/**
 * Component chính của ứng dụng
 * @returns {JSX.Element} - Giao diện App
 */
const App: React.FC = () => {
  const { t } = useTranslation();

  /** Query tìm kiếm */
  const [SEARCH_QUERY, SetSearchQuery] = useState("");
  /** Thông tin khách hàng */
  const [CUSTOMER, SetCustomer] = useState<IOrganization | null>(null);
  /** Trạng thái loading tìm kiếm */
  const [LOADING_SEARCH, SetLoadingSearch] = useState(false);
  /** Lỗi tìm kiếm */
  const [ERROR_SEARCH, SetErrorSearch] = useState("");

  /** Dữ liệu người dùng hiện tại */
  const [CURRENT_USER, SetCurrentUser] = useState<any>(null);
  /** Trạng thái loading user */
  const [LOADING_USER, SetLoadingUser] = useState(true);

  /** Token xác thực */
  const [TOKEN, SetToken] = useState<string | null>(null);
  /** Page ID */
  const [PAGE_ID, SetPageId] = useState<string | null>(null);

  /** Bước thanh toán */
  const [PAYMENT_STEP, SetPaymentStep] = useState<IPaymentStep>("idle");
  /** Chi tiết thanh toán */
  const [PAYMENT_DETAILS, SetPaymentDetails] = useState<IPaymentDetails | null>(
    null
  );

  /** Danh sách thành viên */
  const [MEMBERS, SetMembers] = useState<any[]>([]);
  /** ID thành viên đang chọn */
  const [SELECTED_MEMBER_ID, SetSelectedMemberId] = useState<string>("");

  /**
   * Lấy thông tin người dùng hiện tại
   * @param {string} authToken - Token xác thực
   */
  const FetchCurrentUser = async (authToken: string) => {
    SetLoadingUser(true);
    try {
      /** Kết quả API */
      const RESPONSE = await apiService.ReadCurrentUser(authToken);

      if (RESPONSE.status === 200 && RESPONSE.data) {
        /** Dữ liệu người dùng */
        const USER_DATA = RESPONSE.data.data || RESPONSE.data;
        if (USER_DATA) {
          /** Lưu toàn bộ data response */
          SetCurrentUser(USER_DATA);
        }
      }
    } catch (error) {
      console.error("Failed to fetch current user", error);
    } finally {
      SetLoadingUser(false);
    }
  };

  /**
   * Thực hiện tìm kiếm khách hàng
   * @param {string} query - Org ID hoặc tên khách hàng
   */
  const PerformSearch = async (query: string) => {
    if (!query.trim()) return;

    SetLoadingSearch(true);
    SetCustomer(null);
    SetErrorSearch("");

    /** Token hiện tại */
    const CURRENT_TOKEN = TOKEN || localStorage.getItem("auth_token");
    if (!CURRENT_TOKEN) {
      SetErrorSearch(t("error_token_missing"));
      SetLoadingSearch(false);
      return;
    }

    try {
      /** Kết quả API */
      const RESPONSE = await apiService.ReadOrganization(
        {
          skip: 0,
          limit: 20,
          search: query,
          start_date: null,
          end_date: null,
        },
        CURRENT_TOKEN
      );

      if (RESPONSE.status !== 200 || RESPONSE.error) {
        throw new Error(
          t("error_server", { error: RESPONSE.error || "Unknown error" })
        );
      }

      /** Dữ liệu thô */
      const RAW_DATA = RESPONSE.data;
      console.log("API Response:", RAW_DATA);

      /** Danh sách tổ chức */
      const LIST = Array.isArray(RAW_DATA.data) ? RAW_DATA.data : [];
      /** Dữ liệu đầu tiên */
      const DATA = LIST.length > 0 ? LIST[0] : null;

      if (!DATA) {
        SetErrorSearch(t("error_not_found"));
        return;
      }

      /** Org ID để lấy thông tin ví */
      const ORG_ID = DATA.org_id || query;

      /** Gọi API ReadWallet để lấy thông tin credit chính xác */
      let WALLET_BALANCE = DATA.wallet?.wallet_balance ?? 0;
      try {
        /** Kết quả API wallet */
        const WALLET_RESPONSE = await apiService.ReadWallet(
          ORG_ID,
          CURRENT_TOKEN
        );
        if (WALLET_RESPONSE.status === 200 && WALLET_RESPONSE.data?.data) {
          /** Dữ liệu ví */
          const WALLET_DATA = WALLET_RESPONSE.data.data;
          /** Tính toán số dư từ wallet_balance và wallet_credit */
          WALLET_BALANCE =
            (WALLET_DATA.credit_balance ?? 0) -
            (WALLET_DATA.extra_cost ?? 0) +
            (WALLET_DATA.wallet_balance ?? 0);
          console.log("Wallet Info:", WALLET_DATA);
        }
      } catch (walletErr) {
        console.error("Failed to fetch wallet info:", walletErr);
        /** Nếu lỗi, vẫn sử dụng balance từ organization data */
      }

      /** Dữ liệu tổ chức */
      const ORG_DATA: IOrganization = {
        id: DATA._id || "unknown",
        orgId: ORG_ID,
        name: DATA.org_info?.org_name || DATA.name || "Khách hàng",
        balance: WALLET_BALANCE,
        currentPackage: DATA.org_package?.org_package_type || "Unknown",
        refName: null,
        refStatus: "Chưa có",
        org_info: DATA.org_info,
        user: DATA.user,
        affiliate: DATA.affiliate,
      };

      SetCustomer(ORG_DATA);
    } catch (err) {
      console.error(err);
      SetErrorSearch(
        t("error_search", {
          error: err instanceof Error ? err.message : String(err),
        })
      );
    } finally {
      SetLoadingSearch(false);
    }
  };

  /**
   * Effect khởi tạo từ URL params
   */
  useEffect(() => {
    /** Flag để tránh gọi API 2 lần */
    let IS_MOUNTED = true;

    /** URL params */
    const PARAMS = new URLSearchParams(window.location.search);
    /** Org ID từ URL */
    const ORG_ID_FROM_URL = PARAMS.get("org_id");
    /** Token từ URL */
    const TOKEN_FROM_URL = PARAMS.get("token");

    /** Token đang active */
    let ACTIVE_TOKEN = localStorage.getItem("auth_token");

    if (TOKEN_FROM_URL) {
      SetToken(TOKEN_FROM_URL);
      localStorage.setItem("auth_token", TOKEN_FROM_URL);
      ACTIVE_TOKEN = TOKEN_FROM_URL;
    } else if (ACTIVE_TOKEN) {
      SetToken(ACTIVE_TOKEN);
    }

    if (ACTIVE_TOKEN && IS_MOUNTED) {
      FetchCurrentUser(ACTIVE_TOKEN);
    }

    if (ORG_ID_FROM_URL && IS_MOUNTED) {
      SetSearchQuery(ORG_ID_FROM_URL);
    }

    if (PARAMS.toString()) {
      /** URL mới */
      const NEW_URL = window.location.pathname;
      window.history.replaceState({}, "", NEW_URL);
    }

    return () => {
      IS_MOUNTED = false;
    };
  }, []); // Empty dependency array - chỉ chạy 1 lần khi mount

  /**
   * Fetch danh sách thành viên khi CUSTOMER thay đổi
   */
  useEffect(() => {
    if (!CUSTOMER?.orgId) {
      SetMembers([]);
      SetSelectedMemberId("");
      return;
    }

    const FetchMembers = async () => {
      try {
        const CURRENT_TOKEN = TOKEN || localStorage.getItem("auth_token");
        const RES = await apiService.ReadMembers(
          CUSTOMER.orgId,
          CURRENT_TOKEN || undefined
        );
        console.log(RES, "res");
        if (RES.status === 200 && RES.data) {
          const LIST = RES.data.data || RES.data || [];
          if (Array.isArray(LIST)) {
            SetMembers(LIST);

            /** Logic chọn mặc định */
            let DEFAULT_MEMBER = null;
            console.log(CUSTOMER.user, "user");
            console.log(LIST, "list");
            if (CUSTOMER.user) {
              /** Tìm member trùng với user của org */
              DEFAULT_MEMBER = LIST.find(
                (m: any) =>
                  m?.user_info?.user_id === CUSTOMER?.user?.user_id ||
                  m?.user_info?.fb_staff_id === CUSTOMER?.user?.fb_staff_id
              );
            }
            console.log(DEFAULT_MEMBER, "default");
            if (!DEFAULT_MEMBER) {
              /** Tìm admin đầu tiên */
              DEFAULT_MEMBER = LIST.find(
                (m: any) => m.role === "ADMIN" || m.is_admin
              );
            }

            if (!DEFAULT_MEMBER && LIST.length > 0) {
              // Lấy member đầu tiên
              DEFAULT_MEMBER = LIST[0];
            }

            if (DEFAULT_MEMBER) {
              SetSelectedMemberId(DEFAULT_MEMBER.user_id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch members", error);
      }
    };

    FetchMembers();
  }, [CUSTOMER, CURRENT_USER, TOKEN]);

  /**
   * Polling for Transaction Status
   */
  useEffect(() => {
    /** Interval ID */
    let INTERVAL: NodeJS.Timeout;
    /** Token xác thực */
    const AUTH_TOKEN = localStorage.getItem("auth_token");

    if (
      PAYMENT_STEP === "pending" &&
      PAYMENT_DETAILS?.content &&
      CUSTOMER?.orgId &&
      AUTH_TOKEN
    ) {
      INTERVAL = setInterval(async () => {
        try {
          /** Kết quả API */
          const RES = await apiService.CheckTransaction(
            {
              org_id: CUSTOMER.orgId,
              txn_id: PAYMENT_DETAILS.content,
              bank_name: "BBH_TCB",
              version: "v2",
            },
            AUTH_TOKEN
          );

          if (RES.status === 200 && RES.data) {
            /** Kết quả */
            const RESULT = RES.data;
            /** Trạng thái thành công */
            const IS_SUCCESS =
              RESULT.data === true || RESULT.data?.status === "SUCCESS";

            if (IS_SUCCESS) {
              SetPaymentStep("success");
              clearInterval(INTERVAL);
              /** Làm mới thông tin (bao gồm ví) */
              PerformSearch(CUSTOMER.orgId);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);
    }

    return () => {
      if (INTERVAL) clearInterval(INTERVAL);
    };
  }, [PAYMENT_STEP, PAYMENT_DETAILS, CUSTOMER]);

  /**
   * Effect xử lý debounce tìm kiếm
   */
  useEffect(() => {
    const TIME_OUT_ID = setTimeout(() => {
      if (SEARCH_QUERY.trim()) {
        PerformSearch(SEARCH_QUERY);
      } else {
        SetCustomer(null);
        SetErrorSearch("");
      }
    }, 300);

    return () => clearTimeout(TIME_OUT_ID);
  }, [SEARCH_QUERY]);

  /**
   * Xử lý khởi tạo thanh toán
   * @param {number} amount - Số tiền
   * @param {string} content - Nội dung
   * @param {string} packageName - Tên gói (optional)
   * @param {boolean} autoActivate - Tự động kích hoạt (optional)
   */
  const HandleInitiatePayment = (
    amount: number,
    content: string,
    packageName?: string,
    autoActivate?: boolean,
    qrCode?: string,
    bankInfo?: IBankAccount
  ) => {
    SetPaymentDetails({ amount, content, packageName, qrCode, bankInfo });
    SetPaymentStep("pending");
  };

  /**
   * Xử lý mô phỏng thành công
   */
  const HandleSimulationSuccess = () => {
    SetPaymentStep("success");
  };

  /**
   * Xử lý reset
   */
  const HandleReset = () => {
    SetPaymentStep("idle");
    SetPaymentDetails(null);
  };

  /**
   * Xử lý đóng modal
   */
  const HandleCloseModal = () => {
    if (PAYMENT_STEP === "pending") {
      /** Xác nhận */
      const CONFIRM = window.confirm(t("confirm_cancel_pending"));
      if (!CONFIRM) return;
    }
    SetPaymentStep("idle");
    SetPaymentDetails(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header
        currentUser={CURRENT_USER?.full_name || ""}
        isLoadingUser={LOADING_USER}
      />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        {/* SECTION 1: SEARCH */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            {t("step_1_search")}
          </h2>
          <div className="flex flex-col md:flex-row gap-4 pt-2">
            <div className="flex-grow relative">
              <input
                type="text"
                placeholder={t("search_placeholder")}
                className="w-full border border-gray-300 rounded-md px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-gray-800 placeholder-gray-400"
                value={SEARCH_QUERY}
                onChange={(e) => SetSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {LOADING_SEARCH ? (
                  <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Search className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
          {ERROR_SEARCH && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-md border border-red-100 flex items-center animate-pulse">
              <span className="mr-2">⚠️</span> {ERROR_SEARCH}
            </div>
          )}

          {/* Member Selection */}
          {MEMBERS.length > 0 && (
            <div className="mt-6 border-t pt-4 animate-fade-in">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t("select_member", {
                  defaultValue: "Chọn khách hàng đại diện cho tổ chức",
                })}
              </label>
              <div className="max-w-md">
                <Select
                  value={SELECTED_MEMBER_ID}
                  onValueChange={SetSelectedMemberId}
                >
                  <SelectTrigger className="w-full bg-white border-gray-300">
                    <SelectValue
                      placeholder={t("select_member", {
                        defaultValue: "Chọn khách hàng đại diện cho tổ chức",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBERS.map((m) => (
                      <SelectItem
                        key={m._id || m.user_id}
                        value={m._id || m.user_id}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {m?.user_info?.full_name ||
                              m?.user_info?.user_name ||
                              m?.user_info?.name ||
                              m?.user_info?.email ||
                              "Unknown"}
                          </span>
                          {m.role === "ADMIN" && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-500">
                  * Khách hàng này sẽ được ghi nhận trong giao dịch
                </p>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2 & 3 (Conditional) */}
        {CUSTOMER && (
          <div className="animate-slide-up space-y-8">
            {/* SECTION 2: INFO */}
            <CustomerInfo customer={CUSTOMER} currentUser={CURRENT_USER} />

            {/* SECTION 3: TABS */}
            <OrderTabs
              customer={CUSTOMER}
              current_user={CURRENT_USER}
              on_initiate_payment={HandleInitiatePayment}
              selected_member_id={SELECTED_MEMBER_ID}
              on_success={() => PerformSearch(CUSTOMER.orgId)}
            />
          </div>
        )}
      </main>

      {/* Payment Overlay Modal */}
      <PaymentOverlay
        step={PAYMENT_STEP}
        details={PAYMENT_DETAILS}
        onClose={HandleCloseModal}
        onReset={HandleReset}
        simulateSuccessTrigger={HandleSimulationSuccess}
        currentUser={CURRENT_USER}
        customer={CUSTOMER}
      />
    </div>
  );
};

export default App;
