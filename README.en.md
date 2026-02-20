# FoolChat (TypeScript + Express)

[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

A locally runnable Gemini chat project with:

- Web chat UI (conversation list, locate, model style switch)
- Backend APIs (normal reply + streaming reply)
- Prompt-based style control (built-in + custom styles)
- Local conversation storage (browser LocalStorage)

## 1. Requirements

- Node.js 20+
- A valid Gemini API key

## 2. Quick Start

1. Install dependencies

```bash
npm install
```

2. Create environment file

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Edit `.env`

```env
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.0-flash
PORT=5000
```

4. Start development server

```bash
npm run dev
```

5. Open in browser

- `http://127.0.0.1:5000`

## 3. Scripts

- `npm run dev`: start dev server with `tsx watch` (auto reload)
- `npm run build`: compile TypeScript into `dist/`
- `npm start`: run production server from `dist/index.js`

## 4. Environment Variables

- `GEMINI_API_KEY`: required, Gemini API key
- `GEMINI_MODEL`: optional, default `gemini-2.0-flash`
- `PORT`: optional, default `5000`

If `GEMINI_API_KEY` is missing, the server exits during startup.

## 5. API

### `GET /health`

Health check.

Response:

```json
{ "ok": true }
```

### `POST /api/chat`

Non-streaming chat endpoint.

Request body fields:

- `message?: string`
- `history?: Array<{ role: "user" | "model"; content: string }>`
- `style?: "balanced" | "concise" | "creative" | "professional" | "teacher" | "custom"`
- `customStylePrompt?: string`

Rules:

- At least one of `message` or `history` is required
- `history` keeps the latest 20 valid turns

Response:

```json
{ "reply": "..." }
```

### `POST /api/chat/stream`

Streaming chat endpoint (SSE-style text stream).

Uses the same request body as `/api/chat`. Output format:

```text
data: {"type":"chunk","text":"..."}

data: {"type":"done"}
```

On error:

```text
data: {"type":"error","error":"..."}
```

## 6. Built-in Styles

Supported style values:

- `balanced`
- `concise`
- `creative`
- `professional`
- `teacher`
- `custom` (requires `customStylePrompt`)

Styles are applied on backend prompt construction, not only UI rendering.

## 7. Frontend Features

- New chat / recent chats / locate in chat
- Model style selection + custom style save
- Gradual rendering for streamed response
- Theme switch
- Sidebar collapse

Frontend files in `public/`:

- `public/index.html`
- `public/styles.css`
- `public/app.js`

## 8. Project Structure

```text
.
├─ src/
│  ├─ index.ts       # Express server and routes
│  ├─ api.ts         # Gemini API calls and stream parsing
│  ├─ proactive.ts   # Style prompt builder
│  └─ config.ts      # Env loading and validation
├─ public/           # Static frontend assets
├─ dist/             # Build output
├─ .env.example
└─ package.json
```

## 9. FAQ

1. Startup error: `Missing env: GEMINI_API_KEY`
- Cause: API key not set
- Fix: verify `.env` exists and variable name is correct

2. Port conflict on 5000
- Fix: change `PORT` in `.env` or stop the existing process

3. Model returns no response or 4xx/5xx
- Fix: check API key, model name, and network connectivity

4. Chat history not visible
- Note: history is in browser LocalStorage and may disappear after cache clear or browser change

## 10. Production Notes

- Use `npm run build && npm start`
- Run with a process manager (PM2 / systemd / Windows Service)
- Use reverse proxy (Nginx/Caddy) for HTTPS and domain
- Protect `.env`; never commit real keys
