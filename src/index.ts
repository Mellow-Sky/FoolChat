import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { askGemini, streamGemini } from "./api.js";
import { buildPromptForConversation, buildPromptForUser } from "./proactive.js";
import type { ChatHistoryTurn, ModelStyle } from "./proactive.js";

type RawHistoryTurn = {
  role?: string;
  content?: string;
};

type ChatRequestBody = {
  message?: string;
  style?: string;
  customStylePrompt?: string;
  history?: RawHistoryTurn[];
};

const VALID_STYLES = new Set<ModelStyle>(["custom", "balanced", "concise", "creative", "professional", "teacher"]);

function normalizeStyle(style: string | undefined): ModelStyle {
  if (!style) return "balanced";
  return VALID_STYLES.has(style as ModelStyle) ? (style as ModelStyle) : "balanced";
}

function normalizeHistory(input: RawHistoryTurn[] | undefined): ChatHistoryTurn[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((x) => {
      const role = x.role === "model" ? "model" : x.role === "user" ? "user" : undefined;
      const content = String(x.content || "").trim();
      if (!role || !content) return null;
      return { role, content } as ChatHistoryTurn;
    })
    .filter((x): x is ChatHistoryTurn => Boolean(x))
    .slice(-20);
}

function buildPromptFromBody(body: ChatRequestBody): string {
  const style = normalizeStyle(body.style);
  const customStylePrompt = String(body.customStylePrompt || "");
  const history = normalizeHistory(body.history);

  if (history.length > 0) {
    return buildPromptForConversation(history, style, customStylePrompt);
  }

  const raw = String(body.message || "").trim();
  return buildPromptForUser(raw, style, customStylePrompt);
}

const app = express();
app.use(express.json({ limit: "1mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

app.use(express.static(publicDir));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  const body = req.body as ChatRequestBody;
  const raw = String(body.message || "").trim();
  const history = normalizeHistory(body.history);

  if (!raw && history.length === 0) {
    res.status(400).json({ error: "message or history is required" });
    return;
  }

  try {
    const prompt = buildPromptFromBody(body);
    const reply = await askGemini(prompt);
    res.json({ reply });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/chat/stream", async (req, res) => {
  const body = req.body as ChatRequestBody;
  const raw = String(body.message || "").trim();
  const history = normalizeHistory(body.history);

  if (!raw && history.length === 0) {
    res.status(400).json({ error: "message or history is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const controller = new AbortController();
  req.on("aborted", () => controller.abort());
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const prompt = buildPromptFromBody(body);

    await streamGemini(
      prompt,
      (text) => {
        res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
      },
      controller.signal
    );

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    res.write(`data: ${JSON.stringify({ type: "error", error: msg })}\n\n`);
    res.end();
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(config.port, () => {
  console.log(`Bot server listening on http://127.0.0.1:${config.port}`);
});
