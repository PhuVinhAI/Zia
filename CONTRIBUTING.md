# Hướng dẫn đóng góp cho Zia

Cảm ơn bạn đã quan tâm đến việc đóng góp cho Zia! Dự án này được xây dựng và phát triển nhờ sự đóng góp của cộng đồng.

## Quy tắc ứng xử

Bằng việc tham gia dự án này, bạn đồng ý tuân thủ [Quy tắc ứng xử](CODE_OF_CONDUCT.md) của chúng tôi.

## Cách đóng góp

### Báo cáo lỗi

1. Kiểm tra [Issues](../../issues) để đảm bảo lỗi chưa được báo cáo
2. Tạo issue mới với template "Bug Report"
3. Mô tả chi tiết:
   - Các bước tái tạo lỗi
   - Kết quả mong đợi vs kết quả thực tế
   - Môi trường (OS, phiên bản Bun, Node.js...)

### Đề xuất tính năng

1. Kiểm tra [Issues](../../issues) để tránh trùng lặp
2. Tạo issue mới với template "Feature Request"
3. Mô tả rõ ràng tính năng và lý do cần thiết

### Gửi Pull Request

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit changes: `git commit -m "feat: mô tả ngắn gọn"`
4. Push branch: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

## Quy ước commit

Sử dụng [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Tính năng mới
- `fix:` - Sửa lỗi
- `docs:` - Thay đổi tài liệu
- `style:` - Format code (không ảnh hưởng logic)
- `refactor:` - Tái cấu trúc code
- `test:` - Thêm/sửa test
- `chore:` - Công việc bảo trì

## Thiết lập môi trường phát triển

```bash
# Clone repository
git clone https://github.com/your-username/zia.git
cd zia

# Cài đặt dependencies
bun install

# Copy file cấu hình
cp .env.example .env

# Chạy tests
bun test

# Chạy development
bun dev
```

## Tiêu chuẩn code

- Sử dụng TypeScript
- Tuân thủ cấu hình Biome (lint & format)
- Viết tests cho tính năng mới
- Đảm bảo tất cả tests pass trước khi tạo PR

```bash
# Format code
bun run format

# Kiểm tra lint
bun run lint

# Chạy tests
bun run test:integration
```

## Cấu trúc dự án

```
src/
├── app/           # Entry point
├── core/          # Core modules (logger, tool-registry...)
├── infrastructure/# External services (Gemini, Zalo, Database...)
├── modules/       # Feature modules (gateway, system, entertainment...)
└── shared/        # Shared utilities, types, schemas
```

## Câu hỏi?

Nếu có thắc mắc, hãy tạo issue với label `question` hoặc liên hệ maintainers.

Cảm ơn bạn đã đóng góp! 🎉
