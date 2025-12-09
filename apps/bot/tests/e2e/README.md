# E2E Tests

End-to-End tests cho Zia Bot - test toàn bộ hệ thống với Zalo API thật.

## Yêu cầu

1. **Cấu hình `.env.test`**:
```bash
ZALO_CREDENTIALS_BASE64=<base64_credentials>
GEMINI_API_KEY=<your_key>
E2E_TEST_THREAD_ID=<thread_id_để_test>
```

2. **Chạy bot** ở terminal khác:
```bash
bun start
```

## Chạy Tests

```bash
# Chạy tất cả E2E tests
bun test tests/e2e --timeout 120000

# Chạy với verbose output
TEST_VERBOSE=true bun test tests/e2e --timeout 120000
```

## Test Scenarios

| Test | Mô tả |
|------|-------|
| Basic Chat | Gửi tin nhắn đơn giản, bot phản hồi |
| Multi-message Buffer | Gửi nhiều tin liên tiếp, bot gom nhóm xử lý |
| Tool Calling | Test solveMath, googleSearch |
| Media Handling | Test GIF (Giphy), ảnh anime (Nekos) |
| File Creation | Test tạo DOCX, Chart |
| Conversation Context | Test bot nhớ context |
| Error Handling | Test tin nhắn rỗng, tin nhắn dài |

## Lưu ý

⚠️ **Tests này gửi tin nhắn THẬT qua Zalo!**

- Sử dụng thread ID của chính bạn hoặc account test
- Mỗi test case đợi ~15-30 giây để bot xử lý
- Full suite mất khoảng 5-10 phút

## Lấy Thread ID

Thread ID là ID của cuộc hội thoại Zalo. Có thể lấy bằng cách:

1. Chạy bot với `TEST_VERBOSE=true`
2. Gửi tin nhắn cho bot
3. Xem log để lấy `threadId`

Hoặc dùng test `zaloApi.test.ts` để xem UID của mình.
