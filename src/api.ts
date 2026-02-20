import { config } from "./config.js";

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

function extractText(data: GeminiResponse): string {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .filter((x) => x.trim().length > 0)
      .join("\n")
      .trim() || ""
  );
}

function buildGenerateBody(userText: string) {
  return {
    contents: [
      {
        role: "user",
        parts: [{ text: userText }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048
    }
  };
}

export async function askGemini(userText: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildGenerateBody(userText))
  });

  const data = (await resp.json()) as GeminiResponse;

  if (!resp.ok) {
    const msg = data?.error?.message || `Gemini API error: HTTP ${resp.status}`;
    throw new Error(msg);
  }

  const text = extractText(data);
  if (!text) {
    throw new Error("Gemini returned empty response");
  }
  return text;
}

export async function streamGemini(
  userText: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(config.geminiApiKey)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildGenerateBody(userText)),
    signal
  });

  if (!resp.ok) {
    let detail = "";
    try {
      const data = (await resp.json()) as GeminiResponse;
      detail = data?.error?.message || "";
    } catch {
      // ignore
    }
    throw new Error(detail || `Gemini stream error: HTTP ${resp.status}`);
  }

  if (!resp.body) {
    throw new Error("Gemini stream has no body");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const data = JSON.parse(payload) as GeminiResponse;
        const text = extractText(data);
        if (text) onChunk(text);
      } catch {
        // ignore malformed chunks
      }
    }
  }
}
