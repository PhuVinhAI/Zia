import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../config/index.js";
import { fetchAsBase64 } from "../utils/fetch.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.error("❌ Vui lòng cấu hình GEMINI_API_KEY trong file .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function getGeminiReply(
  prompt: string,
  mediaUrl?: string,
  mimeType?: string
): Promise<string> {
  try {
    let contents: any;

    if (mediaUrl) {
      const base64Data = await fetchAsBase64(mediaUrl);
      if (base64Data) {
        contents = [
          { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
          {
            inlineData: { data: base64Data, mimeType: mimeType || "image/png" },
          },
        ];
      } else {
        contents = `${SYSTEM_PROMPT}\n\nUser: ${prompt}`;
      }
    } else {
      contents = `${SYSTEM_PROMPT}\n\nUser: ${prompt}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });
    return response.text || "Không có phản hồi từ AI.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Gemini đang bận, thử lại sau nhé!";
  }
}

export { ai };
