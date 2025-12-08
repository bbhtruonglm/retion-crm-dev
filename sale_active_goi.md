# Form cho sale kích hoạt hộ khách hàng

## flowchart

```mermaid
flowchart TD
    %% Định nghĩa Style
    classDef actor fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef process fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;
    classDef decision fill:#fce4ec,stroke:#c2185b,stroke-width:2px;
    classDef api fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,stroke-dasharray: 5 5;
    classDef endnode fill:#eeeeee,stroke:#333,stroke-width:2px;

    %% BƯỚC 0: KHỞI TẠO
    Start([Bắt đầu]) --> Step0[Sale click 'Lên đơn' trên hệ thống cũ]:::actor
    Step0 --> OpenTab[Mở Tab mới + Attach Token vào Header]:::process

    %% BƯỚC 1: NHẬP LIỆU
    OpenTab --> InputID[/Sale nhập Org_ID của khách/]:::actor

    %% BƯỚC 2: KIỂM TRA THÔNG TIN
    InputID --> CallApiCheck[[API: Get Org Info]]:::api
    CallApiCheck --> ValidID{Org tồn tại?}:::decision
    ValidID -- Không --> ShowError[Hiển thị lỗi / Nhập lại]:::process
    ShowError --> InputID
    ValidID -- Có --> DisplayInfo[Hiển thị: Tên, Gói hiện tại, Số dư, Người Ref]:::process

    %% BƯỚC 3: THAO TÁC
    DisplayInfo --> ActionChoice{Sale chọn hành động}:::decision

    %% NHÁNH NẠP TIỀN (TOP-UP ONLY)
    ActionChoice -- Nạp tiền --> InputMoney[/Nhập số tiền cần nạp/]:::actor
    InputMoney --> GenQR_Topup[[API: Tạo Payment Order + QR Code]]:::api
    GenQR_Topup --> ShowQR_Topup[Hiển thị QR Code]:::process
    ShowQR_Topup --> SendQR1[Sale gửi/show QR cho khách]:::actor
    SendQR1 --> WaitPay1(Chờ khách thanh toán)
    WaitPay1 --> Webhook1{{System Webhook: Thanh toán thành công}}:::api
    Webhook1 --> UpdateBal1[Cập nhật số dư ví Org]:::process
    UpdateBal1 --> CheckRefStep

    %% NHÁNH MUA GÓI (BUY PACKAGE)
    ActionChoice -- Mua gói --> SelectPlan[/Chọn Gói dịch vụ/]:::actor
    SelectPlan --> CheckBal{Số dư >= Giá gói?}:::decision

    %% MUA GÓI: ĐỦ TIỀN
    CheckBal -- Đủ tiền --> CallApiBuy[[API: Mua gói ngay]]:::api
    CallApiBuy --> ActivePlan[Kích hoạt gói & Trừ tiền]:::process
    ActivePlan --> CheckRefStep

    %% MUA GÓI: THIẾU TIỀN (TRIGGER NẠP + MUA)
    CheckBal -- Thiếu tiền --> CalcMissing[Tính số tiền còn thiếu]:::process
    CalcMissing --> GenQR_Combo[["API: Tạo Payment Order<br/>(Kèm meta: Auto Buy Package)"]]:::api
    GenQR_Combo --> ShowQR_Combo[Hiển thị QR Code nạp tiền]:::process
    ShowQR_Combo --> SendQR2[Sale gửi/show QR cho khách]:::actor
    SendQR2 --> WaitPay2(Chờ khách thanh toán)
    WaitPay2 --> Webhook2{{System Webhook: Thanh toán thành công}}:::api
    Webhook2 --> AutoTrigger[Hệ thống tự động thực hiện Mua gói]:::process
    AutoTrigger --> CheckRefStep

    %% BƯỚC 5: XỬ LÝ REF (POST-PROCESS)
    CheckRefStep{Org đã có Ref chưa?}:::decision
    CheckRefStep -- Đã có --> SuccessNotify[Thông báo thành công]:::process
    CheckRefStep -- Chưa có (Null) --> UpdateRef[[API: Update Ref = Sale đang thao tác]]:::api
    UpdateRef --> SuccessNotify

    SuccessNotify --> End([Kết thúc]):::endnode
```

## sequence diagram

```mermaid
sequenceDiagram
    autonumber
    actor Sale as Sale (Admin)
    participant FE as Frontend Admin
    participant BE as Backend API
    participant DB as Database
    participant PG as Payment Gateway (QR)

    %% BƯỚC 0 & 1 & 2: KHỞI TẠO VÀ TRA CỨU
    Note over Sale, FE: Sale đã login, click "Lên đơn" -> Mở tab mới
    Sale->>FE: Nhập Org_ID khách hàng
    FE->>BE: GET /api/org-info (Header: Token Sale)
    BE->>DB: Query thông tin Org (Name, Balance, Package, Ref)
    DB-->>BE: Return Data
    BE-->>FE: Trả về JSON thông tin
    FE-->>Sale: Hiển thị thông tin Org

    %% BƯỚC 3: LỰA CHỌN THAO TÁC
    alt CASE A: CHỈ NẠP TIỀN (Top-up)
        Sale->>FE: Nhập số tiền -> Click "Tạo QR Nạp"
        FE->>BE: POST /api/payment/create (Amount, Type: TOPUP)
        BE->>PG: Request tạo QR Code (Meta: null)
        PG-->>BE: Return QR Image/String
        BE-->>FE: Hiển thị QR
        FE-->>Sale: Sale gửi QR cho khách

    else CASE B: MUA GÓI (Buy Package)
        Sale->>FE: Chọn Gói -> Click "Mua ngay"
        FE->>BE: POST /api/package/buy (PackageID)
        BE->>DB: Check Balance (Số dư)

        alt B1: Đủ tiền (Sufficient Funds)
            BE->>DB: Trừ tiền & Active Gói
            BE->>BE: Logic: Update Ref (xem bước 5 dưới cùng)
            BE-->>FE: Thông báo Thành công

        else B2: Không đủ tiền (Insufficient Funds)
            BE->>BE: Tính tiền thiếu = Price - Balance
            BE->>PG: Request tạo QR số tiền thiếu<br/>(Meta: {action: "AUTO_BUY", pkg_id: ...})
            PG-->>BE: Return QR Image/String
            BE-->>FE: Trả về QR + Message "Cần nạp thêm"
            FE-->>Sale: Hiển thị QR cho khách nạp
        end
    end

    %% BƯỚC 4: KHÁCH THANH TOÁN & WEBHOOK (Áp dụng cho Case A và Case B2)
    Note over PG, BE: Khách hàng quét mã và thanh toán thành công
    PG->>BE: POST /webhook/payment-success (TransactionData)
    activate BE
    BE->>DB: Update Balance (Cộng tiền vào ví Org)

    %% XỬ LÝ AUTO TRIGGER (Cho Case B2)
    opt Nếu Transaction có Meta = AUTO_BUY
        BE->>DB: Trừ tiền (Giá gói)
        BE->>DB: Active Gói dịch vụ
    end

    %% BƯỚC 5: CẬP NHẬT REF (Logic chung cuối cùng)
    BE->>DB: Get Org Current Ref
    alt Current Ref is NULL (Chưa có ai)
        BE->>DB: UPDATE Org SET Ref = Sale_ID (Từ Token/Order)
    end

    deactivate BE

    %% THÔNG BÁO KẾT QUẢ (Realtime/Socket)
    BE-->>FE: Socket/Notify: "Thanh toán & Xử lý hoàn tất"
    FE-->>Sale: Thông báo: "Đơn hàng thành công, đã cập nhật Ref"
```

## wireframe

```
1. màn hình chính
+-----------------------------------------------------------------------------+
|  LOGO CRM   |  Trang Lên Đơn Hàng Admin          | Xin chào: Sale Nguyen A  |
+-----------------------------------------------------------------------------+
|                                                                             |
|  1. TÌM KIẾM KHÁCH HÀNG                                                     |
|  +--------------------------------------------------------+  +------------+ |
|  | Nhập Org ID của khách (VD: ORG-10293)                  |  |  KIỂM TRA  | |
|  +--------------------------------------------------------+  +------------+ |
|                                                                             |
| =========================================================================== |
|                                                                             |
|  2. THÔNG TIN KHÁCH HÀNG (Kết quả trả về)                                   |
|  +---------------------------+  +---------------------------+               |
|  |  Tên Org: CÔNG TY ABC     |  |  Số dư ví hiện tại:       |               |
|  |  Gói: FREE TIER           |  |  500.000 VNĐ       [REFRESH]|               |
|  +---------------------------+  +---------------------------+               |
|  |  Người giới thiệu (Ref):  |  |  Trạng thái Ref:          |               |
|  |  [ CHƯA CÓ ] (Cơ hội!)    |  |  (Sẽ gán cho bạn sau khi xong)|           |
|  +---------------------------+  +---------------------------+               |
|                                                                             |
| =========================================================================== |
|                                                                             |
|  3. THAO TÁC (Tab Navigation)                                               |
|  +---------------------+ +---------------------+                            |
|  |  [TAB 1] NẠP TIỀN   | |  [TAB 2] MUA GÓI    | <--- (Đang chọn Tab này)   |
|  +---------------------+ +---------------------+                            |
|  |                                                                          |
|  |  Chọn gói dịch vụ muốn mua cho khách:                                    |
|  |  +--------------------------------------------------+                    |
|  |  | [Dropdown] Gói PRO - 2.000.000 VNĐ / Năm         | v                  |
|  |  +--------------------------------------------------+                    |
|  |                                                                          |
|  |  ---------------- TÍNH TOÁN THANH TOÁN ----------------                  |
|  |  Giá gói:              2.000.000 VNĐ                                     |
|  |  Số dư hiện có:        - 500.000 VNĐ                                     |
|  |                        -------------                                     |
|  |  CẦN NẠP THÊM:         1.500.000 VNĐ                                     |
|  |                                                                          |
|  |  [ Checkbox ] Tự động kích hoạt gói sau khi khách nạp xong               |
|  |                                                                          |
|  |  +-------------------------------------------------------+               |
|  |  |           TẠO QR CODE THANH TOÁN (1.5TR)              |               |
|  |  +-------------------------------------------------------+               |
|  |                                                                          |
+--+--------------------------------------------------------------------------+

2. màn hình chờ thanh toán
+-----------------------------------------------------------------------------+
| (Lớp mờ phía sau - Giao diện chính bị làm mờ)                               |
|                                                                             |
|      +---------------------------------------------------------------+      |
|      |  THANH TOÁN ĐƠN HÀNG                                     [X]  |      |
|      +---------------------------------------------------------------+      |
|      |                                                               |      |
|      |   Vui lòng gửi mã này cho khách hàng (Công ty ABC)            |      |
|      |                                                               |      |
|      |        +---------------------------------------------+        |      |
|      |        |                                             |        |      |
|      |        |              [ HÌNH ẢNH QR CODE ]           |        |      |
|      |        |              (VietQR / Momo...)             |        |      |
|      |        |                                             |        |      |
|      |        +---------------------------------------------+        |      |
|      |                                                               |      |
|      |   Số tiền: 1.500.000 VNĐ                                      |      |
|      |   Nội dung: Nap tien mua goi PRO (ORG-10293)                  |      |
|      |                                                               |      |
|      |   [ Loading Spinner ] Đang chờ khách thanh toán...            |      |
|      |                                                               |      |
|      |   (Hệ thống sẽ tự động đóng popup khi nhận tiền thành công)   |      |
|      |                                                               |      |
|      |   +-----------------------+     +-----------------------+     |      |
|      |   | Copy Link Thanh Toán  |     |   Hủy Bỏ / Làm lại    |     |      |
|      |   +-----------------------+     +-----------------------+     |      |
|      |                                                               |      |
|      +---------------------------------------------------------------+      |
|                                                                             |
+-----------------------------------------------------------------------------+

3. màn hình thanh toán thành công
+-----------------------------------------------------------------------------+
| (Lớp mờ phía sau)                                                           |
|                                                                             |
|      +---------------------------------------------------------------+      |
|      |  GIAO DỊCH THÀNH CÔNG!                                        |      |
|      +---------------------------------------------------------------+      |
|      |                                                               |      |
|      |  (ICON CHECK XANH LỚN)                                        |      |
|      |                                                               |      |
|      |  1. Đã nhận: 1.500.000 VNĐ                                    |      |
|      |  2. Đã kích hoạt gói: PRO (1 năm)                             |      |
|      |  3. Cập nhật REF: Org này đã được gán cho bạn (Nguyen A)      |      |
|      |                                                               |      |
|      |  +-------------------------------------------------------+    |      |
|      |  |                LÊN ĐƠN MỚI                            |    |      |
|      |  +-------------------------------------------------------+    |      |
|      |                                                               |      |
|      +---------------------------------------------------------------+      |
|                                                                             |
+-----------------------------------------------------------------------------+
```
