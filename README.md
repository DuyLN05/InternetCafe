# AltF4 Gaming Center — Giao diện quản lý quán net

React 19 + Vite + Tailwind v4 (giữ nguyên bộ khung Figma Make). Phong cách HUD/cyber của bản thiết kế Figma, bổ sung
**light / dark mode**, **hiệu ứng chuyển trang**, ripple khi click, spotlight theo con trỏ, đếm số động, biểu đồ có animation…

## Chạy dự án
```bash
pnpm install      # hoặc npm install
pnpm dev          # http://localhost:8443
pnpm build        # build production vào dist/
```

## Tài khoản dùng thử (khớp README của backend PHP)
| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| Thu ngân | `thungan` | `Thungan@123` |
| Quản lý | `quanly` | `Quanly@123` |
| Quản trị viên | `admin` | `Admin@123` |

Có thể đổi nhanh vai trò ở menu hồ sơ (góc phải trên) để xem phân quyền.
Nhân sự mẫu: thu ngân **Lê Nhật Duy**, quản lý **Trương Thiện Thư**, quản trị viên **Lê Chí Toàn**.
Phím tắt: **Ctrl/⌘ + K** tìm nhanh · **Ctrl/⌘ + B** đóng/mở thanh bên.

## Bản cập nhật 2.5 (AltF4)
- **Trang Tổng hợp** (`#/hub`): thẻ "đèn chiếu" dẫn tới mọi trang, tự lọc theo quyền, kèm số liệu nhanh.
- **Thanh bên thu gọn**: nút tròn ở mép sidebar / nút trên topbar / Ctrl+B; nhớ lựa chọn; tooltip khi thu gọn; mobile là ngăn kéo.
- **Loader** vòng xoay + chữ nhảy (tối ưu: chỉ animate transform/opacity, hỗ trợ light/dark và giảm chuyển động).
- **Sản phẩm dạng menu có ảnh**: thêm/đổi/xóa ảnh (bấm, kéo-thả hoặc dán), tự nén; chưa có ảnh thì dùng tranh minh họa; ảnh hiện cả ở màn gọi món; chuyển nhanh giữa dạng menu/bảng.
- **Tựa game có sẵn** (đầu trang Tổng hợp, xếp một hàng ngang kéo trái/phải): thẻ sóng chuyển động, thông tin gọn ở dưới để lộ ảnh; Quản lý/Quản trị viên thêm, sửa, xóa game và gắn ảnh riêng (chọn màu thẻ, khu máy cài đặt).
- **Banner quảng cáo** (trên hàng game): cỡ ảnh bìa, tự chạy có thanh tiến trình, hiệu ứng parallax, ken-burns, quét sáng, chữ neon; thêm/sửa/xóa, gắn ảnh bìa và liên kết tới game (bấm nút để cuộn tới thẻ game).
- **Vệt sét theo con trỏ**: rê chuột trên màn hình để lại tia sét mờ dần (tự tắt với giảm chuyển động và màn hình cảm ứng).
- Yếu tố gaming-art: logo phím Alt+F4, tiêu đề glitch, góc HUD, hoa văn lục giác, thông số cấu hình máy, chỉ báo ping.

## Chức năng (8 nhóm theo báo cáo)
| Trang | Việc làm được |
|---|---|
| Sơ đồ máy | Trạng thái realtime, mở phiên (hội viên/vãng lai), gọi món, chuyển máy, kết thúc & thanh toán (tiền mặt/ví/chuyển khoản, tiền thừa, hóa đơn) |
| Phiên sử dụng | Lịch sử + phiên đang mở, tính phí trực tiếp |
| Đơn hàng | Tạo đơn vào phiên hoặc bán lẻ tại quầy, phục vụ/hủy (hoàn tồn kho) |
| Hội viên | Đăng ký, nạp ví, khóa/mở khóa, cảnh báo số dư thấp |
| Hóa đơn | Danh sách, hoàn tiền có lý do (Quản lý), không xóa |
| Ca làm việc | Mở ca, kết ca, đối chiếu tiền mặt & chênh lệch |
| Bảo trì | Báo sự cố (máy → bảo trì), đóng phiếu (máy → trống) |
| Tổng hợp | Lối tắt tới mọi trang theo quyền |
| Sản phẩm / Kho | Menu có ảnh, thêm/sửa SP + ảnh, nhập kho, kiểm kê/điều chỉnh (bắt buộc lý do), nhà cung cấp |
| Nhân viên | Thêm, khóa/mở, phân quyền 3 cấp |
| Dashboard / Báo cáo | Biểu đồ 7 ngày, cảnh báo, công suất, top SP; **xuất CSV thật**, in báo cáo |
| Cấu hình / Nhật ký / Sao lưu | Quy tắc phí, đơn giá, giao diện; audit log tự ghi; sao lưu & phục hồi (xác nhận) |

**Quy tắc nghiệp vụ đã cài** (theo README backend): phí tối thiểu 15 phút, làm tròn lên phút, tiền làm tròn lên 100đ;
đơn giá lưu lúc mở phiên; số dư ví ≥ 0; tồn kho ≥ 0; không có máy mở 2 phiên; hóa đơn không xóa; kiểm tra quyền theo vai trò.

## Cấu trúc
```
src/
  App.tsx              Đăng nhập, shell (sidebar/topbar), command palette, chuyển trang
  components/
    ui.tsx             Logo, Loader, ProductArt, Icon, Button, Field, Modal, Toast, DataTable, CountUp, hiệu ứng ripple/spotlight
    theme.tsx          Light/Dark + hiệu ứng loang tròn (View Transitions API)
    modals.tsx         Mở phiên, thanh toán, gọi món, nạp ví, đăng ký hội viên
  lib/
    store.tsx          Toàn bộ nghiệp vụ (mỗi action trả {ok,msg})
    data.ts            Dữ liệu mẫu    types.ts / format.ts / nav.ts
  pages/               16 trang chức năng
  styles/
    tokens.css         Màu 2 theme (sửa palette ở đây)
    base.css  components.css  pages.css  motion.css (toàn bộ keyframes)  gaming.css (loader, tổng hợp, menu ảnh, gaming-art)
```

## Lưu dữ liệu bằng XAMPP (dữ liệu đi theo Git)
Web tự phát hiện API PHP trong thư mục `api/`. Có XAMPP → toàn bộ dữ liệu được ghi vào **`data/state.json`** và ảnh vào
**`data/uploads/`** (không cần MySQL). Commit thư mục `data/` lên Git thì người khác `git pull` về là có đúng dữ liệu đó.

1. Clone/copy cả dự án vào `C:\xampp\htdocs\altf4` (tên thư mục tuỳ ý) rồi bật **Apache** trong XAMPP.
2. Build: `npm install` rồi `npm run build:xampp` (tạo thư mục `dist/` với đường dẫn tương đối).
3. Mở **http://localhost/altf4/** (tự chuyển sang `dist/`; nếu chưa build sẽ hiện hướng dẫn) hoặc trực tiếp **http://localhost/altf4/dist/** — đăng nhập, mọi thay đổi tự lưu vào `data/`.
4. Đẩy lên Git: `git add data && git commit -m "Cập nhật dữ liệu" && git push`. Người khác pull, build, mở web là thấy dữ liệu.

Chạy `npm run dev` (Vite, cổng 8443) vẫn dùng được cùng XAMPP: Vite chuyển `/api` và `/data` sang `http://localhost/altf4/`
(đặt biến môi trường `XAMPP_DIR` nếu thư mục trong htdocs không tên `altf4`). Không có XAMPP thì web tự lưu tạm vào localStorage.

Ghi chú:
- Nhiều máy cùng mở web (cùng XAMPP) tự đồng bộ sau ~6 giây; nếu hai người lưu cùng lúc, bản đến sau được báo "hãy làm lại".
- Cần quyền ghi cho thư mục `data/` (mặc định XAMPP trên Windows đã ghi được).
- Đây là lưu trữ dạng tệp cho đồ án: API chưa có xác thực — đừng mở ra Internet. Muốn dùng MySQL của dự án InternetCafe thì thay
  `api/state.php` bằng các endpoint tương ứng với từng hàm trong `src/lib/store.tsx`.
