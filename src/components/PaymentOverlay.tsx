import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Copy,
  Loader2,
  CheckCircle,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { IPaymentDetails, IPaymentStep } from "../types";
import { CURRENT_USER } from "../constants";

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
  currentUser?: string;
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
}) => {
  const { t } = useTranslation();

  /** Trạng thái feedback copy */
  const [COPY_FEEDBACK, SetCopyFeedback] = useState(false);

  /**
   * Auto-simulate success after 5 seconds if in pending state
   */
  useEffect(() => {
    /** Timer để tự động chuyển sang success */
    let TIMER: ReturnType<typeof setTimeout>;
    if (step === "pending") {
      TIMER = setTimeout(() => {
        simulateSuccessTrigger();
      }, 50000000); // Disable auto simulate effectively
    }
    return () => clearTimeout(TIMER);
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
  const HandleCopy = () => {
    navigator.clipboard.writeText(
      `https://payment.link/fake/${details.amount}`
    );
    SetCopyFeedback(true);
    setTimeout(() => SetCopyFeedback(false), 2000);
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
          onClick={step === "pending" ? onClose : undefined}
        ></div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          {/* --- CONTENT FOR PENDING STATE --- */}
          {step === "pending" && (
            <div className="bg-white">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h3
                  className="text-lg leading-6 font-bold text-gray-900"
                  id="modal-title"
                >
                  {t("payment_modal_title")}
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="px-6 py-6 text-center">
                <p className="text-sm text-gray-500 mb-6">
                  {t("send_code_to_customer")}
                </p>

                {/* QR Placeholder */}
                <div className="mx-auto w-48 h-48 bg-gray-100 border-2 border-gray-200 rounded-lg flex items-center justify-center mb-6 relative group">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      details.content
                    )}`}
                    alt="Payment QR"
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all" />
                </div>

                <div className="space-y-2 mb-6 text-left bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">{t("amount")}</span>
                    <span className="font-bold text-blue-700">
                      {FormatCurrency(details.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">
                      {t("content")}
                    </span>
                    <span className="font-medium text-gray-800 text-sm break-all">
                      {details.content}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-2 mb-6">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <span className="text-sm text-blue-600 font-medium">
                    {t("waiting_payment")}
                  </span>
                  <span className="text-xs text-gray-400">
                    {t("auto_close_hint")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={HandleCopy}
                    className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {COPY_FEEDBACK ? (
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {COPY_FEEDBACK ? t("copied") : t("copy_link")}
                  </button>
                  <button
                    onClick={onClose}
                    className="flex items-center justify-center px-4 py-2 border border-red-200 shadow-sm text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t("cancel")}
                  </button>
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
                        {t("update_ref_msg", {
                          user: currentUser || CURRENT_USER,
                        })}
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
    </div>
  );
};

export default PaymentOverlay;
