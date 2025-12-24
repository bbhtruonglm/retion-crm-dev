import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Header from "./components/Header";
import CustomerInfo from "./components/CustomerInfo";
import OrderTabs from "./components/OrderTabs";
import PaymentOverlay from "./components/PaymentOverlay";
import { Search, User } from "lucide-react";
import {
  IOrganization,
  IBankAccount,
  IPaymentDetails,
  IPaymentStep,
} from "./types";
import { apiService } from "./services";
import { API_CONFIG } from "./services/api.config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NotFoundPage from "./pages/NotFoundPage";

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
    /** Bật trạng thái loading khi gọi API */
    SetLoadingUser(true);
    /** Bắt đầu block try/catch để xử lý lỗi API */
    try {
      /** Gọi API lấy thông tin người dùng hiện tại */
      const RESPONSE = await apiService.ReadCurrentUser(authToken);

      /** Kiểm tra nếu response thành công (status 200) */
      if (RESPONSE.status === 200 && RESPONSE.data) {
        /** Lấy dữ liệu người dùng từ response (hỗ trợ 2 cấu trúc) */
        const USER_DATA = RESPONSE.data.data || RESPONSE.data;
        /** Nếu có dữ liệu người dùng */
        if (USER_DATA) {
          /** Lưu thông tin người dùng vào state */
          SetCurrentUser(USER_DATA);
        }
      }
    } catch (error) {
      /** Log lỗi ra console nếu call API thất bại */
      console.error("Failed to fetch current user", error);
    } finally {
      /** Tắt trạng thái loading bất kể thành công hay thất bại */
      SetLoadingUser(false);
    }
  };

  /**
   * Thực hiện tìm kiếm khách hàng
   * @param {string} query - Org ID hoặc tên khách hàng
   */
  const PerformSearch = async (query: string) => {
    /** Nếu query rỗng thì không làm gì */
    if (!query.trim()) return;

    /** Bật loading, reset customer và error trước khi tìm kiếm mới */
    SetLoadingSearch(true);
    SetCustomer(null);
    SetErrorSearch("");

    /** Lấy token hiện tại từ state hoặc local storage */
    const CURRENT_TOKEN = TOKEN || localStorage.getItem("auth_token");
    /** Nếu không có token thì báo lỗi và dừng */
    if (!CURRENT_TOKEN) {
      SetErrorSearch(t("error_token_missing"));
      SetLoadingSearch(false);
      return;
    }

    /** Bắt đầu block try/catch xử lý tìm kiếm */
    try {
      /** Gọi API tìm kiếm Organization */
      const RESPONSE = await apiService.ReadOrganization(
        {
          skip: 0,
          limit: 20,
          start_date: null,
          end_date: null,
          org_id: query,
        },
        CURRENT_TOKEN
      );

      /** Kiểm tra lỗi trả về từ API */
      if (RESPONSE.status !== 200 || RESPONSE.error) {
        throw new Error(
          t("error_server", { error: RESPONSE.error || "Unknown error" })
        );
      }

      /** Lấy dữ liệu thô từ response */
      const RAW_DATA = RESPONSE.data;

      /** Lấy danh sách tổ chức từ data trả về */
      const LIST = Array.isArray(RAW_DATA.data) ? RAW_DATA.data : [];
      /** Lấy phần tử đầu tiên trong danh sách (kết quả chính xác nhất) */
      const DATA = LIST.length > 0 ? LIST[0] : null;

      /** Nếu không tìm thấy data thì báo lỗi */
      if (!DATA) {
        SetErrorSearch(t("error_not_found"));
        return;
      }

      /** Xác định Org ID để tham chiếu (ưu tiên từ data, fallback query) */
      const ORG_ID = DATA.org_id || query;

      /** Khởi tạo số dư ví mặc định từ data Organization */
      let wallet_balance = DATA.wallet?.wallet_balance ?? 0;

      /** Thử lấy thông tin Wallet chi tiết để cập nhật số dư chính xác */
      try {
        /** Gọi API lấy thông tin ví */
        const WALLET_RESPONSE = await apiService.ReadWallet(
          ORG_ID,
          CURRENT_TOKEN
        );
        /** Nếu lấy ví thành công */
        if (WALLET_RESPONSE.status === 200 && WALLET_RESPONSE.data?.data) {
          /** Lấy dữ liệu ví */
          const WALLET_DATA = WALLET_RESPONSE.data.data;
          /**
           * Tính toán số dư khả dụng (Logic: credit_balance - extra_cost + wallet_balance)
           * Đây là công thức thống nhất để tính tiền có thể tiêu
           */
          wallet_balance =
            (WALLET_DATA.credit_balance ?? 0) -
            (WALLET_DATA.extra_cost ?? 0) +
            (WALLET_DATA.wallet_balance ?? 0);
        }
      } catch (walletErr) {
        /** Ghi log lỗi nếu lấy ví thất bại và dùng số dư mặc định */
        console.error("Failed to fetch wallet info:", walletErr);
      }

      /** Chuẩn hóa dữ liệu Organization để hiển thị UI */
      const ORG_DATA: IOrganization = {
        id: DATA._id || "unknown",
        orgId: ORG_ID,
        name: DATA.org_info?.org_name || DATA.name || "Khách hàng",
        balance: wallet_balance,
        currentPackage: DATA.org_package?.org_package_type || "Unknown",
        refName: null, // Legacy ref logic
        refStatus: "Chưa có",
        org_info: DATA.org_info,
        user: DATA.user,
        affiliate: DATA.affiliate,
      };

      /** Cập nhật state Customer với dữ liệu đã xử lý */
      SetCustomer(ORG_DATA);
    } catch (err) {
      /** Xử lý lỗi chung trong quá trình tìm kiếm */
      console.error(err);
      SetErrorSearch(
        t("error_search", {
          error: err instanceof Error ? err.message : String(err),
        })
      );
    } finally {
      /** Tắt loading search */
      SetLoadingSearch(false);
    }
  };

  /**
   * Effect khởi tạo từ URL params
   */
  useEffect(() => {
    /** Flag để theo dõi component mount status, tránh update state khi unmounted */
    let is_mounted = true;

    /** Lấy URLSearchParams để parse query string */
    const PARAMS = new URLSearchParams(window.location.search);
    /** Lấy giá trị org_id từ URL */
    const ORG_ID_FROM_URL = PARAMS.get("org_id");
    /** Lấy giá trị token từ URL */
    const TOKEN_FROM_URL = PARAMS.get("token");

    /** Lấy token đang lưu trong localStorage */
    let active_token = localStorage.getItem("auth_token");

    /** Logic ưu tiên token từ URL: nếu có thì update localStorage và dùng làm active */
    if (TOKEN_FROM_URL) {
      SetToken(TOKEN_FROM_URL);
      localStorage.setItem("auth_token", TOKEN_FROM_URL);
      active_token = TOKEN_FROM_URL;
    } else if (active_token) {
      /** Nếu không có URL token thì dùng token local */
      SetToken(active_token);
    }

    /** Nếu có token và component còn mounted, fetch thông tin user */
    if (active_token && is_mounted) {
      FetchCurrentUser(active_token);
    } else if (is_mounted) {
      SetLoadingUser(false);
    }

    /** Nếu có ID từ URL, set vào ô tìm kiếm để trigger Effect tìm kiếm */
    if (ORG_ID_FROM_URL && is_mounted) {
      SetSearchQuery(ORG_ID_FROM_URL);
    }

    /** Nếu URL có params, clear URL để gọn gàng */
    if (PARAMS.toString()) {
      const NEW_URL = window.location.pathname;
      window.history.replaceState({}, "", NEW_URL);
    }

    /** Cleanup function: set flag mounted false */
    return () => {
      is_mounted = false;
    };
  }, []); // Dependency rỗng đảm bảo chỉ chạy 1 lần khi mount

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
        /** Lấy token để gọi API member */
        const CURRENT_TOKEN = TOKEN || localStorage.getItem("auth_token");
        /** Gọi API lấy danh sách thành viên */
        const RES = await apiService.ReadMembers(
          CUSTOMER.orgId,
          CURRENT_TOKEN || undefined
        );

        /** Nếu API trả về thành công */
        if (RES.status === 200 && RES.data) {
          /** Chuẩn hóa danh sách từ response */
          const LIST = RES.data.data || RES.data || [];
          if (Array.isArray(LIST)) {
            /** Cập nhật state MEMBERS */
            SetMembers(LIST);

            /** Biến lưu trữ member mặc định được chọn */
            let default_member = null;

            /**
             * Logic tìm member mặc định:
             * 1. Tìm member khớp với user đang gắn với Org (nếu có)
             */
            if (CUSTOMER.user) {
              default_member = LIST.find(
                (m: any) =>
                  m?.user_info?.user_id === CUSTOMER?.user?.user_id ||
                  m?.user_info?.fb_staff_id === CUSTOMER?.user?.fb_staff_id
              );
            }

            /**
             * 2. Nếu không có user khớp, tìm ADMIN đầu tiên
             */
            if (!default_member) {
              default_member = LIST.find(
                (m: any) => m.role === "ADMIN" || m.is_admin
              );
            }

            /**
             * 3. Fallback: Nếu vẫn chưa có, lấy member đầu tiên trong danh sách
             */
            if (!default_member && LIST.length > 0) {
              default_member = LIST[0];
            }

            /** Nếu tìm được default member, set ID vào state để select */
            if (default_member) {
              SetSelectedMemberId(default_member?.user_info?.user_id);
            }
          }
        }
      } catch (error) {
        /** Log lỗi nếu fetch member thất bại */
        console.error("Failed to fetch members", error);
      }
    };

    FetchMembers();
  }, [CUSTOMER, CURRENT_USER, TOKEN]);

  /**
   * Effect SSE: Lắng nghe trạng thái giao dịch realtime thay cho polling
   */
  useEffect(() => {
    /** Chỉ chạy khi đang Pending và có mã giao dịch */
    if (PAYMENT_STEP !== "pending" || !PAYMENT_DETAILS?.content) return;

    const TXN_ID = PAYMENT_DETAILS.content;
    /** Đường dẫn SSE public */
    const SSE_URL = `${API_CONFIG.BILLING_URL}/public/transaction/read_txn?txn_id=${TXN_ID}`;

    let eventSource: EventSource | null = new EventSource(SSE_URL);

    eventSource.onmessage = (event) => {
      try {
        const DATA = JSON.parse(event.data);
        /** Kiểm tra trạng thái thành công */
        const IS_SUCCESS =
          DATA.status === "SUCCESS" ||
          DATA.success === true ||
          DATA.txn_status === "SUCCESS";

        /** Nếu giao dịch thành công */
        if (IS_SUCCESS) {
          /** Chuyển state sang success */
          SetPaymentStep("success");
          /** Làm mới thông tin khách hàng */
          if (CUSTOMER?.orgId) {
            PerformSearch(CUSTOMER.orgId);
          }
          /** Đóng kết nối */
          eventSource?.close();
          eventSource = null;
        } else if (DATA.error === "TXN_NOT_FOUND") {
          console.error("Transaction not found via SSE");
        }
      } catch (e) {
        console.error("SSE Parse Message Error", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection Error", err);
      // EventSource tự động retry khi mất kết nối
    };

    /** Cleanup khi unmount hoặc đổi state */
    return () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [PAYMENT_STEP, PAYMENT_DETAILS?.content]);

  /**
   * Effect xử lý debounce tìm kiếm
   * Giúp giảm tải request API khi user đang gõ phím liên tục
   */
  useEffect(() => {
    /** Set timeout 300ms sau lần gõ cuối cùng mới thực thi */
    const TIME_OUT_ID = setTimeout(() => {
      /** Nếu ô tìm kiếm có giá trị -> Gọi API Search */
      if (SEARCH_QUERY.trim()) {
        PerformSearch(SEARCH_QUERY);
      } else {
        /** Nếu ô tìm kiếm rỗng -> Reset data customer */
        SetCustomer(null);
        SetErrorSearch("");
      }
    }, 300);

    /** Clear timeout nếu user gõ tiếp trước khi hết 300ms */
    return () => clearTimeout(TIME_OUT_ID);
  }, [SEARCH_QUERY]);

  /**
   * Xử lý khởi tạo thanh toán
   * @param {number} amount - Số tiền cần thanh toán
   * @param {string} content - Nội dung chuyển khoản
   * @param {string} packageName - Tên gói dịch vụ (nếu mua gói)
   * @param {boolean} autoActivate - Cờ tự động kích hoạt
   * @param {string} qrCode - Chuỗi QR code (nếu có sẵn)
   * @param {IBankAccount} bankInfo - Thông tin tài khoản ngân hàng động
   */
  const HandleInitiatePayment = (
    amount: number,
    content: string,
    packageName?: string,
    autoActivate?: boolean,
    qrCode?: string,
    bankInfo?: IBankAccount
  ) => {
    /** Lưu toàn bộ thông tin thanh toán vào state để component Overlay sử dụng */
    SetPaymentDetails({ amount, content, packageName, qrCode, bankInfo });
    /** Chuyển trạng thái sang Pending để hiển thị Overlay QR code */
    SetPaymentStep("pending");
  };

  /**
   * Xử lý mô phỏng thành công (Dev mode mostly)
   */
  const HandleSimulationSuccess = () => {
    /** Chuyển trực tiếp sang trạng thái thành công */
    SetPaymentStep("success");
  };

  /**
   * Xử lý reset về trạng thái ban đầu
   */
  const HandleReset = () => {
    SetPaymentStep("idle");
    SetPaymentDetails(null);
  };

  /**
   * Xử lý đóng modal overlay
   * Logic confirm đã được chuyển vào trong PaymentOverlay component
   */
  const HandleCloseModal = () => {
    /** Reset về trạng thái rảnh rỗi */
    SetPaymentStep("idle");
    SetPaymentDetails(null);
  };

  /** Kiểm tra quyền truy cập */
  if (!LOADING_USER) {
    /**
     * Fallback cases:
     * 1. Không có token/user (CURRENT_USER là null)
     * 2. Có user nhưng role không phải ADMIN hoặc STAFF
     */
    if (!CURRENT_USER || !["ADMIN", "MEMBER"].includes(CURRENT_USER.role)) {
      return <NotFoundPage />;
    }
  }

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
                /** Cập nhật state tìm kiếm khi user gõ */
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

            {/* Button kiểm tra thủ công */}
            <button
              onClick={() => PerformSearch(SEARCH_QUERY)}
              disabled={LOADING_SEARCH}
              className="bg-blue-600 text-white px-6 py-2 flex items-center gap-2 rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed shrink-0"
            >
              {/* Icon kính lúp */}
              <Search className="w-5 h-5 mr-2" />
              {t("check", { defaultValue: "Kiểm tra" })}
            </button>
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
                  /** Cập nhật state member ID khi chọn */
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
                        key={m.user_info?.user_id}
                        value={m.user_info?.user_id}
                      >
                        <span className="flex items-center gap-2 w-full">
                          <User className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="font-medium truncate block max-w-[200px]">
                            {m?.user_info?.full_name ||
                              m?.user_info?.user_name ||
                              m?.user_info?.name ||
                              m?.user_info?.email ||
                              "Unknown"}
                          </span>
                          {m.role === "ADMIN" && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded shrink-0">
                              Admin
                            </span>
                          )}
                        </span>
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
