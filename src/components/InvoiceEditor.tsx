import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, X, Loader2 } from "lucide-react";
import { IOrganization } from "../types";
import { apiService } from "../services";
import { toast } from "react-toastify";

export interface IInvoiceEditorProps {
  /** Thông tin khách hàng */
  customer: IOrganization;
  /** Callback khi cập nhật thành công */
  onUpdate?: (updatedCustomer: IOrganization) => void;
}

/**
 * Component cho phép sửa inline thông tin hóa đơn
 * @param {IInvoiceEditorProps} props - Props đầu vào
 * @returns {JSX.Element} - Giao diện InvoiceEditor
 */
const InvoiceEditor: React.FC<IInvoiceEditorProps> = ({
  customer,
  onUpdate,
}) => {
  const { t } = useTranslation();

  /** Trạng thái đang edit */
  const [IS_EDITING, SetIsEditing] = useState(false);
  /** Trạng thái loading */
  const [IS_LOADING, SetIsLoading] = useState(false);

  /** Form data */
  const [FORM_DATA, SetFormData] = useState({
    org_name: customer.org_info?.org_name || customer.name || "",
    org_tax_code: customer.org_info?.org_tax_code || "",
    org_address: customer.org_info?.org_address || "",
    org_representative: customer.org_info?.org_representative || "",
    org_phone: customer.org_info?.org_phone || "",
    org_email: customer.org_info?.org_email || "",
  });

  /**
   * Cập nhật FORM_DATA khi customer prop thay đổi
   */
  useEffect(() => {
    /** Cập nhật form data từ customer mới */
    SetFormData({
      org_name: customer.org_info?.org_name || customer.name || "",
      org_tax_code: customer.org_info?.org_tax_code || "",
      org_address: customer.org_info?.org_address || "",
      org_representative: customer.org_info?.org_representative || "",
      org_phone: customer.org_info?.org_phone || "",
      org_email: customer.org_info?.org_email || "",
    });
  }, [customer]);

  /**
   * Xử lý thay đổi input
   * @param {string} field - Tên trường
   * @param {string} value - Giá trị mới
   */
  const HandleChange = (field: string, value: string) => {
    SetFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Xử lý lưu thông tin
   */
  const HandleSave = async () => {
    SetIsLoading(true);
    try {
      /** Token xác thực */
      const TOKEN = localStorage.getItem("auth_token");
      if (!TOKEN) {
        toast.error(
          t("login_again", { defaultValue: "Vui lòng đăng nhập lại." })
        );
        return;
      }

      /** Gọi API update */
      const RESPONSE = await apiService.UpdateOrganization(
        {
          org_id: customer.orgId,
          org_info: {
            ...customer.org_info,
            org_name: FORM_DATA.org_name,
            org_tax_code: FORM_DATA.org_tax_code,
            org_address: FORM_DATA.org_address,
            _id: customer.id,
            org_customer_code: customer.org_info?.org_customer_code || "",
            org_contract_code: customer.org_info?.org_contract_code || "",
            org_avatar: customer.org_info?.org_avatar || "",
            org_country: customer.org_info?.org_country || "VN",
            org_currency: customer.org_info?.org_currency || "VND",
            org_representative: FORM_DATA.org_representative,
            org_phone: FORM_DATA.org_phone,
            org_email: FORM_DATA.org_email,
          },
        },
        TOKEN
      );

      if (RESPONSE.status === 200 && !RESPONSE.error) {
        /** Cập nhật customer data */
        const UPDATED_CUSTOMER: IOrganization = {
          ...customer,
          org_info: {
            ...customer.org_info,
            org_name: FORM_DATA.org_name,
            org_tax_code: FORM_DATA.org_tax_code,
            org_address: FORM_DATA.org_address,
          },
        };

        /** Callback */
        if (onUpdate) {
          onUpdate(UPDATED_CUSTOMER);
        }

        /** Đóng edit mode */
        SetIsEditing(false);
        toast.success("Cập nhật thông tin hóa đơn thành công!");
      } else {
        throw new Error(RESPONSE.error || "Không thể cập nhật thông tin");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi cập nhật thông tin"
      );
    } finally {
      SetIsLoading(false);
    }
  };

  /**
   * Xử lý hủy
   */
  const HandleCancel = () => {
    /** Reset form */
    SetFormData({
      org_name: customer.org_info?.org_name || customer.name || "",
      org_tax_code: customer.org_info?.org_tax_code || "",
      org_address: customer.org_info?.org_address || "",
      org_representative: "",
      org_phone: "",
      org_email: "",
    });
    SetIsEditing(false);
  };

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-gray-900">Thông tin xuất hóa đơn</h4>
        {!IS_EDITING && (
          <button
            onClick={() => SetIsEditing(true)}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
          >
            Sửa
          </button>
        )}
      </div>

      {IS_EDITING ? (
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-700">
              Tổ chức của {customer.name} - MST:{" "}
              {FORM_DATA.org_tax_code || "___"}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Địa chỉ:</label>
            <input
              type="text"
              value={FORM_DATA.org_address}
              onChange={(e) => HandleChange("org_address", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập địa chỉ..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Người đại diện:
            </label>
            <input
              type="text"
              value={FORM_DATA.org_representative}
              onChange={(e) =>
                HandleChange("org_representative", e.target.value)
              }
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập tên người đại diện..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Số điện thoại:
            </label>
            <input
              type="text"
              value={FORM_DATA.org_phone}
              onChange={(e) => HandleChange("org_phone", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập số điện thoại..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Email:</label>
            <input
              type="email"
              value={FORM_DATA.org_email}
              onChange={(e) => HandleChange("org_email", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập email..."
            />
          </div>

          <div className="pt-2 space-y-2">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <span>•</span>
              <p>
                Doanh nghiệp nhập đúng thông tin và cung cấp các thông tin khác
                chính xác bằng Tiếng Việt có dấu (đối với thông tin tiếng Việt).
                Retion sẽ không chịu trách nhiệm nếu hóa đơn đã xuất nếu có sai
                sót thông tin
              </p>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <span>•</span>
              <p>
                Dữ liệu doanh nghiệp sẽ được Retion sử dụng để liên lạc và hỗ
                trợ doanh nghiệp. Để yêu cầu thu hồi thông tin này, vui lòng gửi
                email tới{" "}
                <a
                  href="mailto:hotro@botbanhang.vn"
                  className="text-blue-600 hover:underline"
                >
                  hotro@botbanhang.vn
                </a>
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={HandleSave}
              disabled={IS_LOADING}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
            >
              {IS_LOADING ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Lưu
            </button>
            <button
              onClick={HandleCancel}
              disabled={IS_LOADING}
              className="flex items-center gap-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1 text-sm text-gray-700">
          <div className="flex items-center gap-2 font-semibold">
            Tổ chức của {customer.name} - MST: {FORM_DATA.org_tax_code || "___"}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">• Địa chỉ:</span>
            {FORM_DATA.org_address || ""}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">• Người đại diện:</span>
            {FORM_DATA.org_representative || ""}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">• Số điện thoại:</span>
            {FORM_DATA.org_phone || ""}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">• Email:</span>
            {FORM_DATA.org_email || ""}
          </div>

          <div className="pt-3 space-y-2">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <span>•</span>
              <p>
                Doanh nghiệp nhập đúng thông tin và cung cấp các thông tin khác
                chính xác bằng Tiếng Việt có dấu (đối với thông tin tiếng Việt).
                Retion sẽ không chịu trách nhiệm nếu hóa đơn đã xuất nếu có sai
                sót thông tin
              </p>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <span>•</span>
              <p>
                Dữ liệu doanh nghiệp sẽ được Retion sử dụng để liên lạc và hỗ
                trợ doanh nghiệp. Để yêu cầu thu hồi thông tin này, vui lòng gửi
                email tới{" "}
                <a
                  href="mailto:hotro@botbanhang.vn"
                  className="text-blue-600 hover:underline"
                >
                  hotro@botbanhang.vn
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceEditor;
