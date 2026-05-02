# Hướng dẫn Deploy lên Railway

## Bước 1: Tạo Project Railway
1. Vào railway.app → Login with GitHub
2. New Project → Deploy from GitHub repo → chọn "returnhub"
3. Railway tạo project rỗng

## Bước 2: Thêm Service Backend
1. Trong project → Add Service → GitHub Repo → returnhub
2. Settings → Build:
   - Dockerfile Path: `Dockerfile.backend`
3. Settings → Variables → Add:
   - `DATABASE_URL` = `sqlite:////data/returnhub.db`
4. Settings → Networking → Generate Domain
5. Copy URL backend VD: `https://returnhub-backend.up.railway.app`

## Bước 3: Thêm Service Frontend  
1. Add Service → GitHub Repo → returnhub (lần 2)
2. Settings → Build:
   - Dockerfile Path: `Dockerfile.frontend`
3. Settings → Variables → Add:
   - `VITE_API_URL` = URL backend ở bước 2 (VD: https://returnhub-backend.up.railway.app)
4. Settings → Networking → Generate Domain
5. Copy URL frontend → đây là URL để dùng và điền vào TikTok

## Bước 4: Điền vào TikTok
- URL trang web sản phẩm: URL frontend từ bước 3
- Tài khoản kiểm thử: tài khoản TikTok Shop của bạn

## Lưu ý
- Free tier Railway: 500 giờ/tháng (~21 ngày) — đủ để TikTok duyệt
- Nếu cần chạy liên tục: nâng lên $5/tháng
