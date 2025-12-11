/**
 * Interface cho User
 */
export interface IUser {
  /** Mongo ID */
  _id: string;
  /** Facebook Staff ID */
  fb_staff_id: string;
  /** Version */
  __v: number;
  /** Affiliate ID */
  affiliate_id: string;
  /** Ngày tạo */
  createdAt: string;
  /** Tên đầy đủ */
  full_name: string;
  /** Là Admin */
  is_admin: boolean;
  /** Token đã chết */
  is_die_token: boolean;
  /** Được phép tải xuống */
  is_download: boolean;
  /** Đã xác minh */
  is_verify: boolean;
  /** Danh sách ID Business Manager */
  list_fb_bm_id: string[];
  /** Danh sách trang */
  list_page: any[];
  /** Vai trò */
  role: string;
  /** Cài đặt */
  setting: {
    /** Hiển thị */
    display: {
      /** Gán avatar */
      assign_avatar: string;
      /** Nhãn */
      label: string;
      /** ID */
      _id: string;
    };
    /** Bộ lọc hội thoại tùy chỉnh */
    custom_filter_conversation: any[];
    /** ID */
    _id: string;
  };
  /** Ngày cập nhật */
  updatedAt: string;
  /** User ID */
  user_id: string;
  /** Truy cập cuối cùng */
  last_access: string;
  /** Thông tin người dùng */
  user_info: {
    /** Custom ID */
    custom_id: string;
  };
  /** Email */
  email?: string;
  /** Phone */
  phone?: string;
}

export interface IOrganization {
  id: string;
  orgId: string;
  name: string;
  balance: number;
  currentPackage: string;
  refName: string | null;
  refStatus: string;
  org_info?: {
    org_name?: string;
    org_tax_code?: string;
    org_address?: string;
    org_customer_code?: string;
    org_contract_code?: string;
    org_avatar?: string;
    org_country?: string;
    org_currency?: string;
    org_affiliate_id?: string;
  };
  /** Thông tin người dùng */
  user?: IUser;
  /** Thông tin affiliate */
  affiliate?: IUser;
}

/**
 * Loại gói dịch vụ
 */
export enum IPackageType {
  /** Gói đăng ký chính */
  SUBSCRIPTION = "subscription",
  /** Mua thêm trang */
  EXTRA_PAGE = "extra_page",
  /** Mua thêm nhân viên */
  EXTRA_STAFF = "extra_staff",
  /** Mua thêm FAU */
  EXTRA_FAU = "extra_fau",
  /** Mua thêm AI Text */
  EXTRA_AI_TEXT = "extra_ai_text",
  /** Mua thêm AI Image */
  EXTRA_AI_IMAGE = "extra_ai_image",
  /** Mua thêm AI Sound */
  EXTRA_AI_SOUND = "extra_ai_sound",
  /** Mua thêm AI Video */
  EXTRA_AI_VIDEO = "extra_ai_video",
}

/**
 * Interface cho gói dịch vụ đăng ký
 */
export interface IServicePackage {
  /** ID của gói */
  id: string;
  /** Tên gói */
  name: string;
  /** Giá gói */
  price: number;
  /** Loại gói */
  type: IPackageType;
  /** Mô tả gói */
  description?: string;
  /** Thời hạn (ms) */
  duration?: number;
  /** Số trang */
  page?: number;
  /** Số nhân viên */
  staff?: number;
  /** Số khách hàng */
  client?: number;
  /** Số FAU */
  fau?: number;
  /** Số ký tự AI */
  aiText?: number;
  /** Số ảnh AI */
  aiImage?: number;
  /** Số phút âm thanh AI */
  aiSound?: number;
  /** Số phút video AI */
  aiVideo?: number;
  /** Phân bổ huấn luyện AI */
  ai_train_package_amount?: number;
}

/**
 * Interface cho gói mua thêm
 */
export interface IExtraPackage {
  /** ID của gói */
  id: string;
  /** Tên gói */
  name: string;
  /** Giá */
  price: number;
  /** Loại gói */
  type: IPackageType;
  /** Mô tả */
  description?: string;
  /** Số lượng */
  quantity: number;
  /** Đơn vị */
  unit: string;
  /** Giá mỗi đơn vị */
  pricePerUnit: number;
}

export interface IDurationOption {
  months: number;
  label: string;
  discount?: number; // percent 0-100
}

export type ITabType = "topup" | "buy_package";

export type IPaymentStep = "idle" | "pending" | "success";

export interface IPaymentDetails {
  amount: number;
  content: string;
  qrCode?: string;
  packageName?: string;
  bankInfo?: IBankAccount;
}

export interface IBankAccount {
  bank_bin: number;
  account: string;
  name: string;
  bank: string;
  code: string;
}
