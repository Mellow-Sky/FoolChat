const STORAGE_KEY = "gemini_style_ui_conversations_v1";
const STYLE_KEY = "gemini_style_ui_model_style_v1";
const LEGACY_CUSTOM_STYLE_PROMPT_KEY = "gemini_style_ui_custom_style_prompt_v1";
const CUSTOM_MODELS_KEY = "gemini_style_ui_custom_models_v1";
const SIDEBAR_COLLAPSED_KEY = "gemini_style_ui_sidebar_collapsed_v1";
const THEME_KEY = "gemini_style_ui_theme_v1";

const appShell = document.querySelector(".app-shell");
const themeToggle = document.querySelector("#theme-toggle");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#chat-input");
const sendBtn = document.querySelector("#send-btn");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const messages = document.querySelector("#messages");
const statusText = document.querySelector("#status-text");
const mainTitle = document.querySelector("#main-title");
const template = document.querySelector("#msg-template");
const starters = document.querySelector("#starters");
const welcome = document.querySelector("#welcome");
const browsePanel = document.querySelector("#browse-panel");
const styleSettings = document.querySelector("#style-settings");
const customStyleNameInput = document.querySelector("#custom-style-name");
const customStyleInput = document.querySelector("#custom-style-input");
const saveStyleBtn = document.querySelector("#save-style-btn");
const exitStyleBtn = document.querySelector("#exit-style-btn");
const styleTip = document.querySelector("#style-tip");

const browseNewChat = document.querySelector("#browse-new-chat");
const browseRecent = document.querySelector("#browse-recent");
const browseLocate = document.querySelector("#browse-locate");
const browseModelStyle = document.querySelector("#browse-model-style");

const BUILTIN_STYLE_OPTIONS = [
  { id: "balanced", label: "均衡", desc: "清晰完整，适合大多数问题" },
  { id: "concise", label: "简洁", desc: "更短更直接，减少展开" },
  { id: "creative", label: "创意", desc: "表达更有想象力与文采" },
  { id: "professional", label: "专业", desc: "术语准确，结构更严谨" },
  { id: "teacher", label: "讲解", desc: "循序渐进，适合学习场景" }
];

let browseMode = "new";
let conversations = loadConversations();
let activeId = conversations[0]?.id || createConversation("新对话");
let typingNode = null;

let customModels = loadCustomModels();
let selectedStyle = loadSelectedStyle();
let editingCustomModelId = null;

let sidebarCollapsed = loadSidebarCollapsed();
let currentTheme = loadTheme();

function nowTime() {
  return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function setStatus(text) {
  statusText.textContent = text;
}

function applyTheme() {
  const isCute = currentTheme === "cute";
  document.body.classList.toggle("theme-cute", isCute);
  themeToggle.textContent = isCute ? "🐱" : "🍎";
  themeToggle.title = isCute ? "当前：可爱萌系（点我切到Apple）" : "当前：Apple（点我切到可爱萌系）";
  themeToggle.setAttribute("aria-label", themeToggle.title);
}

function applySidebarState() {
  appShell.classList.toggle("sidebar-collapsed", sidebarCollapsed);
  sidebarToggle.classList.toggle("is-collapsed", sidebarCollapsed);
  sidebarToggle.setAttribute("aria-expanded", sidebarCollapsed ? "false" : "true");
  sidebarToggle.title = sidebarCollapsed ? "展开侧栏" : "收起侧栏";
  sidebarToggle.setAttribute("aria-label", sidebarToggle.title);
}

function allStyleOptions() {
  const custom = customModels.map((m) => ({ id: m.id, label: m.name, desc: "自定义模型" }));
  return [...BUILTIN_STYLE_OPTIONS, ...custom];
}

function isBuiltinStyle(styleId) {
  return BUILTIN_STYLE_OPTIONS.some((x) => x.id === styleId);
}

function findCustomModel(modelId) {
  return customModels.find((m) => m.id === modelId);
}

function styleLabel(styleId) {
  return allStyleOptions().find((x) => x.id === styleId)?.label || "均衡";
}

function setStatusReady() {
  setStatus(`Ready · ${styleLabel(selectedStyle)}`);
}

function setRightView(mode) {
  const isStyle = mode === "style";
  styleSettings.classList.toggle("hidden", !isStyle);
  messages.classList.toggle("hidden", isStyle);
  welcome.classList.toggle("hidden", isStyle);
  starters.classList.toggle("hidden", isStyle);
  form.classList.toggle("hidden", isStyle);

  mainTitle.textContent = isStyle ? "模型风格" : "FoolChat";
}

function autoResize() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 220)}px`;
}

function safeTitle(text) {
  return text.trim().replace(/\s+/g, " ").slice(0, 20) || "新对话";
}

function shorten(text, max = 20) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

function setBrowseActive(target) {
  for (const btn of [browseNewChat, browseRecent, browseLocate, browseModelStyle]) {
    if (!btn) continue;
    btn.classList.toggle("active", btn === target);
  }
}

function createConversation(title) {
  const id = `c_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
  conversations.unshift({ id, title, messages: [] });
  persistConversations();
  return id;
}

function getActiveConversation() {
  return conversations.find((c) => c.id === activeId);
}

function switchToOrCreateBlankConversation() {
  const blank = conversations.find((c) => c.messages.length === 0);
  if (blank) {
    activeId = blank.id;
    return;
  }
  activeId = createConversation("新对话");
}

function deleteConversation(id) {
  const idx = conversations.findIndex((c) => c.id === id);
  if (idx < 0) return;

  const isActive = conversations[idx].id === activeId;
  conversations.splice(idx, 1);

  if (conversations.length === 0) {
    activeId = createConversation("新对话");
  } else if (isActive) {
    activeId = conversations[Math.max(0, idx - 1)].id;
  }

  persistConversations();
  renderMessages();
  renderBrowsePanel();
  setStatusReady();
}

function deleteCustomModel(modelId) {
  customModels = customModels.filter((m) => m.id !== modelId);

  if (selectedStyle === modelId) {
    selectedStyle = "balanced";
    persistSelectedStyle();
  }

  if (editingCustomModelId === modelId) {
    editingCustomModelId = null;
  }

  persistCustomModels();
  renderBrowsePanel();
  setStatusReady();
}

function openCustomStyleEditor(model) {
  browseMode = "style";
  setBrowseActive(browseModelStyle);
  setRightView("style");

  editingCustomModelId = model?.id || null;
  customStyleNameInput.value = model?.name || "";
  customStyleInput.value = model?.prompt || "";

  styleTip.textContent = model
    ? `正在编辑模型：${model.name}`
    : "请输入模型名称和提示词，保存后将添加到模型风格列表。";
}

function setStarterVisible(show) {
  starters.style.display = show ? "flex" : "none";
  welcome.style.display = show ? "block" : "none";
}

function roleLabel(kind) {
  if (kind === "user") return "YOU";
  if (kind === "bot") return "FOOLCHAT";
  if (kind === "error") return "ERROR";
  return "SYSTEM";
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseInlineMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdown(md) {
  const blockTokens = [];
  let safe = escapeHtml(String(md || "")).replace(/\r\n/g, "\n");

  safe = safe.replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
    const token = `@@BLOCK_${blockTokens.length}@@`;
    const cls = lang ? ` class="language-${lang}"` : "";
    blockTokens.push(`<pre><code${cls}>${code.trimEnd()}</code></pre>`);
    return token;
  });

  const lines = safe.split("\n");
  const out = [];
  let inUl = false;
  let inOl = false;

  function closeLists() {
    if (inUl) out.push("</ul>");
    if (inOl) out.push("</ol>");
    inUl = false;
    inOl = false;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeLists();
      continue;
    }

    if (/^@@BLOCK_\d+@@$/.test(line)) {
      closeLists();
      out.push(line);
      continue;
    }

    const ul = line.match(/^[-*]\s+(.+)$/);
    if (ul) {
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${parseInlineMarkdown(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${parseInlineMarkdown(ol[1])}</li>`);
      continue;
    }

    closeLists();

    if (line.startsWith("### ")) {
      out.push(`<h3>${parseInlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${parseInlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(`<h1>${parseInlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("> ")) {
      out.push(`<blockquote>${parseInlineMarkdown(line.slice(2))}</blockquote>`);
      continue;
    }

    out.push(`<p>${parseInlineMarkdown(line)}</p>`);
  }

  closeLists();

  let html = out.join("\n");
  blockTokens.forEach((block, i) => {
    html = html.replaceAll(`@@BLOCK_${i}@@`, block);
  });
  return html;
}

function highlightCodeBlocks(scopeNode) {
  if (!window.hljs) return;
  const root = scopeNode || document;
  const codeBlocks = root.querySelectorAll(".content pre code");
  codeBlocks.forEach((codeEl) => {
    window.hljs.highlightElement(codeEl);
  });
}

function appendMessageNode(msg, idx) {
  const node = template.content.firstElementChild.cloneNode(true);
  const roleEl = node.querySelector(".message-role");
  const timeEl = node.querySelector(".message-time");
  const contentEl = node.querySelector(".content");

  node.classList.add(msg.kind);
  node.dataset.msgIndex = String(idx);

  roleEl.textContent = roleLabel(msg.kind);
  timeEl.textContent = msg.time;
  if (msg.kind === "user") {
    contentEl.textContent = msg.content;
  } else {
    contentEl.innerHTML = renderMarkdown(msg.content);
    highlightCodeBlocks(node);
  }

  messages.appendChild(node);
  messages.scrollTop = messages.scrollHeight;
}

function updateMessageNode(idx) {
  const convo = getActiveConversation();
  if (!convo) return;
  const msg = convo.messages[idx];
  if (!msg) return;

  const node = messages.querySelector(`.message[data-msg-index="${idx}"]`);
  if (!node) {
    renderMessages();
    return;
  }

  const contentEl = node.querySelector(".content");
  const timeEl = node.querySelector(".message-time");
  if (!contentEl || !timeEl) return;

  timeEl.textContent = msg.time;
  if (msg.kind === "user") {
    contentEl.textContent = msg.content;
  } else {
    contentEl.innerHTML = renderMarkdown(msg.content);
    highlightCodeBlocks(node);
  }
  messages.scrollTop = messages.scrollHeight;
}

function renderMessages() {
  const convo = getActiveConversation();
  messages.innerHTML = "";

  if (!convo || convo.messages.length === 0) {
    setStarterVisible(true);
    return;
  }

  setStarterVisible(false);
  convo.messages.forEach((msg, idx) => appendMessageNode(msg, idx));
}

function persistConversations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages));
  } catch {
    return [];
  }
}

function persistSelectedStyle() {
  localStorage.setItem(STYLE_KEY, selectedStyle);
}

function loadSelectedStyle() {
  const raw = localStorage.getItem(STYLE_KEY);
  if (!raw) return "balanced";
  if (BUILTIN_STYLE_OPTIONS.some((x) => x.id === raw)) return raw;
  if (customModels.some((m) => m.id === raw)) return raw;
  if (raw === "custom" && customModels.length > 0) return customModels[0].id;
  return "balanced";
}

function persistCustomModels() {
  localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(customModels));
}

function loadCustomModels() {
  try {
    const raw = localStorage.getItem(CUSTOM_MODELS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((m) => m && typeof m.id === "string" && typeof m.name === "string" && typeof m.prompt === "string")
          .map((m) => ({ id: m.id, name: m.name.trim() || "未命名模型", prompt: m.prompt.trim() }));
      }
    }

    const legacyPrompt = localStorage.getItem(LEGACY_CUSTOM_STYLE_PROMPT_KEY) || "";
    if (legacyPrompt.trim()) {
      return [
        {
          id: `custom_${Date.now().toString(36)}`,
          name: "我的自定义风格",
          prompt: legacyPrompt.trim()
        }
      ];
    }

    return [];
  } catch {
    return [];
  }
}

function loadSidebarCollapsed() {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
}

function persistSidebarCollapsed() {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
}

function loadTheme() {
  const raw = localStorage.getItem(THEME_KEY);
  return raw === "cute" ? "cute" : "apple";
}

function persistTheme() {
  localStorage.setItem(THEME_KEY, currentTheme);
}

function pushMessage(content, kind) {
  const convo = getActiveConversation();
  if (!convo) return;

  const msg = { content, kind, time: nowTime() };
  convo.messages.push(msg);

  if (convo.messages.length === 1 && kind === "user") {
    convo.title = safeTitle(content);
    browseMode = "locate";
    if (browseLocate) setBrowseActive(browseLocate);
    setRightView("chat");
  }

  persistConversations();
  appendMessageNode(msg, convo.messages.length - 1);
  setStarterVisible(false);
  renderBrowsePanel();
}

function removeTypingNode() {
  if (typingNode) {
    typingNode.remove();
    typingNode = null;
  }
}

function showTyping() {
  removeTypingNode();
  const node = template.content.firstElementChild.cloneNode(true);
  node.classList.add("typing");
  node.querySelector(".message-role").textContent = "FOOLCHAT";
  node.querySelector(".message-time").textContent = nowTime();
  node.querySelector(".content").innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
  typingNode = node;
  messages.appendChild(node);
  messages.scrollTop = messages.scrollHeight;
}

function scrollToMessage(index) {
  const node = messages.querySelector(`.message[data-msg-index="${index}"]`);
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  node.classList.add("located");
  setTimeout(() => node.classList.remove("located"), 1200);
}

function renderBrowsePanel() {
  const convo = getActiveConversation();
  browsePanel.innerHTML = "";

  if (browseMode === "new") {
    const wrap = document.createElement("div");
    wrap.className = "browse-card";
    wrap.innerHTML = `
      <p class="browse-title">新对话</p>
      <p class="browse-desc">创建一个新的会话窗口。</p>
      <button type="button" class="browse-action">+ 开始新对话</button>
    `;
    wrap.querySelector(".browse-action").addEventListener("click", () => {
      switchToOrCreateBlankConversation();
      browseMode = "recent";
      if (browseRecent) setBrowseActive(browseRecent);
      setRightView("chat");
      renderMessages();
      renderBrowsePanel();
      setStatusReady();
      input.focus();
    });
    browsePanel.appendChild(wrap);
    return;
  }

  if (browseMode === "recent") {
    const title = document.createElement("p");
    title.className = "browse-title";
    title.textContent = "最近对话";
    browsePanel.appendChild(title);

    if (conversations.length === 0) {
      const empty = document.createElement("p");
      empty.className = "browse-empty";
      empty.textContent = "暂无对话";
      browsePanel.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "browse-list";

    conversations.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "browse-row";
      if (c.id === activeId) btn.classList.add("active");
      btn.innerHTML = `
        <span class="browse-row-main">
          <span class="browse-row-title">${escapeHtml(shorten(c.title, 22))}</span>
          <span class="browse-row-sub">${c.messages.length} 条</span>
        </span>
        <span class="browse-row-tools">
          <button type="button" class="browse-delete" aria-label="删除对话" title="删除对话">删除</button>
        </span>
      `;
      btn.addEventListener("click", () => {
        activeId = c.id;
        renderMessages();
        renderBrowsePanel();
        setStatusReady();
      });

      const del = btn.querySelector(".browse-delete");
      if (del) {
        del.addEventListener("click", (event) => {
          event.stopPropagation();
          deleteConversation(c.id);
        });
      }
      list.appendChild(btn);
    });

    browsePanel.appendChild(list);
    return;
  }

  if (browseMode === "locate") {
    const title = document.createElement("p");
    title.className = "browse-title";
    title.textContent = "对话定位";
    browsePanel.appendChild(title);

    const userMessages = (convo?.messages || [])
      .map((m, idx) => ({ ...m, idx }))
      .filter((m) => m.kind === "user");

    if (userMessages.length === 0) {
      const empty = document.createElement("p");
      empty.className = "browse-empty";
      empty.textContent = "当前对话里还没有你说过的话";
      browsePanel.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "browse-list";

    userMessages.forEach((m, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "browse-row";
      btn.innerHTML = `
        <span class="browse-row-main">
          <span class="browse-row-title">${i + 1}. ${escapeHtml(shorten(m.content, 18))}</span>
          <span class="browse-row-sub">${m.time}</span>
        </span>
      `;
      btn.addEventListener("click", () => scrollToMessage(m.idx));
      list.appendChild(btn);
    });

    browsePanel.appendChild(list);
    return;
  }

  const title = document.createElement("p");
  title.className = "browse-title";
  title.textContent = "模型风格";
  browsePanel.appendChild(title);

  const desc = document.createElement("p");
  desc.className = "browse-desc";
  desc.textContent = "支持新增、选择、删除自定义模型。";
  browsePanel.appendChild(desc);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "browse-action";
  addBtn.textContent = "+ 新增自定义模型";
  addBtn.addEventListener("click", () => openCustomStyleEditor(null));
  browsePanel.appendChild(addBtn);

  const list = document.createElement("div");
  list.className = "browse-list";

  BUILTIN_STYLE_OPTIONS.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "browse-row";
    if (opt.id === selectedStyle) btn.classList.add("active");
    btn.innerHTML = `
      <span class="browse-row-main">
        <span class="browse-row-title">${opt.label}</span>
        <span class="browse-row-sub">${opt.desc}</span>
      </span>
    `;
    btn.addEventListener("click", () => {
      selectedStyle = opt.id;
      persistSelectedStyle();
      renderBrowsePanel();
      setRightView("chat");
      setStatusReady();
    });
    list.appendChild(btn);
  });

  customModels.forEach((model) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "browse-row";
    if (model.id === selectedStyle) btn.classList.add("active");
    btn.innerHTML = `
      <span class="browse-row-main">
        <span class="browse-row-title">${escapeHtml(model.name)}</span>
        <span class="browse-row-sub">自定义模型</span>
      </span>
      <span class="browse-row-tools">
        <button type="button" class="browse-edit" aria-label="编辑模型" title="编辑模型">编辑</button>
        <button type="button" class="browse-delete" aria-label="删除模型" title="删除模型">删除</button>
      </span>
    `;

    btn.addEventListener("click", () => {
      selectedStyle = model.id;
      persistSelectedStyle();
      renderBrowsePanel();
      setRightView("chat");
      setStatusReady();
    });

    const editBtn = btn.querySelector(".browse-edit");
    editBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openCustomStyleEditor(model);
    });

    const delBtn = btn.querySelector(".browse-delete");
    delBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteCustomModel(model.id);
    });

    list.appendChild(btn);
  });

  browsePanel.appendChild(list);
}

function resolveChatStylePayload() {
  if (isBuiltinStyle(selectedStyle)) {
    return { style: selectedStyle, customStylePrompt: "" };
  }

  const model = findCustomModel(selectedStyle);
  if (!model) {
    selectedStyle = "balanced";
    persistSelectedStyle();
    return { style: "balanced", customStylePrompt: "" };
  }

  return { style: "custom", customStylePrompt: model.prompt };
}

function buildHistoryPayload() {
  const convo = getActiveConversation();
  if (!convo) return [];

  return convo.messages
    .filter((m) => m.kind === "user" || m.kind === "bot")
    .map((m) => ({
      role: m.kind === "user" ? "user" : "model",
      content: m.content
    }))
    .filter((m) => String(m.content || "").trim().length > 0)
    .slice(-20);
}

async function streamMessage(
  history,
  onChunk
) {
  const stylePayload = resolveChatStylePayload();

  const resp = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      history,
      style: stylePayload.style,
      customStylePrompt: stylePayload.customStylePrompt
    })
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  if (!resp.body) {
    throw new Error("stream response has no body");
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

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;

      let event;
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }

      if (event.type === "chunk" && typeof event.text === "string") {
        onChunk(event.text);
      } else if (event.type === "error") {
        throw new Error(event.error || "stream error");
      }
    }
  }
}

async function submitMessage(text) {
  pushMessage(text, "user");
  const convo = getActiveConversation();
  if (!convo) return;

  const history = buildHistoryPayload();
  let botIndex = -1;
  let botStarted = false;
  let pendingText = "";
  let streamDone = false;
  let renderTimer = null;
  let resolveDrain;
  const drainPromise = new Promise((resolve) => {
    resolveDrain = resolve;
  });

  const finishDrainIfReady = () => {
    if (streamDone && pendingText.length === 0 && resolveDrain) {
      const done = resolveDrain;
      resolveDrain = null;
      done();
    }
  };

  const startGradualRender = () => {
    if (renderTimer) return;
    renderTimer = setInterval(() => {
      if (!botStarted) return;

      if (pendingText.length > 0) {
        // 每一帧吐出少量字符，形成平滑渐显效果
        const step = pendingText.slice(0, 2);
        pendingText = pendingText.slice(2);
        convo.messages[botIndex].content += step;
        updateMessageNode(botIndex);
      }

      if (pendingText.length === 0 && streamDone) {
        clearInterval(renderTimer);
        renderTimer = null;
        finishDrainIfReady();
      }
    }, 24);
  };

  sendBtn.disabled = true;
  if (browseNewChat) browseNewChat.disabled = true;
  if (browseModelStyle) browseModelStyle.disabled = true;
  setStatus(`Thinking · ${styleLabel(selectedStyle)}`);
  showTyping();

  try {
    await streamMessage(history, (chunk) => {
      if (!botStarted) {
        removeTypingNode();
        botIndex = convo.messages.length;
        const botMsg = { content: "", kind: "bot", time: nowTime() };
        convo.messages.push(botMsg);
        persistConversations();
        appendMessageNode(botMsg, botIndex);
        botStarted = true;
        startGradualRender();
      }

      pendingText += chunk;
    });
    streamDone = true;
    finishDrainIfReady();
    await drainPromise;
    removeTypingNode();
    persistConversations();
    setStatusReady();
  } catch (error) {
    streamDone = true;
    if (renderTimer) {
      clearInterval(renderTimer);
      renderTimer = null;
    }
    removeTypingNode();
    const msg = error instanceof Error ? error.message : "unknown error";
    if (botStarted && botIndex >= 0) {
      if (pendingText.length > 0) {
        convo.messages[botIndex].content += pendingText;
        pendingText = "";
      }
      convo.messages[botIndex].content += `\n\n[流式中断: ${msg}]`;
      persistConversations();
      updateMessageNode(botIndex);
    } else {
      pushMessage(msg, "error");
    }
    setStatus("Error");
  } finally {
    sendBtn.disabled = false;
    if (browseNewChat) browseNewChat.disabled = false;
    if (browseModelStyle) browseModelStyle.disabled = false;
    input.focus();
  }
}

input.addEventListener("input", autoResize);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  autoResize();
  await submitMessage(text);
});

saveStyleBtn.addEventListener("click", () => {
  const name = customStyleNameInput.value.trim();
  const prompt = customStyleInput.value.trim();

  if (!name) {
    styleTip.textContent = "请先填写模型名称。";
    return;
  }

  if (!prompt) {
    styleTip.textContent = "请先填写风格提示词。";
    return;
  }

  let modelId = editingCustomModelId;
  if (modelId) {
    customModels = customModels.map((m) => (m.id === modelId ? { ...m, name, prompt } : m));
  } else {
    modelId = `custom_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
    customModels.unshift({ id: modelId, name, prompt });
  }

  persistCustomModels();
  selectedStyle = modelId;
  persistSelectedStyle();

  editingCustomModelId = null;
  setRightView("chat");
  renderBrowsePanel();
  setStatusReady();
  styleTip.textContent = `已保存模型：${name}`;
});

exitStyleBtn.addEventListener("click", () => {
  editingCustomModelId = null;
  setRightView("chat");
  setStatusReady();
  input.focus();
});

if (browseNewChat) {
  browseNewChat.addEventListener("click", () => {
    browseMode = "new";
    setBrowseActive(browseNewChat);
    setRightView("chat");
    switchToOrCreateBlankConversation();
    renderMessages();
    renderBrowsePanel();
    setStatusReady();
    input.focus();
  });
}

if (browseRecent) {
  browseRecent.addEventListener("click", () => {
    browseMode = "recent";
    setBrowseActive(browseRecent);
    setRightView("chat");
    renderBrowsePanel();
    setStatusReady();
  });
}

if (browseLocate) {
  browseLocate.addEventListener("click", () => {
    browseMode = "locate";
    setBrowseActive(browseLocate);
    setRightView("chat");
    renderBrowsePanel();
    setStatusReady();
  });
}

if (browseModelStyle) {
  browseModelStyle.addEventListener("click", () => {
    browseMode = "style";
    setBrowseActive(browseModelStyle);
    setRightView("chat");
    renderBrowsePanel();
    setStatusReady();
  });
}

sidebarToggle.addEventListener("click", () => {
  sidebarCollapsed = !sidebarCollapsed;
  applySidebarState();
  persistSidebarCollapsed();
});

themeToggle.addEventListener("click", () => {
  currentTheme = currentTheme === "cute" ? "apple" : "cute";
  applyTheme();
  persistTheme();
});

for (const chip of document.querySelectorAll(".starter-chip")) {
  chip.addEventListener("click", async () => {
    const text = chip.getAttribute("data-prompt") || "";
    if (!text) return;
    await submitMessage(text);
  });
}

if (conversations.length === 0) {
  activeId = createConversation("新对话");
}

renderMessages();
renderBrowsePanel();
applySidebarState();
applyTheme();
setRightView("chat");
setStatusReady();
autoResize();
input.focus();
