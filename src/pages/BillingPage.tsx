import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { apiService } from "../services";
import {
  Loader2,
  CheckCircle,
  X,
  QrCode,
  Image as ImageIcon,
  ArrowLeft,
} from "lucide-react";
import { API_CONFIG } from "../services/api.config";
import RetionLogo from "../assets/icons/Logo_retion_embed.png";
import RetionLogoFull from "../assets/icons/Logo_Full.png";
import { BANK_ACCOUNTS, BANK_ACCOUNTS_NAME } from "../constants";

import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

/**
 * Trang hiển thị thông tin thanh toán (Billing)
 * Đường dẫn: /billing/<txn_id>
 */
const BillingPage: React.FC = () => {
  /** Hook dịch ngôn ngữ */
  const { t } = useTranslation();
  /** Lấy transaction ID từ URL params */
  const { id: TXN_ID } = useParams<{ id: string }>();

  /** State trạng thái loading */
  const [LOADING, SetLoading] = useState(true);
  /** State lưu lỗi */
  const [ERROR, SetError] = useState("");
  /** State lưu thông tin giao dịch */
  const [TRANSACTION, SetTransaction] = useState<any>(null);
  /** State lưu trạng thái copy (không dùng nhưng giữ lại nếu cần mở rộng) */
  const [COPY_FEEDBACK, SetCopyFeedback] = useState(false);

  /** Ref để theo dõi lần load đầu tiên */
  const IS_FIRST_LOAD = useRef(true);

  /**
   * Effect xử lý kết nối SSE để lấy dữ liệu ban đầu và lắng nghe cập nhật
   */
  useEffect(() => {
    /** Reset flag lần đầu khi ID thay đổi (re-mount effect) */
    IS_FIRST_LOAD.current = true;

    /** Kiểm tra mã giao dịch có tồn tại không */
    if (!TXN_ID) {
      /** Báo lỗi nếu không có ID */
      SetError("Mã giao dịch không hợp lệ.");
      /** Tắt loading */
      SetLoading(false);
      return;
    }

    /** Đường dẫn SSE public */
    const SSE_URL = `${API_CONFIG.BILLING_URL}/public/transaction/read_txn?txn_id=${TXN_ID}`;
    /** Log đường dẫn SSE để debug */
    console.log("Subscribing to SSE:", SSE_URL);

    /** Khởi tạo EventSource kết nối tới server */
    const EVENT_SOURCE = new EventSource(SSE_URL);

    /** Xử lý khi nhận message từ server */
    EVENT_SOURCE.onmessage = (event) => {
      try {
        /** Parse dữ liệu JSON từ event data */
        const DATA = JSON.parse(event.data);
        /** Log dữ liệu nhận được để debug */
        console.log("SSE Message:", DATA);

        /** Xử lý trường hợp lỗi từ server (VD: TXN_NOT_FOUND) */
        if (DATA.error === "TXN_NOT_FOUND") {
          /** Log lỗi chi tiết */
          console.error("SSE Error:", DATA.error);
          /** Set thông báo lỗi cho người dùng */
          SetError("Giao dịch không tồn tại hoặc không tìm thấy.");
          /** Tắt loading */
          SetLoading(false);
          /** Đóng kết nối SSE */
          EVENT_SOURCE.close();
          return;
        }

        /** Kiểm tra dữ liệu hợp lệ (DATA và DATA.data hoặc DATA transaction flat) */
        // Logic cũ giả định DATA hoặc DATA.data.
        // Dưới đây gán TRANS_DATA bằng DATA luôn theo quan sát gần nhất.

        /** Dữ liệu transaction */
        const TRANS_DATA = DATA;

        /** Lấy thông tin merchant transaction từ meta */
        const MERCHANT_TXN = TRANS_DATA?.txn_data?.meta?.merchant_txn;

        /** Nếu có thông tin merchant transaction thì mới xử lý hiển thị */
        if (MERCHANT_TXN) {
          /** Cập nhật state transaction với thông tin đã map */
          SetTransaction({
            ...TRANS_DATA,
            /** Thông tin ngân hàng từ merchant txn */
            bank_info: MERCHANT_TXN.receiver
              ? {
                  account: MERCHANT_TXN.receiver.account_number,
                  bank: MERCHANT_TXN.receiver.bank_name,
                  name:
                    MERCHANT_TXN.receiver.account_name || BANK_ACCOUNTS_NAME,
                }
              : undefined,
            /** Mã QR */
            qr_code: MERCHANT_TXN.qr_code,
            /** Nội dung chuyển khoản */
            txn_code:
              MERCHANT_TXN.receiver?.transaction_content || TRANS_DATA.txn_id,
          });

          /** Kiểm tra trạng thái thành công */
          const IS_SUCCESS =
            TRANS_DATA.status === "SUCCESS" ||
            TRANS_DATA.success === true ||
            TRANS_DATA.txn_status === "SUCCESS";

          /** Nếu giao dịch thành công */
          if (IS_SUCCESS) {
            /** Cập nhật status thành công vào state */
            SetTransaction((prev: any) => ({ ...prev, status: "SUCCESS" }));

            /** Hiển thị thông báo toast CHỈ KHI KHÔNG PHẢI lần load đầu tiên */
            if (!IS_FIRST_LOAD.current) toast.success("Thanh toán thành công!");

            /** Đóng kết nối khi thành công */
            EVENT_SOURCE.close();
          }

          /** Kiểm tra trạng thái thất bại */
          const IS_FAILED =
            TRANS_DATA.status === "FAILED" ||
            TRANS_DATA.txn_status === "FAILED" ||
            TRANS_DATA.status === "CANCELLED";

          /** Nếu giao dịch thất bại */
          if (IS_FAILED) {
            /** Cập nhật status thất bại vào state */
            SetTransaction((prev: any) => ({ ...prev, status: "FAILED" }));

            /** Hiển thị thông báo lỗi nếu không phải lần đầu */
            if (!IS_FIRST_LOAD.current) toast.error("Giao dịch thất bại!");

            /** Đóng kết nối */
            EVENT_SOURCE.close();
          }

          /** Tắt loading khi đã có dữ liệu hợp lệ */
          SetLoading(false);

          /** Đánh dấu đã qua lần load đầu tiên */
          IS_FIRST_LOAD.current = false;
        } else {
          /**
           * Tình huống không có dữ liệu merchant -> Coi như lỗi hoặc data sai
           * Báo UI, tắt Loading, đóng SSE để tránh spam request.
           */
          console.error("Missing merchant_txn in meta from SSE");
          /** Set lỗi hiển thị */
          SetError("Không tìm thấy dữ liệu giao dịch từ hệ thống.");
          /** Tắt loading */
          SetLoading(false);
          /** Đóng kết nối */
          EVENT_SOURCE.close();
        }
      } catch (e) {
        /** Log lỗi parse JSON */
        console.error("SSE Parse Error", e);
      }
    };

    /** Xử lý lỗi kết nối */
    EVENT_SOURCE.onerror = async (err: any) => {
      /** Log lỗi kết nối */
      console.error("SSE Error", err);

      /**
       * Nếu lỗi xảy ra ngay lần đầu tiên (chưa nhận được data nào)
       */
      if (IS_FIRST_LOAD.current) {
        /** Đóng kết nối ngay lập tức */
        EVENT_SOURCE.close();

        /**
         * Case: Server trả về event error có kèm data (string JSON)
         */
        if (err?.data) {
          try {
            /** Parse data error */
            const ERR_DATA =
              typeof err.data === "string" ? JSON.parse(err.data) : err.data;
            /** Nếu lỗi là TXN_NOT_FOUND */
            if (ERR_DATA?.error === "TXN_NOT_FOUND") {
              /** Set lỗi không tồn tại */
              SetError("Giao dịch không tồn tại.");
              /** Tắt loading */
              SetLoading(false);
              return;
            }
          } catch (parseErr) {
            /** Log warn nếu parse thất bại */
            console.warn("Failed to parse error data", parseErr);
          }
        }

        /**
         * Fallback: Gọi fetch manual để kiểm tra status code và body (vì onerror của EventSource hạn chế)
         */
        try {
          /** Gọi fetch tới URL SSE */
          const RES = await fetch(SSE_URL);
          /** Log để inspect response */
          console.log("SSE Error Check RES", RES);

          /** Biến check not found */
          let is_not_found = RES.status === 404;

          /** Nếu status khác 404 và 200, check body JSON */
          if (!is_not_found && RES.status !== 200) {
            /** Lấy body JSON */
            const ERR_BODY = await RES.json().catch(() => ({}));
            /** Nếu body báo TXN_NOT_FOUND */
            if (ERR_BODY.error === "TXN_NOT_FOUND") is_not_found = true;
          }

          /** Set message lỗi tương ứng */
          if (is_not_found) SetError("Giao dịch không tồn tại.");
          else SetError("Không thể kết nối tới máy chủ.");
        } catch (e) {
          /** Set lỗi default nếu fetch fail */
          SetError("Không thể kết nối tới máy chủ.");
        } finally {
          /** Luôn tắt loading ở khối finally */
          SetLoading(false);
        }
      }
    };

    /** Cleanup function khi unmount */
    return () => {
      /** Đóng connection */
      EVENT_SOURCE.close();
    };
  }, [TXN_ID]);

  /**
   * Định dạng tiền tệ
   * @param {number} val - Số tiền
   * @returns {string} Chuỗi định dạng VND
   */
  const FormatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);

  /**
   * Xử lý tải ảnh QR về máy
   */
  const HandleDownloadQr = async () => {
    /** Nếu chưa có transaction thì return */
    if (!TRANSACTION) return;
    try {
      /** Lấy nội dung QR */
      const QR_CODE_DATA =
        TRANSACTION.qr_code || TRANSACTION.txn_code || TRANSACTION.txn_id;
      /** URL tạo QR */
      const QR_BASE_URL =
        API_CONFIG.QR_SERVICE_URL ||
        "https://api.qrserver.com/v1/create-qr-code/";
      /** Src ảnh đầy đủ */
      const QR_SRC = `${QR_BASE_URL}?size=500x500&data=${encodeURIComponent(
        QR_CODE_DATA
      )}`;

      /** Fetch ảnh */
      const RESPONSE = await fetch(QR_SRC);
      /** Chuyển sang blob */
      const BLOB = await RESPONSE.blob();
      /** Tạo URL object */
      const URL_BLOB = URL.createObjectURL(BLOB);

      /** Tạo thẻ a ảo để download */
      const LINK = document.createElement("a");
      LINK.href = URL_BLOB;
      LINK.download = `QR-Payment-${TXN_ID}.png`;
      document.body.appendChild(LINK);
      /** Click download */
      LINK.click();
      /** Cleanup DOM */
      document.body.removeChild(LINK);
      /** Revoke URL */
      URL.revokeObjectURL(URL_BLOB);
    } catch (e) {
      /** Log lỗi */
      console.error(e);
      /** Toast báo lỗi */
      toast.error("Không thể tải ảnh QR.");
    }
  };

  /** Nếu đang loading render spinner */
  if (LOADING) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  /** Nếu có lỗi hoặc không có transaction render màn hình lỗi */
  if (ERROR || !TRANSACTION) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full border border-gray-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
            Đã xảy ra lỗi
          </h3>
          <p className="text-gray-500 mb-8">
            {ERROR ||
              "Không thể tải thông tin giao dịch. Vui lòng thử lại sau."}
          </p>
          <a
            href={import.meta.env.VITE_ROOT_DOMAIN || "/"}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Về trang chủ
          </a>
        </div>
      </div>
    );
  }

  /** Kiểm tra trạng thái success */
  const IS_SUCCESS = TRANSACTION.status === "SUCCESS";
  /** Kiểm tra trạng thái failed */
  const IS_FAILED =
    TRANSACTION.status === "FAILED" || TRANSACTION.status === "CANCELLED";

  /** Số tiền */
  const AMOUNT = TRANSACTION.txn_amount || TRANSACTION.amount || 0;
  /** Nội dung chuyển khoản */
  const CONTENT = TRANSACTION.txn_code || TRANSACTION.txn_id || TXN_ID;
  /** Thông tin bank */
  const BANK_INFO = TRANSACTION.bank_info || BANK_ACCOUNTS.BBH;

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="mb-8">
        <img src={RetionLogoFull} alt="Retion CRM" className="h-12 w-auto" />
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
        {/* LEFT: QR Display (Always rendered, blurred on success) */}
        <div className="md:w-5/12 bg-gray-50 border-r border-gray-100 p-8 flex flex-col items-center text-center relative overflow-hidden">
          {/* Content Container with Conditional Blur */}
          <div
            className={`transition-all duration-500 w-full flex flex-col items-center ${
              IS_SUCCESS || IS_FAILED
                ? "filter blur-sm opacity-50 pointer-events-none"
                : ""
            }`}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 uppercase tracking-wide">
              <QrCode className="w-5 h-5 text-blue-600" />
              Quét mã thanh toán
            </h3>

            <div className="relative w-64 h-64 p-2 bg-white rounded-xl shadow-sm mb-6">
              {/* QR Image */}
              <img
                src={`${
                  API_CONFIG.QR_SERVICE_URL ||
                  "https://api.qrserver.com/v1/create-qr-code/"
                }?size=300x300&data=${encodeURIComponent(CONTENT)}`}
                className="w-full h-full object-contain mix-blend-multiply"
                alt="QR Code"
              />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full p-1 shadow-md flex items-center justify-center">
                <img
                  src={RetionLogo}
                  className="w-6 h-6 object-contain"
                  alt="Logo"
                />
              </div>
            </div>

            <div className="text-3xl font-extrabold text-blue-600 mb-4 tracking-tight">
              {FormatCurrency(AMOUNT)}
            </div>
            <p className="text-sm text-gray-500">
              Sử dụng App Ngân hàng hoặc Ví điện tử
              <br />
              để quét mã thanh toán
            </p>
          </div>

          {/* Success Overlay for QR Logic */}
          {IS_SUCCESS && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-full shadow-lg border border-green-100 animate-in fade-in zoom-in">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
          )}

          {/* Failed Overlay for QR Logic */}
          {IS_FAILED && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-full shadow-lg border border-red-100 animate-in fade-in zoom-in">
                <X className="w-12 h-12 text-red-600" />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Info (Switches between Payment Info and Success/Failed Info) */}
        <div className="md:w-7/12 p-8 flex flex-col bg-white transition-all duration-300">
          {IS_SUCCESS ? (
            // SUCCESS INFO VIEW
            <div className="h-full flex flex-col items-center justify-center text-center animate-in slide-in-from-right-8 fade-in">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                Thanh toán thành công!
              </h2>
              <p className="text-gray-500 mb-8">
                Cảm ơn bạn đã sử dụng dịch vụ của Retion.
              </p>

              <div className="bg-gray-50 rounded-xl p-6 w-full max-w-md border border-gray-100">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Mã giao dịch</span>
                  <span className="font-mono font-bold text-gray-900">
                    {TXN_ID}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Số tiền</span>
                  <span className="font-bold text-green-600">
                    {FormatCurrency(AMOUNT)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Thời gian</span>
                  <span className="text-gray-900">
                    {new Date(
                      TRANSACTION?.updatedAt || new Date()
                    ).toLocaleString("vi-VN")}
                  </span>
                </div>
              </div>

              <a
                href={import.meta.env.VITE_ROOT_DOMAIN || "/"}
                className="mt-8 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Về trang chủ
              </a>
            </div>
          ) : IS_FAILED ? (
            // FAILED INFO VIEW
            <div className="h-full flex flex-col items-center justify-center text-center animate-in slide-in-from-right-8 fade-in">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <X className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                Thanh toán thất bại!
              </h2>
              <p className="text-gray-500 mb-8">
                Giao dịch đã bị thẻ hoặc xảy ra lỗi trong quá trình xử lý.
                <br />
                Vui lòng thử lại hoặc liên hệ bộ phận hỗ trợ.
              </p>

              <div className="bg-gray-50 rounded-xl p-6 w-full max-w-md border border-gray-100">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Mã giao dịch</span>
                  <span className="font-mono font-bold text-gray-900">
                    {TXN_ID}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Số tiền</span>
                  <span className="font-bold text-red-600">
                    {FormatCurrency(AMOUNT)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Thời gian</span>
                  <span className="text-gray-900">
                    {new Date().toLocaleString("vi-VN")}
                  </span>
                </div>
              </div>

              <a
                href={import.meta.env.VITE_ROOT_DOMAIN || "/"}
                className="mt-8 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Về trang chủ
              </a>
            </div>
          ) : (
            // PENDING INFO VIEW (Existing)
            <>
              <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide mb-6">
                Thông tin chuyển khoản
              </h3>

              <div className="space-y-5 flex-1">
                {/* Account Number */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1 font-bold uppercase">
                    Số tài khoản
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-mono font-bold text-green-700 flex-grow tracking-wide">
                      {BANK_INFO.account}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(BANK_INFO.account);
                        SetCopyFeedback(true);
                        setTimeout(() => SetCopyFeedback(false), 2000);
                      }}
                      className="text-blue-600 bg-blue-50 px-3 py-1 rounded text-xs font-bold uppercase hover:bg-blue-100"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Account Name */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1 font-bold uppercase">
                    Tên tài khoản
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-gray-800 uppercase flex-grow">
                      {BANK_ACCOUNTS_NAME}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1 font-bold uppercase">
                    Nội dung chuyển khoản
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-mono font-bold text-blue-700 flex-grow tracking-wide">
                      {CONTENT}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(CONTENT);
                        SetCopyFeedback(true);
                        setTimeout(() => SetCopyFeedback(false), 2000);
                      }}
                      className="text-blue-600 bg-blue-50 px-3 py-1 rounded text-xs font-bold uppercase hover:bg-blue-100"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-red-500 italic">
                    * Lưu ý: Nhập chính xác nội dung để được kích hoạt tự động.
                  </div>
                </div>

                {/* Bank */}
                <div className="px-1 text-sm text-gray-600">
                  <span className="font-semibold text-gray-400 uppercase text-xs">
                    Ngân hàng:
                  </span>{" "}
                  {BANK_INFO.bank}
                </div>
              </div>

              {/* Status Footer */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-sm font-semibold text-blue-800">
                    Hệ thống đang chờ nhận tiền...
                  </span>
                </div>

                <div className="mt-4 flex gap-4">
                  <button
                    onClick={HandleDownloadQr}
                    className="flex-1 flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-bold rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" /> Lưu ảnh QR
                  </button>
                  <button
                    onClick={() => {
                      SetTransaction((prev: any) => ({
                        ...prev,
                        status: "FAILED",
                      }));
                      toast.error("Giao dịch thất bại (Giả lập)!");
                    }}
                    className="px-4 py-3 border border-red-200 text-sm font-bold rounded-lg text-red-600 hover:bg-red-50"
                  >
                    Giả lập Fail
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} Retion CRM. All rights reserved.
      </div>
    </div>
  );
};

export default BillingPage;
