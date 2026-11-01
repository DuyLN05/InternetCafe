# Tối ưu chất lượng ảnh ALT F4

Các thay đổi trong bản này:
- Nâng độ phân giải mặc định khi xử lý ảnh lên tối đa 1600px, chất lượng 0.92.
- Ưu tiên WebP để giảm dung lượng, giữ chi tiết và nền trong suốt; tự chuyển sang JPEG nếu trình duyệt không hỗ trợ WebP.
- Banner dùng tối đa 2560px / chất lượng 0.96.
- Ảnh game dùng tối đa 1600px / chất lượng 0.94.
- CSS ảnh được chuẩn hóa `object-fit: cover`, căn giữa và giảm mức phóng to của hiệu ứng banner để hạn chế cảm giác mềm/mờ.

## Cập nhật bản chạy trong XAMPP

Sau khi giải nén project, mở terminal tại thư mục `InternetCafe` và chạy:

```bash
npm install
npm run build:xampp
```

Sau đó chép/triển khai thư mục `dist` mới vào vị trí đang chạy (`htdocs/altf4/dist`) theo cấu hình của bạn. Nếu đang chạy chế độ phát triển, dùng `npm run dev`.

Lưu ý: việc tối ưu chỉ áp dụng cho ảnh được tải lên sau khi cập nhật. Ảnh cũ đã nén thấp cần tải lại bản gốc độ phân giải cao để lấy lại chi tiết.
