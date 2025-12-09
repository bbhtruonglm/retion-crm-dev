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
  user?: any;
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
