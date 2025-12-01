const getTimestamp = () => new Date().toLocaleString("vi-VN");

export const logger = {
  info: (message: string) => console.log(`[${getTimestamp()}] ℹ️  ${message}`),
  success: (message: string) =>
    console.log(`[${getTimestamp()}] ✅ ${message}`),
  warn: (message: string) => console.warn(`[${getTimestamp()}] ⚠️  ${message}`),
  error: (message: string, err?: unknown) => {
    console.error(`[${getTimestamp()}] ❌ ${message}`);
    if (err) console.error(err);
  },
  message: (threadId: string, content: string) => {
    console.log(`[${getTimestamp()}] 💬 [${threadId}]: ${content}`);
  },
};
