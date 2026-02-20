export type ModelStyle = "custom" | "balanced" | "concise" | "creative" | "professional" | "teacher";

export type ChatHistoryTurn = {
  role: "user" | "model";
  content: string;
};

const styleGuides: Record<ModelStyle, string[]> = {
  custom: ["风格：自定义。请严格遵循用户给定的风格提示词。"],
  balanced: ["风格：均衡。保证可用性与可读性，先结论后补充。"],
  concise: ["风格：简洁。只给最关键答案，避免冗长解释。", "优先使用短句和短列表。"],
  creative: ["风格：创意。表达更有想象力和文采，但保持信息准确。", "可给出多个有趣版本供用户选择。"],
  professional: ["风格：专业。术语准确、结构清晰、假设明确。", "必要时给出步骤、边界条件和风险提示。"],
  teacher: ["风格：讲解。循序渐进，先直观解释再给示例。", "尽量让初学者也能理解。"]
};

function buildInstruction(style: ModelStyle = "balanced", customStylePrompt?: string): string[] {
  const guide = styleGuides[style] || styleGuides.balanced;
  const customGuide =
    style === "custom" && customStylePrompt?.trim()
      ? ["自定义风格提示词（高优先级，必须遵守）：", customStylePrompt.trim()]
      : [];

  return [
    "你是一个中文助手。",
    "请直接给出完整可用的回答，不要只回复一句澄清问题。",
    "如果用户信息不足，请基于最常见场景先给出一个可直接使用的版本，再补充可选优化。",
    "尽量结构化输出，优先使用短段落或列表。",
    ...guide,
    ...customGuide
  ];
}

export function buildPromptForUser(text: string, style: ModelStyle = "balanced", customStylePrompt?: string): string {
  return [...buildInstruction(style, customStylePrompt), "", `用户问题：${text.trim()}`].join("\n");
}

export function buildPromptForConversation(
  history: ChatHistoryTurn[],
  style: ModelStyle = "balanced",
  customStylePrompt?: string
): string {
  const usable = history
    .map((x) => ({ role: x.role, content: String(x.content || "").trim() }))
    .filter((x) => x.content.length > 0)
    .slice(-20);

  const transcript = usable
    .map((x) => `${x.role === "user" ? "用户" : "助手"}: ${x.content}`)
    .join("\n");

  return [
    ...buildInstruction(style, customStylePrompt),
    "",
    "下面是到目前为止的对话记录，请结合上下文继续回答：",
    transcript || "用户: "
  ].join("\n");
}
