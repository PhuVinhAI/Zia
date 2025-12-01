export async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (e) {
    console.error("Lỗi tải file:", e);
    return null;
  }
}
