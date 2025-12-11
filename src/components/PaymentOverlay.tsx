import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Copy,
  Loader2,
  CheckCircle,
  ArrowRight,
  RotateCcw,
  Download,
  Image as ImageIcon,
  QrCode,
  Info,
} from "lucide-react";
import { IPaymentDetails, IPaymentStep, IOrganization, IUser } from "../types";
import { toast } from "react-toastify";
import { CURRENT_USER, BANK_ACCOUNTS, BANK_ACCOUNTS_NAME } from "../constants";
import RetionLogo from "../assets/icons/Logo_retion_embed.png";
import { API_CONFIG } from "../services/api.config";

export interface IPaymentOverlayProps {
  /** Bước thanh toán hiện tại */
  step: IPaymentStep;
  /** Chi tiết thanh toán */
  details: IPaymentDetails | null;
  /** Hàm đóng modal */
  onClose: () => void;
  /** Hàm reset */
  onReset: () => void;
  /** Hàm trigger mô phỏng thành công */
  simulateSuccessTrigger: () => void;
  /** Tên người dùng hiện tại */
  /** Tên người dùng hiện tại */
  currentUser?: IUser | any;
  /** Thông tin khách hàng */
  customer?: IOrganization | null;
}

/**
 * Component hiển thị overlay thanh toán
 * @param {IPaymentOverlayProps} props - Props đầu vào
 * @returns {JSX.Element | null} - Giao diện PaymentOverlay hoặc null
 */
const PaymentOverlay: React.FC<IPaymentOverlayProps> = ({
  step,
  details,
  onClose,
  onReset,
  simulateSuccessTrigger,
  currentUser,
  customer,
}) => {
  const { t } = useTranslation();

  /** Trạng thái feedback copy */
  const [COPY_FEEDBACK, SetCopyFeedback] = useState(false);

  /** Trạng thái hiển thị modal xác nhận hủy */
  const [SHOW_CANCEL_CONFIRM, SetShowCancelConfirm] = useState(false);

  /**
   * Xử lý yêu cầu đóng modal
   * Nếu đang pending -> hiện popup xác nhận
   * Nếu không -> đóng luôn
   */
  const HandleAttemptClose = () => {
    if (step === "pending") {
      SetShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  /**
   * Auto-simulate success after 5 seconds if in pending state
   */
  useEffect(() => {
    /** Timer để tự động chuyển sang success */
    let timer: ReturnType<typeof setTimeout>;

    /**
     * Logic: Nếu đang ở trạng thái pending, đặt timer gọi simulateSuccessTrigger.
     * Hiện tại đặt 50000000ms (~13 giờ) để coi như disable tính năng này,
     * trừ khi logic business thay đổi cần auto-success.
     */
    if (step === "pending") {
      timer = setTimeout(() => {
        simulateSuccessTrigger();
      }, 50000000); // Disable auto simulate effectively
    }

    /** Cleanup timer khi unmount hoặc step thay đổi */
    return () => clearTimeout(timer);
  }, [step, simulateSuccessTrigger]);

  if (step === "idle" || !details) return null;

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

  /**
   * Xử lý copy link
   */
  /**
   * Xử lý download QR
   */
  /**
   * Lấy thông tin người giới thiệu hiển thị
   */
  const GetReferrerDisplay = () => {
    if (!customer) return null;

    // 1. Ưu tiên Affiliate chính thức
    /**
     * Logic ưu tiên 1: Thông tin Affiliate gắn với Customer.
     * Sử dụng affiliate_id hoặc phone làm ID hiển thị.
     */
    if (customer.affiliate && customer.affiliate.full_name) {
      const ID = customer.affiliate.affiliate_id || customer.affiliate.phone;
      return {
        name: customer.affiliate.full_name,
        id: ID,
        alias_code: customer.affiliate.alias_code,
      };
    }

    // 2. Nếu có refName (legacy)
    /** Logic ưu tiên 2: Dữ liệu refName cũ lưu trực tiếp trên Customer */
    if (customer.refName) {
      return {
        name: customer.refName,
        id: "",
      };
    }

    // 3. Mặc định user hiện tại (nếu chưa có ai)
    /**
     * Logic ưu tiên 3: Nếu chưa có người giới thiệu,
     * hiển thị User hiện tại đang thao tác (Sales) như người sẽ nhận hoa hồng.
     */
    if (currentUser) {
      const ID =
        currentUser.affiliate_id || currentUser.phone || currentUser.user_id;
      return {
        name: currentUser.full_name,
        id: ID,
        alias_code: currentUser.alias_code,
      };
    }

    return null;
  };

  const REF_INFO = GetReferrerDisplay();

  /**
   * Xử lý download QR
   */
  const HandleDownloadQr = async () => {
    try {
      /** Lấy URL base cho service QR */
      const QR_BASE_URL =
        API_CONFIG.QR_SERVICE_URL ||
        "https://api.qrserver.com/v1/create-qr-code/";

      /** Tạo URL đầy đủ kèm data */
      const QR_SRC = `${QR_BASE_URL}?size=500x500&data=${encodeURIComponent(
        details.qrCode || details.content
      )}`;

      /**
       * Fetch ảnh về dưới dạng Blob để xử lý download
       * Việc này giúp tránh mở tab mới và force browser download file ảnh
       */
      const RESPONSE = await fetch(QR_SRC);
      const BLOB = await RESPONSE.blob();
      const URL_BLOB = URL.createObjectURL(BLOB);

      /** Tạo thẻ a ảo để trigger event click download */
      const LINK = document.createElement("a");
      LINK.href = URL_BLOB;
      LINK.download = `QR-Payment-${details.content}.png`;
      document.body.appendChild(LINK);
      LINK.click();
      /** Dọn dẹp DOM và URL object sau khi xong */
      document.body.removeChild(LINK);
      URL.revokeObjectURL(URL_BLOB);
    } catch (e) {
      console.error("Failed to download QR", e);
      toast.error("Không thể tải ảnh QR. Vui lòng thử lại.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop with blur */}
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm"
          aria-hidden="true"
          onClick={HandleAttemptClose}
        ></div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full">
          {/* --- CONTENT FOR PENDING STATE --- */}
          {step === "pending" && (
            <div className="bg-white">
              <div className="flex flex-col md:flex-row min-h-[500px]">
                {/* LEFT COLUMN: SCAN QR */}
                <div className="md:w-5/12 bg-gray-50 border-r border-gray-100 p-8 flex flex-col items-center justify-center text-center">
                  <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 uppercase tracking-wide">
                    <QrCode className="w-5 h-5 text-blue-600" />
                    {t("scan_qr_payment", {
                      defaultValue: "Quét mã thanh toán",
                    })}
                  </h3>

                  {/* QR Container */}
                  <div className="relative w-64 h-64 p-2 bg-white rounded-xl shadow-sm mb-6">
                    {/* Corners */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg -mb-1 -mr-1"></div>

                    {/* QR Image */}
                    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white relative rounded-lg">
                      <img
                        src={`${
                          API_CONFIG.QR_SERVICE_URL ||
                          "https://api.qrserver.com/v1/create-qr-code/"
                        }?size=300x300&data=${encodeURIComponent(
                          details.qrCode || details.content
                        )}`}
                        alt="Payment QR"
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                      {/* Centered Logo */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full p-1 shadow-md flex items-center justify-center">
                        <img
                          src={RetionLogo}
                          alt="Logo"
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                    </div>

                    {/* Loading Overlay */}
                    {!details.qrCode && !details.content && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-20">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="text-3xl font-extrabold text-blue-600 mb-8 tracking-tight">
                    {FormatCurrency(details.amount)}
                  </div>

                  <div className="text-sm text-gray-500 space-y-1">
                    <p>
                      {t("use_banking_app", {
                        defaultValue: "Sử dụng App Ngân hàng hoặc Ví điện tử",
                      })}
                    </p>
                    <p>
                      {t("to_scan_qr", {
                        defaultValue: "để quét mã thanh toán",
                      })}
                    </p>
                  </div>
                </div>

                {/* RIGHT COLUMN: INFO & ACTIONS */}
                <div className="md:w-7/12 p-8 flex flex-col bg-white">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                      {t("payment_info", {
                        defaultValue: "Thông tin chuyển khoản",
                      })}
                    </h3>
                    <button
                      onClick={HandleAttemptClose}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Bank Info Box */}
                  <div className="bg-white rounded-lg space-y-5 flex-1 overflow-y-auto max-h-[400px]">
                    {/* Account Number */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1 font-medium uppercase">
                        {t("account_number", { defaultValue: "Số tài khoản" })}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-mono font-bold text-green-700 flex-grow tracking-wide">
                          {details.bankInfo?.account ||
                            BANK_ACCOUNTS.BBH.account}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              details.bankInfo?.account ||
                                BANK_ACCOUNTS.BBH.account
                            );
                            SetCopyFeedback(true);
                            setTimeout(() => SetCopyFeedback(false), 2000);
                            toast.success(
                              t("copied_account_number", {
                                defaultValue: "Đã sao chép số tài khoản!",
                              })
                            );
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold uppercase px-2 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          {t("copy", { defaultValue: "Sao chép" })}
                        </button>
                      </div>
                    </div>

                    {/* Account Name */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1 font-medium uppercase">
                        {t("account_name", { defaultValue: "Tên tài khoản" })}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-gray-800 flex-grow uppercase">
                          {BANK_ACCOUNTS_NAME}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(BANK_ACCOUNTS_NAME);
                            SetCopyFeedback(true);
                            setTimeout(() => SetCopyFeedback(false), 2000);
                            toast.success(
                              t("copied_account_name", {
                                defaultValue: "Đã sao chép tên tài khoản!",
                              })
                            );
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold uppercase px-2 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          {t("copy", { defaultValue: "Sao chép" })}
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1 font-medium uppercase">
                        {t("transfer_content", { defaultValue: "Nội dung" })}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-mono font-bold text-blue-600 flex-grow tracking-wide">
                          {details.bankInfo?.code || details.content}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              details.bankInfo?.code || details.content
                            );
                            SetCopyFeedback(true);
                            setTimeout(() => SetCopyFeedback(false), 2000);
                            toast.success(
                              t("copied_content", {
                                defaultValue:
                                  "Đã sao chép nội dung chuyển khoản!",
                              })
                            );
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold uppercase px-2 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          {t("copy", { defaultValue: "Sao chép" })}
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-red-500 italic">
                        *{" "}
                        {t("content_warning", {
                          defaultValue:
                            "Lưu ý: Nhập chính xác nội dung chuyển khoản để được tự động kích hoạt.",
                        })}
                      </div>
                    </div>

                    {/* Bank Name */}
                    <div className="px-1">
                      <div className="text-xs text-gray-400 mb-1 uppercase">
                        {t("bank_name", { defaultValue: "Ngân hàng" })}
                      </div>
                      <div className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        {details.bankInfo?.bank || BANK_ACCOUNTS.BBH.bank}
                      </div>
                    </div>
                  </div>

                  {/* Footer Status & Actions */}
                  <div className="mt-auto pt-6 border-t border-gray-100">
                    {/* Status */}
                    <div className="flex items-center gap-3 mb-4 bg-blue-50 p-3 rounded-lg">
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      <span className="text-sm text-blue-700 font-medium">
                        {t("waiting_payment_auto", {
                          defaultValue: "Hệ thống đang chờ nhận tiền...",
                        })}
                      </span>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/billing/${details.content}`;
                          navigator.clipboard.writeText(link);
                          toast.success(
                            t("link_copied", {
                              defaultValue: "Đã sao chép link thanh toán!",
                            })
                          );
                        }}
                        className="w-full flex items-center justify-center px-4 py-2.5 border border-blue-600 shadow-sm text-sm font-bold rounded-lg text-blue-600 bg-white hover:bg-blue-50 transition-all hover:shadow-md"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        {t("copy_link", {
                          defaultValue: "Sao chép Link thanh toán",
                        })}
                      </button>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={HandleDownloadQr}
                          className="flex items-center justify-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all hover:shadow-md"
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          {t("save_image", { defaultValue: "Lưu ảnh QR" })}
                        </button>
                        <button
                          onClick={HandleAttemptClose}
                          className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          {t("close_payment_session", {
                            defaultValue: "Đóng",
                          })}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- CONTENT FOR SUCCESS STATE --- */}
          {step === "success" && (
            <div className="bg-white">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-4">
                    <CheckCircle
                      className="h-12 w-12 text-green-600"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-2xl leading-6 font-bold text-gray-900 mb-2">
                    {t("txn_success")}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    {t("txn_success_msg")}
                  </p>

                  <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3 mb-6">
                    <div className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 text-green-500 flex items-center justify-center border border-green-500 rounded-full text-xs font-bold mr-3">
                        1
                      </span>
                      <span className="text-sm text-gray-700">
                        {t("received")}{" "}
                        <span className="font-bold">
                          {FormatCurrency(details.amount)}
                        </span>
                      </span>
                    </div>
                    {details.packageName && (
                      <div className="flex items-start">
                        <span className="flex-shrink-0 h-5 w-5 text-green-500 flex items-center justify-center border border-green-500 rounded-full text-xs font-bold mr-3">
                          2
                        </span>
                        <span className="text-sm text-gray-700">
                          {t("activated_package")}{" "}
                          <span className="font-bold">
                            {details.packageName}
                          </span>{" "}
                          ({t("year")})
                        </span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <span className="flex-shrink-0 h-5 w-5 text-green-500 flex items-center justify-center border border-green-500 rounded-full text-xs font-bold mr-3">
                        {details.packageName ? 3 : 2}
                      </span>
                      <span className="text-sm text-gray-700">
                        {t("ref_current")}:{" "}
                        <span className="font-bold">
                          {REF_INFO ? (
                            <>
                              {REF_INFO.name}
                              {REF_INFO.id && ` (${REF_INFO.id})`}
                            </>
                          ) : (
                            "---"
                          )}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse bg-gray-50">
                <button
                  type="button"
                  onClick={onReset}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm items-center"
                >
                  {t("new_order")}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onReset}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <RotateCcw className="mr-2 w-4 h-4" /> {t("close")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Custom Confirmation Modal */}
      {SHOW_CANCEL_CONFIRM && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {t("confirm_close_title", {
                  defaultValue: "Đóng cửa sổ thanh toán?",
                })}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {t("confirm_close_msg", {
                  defaultValue:
                    "Giao dịch vẫn sẽ tiếp tục trên hệ thống. Đừng quên Gửi Link hoặc Mã QR cho khách hàng để họ thanh toán nhé!",
                })}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => SetShowCancelConfirm(false)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t("go_back", { defaultValue: "Quay lại" })}
                </button>
                <button
                  onClick={() => {
                    SetShowCancelConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  {t("confirm_close", { defaultValue: "Đóng phiên" })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentOverlay;
