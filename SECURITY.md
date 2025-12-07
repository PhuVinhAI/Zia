# Chính sách bảo mật

## Phiên bản được hỗ trợ

| Phiên bản | Hỗ trợ            |
| --------- | ----------------- |
| 1.x.x     | :white_check_mark:|
| < 1.0     | :x:               |

## Báo cáo lỗ hổng bảo mật

Chúng tôi rất coi trọng vấn đề bảo mật của Zia. Nếu bạn phát hiện lỗ hổng bảo mật, vui lòng báo cáo một cách có trách nhiệm.

### Cách báo cáo

**KHÔNG** tạo public issue cho các lỗ hổng bảo mật.

Thay vào đó, vui lòng:

1. Gửi email đến: [security@example.com] (thay thế bằng email thực tế)
2. Hoặc sử dụng tính năng "Report a vulnerability" trên GitHub Security tab

### Thông tin cần cung cấp

- Mô tả chi tiết về lỗ hổng
- Các bước để tái tạo vấn đề
- Phiên bản bị ảnh hưởng
- Tác động tiềm tàng
- Đề xuất cách khắc phục (nếu có)

### Quy trình xử lý

1. **Xác nhận**: Chúng tôi sẽ xác nhận nhận được báo cáo trong vòng 48 giờ
2. **Đánh giá**: Đánh giá mức độ nghiêm trọng và xác minh lỗ hổng
3. **Khắc phục**: Phát triển và kiểm tra bản vá
4. **Phát hành**: Phát hành bản cập nhật bảo mật
5. **Công bố**: Công bố thông tin sau khi bản vá được phát hành

### Cam kết của chúng tôi

- Phản hồi nhanh chóng các báo cáo bảo mật
- Giữ bí mật thông tin người báo cáo
- Cung cấp credit cho người phát hiện (nếu được đồng ý)
- Không thực hiện hành động pháp lý đối với các báo cáo thiện chí

## Các biện pháp bảo mật

### Quản lý credentials

- **KHÔNG BAO GIỜ** commit credentials, API keys, hoặc secrets vào repository
- Sử dụng file `.env` cho các biến môi trường nhạy cảm
- File `.env` đã được thêm vào `.gitignore`

### Dependencies

- Thường xuyên cập nhật dependencies
- Sử dụng `bun audit` để kiểm tra lỗ hổng trong dependencies
- Review các dependencies mới trước khi thêm vào dự án

### Best practices

- Validate tất cả input từ người dùng
- Sử dụng parameterized queries cho database
- Implement rate limiting cho API endpoints
- Log các hoạt động đáng ngờ

## Cập nhật bảo mật

Theo dõi các cập nhật bảo mật qua:

- GitHub Releases
- Security Advisories trên repository

Cảm ơn bạn đã giúp giữ Zia an toàn! 🔒
