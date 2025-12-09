# Environment Configuration

Dự án sử dụng các file environment để cấu hình API URLs cho các môi trường khác nhau.

## 📁 Các file environment

### `.env.development`

Môi trường development (local development)

- Tự động được load khi chạy `pnpm run dev`
- API URLs: `https://chatbox-api.34.142.177.104.sslip.io/v1/`

### `.env.production`

Môi trường production

- Tự động được load khi chạy `pnpm run build`
- API URLs: `https://chatbox-api.retion.ai/v1/`

### `.env.local` (Optional)

File local để override các giá trị trong `.env.development` hoặc `.env.production`

- File này được gitignore, không commit lên repository
- Tạo file này nếu bạn muốn sử dụng API URLs khác

## 🔧 Environment Variables

| Variable           | Description                              | Example                                       |
| ------------------ | ---------------------------------------- | --------------------------------------------- |
| `VITE_APP_URL`     | App API URL (chatbot_user, conversation) | `https://chatbox-api.retion.ai/v1/n4_service` |
| `VITE_MANAGER_URL` | Manager API URL (billing, organization)  | `https://chatbox-api.retion.ai/v1/n4_service` |
| `VITE_BILLING_URL` | Billing API URL                          | `https://chatbox-api.retion.ai/v1/billing`    |

## 🚀 Sử dụng

### Development (Dev Environment)

```bash
pnpm run dev
```

Sử dụng `.env.development` - Chạy dev server với API URLs development

### Production Mode (Prod Environment)

```bash
pnpm run prod
```

Sử dụng `.env.production` - Chạy dev server với API URLs production (để test trước khi build)

### Production Build

```bash
pnpm run build
```

Sử dụng `.env.production` - Build ứng dụng cho production

### Preview Build

```bash
pnpm run preview
```

Preview bản build production

### Local Override

1. Copy `.env.example` thành `.env.local`
2. Sửa các giá trị theo ý muốn

## 📝 Lưu ý

- Tất cả env variables phải bắt đầu với `VITE_` để Vite có thể expose cho client
- Không commit file `.env.local` lên repository
- Khi thêm env variable mới, nhớ cập nhật:
  1. File `.env.example`
  2. File `src/vite-env.d.ts` (TypeScript types)
  3. File README này
