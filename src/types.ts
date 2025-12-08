export interface IOrganization {
  id: string;
  orgId: string;
  name: string;
  balance: number;
  currentPackage: string;
  refName: string | null;
  refStatus: string;
}

export interface IServicePackage {
  id: string;
  name: string;
  price: number; // Price per month
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
  packageName?: string;
}
