# FoolChat (TypeScript + Express)

[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md)

Gemini を使ったローカル実行可能なチャットプロジェクトです。主な機能:

- Web チャット UI（会話一覧、会話内ジャンプ、モデルスタイル切替）
- バックエンド API（通常応答 + ストリーミング応答）
- プロンプトベースのスタイル制御（内蔵 + カスタム）
- ローカル会話保存（ブラウザ LocalStorage）

## 1. 必要環境

- Node.js 20+
- 有効な Gemini API キー

## 2. クイックスタート

1. 依存関係をインストール

```bash
npm install
```

2. 環境変数ファイルを作成

```bash
cp .env.example .env
```

Windows PowerShell の場合:

```powershell
Copy-Item .env.example .env
```

3. `.env` を編集

```env
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.0-flash
PORT=5000
```

4. 開発サーバーを起動

```bash
npm run dev
```

5. ブラウザで開く

- `http://127.0.0.1:5000`

## 3. スクリプト

- `npm run dev`: `tsx watch` で開発サーバー起動（自動リロード）
- `npm run build`: TypeScript を `dist/` にビルド
- `npm start`: `dist/index.js` を本番モードで実行

## 4. 環境変数

- `GEMINI_API_KEY`: 必須、Gemini API キー
- `GEMINI_MODEL`: 任意、デフォルト `gemini-2.0-flash`
- `PORT`: 任意、デフォルト `5000`

`GEMINI_API_KEY` が未設定の場合、サーバーは起動時に終了します。

## 5. API

### `GET /health`

ヘルスチェック。

レスポンス:

```json
{ "ok": true }
```

### `POST /api/chat`

非ストリーミングのチャット API。

リクエストボディ:

- `message?: string`
- `history?: Array<{ role: "user" | "model"; content: string }>`
- `style?: "balanced" | "concise" | "creative" | "professional" | "teacher" | "custom"`
- `customStylePrompt?: string`

ルール:

- `message` または `history` のどちらかは必須
- `history` は最新 20 件の有効ターンのみ利用

レスポンス:

```json
{ "reply": "..." }
```

### `POST /api/chat/stream`

ストリーミングチャット API（SSE 形式のテキストストリーム）。

リクエストボディは `/api/chat` と同じ。出力形式:

```text
data: {"type":"chunk","text":"..."}

data: {"type":"done"}
```

エラー時:

```text
data: {"type":"error","error":"..."}
```

## 6. 内蔵スタイル

利用可能なスタイル:

- `balanced`
- `concise`
- `creative`
- `professional`
- `teacher`
- `custom`（`customStylePrompt` が必要）

スタイルは UI 表示だけでなく、バックエンドのプロンプト生成に適用されます。

## 7. フロントエンド機能

- 新規チャット / 最近の会話 / 会話内ジャンプ
- モデルスタイル選択 + カスタムスタイル保存
- ストリーミング応答の段階的描画
- テーマ切替
- サイドバー折りたたみ

フロントエンドファイル（`public/`）:

- `public/index.html`
- `public/styles.css`
- `public/app.js`

## 8. ディレクトリ構成

```text
.
├─ src/
│  ├─ index.ts       # Express サーバーとルーティング
│  ├─ api.ts         # Gemini API 呼び出しとストリーム解析
│  ├─ proactive.ts   # スタイル用プロンプト生成
│  └─ config.ts      # 環境変数読み込みと検証
├─ public/           # 静的フロントエンド資産
├─ dist/             # ビルド出力
├─ .env.example
└─ package.json
```

## 9. よくある問題

1. 起動時エラー: `Missing env: GEMINI_API_KEY`
- 原因: API キー未設定
- 対処: `.env` の存在と変数名を確認

2. 5000 番ポート競合
- 対処: `.env` の `PORT` を変更するか、既存プロセスを停止

3. モデル応答なし / 4xx・5xx
- 対処: API キー、モデル名、ネットワーク接続を確認

4. 履歴が表示されない
- 注記: 履歴は LocalStorage 保存のため、ブラウザ変更やキャッシュ削除で消える場合があります

## 10. 本番運用の推奨

- `npm run build && npm start` を使用
- プロセスマネージャーで常駐化（PM2 / systemd / Windows Service）
- 逆プロキシ（Nginx/Caddy）で HTTPS とドメイン対応
- `.env` を保護し、実キーをリポジトリにコミットしない
