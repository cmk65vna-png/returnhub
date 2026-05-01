# ReturnHub — Quản lý hàng hoàn TikTok Shop & Shopee

## Cách chạy (chỉ cần làm 1 lần)

### Bước 1: Cài Docker Desktop
Tải về tại: https://www.docker.com/products/docker-desktop/
- Windows: tải file .exe, cài như bình thường, khởi động lại máy
- Mac: tải file .dmg, kéo vào Applications

### Bước 2: Chạy ứng dụng
Mở Terminal (Mac) hoặc Command Prompt (Windows), vào thư mục này:

```bash
cd đường-dẫn-tới-thư-mục/returnhub
docker compose up --build
```

Lần đầu mất 3-5 phút để tải. Các lần sau chỉ cần:
```bash
docker compose up
```

### Bước 3: Mở trình duyệt
Truy cập: http://localhost:3000

---

## Tắt ứng dụng
```bash
docker compose down
```
Dữ liệu vẫn được giữ lại.

---

## Kết nối API thật (sau khi có tài khoản developer)

### Shopee Open Platform
1. Đăng ký tại: https://open.shopee.com/
2. Tạo app → lấy **Partner ID** và **Partner Key**
3. Vào trang **Kết nối sàn** trong app → điền thông tin
4. Thực hiện OAuth để lấy **Access Token**

### TikTok Shop
1. Đăng ký tại: https://partner.tiktokshop.com/
2. Tạo app → lấy **App Key** và **App Secret**
3. Vào trang **Kết nối sàn** → điền thông tin
4. Thực hiện OAuth để lấy **Access Token**

> Chưa có API key vẫn dùng được — app chạy với dữ liệu mẫu (demo mode)

---

## Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| Dashboard | Tổng quan đơn hoàn, cảnh báo lệch kho |
| Đơn hoàn | Xem tất cả đơn, lọc theo sàn/trạng thái, cập nhật thủ công |
| Nhập kho | Ghi nhận kiện hàng shipper trả về, tình trạng hàng |
| Đối soát | Tự động so sánh sàn ↔ kho, phát hiện lệch |
| Kết nối sàn | Cấu hình API Shopee & TikTok Shop, đồng bộ đơn |

---

## Cấu trúc thư mục
```
returnhub/
├── backend/          # Python FastAPI
│   ├── main.py
│   ├── routers/      # API endpoints
│   ├── models/       # Database models
│   └── requirements.txt
├── frontend/         # React + Vite
│   └── src/
│       ├── pages/    # Dashboard, Returns, Warehouse, Reconcile, Settings
│       └── services/ # API calls
└── docker-compose.yml
```

## Hỗ trợ & nâng cấp
- Thêm sàn Lazada: tạo file `routers/lazada.py` tương tự
- Xuất Excel: thêm endpoint `/api/returns/export` với thư viện openpyxl
- Đa người dùng: thêm authentication với FastAPI-Users
