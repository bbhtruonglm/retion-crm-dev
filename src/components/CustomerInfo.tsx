import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Wallet, UserPlus, Package } from "lucide-react";
import { IOrganization } from "../types";

export interface ICustomerInfoProps {
  /** Thông tin khách hàng */
  customer: IOrganization;
  /** Người dùng hiện tại */
  currentUser?: any;
}

/**
 * Component hiển thị thông tin khách hàng
 * @param {ICustomerInfoProps} props - Props đầu vào
 * @returns {JSX.Element} - Giao diện CustomerInfo
 */
const CustomerInfo: React.FC<ICustomerInfoProps> = ({
  customer,
  currentUser,
}) => {
  const { t } = useTranslation();

  /** Trạng thái đang refresh */
  const [IS_REFRESHING, SetIsRefreshing] = useState(false);

  /**
   * Xử lý refresh số dư
   */
  const HandleRefresh = () => {
    SetIsRefreshing(true);
    setTimeout(() => SetIsRefreshing(false), 1000);
  };

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
   * Lấy thông tin người giới thiệu hiển thị
   */
  const GetReferrerDisplay = () => {
    // 1. Ưu tiên Affiliate chính thức
    if (customer.affiliate && customer.affiliate.full_name) {
      /**
       * Lấy ID hiển thị ưu tiên:
       * 1. affiliate_id
       * 2. custom_id (trong user_info)
       * 3. Số điện thoại
       */
      const ID =
        customer.affiliate.affiliate_id ||
        customer.affiliate.user_info?.custom_id ||
        customer.affiliate.phone;

      /** Trả về object hiển thị */
      return {
        name: customer.affiliate.full_name,
        id: ID,
        isCurrent: false,
      };
    }

    // 2. Nếu có refName (legacy)
    if (customer.refName) {
      return {
        name: customer.refName,
        id: "",
        isCurrent: false,
      };
    }

    // 3. Mặc định user hiện tại -> REMOVED per user request (only update on success)
    // if (currentUser) {
    //   ...
    // }

    /** Trường hợp không có referrer nào */
    return null;
  };

  const REF_DISPLAY = GetReferrerDisplay();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
        {t("step_2_info")}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Col 1 */}
        <div className="space-y-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">{t("org_name")}</span>
            <div className="font-bold text-lg text-gray-800 line-clamp-2">
              {customer.name}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Package className="w-3 h-3" /> {t("current_package")}
            </span>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800 w-fit">
              {customer.currentPackage}
            </div>
          </div>
        </div>

        {/* Col 2 */}
        <div className="space-y-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Wallet className="w-3 h-3" /> {t("current_balance")}
            </span>
            <div className="flex items-center space-x-3">
              <span className="font-bold text-2xl text-green-600">
                {FormatCurrency(customer.balance)}
              </span>
              {/* <button
                onClick={HandleRefresh}
                className="text-gray-400 hover:text-blue-500 transition-colors"
                title="Refresh Balance"
              >
                <RefreshCw
                  className={`w-4 h-4 ${IS_REFRESHING ? "animate-spin" : ""}`}
                />
              </button> */}
            </div>
          </div>

          <div className="flex flex-col bg-gray-50 p-3 rounded-md border border-dashed border-gray-300">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-gray-500 block mb-1">
                  {t("referrer")}
                </span>
                <span
                  className={`font-medium ${
                    !REF_DISPLAY ? "text-orange-500 italic" : "text-gray-800"
                  }`}
                >
                  {REF_DISPLAY ? (
                    <>
                      {REF_DISPLAY.name}
                      {REF_DISPLAY.id && ` (${REF_DISPLAY.id})`}
                    </>
                  ) : (
                    "Chưa có"
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfo;
