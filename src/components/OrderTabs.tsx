import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IOrganization, ITabType } from "../types";
import { MOCK_PACKAGES, MOCK_DURATIONS, BANK_ACCOUNTS } from "../constants";
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
import { IBankAccount } from "../types";

export interface IOrderTabsProps {
  /** Khách hàng hiện tại */
  customer: IOrganization;
  /** Hàm xử lý khởi tạo thanh toán */
  on_initiate_payment: (
    amount: number,
    content: string,
    packageName?: string,
    autoActivate?: boolean,
    qrCode?: string,
    bankInfo?: IBankAccount
  ) => void;
  /** Tài khoản hiện tại */
  current_user: any;
  /** ID thành viên */
  selected_member_id: string;
  /** Hàm callback khi thành công */
  on_success?: () => void;
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
  selected_member_id,
  on_success,
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

  // Voucher State
  /** Số tiền sau khi giảm giá */
  const [DISCOUNTED_AMOUNT, SetDiscountedAmount] = useState<number | null>(
    null
  );
  /** Kết quả verify voucher full object */
  const [VERIFY_VOUCHER_RESULT, SetVerifyVoucherResult] = useState<any>(null);
  const [VERIFIED_VOUCHER_CODE, SetVerifiedVoucherCode] = useState<string>("");
  const [IS_VERIFYING_VOUCHER, SetIsVerifyingVoucher] = useState(false);

  // Reset voucher when active tab changes
  useEffect(() => {
    SetDiscountedAmount(null);
    SetVerifiedVoucherCode("");
    SetPromoCode("");
    SetVerifyVoucherResult(null);
  }, [ACTIVE_TAB]);

  // Reset voucher when base amount changes (package/duration/topup amount)
  useEffect(() => {
    if (VERIFIED_VOUCHER_CODE) {
      SetDiscountedAmount(null);
      SetVerifiedVoucherCode("");
      SetVerifyVoucherResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TOPUP_AMOUNT, SELECTED_PACKAGE_ID, SELECTED_DURATION_MONTHS]);

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
    // 30 ngày (ms)
    /** 30 ngày (ms) */
    const MONTH_MS = 1000 * 60 * 60 * 24 * 30;
    /** Mặc định số tháng của gói là 1 */
    let pkg_duration_months = 1;

    /**
     * Tính số tháng thực tế của gói nếu có duration (timestamp)
     * Logic: duration / MONTH_MS
     */
    if (
      SELECTED_PACKAGE.duration &&
      SELECTED_PACKAGE.duration > 0 &&
      SELECTED_PACKAGE.duration < 9999999999999
    ) {
      pkg_duration_months = Math.round(SELECTED_PACKAGE.duration / MONTH_MS);
      if (pkg_duration_months < 1) pkg_duration_months = 1;
    }

    // Tính giá mỗi tháng: Giá gói / Số tháng của gói (để chuẩn hóa giá tháng)
    const PRICE_PER_MONTH = SELECTED_PACKAGE.price / pkg_duration_months;

    // Tổng = Giá mỗi tháng * Số tháng user chọn
    return Math.round(PRICE_PER_MONTH * SELECTED_DURATION.months);
  }, [SELECTED_PACKAGE, SELECTED_DURATION]);

  /**
   * Số tiền cần nạp thêm
   * Logic: (Giá phải trả - Số dư hiện tại)
   * Nếu âm (dư tiền) thì trả về 0
   */
  const BUY_NEEDED_AMOUNT = useMemo(() => {
    /** Lấy giá sau khi giảm (nếu có) hoặc giá gốc */
    const PRICE =
      DISCOUNTED_AMOUNT !== null ? DISCOUNTED_AMOUNT : PACKAGE_TOTAL_PRICE;
    /** Tính số tiền thiếu */
    const NEED = PRICE - customer.balance;
    /** Trả về số dương hoặc 0 */
    return NEED > 0 ? NEED : 0;
  }, [PACKAGE_TOTAL_PRICE, customer.balance, DISCOUNTED_AMOUNT]);

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
   * Tính toán hiển thị text sau khi nhập mã thành công
   */
  const getPriceChangeText = (original_price: number, new_price: number) => {
    const DIFF_AMOUNT = new_price - original_price;
    if (DIFF_AMOUNT < 0) {
      return `${t("pay_less", {
        defaultValue: "Giảm",
      })} ${FormatCurrency(Math.abs(DIFF_AMOUNT))}`;
    } else if (DIFF_AMOUNT > 0) {
      return `${t("pay_more", {
        defaultValue: "Tăng",
      })} ${FormatCurrency(DIFF_AMOUNT)}`;
    } else {
      return "";
    }
  };

  /**
   * Effect Debounce Verify Voucher
   */
  useEffect(() => {
    const VerifyVoucher = async () => {
      // Determine base amount
      /** Xác định số tiền gốc để tính voucher */
      let base_amount = 0;
      if (ACTIVE_TAB === "topup") {
        /** Nếu tab nạp tiền: parse từ input */
        base_amount = parseInt(TOPUP_AMOUNT.replace(/\D/g, ""), 10) || 0;
      } else {
        /** Nếu tab mua gói: dùng tổng tiền gói */
        base_amount = PACKAGE_TOTAL_PRICE;
      }

      /** Nếu không có mã hoặc số tiền <= 0 thì reset */
      if (!PROMO_CODE.trim() || base_amount <= 0) {
        SetVerifyVoucherResult({});
        SetDiscountedAmount(null);
        SetVerifiedVoucherCode("");
        return;
      }

      SetIsLoading(true);
      try {
        const TOKEN = localStorage.getItem("auth_token");
        /** Gọi API Verify Voucher */
        const RES = await apiService.VerifyVoucher(
          {
            org_id: customer.orgId,
            voucher_code: PROMO_CODE,
            txn_amount: base_amount,
            user_id: customer.id,
          },
          TOKEN
        );

        /** Xử lý kết quả trả về */
        if (RES.status === 200 && RES.data && RES.data.data) {
          const DATA = RES.data.data;
          SetVerifyVoucherResult(DATA);

          /** Nếu voucher hợp lệ (is_verify = true) */
          if (DATA.is_verify) {
            /** Cập nhật số tiền sau giảm */
            SetDiscountedAmount(DATA.txn_origin_amount);
            /** Đánh dấu mã này đã verify thành công */
            SetVerifiedVoucherCode(PROMO_CODE);
          } else {
            SetDiscountedAmount(null);
            SetVerifiedVoucherCode("");
          }
        } else {
          /** Nếu API lỗi hoặc voucher sai */
          SetVerifyVoucherResult({ is_verify: false });
          SetDiscountedAmount(null);
          SetVerifiedVoucherCode("");
        }
      } catch (error) {
        console.error("Verify voucher error", error);
        SetVerifyVoucherResult({ is_verify: false });
      } finally {
        SetIsLoading(false);
      }
    };

    const TIMEOUT_ID = setTimeout(() => {
      VerifyVoucher();
    }, 300);

    return () => clearTimeout(TIMEOUT_ID);
  }, [
    PROMO_CODE,
    ACTIVE_TAB,
    TOPUP_AMOUNT,
    PACKAGE_TOTAL_PRICE,
    customer.orgId,
  ]);

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
          /** Lưu người giới thiệu (ref) vào meta nếu có user đang login */
          ref: current_user?.alias_code || current_user?.user_id || "UNKNOWN",
          /** Lưu người thực hiện actual_user_id là member được chọn */
          actual_user_id: selected_member_id,
        },
        /** Nếu có voucher code thì gửi kèm */
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

    const TXN_CODE = TXN.txn_code || TXN.txn_id || `Unknown-${Date.now()}`;
    let qr_string = "";
    let dynamic_bank_info = BANK_ACCOUNTS.BBH;

    try {
      /** Gọi API generate QR */
      const QR_RES = await apiService.GenerateQrCode(
        {
          version: "v3",
          txn_id: TXN_CODE,
          org_id: customer.orgId,
        },
        TOKEN
      );

      if (QR_RES.status === 200 && QR_RES.data) {
        const RESP_DATA = QR_RES.data.data || QR_RES.data;

        /** QR DATA string */
        const QR_DATA = RESP_DATA.qr_code;
        if (typeof QR_DATA === "string") {
          qr_string = QR_DATA;
        }

        /** Parse Receiver Info if available (v3) API trả về thông tin tài khoản đích */
        if (RESP_DATA.receiver) {
          const { account_number, bank_name, transaction_content } =
            RESP_DATA.receiver;
          // Construct dynamic bank info
          // Preserve static name/bin from BBH default or map if needed.
          // Here we update account and bank name from response.
          /** Cập nhật thông tin ngân hàng động từ phản hồi VietQR */
          dynamic_bank_info = {
            ...BANK_ACCOUNTS.BBH,
            account: account_number || BANK_ACCOUNTS.BBH.account,
            bank: bank_name || BANK_ACCOUNTS.BBH.bank,
            code: transaction_content || TXN_CODE,
          };
        }
      }
    } catch (e) {
      console.error("Failed to generate QR", e);
    }

    return { code: TXN_CODE, qr: qr_string, bank: dynamic_bank_info };
  };

  /**
   * Xử lý tạo QR nạp tiền
   */
  const HandleCreateQrTopup = async () => {
    /** Kiểm tra nếu có mã giảm giá nhưng không hợp lệ thì chặn */
    if (
      PROMO_CODE.trim() &&
      (!VERIFY_VOUCHER_RESULT || !VERIFY_VOUCHER_RESULT.is_verify)
    ) {
      alert(
        t("invalid_voucher_block", {
          defaultValue: "Mã giảm giá không hợp lệ. Vui lòng kiểm tra lại.",
        })
      );
      return;
    }

    /** Số tiền nạp đã parse */
    let amount = parseInt(TOPUP_AMOUNT.replace(/\D/g, ""), 10) || 0;
    if (amount <= 0) return;

    // Nếu có voucher verified, dùng số tiền đã discount
    if (DISCOUNTED_AMOUNT !== null && PROMO_CODE === VERIFIED_VOUCHER_CODE) {
      amount = DISCOUNTED_AMOUNT;
    }

    SetIsLoading(true);
    try {
      /** Mã Code từ transaction */
      const { code, qr, bank } = await CreateTransaction(amount, {
        type: "TOP_UP_WALLET",
      });

      /** Gọi callback khởi tạo thanh toán để hiện overlay */
      on_initiate_payment(amount, code, undefined, undefined, qr, bank);
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
    /** Kiểm tra nếu có mã giảm giá nhưng không hợp lệ thì chặn */
    if (
      PROMO_CODE.trim() &&
      (!VERIFY_VOUCHER_RESULT || !VERIFY_VOUCHER_RESULT.is_verify)
    ) {
      alert(
        t("invalid_voucher_block", {
          defaultValue: "Mã giảm giá không hợp lệ. Vui lòng kiểm tra lại.",
        })
      );
      return;
    }

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

        /** Gọi API mua gói trả phí */
        const PURCHASE_RES = await apiService.PurchasePackage(
          {
            org_id: customer.orgId,
            wallet_id: WALLET_ID,
            package_type: PACKAGE_TYPE,
            months: SELECTED_DURATION_MONTHS,
            ...(PROMO_CODE && PROMO_CODE === VERIFIED_VOUCHER_CODE
              ? { voucher_code: PROMO_CODE }
              : {}),
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

        /** Chờ 1 giây rồi thông báo */
        await new Promise((resolve) => setTimeout(resolve, 1000));
        alert(
          t("activate_success", { defaultValue: "Kích hoạt gói thành công!" })
        );

        if (on_success) {
          on_success();
        }
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
      /** Tạo transaction & QR */
      const FINAL_AMOUNT_TO_PAY =
        BUY_NEEDED_AMOUNT <= 0 ? 0 : BUY_NEEDED_AMOUNT; // BUY_NEEDED_AMOUNT already accounts for discount

      const { code, qr, bank } = await CreateTransaction(FINAL_AMOUNT_TO_PAY, {
        type: "PURCHASE",
        product: SELECTED_PACKAGE.id,
        quantity: SELECTED_DURATION.months,
      });

      SetIsLoading(false);

      on_initiate_payment(
        BUY_NEEDED_AMOUNT,
        code,
        SELECTED_PACKAGE.name,
        AUTO_ACTIVATE,
        qr,
        bank
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
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-gray-700">
                  {t("promo_code")}
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={PROMO_CODE}
                    onChange={(e) => SetPromoCode(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t("enter_promo_code")}
                  />
                  {/* Message result */}
                  {PROMO_CODE && VERIFY_VOUCHER_RESULT && (
                    <div className="text-sm">
                      {VERIFY_VOUCHER_RESULT.is_verify === false ? (
                        <span className="text-red-500">
                          {t("invalid_voucher", {
                            defaultValue: "Mã giảm giá không hợp lệ",
                          })}
                        </span>
                      ) : (
                        <span className="text-green-600">
                          {getPriceChangeText(
                            VERIFY_VOUCHER_RESULT.txn_origin_amount,
                            VERIFY_VOUCHER_RESULT.txn_amount
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 my-6"></div>

            <InvoiceSection />
            <PaymentMethodSection />

            <div className="mt-auto">
              <button
                onClick={HandleCreateQrTopup}
                disabled={
                  IS_LOADING ||
                  (!!PROMO_CODE.trim() &&
                    (!VERIFY_VOUCHER_RESULT ||
                      !VERIFY_VOUCHER_RESULT.is_verify))
                }
                className={`w-full py-4 text-white text-lg font-bold rounded-md shadow transition-all flex items-center justify-center ${
                  IS_LOADING ||
                  (!!PROMO_CODE.trim() &&
                    (!VERIFY_VOUCHER_RESULT ||
                      !VERIFY_VOUCHER_RESULT.is_verify))
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                    {MOCK_PACKAGES.map((pkg) => {
                      // Calculate real monthly price for display
                      const MONTH_MS = 1000 * 60 * 60 * 24 * 30;
                      let pkgDurationMonths = 1;
                      if (
                        pkg.duration &&
                        pkg.duration > 0 &&
                        pkg.duration < 9999999999999
                      ) {
                        pkgDurationMonths = Math.round(pkg.duration / MONTH_MS);
                        if (pkgDurationMonths < 1) pkgDurationMonths = 1;
                      }
                      const pricePerMonth = pkg.price / pkgDurationMonths;

                      // If package is exactly 12 months (yearly package), show price/year
                      if (pkgDurationMonths === 12) {
                        return (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name} ({FormatCurrency(pkg.price)}/
                            {t("year", { defaultValue: "năm" })})
                          </SelectItem>
                        );
                      }

                      return (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} ({FormatCurrency(pricePerMonth)}/
                          {t("month")})
                        </SelectItem>
                      );
                    })}
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
                  <div className="flex flex-col gap-2">
                    <div className="relative w-full">
                      <input
                        type="text"
                        value={PROMO_CODE}
                        onChange={(e) => SetPromoCode(e.target.value)}
                        placeholder={t("enter_promo_code")}
                        className="block w-full border-gray-300 rounded-md text-sm px-3 py-2 border focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    {PROMO_CODE && VERIFY_VOUCHER_RESULT && (
                      <div className="mt-1 text-sm">
                        {VERIFY_VOUCHER_RESULT.is_verify === false ? (
                          <span className="text-red-500">
                            {t("invalid_voucher", {
                              defaultValue: "Mã giảm giá không hợp lệ",
                            })}
                          </span>
                        ) : (
                          <span className="text-green-600">
                            {getPriceChangeText(
                              VERIFY_VOUCHER_RESULT.txn_origin_amount,
                              VERIFY_VOUCHER_RESULT.txn_amount
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-600">{t("total_payment")}</span>
                    <div className="text-right">
                      {DISCOUNTED_AMOUNT !== null &&
                        PROMO_CODE === VERIFIED_VOUCHER_CODE && (
                          <div className="text-sm text-gray-400 line-through">
                            {FormatCurrency(
                              PACKAGE_TOTAL_PRICE > customer.balance
                                ? PACKAGE_TOTAL_PRICE - customer.balance
                                : 0
                            )}
                          </div>
                        )}
                      <span className="text-2xl font-bold text-blue-600">
                        {FormatCurrency(BUY_NEEDED_AMOUNT)}
                      </span>
                    </div>
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
                    disabled={
                      IS_LOADING ||
                      (!!PROMO_CODE.trim() &&
                        (!VERIFY_VOUCHER_RESULT ||
                          !VERIFY_VOUCHER_RESULT.is_verify))
                    }
                    className={`w-full py-4 text-white text-lg font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                      IS_LOADING ||
                      (!!PROMO_CODE.trim() &&
                        (!VERIFY_VOUCHER_RESULT ||
                          !VERIFY_VOUCHER_RESULT.is_verify))
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 hover:shadow-xl"
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
                  disabled={
                    IS_LOADING ||
                    (!!PROMO_CODE.trim() &&
                      (!VERIFY_VOUCHER_RESULT ||
                        !VERIFY_VOUCHER_RESULT.is_verify))
                  }
                  className={`w-full py-4 text-white text-lg font-bold rounded-xl shadow-lg transition-all ${
                    IS_LOADING ||
                    (!!PROMO_CODE.trim() &&
                      (!VERIFY_VOUCHER_RESULT ||
                        !VERIFY_VOUCHER_RESULT.is_verify))
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
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
