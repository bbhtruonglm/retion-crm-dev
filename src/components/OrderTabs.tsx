import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { IOrganization, ITabType } from "../types";
import { MOCK_PACKAGES, MOCK_DURATIONS } from "../constants";
import { QrCode, Wallet, Package, Check, ClipboardCopy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiService } from "../services";
import InvoiceEditor from "./InvoiceEditor";

export interface IOrderTabsProps {
  /** Khách hàng hiện tại */
  customer: IOrganization;
  /** Hàm xử lý khởi tạo thanh toán */
  on_initiate_payment: (
    amount: number,
    content: string,
    packageName?: string,
    autoActivate?: boolean
  ) => void;
  /** Tài khoản hiện tại */
  current_user: any;
}

/**
 * Component xử lý Tabs chọn dịch vụ (Nạp tiền / Mua gói)
 * @param {IOrderTabsProps} props - Props đầu vào
 * @returns {JSX.Element} - Giao diện OrderTabs
 */
const OrderTabs: React.FC<IOrderTabsProps> = ({
  customer,
  on_initiate_payment,
  current_user,
}) => {
  const { t } = useTranslation();
  /** Tab đang active: 'topup' hoặc 'buy_package' */
  const [ACTIVE_TAB, SetActiveTab] = useState<ITabType>("topup");

  // Shared State
  /** Mã khuyến mãi */
  const [PROMO_CODE, SetPromoCode] = useState("");
  /** Tùy chọn xuất hóa đơn */
  const [INVOICE_OPTION, SetInvoiceOption] = useState<"no_invoice" | "invoice">(
    "no_invoice"
  );
  /** Trạng thái loading */
  const [IS_LOADING, SetIsLoading] = useState(false);

  // State for Buy Package Tab
  /** ID gói dịch vụ đang chọn */
  const [SELECTED_PACKAGE_ID, SetSelectedPackageId] = useState<string>(
    MOCK_PACKAGES[0].id
  );
  /** Số tháng đã chọn */
  const [SELECTED_DURATION_MONTHS, SetSelectedDurationMonths] =
    useState<number>(12);
  /** Tự động kích hoạt sau khi thanh toán */
  const [AUTO_ACTIVATE, SetAutoActivate] = useState(true);

  // State for Topup Tab
  /** Số tiền nạp nhập vào */
  const [TOPUP_AMOUNT, SetTopupAmount] = useState<string>("500.000");

  // -- COMPUTED --
  /** Gói dịch vụ đang chọn (Object) */
  const SELECTED_PACKAGE = useMemo(
    () =>
      MOCK_PACKAGES.find((p) => p.id === SELECTED_PACKAGE_ID) ||
      MOCK_PACKAGES[0],
    [SELECTED_PACKAGE_ID]
  );

  /** Thời hạn đang chọn (Object) */
  const SELECTED_DURATION = useMemo(
    () =>
      MOCK_DURATIONS.find((d) => d.months === SELECTED_DURATION_MONTHS) ||
      MOCK_DURATIONS[1],
    [SELECTED_DURATION_MONTHS]
  );

  /** Tổng tiền gói dịch vụ */
  const PACKAGE_TOTAL_PRICE = useMemo(() => {
    return SELECTED_PACKAGE.price * SELECTED_DURATION.months;
  }, [SELECTED_PACKAGE, SELECTED_DURATION]);

  /** Số tiền cần nạp thêm */
  const BUY_NEEDED_AMOUNT = useMemo(() => {
    const NEED = PACKAGE_TOTAL_PRICE - customer.balance;
    return NEED > 0 ? NEED : 0;
  }, [PACKAGE_TOTAL_PRICE, customer.balance]);

  /**
   * Định dạng tiền tệ
   * @param {number} val - Giá trị số
   * @returns {string} - Chuỗi định dạng tiền
   */
  const FormatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);

  // -- HANDLERS --

  /**
   * Tạo giao dịch mới
   * @param {number} amount - Số tiền giao dịch
   * @param {object} meta - Metadata của giao dịch
   * @returns {Promise<string>} - Mã giao dịch
   */
  const CreateTransaction = async (
    amount: number,
    meta: {
      type: "PURCHASE" | "INCREASE" | "TOP_UP_WALLET";
      product?: string;
      quantity?: number;
    }
  ) => {
    /** Token xác thực */
    const TOKEN = localStorage.getItem("auth_token");
    if (!TOKEN)
      throw new Error(
        t("login_again", { defaultValue: "Vui lòng đăng nhập lại." })
      );

    // 1. Read Wallet
    /** Kết quả lấy ví */
    const WALLET_RES = await apiService.ReadWallet(customer.orgId, TOKEN);

    if (WALLET_RES.status !== 200 || WALLET_RES.error)
      throw new Error(
        t("cannot_get_wallet", { defaultValue: "Không thể lấy thông tin ví." })
      );
    /** Dữ liệu ví */
    const WALLET_DATA = WALLET_RES.data;
    /** ID ví */
    const WALLET_ID = WALLET_DATA.data?.wallet_id || WALLET_DATA.wallet_id;
    if (!WALLET_ID)
      throw new Error(
        t("wallet_id_not_found", { defaultValue: "Không tìm thấy ID ví." })
      );

    // 2. Create Transaction
    /** Kết quả tạo giao dịch */
    const TXN_RES = await apiService.CreateTransaction(
      {
        org_id: customer.orgId,
        wallet_id: WALLET_ID,
        txn_amount: amount,
        txn_payment_method: "TRANSFER",
        txn_is_issue_invoice: INVOICE_OPTION === "invoice",
        meta: {
          ...meta,
          ref: current_user?.alias_code || current_user?.user_id || "UNKNOWN",
        },
        ...(PROMO_CODE ? { voucher_code: PROMO_CODE } : {}),
      },
      TOKEN
    );

    if (TXN_RES.status !== 200 || TXN_RES.error)
      throw new Error(
        t("cannot_create_txn", { defaultValue: "Không thể tạo giao dịch." })
      );
    /** Dữ liệu giao dịch */
    const TXN_DATA = TXN_RES.data;
    /** Đối tượng giao dịch */
    const TXN = TXN_DATA.data || TXN_DATA;

    return TXN.txn_code || TXN.txn_id || `Unknown-${Date.now()}`;
  };

  /**
   * Xử lý tạo QR nạp tiền
   */
  const HandleCreateQrTopup = async () => {
    /** Số tiền nạp đã parse */
    const AMOUNT = parseInt(TOPUP_AMOUNT.replace(/\D/g, ""), 10) || 0;
    if (AMOUNT <= 0) return;

    SetIsLoading(true);
    try {
      /** Mã Code từ transaction */
      const CODE = await CreateTransaction(AMOUNT, {
        type: "TOP_UP_WALLET",
      });
      on_initiate_payment(AMOUNT, CODE);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : t("error_occurred", { defaultValue: "Có lỗi xảy ra" })
      );
    } finally {
      SetIsLoading(false);
    }
  };

  /**
   * Xử lý tạo QR mua gói hoặc kích hoạt gói nếu đủ tiền
   */
  const HandleCreateQrPackage = async () => {
    /** Nếu đủ tiền, kích hoạt gói trực tiếp */
    if (BUY_NEEDED_AMOUNT <= 0) {
      SetIsLoading(true);
      try {
        /** Token xác thực */
        const TOKEN = localStorage.getItem("auth_token");
        if (!TOKEN)
          throw new Error(
            t("login_again", { defaultValue: "Vui lòng đăng nhập lại." })
          );

        /** Lấy thông tin ví */
        const WALLET_RES = await apiService.ReadWallet(customer.orgId, TOKEN);
        if (WALLET_RES.status !== 200 || WALLET_RES.error)
          throw new Error(
            t("cannot_get_wallet", {
              defaultValue: "Không thể lấy thông tin ví.",
            })
          );

        /** Dữ liệu ví */
        const WALLET_DATA = WALLET_RES.data;
        /** ID ví */
        const WALLET_ID = WALLET_DATA.data?.wallet_id || WALLET_DATA.wallet_id;
        if (!WALLET_ID)
          throw new Error(
            t("wallet_id_not_found", { defaultValue: "Không tìm thấy ID ví." })
          );

        /** Xác định package type - nếu chưa từng dùng thử và chọn gói PRO thì cho dùng thử */
        const PACKAGE_TYPE = SELECTED_PACKAGE_ID.toUpperCase();

        /** Gọi API mua gói */
        const PURCHASE_RES = await apiService.PurchasePackage(
          {
            org_id: customer.orgId,
            wallet_id: WALLET_ID,
            package_type: PACKAGE_TYPE,
            months: SELECTED_DURATION_MONTHS,
          },
          TOKEN
        );

        if (PURCHASE_RES.status !== 200 || PURCHASE_RES.error) {
          /** Xử lý lỗi không đủ tiền */
          if (PURCHASE_RES.error === "WALLET.NOT_ENOUGH_MONEY") {
            throw new Error(
              t("not_enough_money", {
                defaultValue: "Số dư ví không đủ để mua gói này.",
              })
            );
          }
          throw new Error(
            PURCHASE_RES.error ||
              t("cannot_purchase", {
                defaultValue: "Không thể mua gói. Vui lòng thử lại.",
              })
          );
        }

        /** Thông báo thành công */
        alert(
          t("purchase_success", {
            defaultValue: "Mua gói thành công! Trang sẽ được tải lại.",
          })
        );

        /** Chờ 1 giây rồi reload */
        await new Promise((resolve) => setTimeout(resolve, 1000));
        window.location.reload();
      } catch (error) {
        console.error(error);
        alert(
          error instanceof Error
            ? error.message
            : t("error_occurred", { defaultValue: "Có lỗi xảy ra" })
        );
      } finally {
        SetIsLoading(false);
      }
      return;
    }

    /** Nếu không đủ tiền, tạo QR để nạp thêm */
    SetIsLoading(true);
    try {
      /** Mã Code từ transaction */
      const CODE = await CreateTransaction(BUY_NEEDED_AMOUNT, {
        type: "PURCHASE",
        product: SELECTED_PACKAGE_ID.toUpperCase(),
        quantity: SELECTED_DURATION_MONTHS,
      });
      on_initiate_payment(
        BUY_NEEDED_AMOUNT,
        CODE,
        SELECTED_PACKAGE.name,
        AUTO_ACTIVATE
      );
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : t("error_occurred", { defaultValue: "Có lỗi xảy ra" })
      );
    } finally {
      SetIsLoading(false);
    }
  };

  /**
   * Xử lý thay đổi số tiền nhập vào
   * @param {React.ChangeEvent<HTMLInputElement>} e - Sự kiện input
   */
  const HandleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    /** Giá trị thô */
    const VAL = e.target.value.replace(/\D/g, "");
    if (!VAL) SetTopupAmount("");
    else
      SetTopupAmount(new Intl.NumberFormat("vi-VN").format(parseInt(VAL, 10)));
  };

  // Reusable Components
  /**
   * Component hiển thị phần hóa đơn
   * @returns {JSX.Element}
   */
  const InvoiceSection = () => (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase">
        {t("invoice")}
      </h3>
      <div className="flex items-center space-x-6 mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="invoice"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            checked={INVOICE_OPTION === "no_invoice"}
            onChange={() => SetInvoiceOption("no_invoice")}
          />
          <span className="ml-2 text-gray-900 text-sm">{t("no_invoice")}</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="invoice"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            checked={INVOICE_OPTION === "invoice"}
            onChange={() => SetInvoiceOption("invoice")}
          />
          <span className="ml-2 text-gray-900 text-sm">
            {t("issue_invoice")}
          </span>
        </label>
      </div>

      {INVOICE_OPTION === "invoice" && <InvoiceEditor customer={customer} />}
    </div>
  );

  /**
   * Component hiển thị phần phương thức thanh toán
   * @returns {JSX.Element}
   */
  const PaymentMethodSection = () => (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase">
        {t("payment")}
      </h3>
      <div className="flex items-center gap-4 mb-6">
        <label className="flex items-center p-4 bg-white border border-blue-600 rounded-lg cursor-pointer shadow-sm ring-1 ring-blue-600">
          <input
            type="radio"
            checked={true}
            readOnly
            className="h-4 w-4 text-blue-600"
          />
          <span className="ml-3 font-bold text-gray-900">
            {t("transfer_bank")}
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => SetActiveTab("topup")}
          className={`flex-1 py-4 border-b-2 text-sm font-medium text-center focus:outline-none transition-colors flex items-center justify-center gap-2 ${
            ACTIVE_TAB === "topup"
              ? "bg-white border-b-blue-600 text-blue-600 font-bold "
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Wallet className="w-5 h-5" /> {t("top_up")}
        </button>
        <button
          onClick={() => SetActiveTab("buy_package")}
          className={`flex-1 border-b-2 py-4 text-sm font-medium text-center focus:outline-none transition-colors flex items-center justify-center gap-2 ${
            ACTIVE_TAB === "buy_package"
              ? "bg-white border-b-blue-600 text-blue-600 font-bold"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Package className="w-5 h-5" /> {t("buy_package")}
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6 flex-grow ">
        {ACTIVE_TAB === "topup" ? (
          <div className="animate-fade-in flex flex-col h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700">
                  {t("top_up_amount")}
                </label>
                <input
                  type="text"
                  value={TOPUP_AMOUNT}
                  onChange={HandleAmountChange}
                  className="block w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t("min_max_top_up")}
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700">
                  {t("promo_code")}
                </label>
                <input
                  type="text"
                  value={PROMO_CODE}
                  onChange={(e) => SetPromoCode(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("enter_promo_code")}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 my-6"></div>

            <InvoiceSection />
            <PaymentMethodSection />

            <div className="mt-auto">
              <button
                onClick={HandleCreateQrTopup}
                disabled={IS_LOADING}
                className={`w-full py-4 text-white text-lg font-bold rounded-md shadow hover:shadow-lg transition-all flex items-center justify-center ${
                  IS_LOADING
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {IS_LOADING ? t("processing") : t("continue")}
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in flex flex-col h-full bg-slate-50 -m-6 p-6">
            {/* BUY PACKAGE CONTENT */}

            {/* 1. SELECTION ROW */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700">
                  {t("select_package")}
                </label>
                <Select
                  value={SELECTED_PACKAGE_ID}
                  onValueChange={SetSelectedPackageId}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder={t("select_package")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_PACKAGES.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} ({FormatCurrency(pkg.price)}/{t("month")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700">
                  {t("select_duration")}
                </label>
                <Select
                  value={String(SELECTED_DURATION_MONTHS)}
                  onValueChange={(val) =>
                    SetSelectedDurationMonths(Number(val))
                  }
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder={t("select_duration")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_DURATIONS.map((d) => (
                      <SelectItem key={d.months} value={String(d.months)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2. SUMMARY & PAYMENT LAYOUT */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-8">
              {/* LEFT: PACKAGE INFO */}
              <div className="flex-1 space-y-4 border-r border-gray-100 pr-4">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                  {t("package_info")}
                </h4>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {SELECTED_PACKAGE.name}
                  </p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                    {t("for_business")}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600">{t("duration")}</span>
                  <span className="font-semibold">
                    {SELECTED_DURATION.label}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">{t("value")}</span>
                  <span className="font-bold text-gray-900">
                    {FormatCurrency(PACKAGE_TOTAL_PRICE)}
                  </span>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 rounded text-sm text-yellow-800 flex gap-2">
                  <Wallet className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">{t("current_wallet_balance")}</p>
                    <p>{FormatCurrency(customer.balance)}</p>
                  </div>
                </div>
              </div>

              {/* RIGHT: PAYMENT INFO */}
              <div className="flex-1 space-y-6">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                  {t("payment_info")}
                </h4>

                <InvoiceSection />

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    {t("promo_code")}
                  </label>
                  <input
                    type="text"
                    value={PROMO_CODE}
                    onChange={(e) => SetPromoCode(e.target.value)}
                    placeholder={t("enter_promo_code")}
                    className="block w-full border-gray-300 rounded-md text-sm px-3 py-2 border"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-600">{t("total_payment")}</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {FormatCurrency(BUY_NEEDED_AMOUNT)}
                    </span>
                  </div>
                  {BUY_NEEDED_AMOUNT <= 0 ? (
                    <div className="text-green-600 font-medium text-sm flex items-center gap-1">
                      <Check className="w-4 h-4" /> {t("balance_sufficient")}
                    </div>
                  ) : (
                    <div className="text-red-500 text-sm">
                      {t("need_top_up", {
                        amount: FormatCurrency(BUY_NEEDED_AMOUNT),
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. ACTION BUTTON */}
            <div className="mt-8">
              {BUY_NEEDED_AMOUNT > 0 ? (
                <>
                  <PaymentMethodSection />

                  <button
                    onClick={HandleCreateQrPackage}
                    disabled={IS_LOADING}
                    className={`w-full py-4 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
                      IS_LOADING
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
                    }`}
                  >
                    {IS_LOADING
                      ? t("processing")
                      : t("create_qr_payment", {
                          amount: FormatCurrency(BUY_NEEDED_AMOUNT),
                        })}
                  </button>
                </>
              ) : (
                <button
                  onClick={HandleCreateQrPackage}
                  className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all"
                >
                  {t("activate_now")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTabs;
