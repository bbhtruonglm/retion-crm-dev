declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.gif" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  /** App API URL */
  readonly VITE_APP_URL?: string;
  /** Manager API URL */
  readonly VITE_MANAGER_URL?: string;
  /** Billing API URL */
  readonly VITE_BILLING_URL?: string;
  /** QR Service URL */
  readonly VITE_QR_SERVICE_URL?: string;
  /** Root Domain */
  readonly VITE_ROOT_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
