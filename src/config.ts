import "dotenv/config";

function must(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
}

function optionalNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid number env: ${key}`);
  }
  return n;
}

export const config = {
  port: optionalNumber("PORT", 5000),
  geminiApiKey: must("GEMINI_API_KEY"),
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash"
};
