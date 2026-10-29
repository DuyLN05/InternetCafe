# Website quản lý quán net – Nhóm Alt F4 (Lớp 242101TH001)
PHP 8+ (PDO) · MySQL 5.7+/8 (utf8mb4, transaction) · HTML/CSS/JS thuần.

## Cài đặt
1. Chép thư mục vào htdocs (XAMPP) hoặc chạy `php -S localhost:8000` trong thư mục dự án.
2. Sửa `config.php` (host, user, mật khẩu MySQL).
3. Mở `/install.php` một lần (trang chủ `index.php` là trang giới thiệu, hệ thống ở `app.php`) → tạo CSDL + dữ liệu mẫu. **Sau đó xóa `install.php`.**
4. Đăng nhập `/login.php`: `admin/Admin@123` · `quanly/Quanly@123` · `thungan/Thungan@123` (đổi mật khẩu ngay).

## Chức năng (8 nhóm theo báo cáo)
| Nhóm | Trang | Vai trò tối thiểu |
|---|---|---|
| Đăng nhập, đổi mật khẩu, phân quyền | login, password | Thu ngân |
| Máy & phiên: trạng thái, mở/kết thúc, tính phí, chuyển máy | machines | Thu ngân (sửa giờ/máy/đơn giá: Quản lý) |
| Hội viên & ví: đăng ký, nạp tiền, lịch sử, số dư ≥ 0, cảnh báo thấp | members | Thu ngân |
| Đồ ăn & đơn hàng (giá lưu tại thời điểm bán) | orders | Thu ngân |
| Kho: nhập, kiểm kê, nhà cung cấp, cảnh báo sắp hết | inventory | Quản lý |
| Hóa đơn: tiền mặt/trừ ví/chuyển khoản, không xóa, hoàn tiền | invoices | Thu ngân (hoàn: Quản lý) |
| Bảo trì: báo sự cố, phân công, đóng phiếu | maintenance | Thu ngân (xử lý: Quản lý) |
| Báo cáo: doanh thu, lượt dùng máy, tồn kho, CSV, in | reports | Quản lý |
| Nhân viên & phân quyền | staff | Quản lý |
| Ca làm việc: mở/kết ca, đối chiếu tiền mặt | shifts | Thu ngân |
| Cấu hình quy tắc phí, nhật ký, sao lưu/phục hồi | system | Quản trị viên |

## Bảo mật
PDO prepared statements · password_hash/verify · CSRF token mọi form POST · kiểm tra quyền phía máy chủ (index.php + từng hành động) · transaction + khóa dòng (`FOR UPDATE`) chống mở 2 phiên/bán vượt tồn/lệch số dư · audit log · hóa đơn không xóa.

## Quy tắc tính phí
Giờ lấy từ máy chủ (MySQL `NOW()`); tối thiểu `min_minutes` phút (mặc định 15), làm tròn lên phút, tiền làm tròn lên 100đ; đơn giá lưu lúc mở phiên.

## Sao lưu định kỳ
`php cron_backup.php` (cron / Task Scheduler) → file trong `backups/`.
