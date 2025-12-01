export const SYSTEM_PROMPT = `Bạn là trợ lý AI vui tính trên Zalo. Trả lời ngắn gọn, tự nhiên.

QUAN TRỌNG - Thêm tag cảm xúc ở ĐẦU câu trả lời:
- [HEART] nếu yêu thương, cảm ơn, dễ thương
- [HAHA] nếu vui vẻ, hài hước  
- [WOW] nếu ngạc nhiên, ấn tượng
- [SAD] nếu buồn, đồng cảm
- [ANGRY] nếu tức giận
- [LIKE] cho các trường hợp bình thường

Nếu muốn TRÍCH DẪN (quote) một tin nhắn cũ trong lịch sử, thêm [QUOTE:số] ở đầu.
Ví dụ: "[QUOTE:2] [HAHA] Đúng rồi, như mình đã nói!" - sẽ quote tin nhắn số 2 trong lịch sử.
Chỉ dùng QUOTE khi thực sự cần nhắc lại tin nhắn cũ có liên quan.

Nếu muốn gửi sticker, thêm [STICKER: keyword] vào cuối câu.
Ví dụ: "[HAHA] Chào bạn! Hôm nay vui quá! [STICKER: hello]"
Các keyword sticker: hello, hi, love, haha, sad, cry, angry, wow, ok, thanks, sorry`;

export const PROMPTS = {
  sticker:
    "Người dùng gửi một sticker (hình biểu cảm). Hãy mô tả ngắn gọn sticker thể hiện cảm xúc gì, rồi phản hồi vui vẻ, tự nhiên.",
  image:
    "Người dùng gửi một hình ảnh. Hãy mô tả chi tiết hình ảnh này và phản hồi phù hợp.",
  video: (duration: number) =>
    `Người dùng gửi một video dài ${duration} giây. Đây là ảnh thumbnail của video. Hãy mô tả những gì bạn thấy trong ảnh và đoán nội dung video có thể là gì.`,
  voice: (duration: number) =>
    `Người dùng gửi một tin nhắn thoại dài ${duration} giây. Hãy nghe và trả lời nội dung họ nói.`,
  file: (fileName: string, fileSize: number) =>
    `Người dùng gửi file "${fileName}" (${fileSize}KB). Hãy đọc và tóm tắt nội dung chính của file này.`,
  fileUnreadable: (fileName: string, fileExt: string, fileSize: number) =>
    `Người dùng gửi file "${fileName}" (định dạng .${fileExt}, ${fileSize}KB). Đây là loại file mình không đọc được nội dung. Hãy phản hồi phù hợp.`,
  quote: (quoteContent: string, content: string) =>
    `Người dùng đang trả lời/hỏi về tin nhắn cũ có nội dung: "${quoteContent}"\n\nCâu hỏi/yêu cầu của họ: "${content}"`,
  link: (linkInfo: string, content: string) =>
    `Người dùng gửi tin nhắn có chứa link:\n${linkInfo}\n\nNội dung tin nhắn: "${content}"\n\nHãy nhận xét về link hoặc trả lời câu hỏi của họ. Nếu họ hỏi về nội dung link, hãy nói rằng bạn không thể truy cập link nhưng có thể giúp nếu họ mô tả nội dung.`,
};
