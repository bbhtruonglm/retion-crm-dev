import { IOrganization, IServicePackage, IDurationOption } from "./types";

/**
 * Danh sách các gói dịch vụ
 */
export const MOCK_PACKAGES: IServicePackage[] = [
  { id: "business", name: "Gói Business", price: 2600000 },
  { id: "pro", name: "Gói PRO", price: 1500000 },
  { id: "starter", name: "Gói Starter", price: 900000 },
];

/**
 * Danh sách các tùy chọn thời hạn
 */
export const MOCK_DURATIONS: IDurationOption[] = [
  { months: 1, label: "1 tháng" },
  { months: 2, label: "2 tháng" },
  { months: 3, label: "3 tháng" },
  { months: 4, label: "4 tháng" },
  { months: 5, label: "5 tháng" },
  { months: 6, label: "6 tháng" },
  { months: 9, label: "9 tháng" },
  { months: 12, label: "12 tháng" },
  { months: 15, label: "15 tháng" },
  { months: 18, label: "18 tháng" },
  { months: 21, label: "21 tháng" },
  { months: 24, label: "24 tháng" },
  { months: 30, label: "30 tháng" },
  { months: 36, label: "36 tháng" },
];

/**
 * Dữ liệu giả định về tổ chức
 */
export const MOCK_DB: IOrganization[] = [
  {
    id: "1",
    orgId: "ORG-10293",
    name: "CÔNG TY ABC",
    balance: 500000,
    currentPackage: "FREE TIER",
    refName: null,
    refStatus: "Chưa có",
  },
  {
    id: "2",
    orgId: "ORG-99999",
    name: "CÔNG TY XYZ GLOBAL",
    balance: 12000000,
    currentPackage: "PRO",
    refName: "Sale Nguyen B",
    refStatus: "Đã gán",
  },
];

/**
 * Người dùng hiện tại
 */
export const CURRENT_USER = "Sale Nguyen A";
