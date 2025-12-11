import React from "react";
import { Link } from "react-router-dom";
import { Home, AlertCircle } from "lucide-react";
import RetionLogoFull from "../assets/icons/Logo_Full.png";

/**
 * Trang lỗi 404 / Không có quyền truy cập
 */
const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* <div className="flex justify-center">
          <img src={RetionLogoFull} alt="Retion CRM" className="h-12 w-auto" />
        </div> */}
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Không tìm thấy trang
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Trang bạn đang tìm kiếm không tồn tại hoặc bạn không có quyền truy
          cập.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <div className="text-gray-500 mb-6">
            Vui lòng kiểm tra lại đường dẫn hoặc liên hệ với quản trị viên nếu
            bạn nghĩ đây là một sự nhầm lẫn.
          </div>

          <div>
            <a
              href={import.meta.env.VITE_ROOT_DOMAIN || "/"}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Home className="w-5 h-5 mr-2" />
              Quay lại trang chủ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
