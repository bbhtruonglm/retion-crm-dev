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
    <header className="bg-white text-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center space-x-2 font-bold text-xl">
          <img src={RetionLogo} alt="Retion Logo" className="h-8 w-auto" />
        </div>

        {/* Center: Title */}
        {/* <div className="hidden md:block font-medium text-lg text-blue-100">
          {t("header_title")}
        </div> */}

        {/* Right: User Info */}
        <div className="flex items-center space-x-2 bg-blue-800 px-3 py-1.5 rounded-full text-sm">
          <User className="w-4 h-4 text-blue-300" />
          <span>
            {t("hello")}{" "}
            {isLoadingUser ? (
              <span className="inline-block h-4 w-24 bg-white animate-pulse rounded"></span>
            ) : (
              <span className="font-semibold">
                {currentUser || CURRENT_USER}
              </span>
            )}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
