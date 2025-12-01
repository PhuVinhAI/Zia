import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  BOT_NAME: process.env.BOT_NAME || "Bot",
  SELF_LISTEN: process.env.ZALO_SELF_LISTEN === "true",
};
