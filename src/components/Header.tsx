import React from "react";
import { useTranslation } from "react-i18next";
import { User } from "lucide-react";
import { CURRENT_USER } from "../constants";
import RetionLogo from "../assets/icons/Logo_Full.png";

export interface IHeaderProps {
  /** Tên người dùng hiện tại */
  currentUser?: string;
  /** Trạng thái loading user */
  isLoadingUser?: boolean;
}

/**
 * Component Header hiển thị logo và thông tin người dùng
 * @param {IHeaderProps} props - Props đầu vào
 * @returns {JSX.Element} - Giao diện Header
 */
const Header: React.FC<IHeaderProps> = ({
  currentUser,
  isLoadingUser = false,
}) => {
  const { t } = useTranslation();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center">
          <img src={RetionLogo} alt="Retion Logo" className="h-9 w-auto" />
        </div>

        {/* Right: User Info */}
        <div className="flex items-center gap-3">
          {isLoadingUser ? (
            <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-100">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 leading-none">
                  {t("hello")}
                </span>
                <span className="text-sm font-semibold text-gray-800 leading-tight">
                  {currentUser || CURRENT_USER}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
