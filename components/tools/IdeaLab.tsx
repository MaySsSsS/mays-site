"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import styles from "@/styles/tools/idea-lab.module.css";

const STORAGE_KEY = "mays-idea-lab-v1";

type GoalType = "ship" | "explore" | "decide" | "automate";
type Horizon = "today" | "week" | "month";
type RiskLevel = "low" | "balanced" | "bold";
type FocusFlag = "design" | "data" | "automation" | "publish";
type CopyState = "idle" | "success" | "error";

type IdeaForm = {
  idea: string;
  successSignal: string;
  constraints: string;
  audience: string;
  goalType: GoalType;
  horizon: Horizon;
  riskLevel: RiskLevel;
  effort: number;
  focusFlags: FocusFlag[];
};

type Brief = {
  title: string;
  oneLiner: string;
  scope: string[];
  milestones: string[];
  tasks: string[];
  risks: string[];
  validation: string[];
  codexPrompt: string;
  markdown: string;
};

const defaultForm: IdeaForm = {
  idea: "我想做一个能把零散产品想法整理成执行计划的小工具，适合放在个人网站的 tools 里。",
  successSignal: "打开页面 5 分钟内能得到一份可以直接开工的项目简报。",
  constraints: "不依赖外部 API，不保存到服务器，公开访问也不能泄露隐私。",
  audience: "个人项目维护者",
  goalType: "ship",
  horizon: "week",
  riskLevel: "balanced",
  effort: 3,
  focusFlags: ["design", "publish"]
};

const goalOptions: Array<{
  value: GoalType;
  label: string;
  summary: string;
  intent: string;
}> = [
  {
    value: "ship",
    label: "上线一个功能",
    summary: "优先拆出可交付范围和验收标准。",
    intent: "把想法推进到可发布的最小版本"
  },
  {
    value: "explore",
    label: "探索一个方向",
    summary: "优先形成问题地图、假设和下一步实验。",
    intent: "把模糊方向变成可验证的问题清单"
  },
  {
    value: "decide",
    label: "做一个决策",
    summary: "优先比较方案、权衡风险和确定取舍。",
    intent: "把多个选择压缩成一个明确判断"
  },
  {
    value: "automate",
    label: "自动化一件事",
    summary: "优先定义触发条件、数据流和失败兜底。",
    intent: "把重复流程改造成稳定的自动任务"
  }
];

const horizonOptions: Array<{
  value: Horizon;
  label: string;
  summary: string;
}> = [
  {
    value: "today",
    label: "今天",
    summary: "压缩成单次冲刺，先证明能跑。"
  },
  {
    value: "week",
    label: "一周",
    summary: "留出设计、实现、验证和修正空间。"
  },
  {
    value: "month",
    label: "一个月",
    summary: "适合分阶段打磨，并保留复盘节奏。"
  }
];

const riskOptions: Array<{
  value: RiskLevel;
  label: string;
  summary: string;
}> = [
  {
    value: "low",
    label: "保守",
    summary: "少改动、先稳定、避免牵动核心链路。"
  },
  {
    value: "balanced",
    label: "均衡",
    summary: "在可控风险内追求完整体验。"
  },
  {
    value: "bold",
    label: "激进",
    summary: "允许更大改造，但必须有回滚边界。"
  }
];

const focusOptions: Array<{
  value: FocusFlag;
  label: string;
  summary: string;
}> = [
  {
    value: "design",
    label: "界面体验",
    summary: "需要处理布局、交互状态和视觉完成度。"
  },
  {
    value: "data",
    label: "数据结构",
    summary: "需要定义字段、来源、缓存或迁移方式。"
  },
  {
    value: "automation",
    label: "自动流程",
    summary: "需要定时任务、触发器、失败兜底或告警。"
  },
  {
    value: "publish",
    label: "公开发布",
    summary: "需要考虑访问路径、构建、部署和隐私面。"
  }
];

function sanitizeForm(value: unknown): IdeaForm | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const partial = value as Partial<IdeaForm>;
  const savedGoalType = partial.goalType;
  const savedHorizon = partial.horizon;
  const savedRiskLevel = partial.riskLevel;
  const goalType: GoalType =
    savedGoalType && goalOptions.some((option) => option.value === savedGoalType)
      ? savedGoalType
      : defaultForm.goalType;
  const horizon: Horizon =
    savedHorizon && horizonOptions.some((option) => option.value === savedHorizon)
      ? savedHorizon
      : defaultForm.horizon;
  const riskLevel: RiskLevel =
    savedRiskLevel && riskOptions.some((option) => option.value === savedRiskLevel)
      ? savedRiskLevel
      : defaultForm.riskLevel;
  const focusFlags = Array.isArray(partial.focusFlags)
    ? partial.focusFlags.filter((flag): flag is FocusFlag =>
        focusOptions.some((option) => option.value === flag)
      )
    : defaultForm.focusFlags;

  return {
    idea: typeof partial.idea === "string" ? partial.idea : defaultForm.idea,
    successSignal:
      typeof partial.successSignal === "string" ? partial.successSignal : defaultForm.successSignal,
    constraints: typeof partial.constraints === "string" ? partial.constraints : defaultForm.constraints,
    audience: typeof partial.audience === "string" ? partial.audience : defaultForm.audience,
    goalType,
    horizon,
    riskLevel,
    effort:
      typeof partial.effort === "number" && Number.isFinite(partial.effort)
        ? Math.min(5, Math.max(1, Math.round(partial.effort)))
        : defaultForm.effort,
    focusFlags
  };
}

function getTitle(idea: string) {
  const firstLine = idea
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "未命名想法";
  }

  return firstLine.length > 24 ? `${firstLine.slice(0, 24)}...` : firstLine;
}

function listFromText(value: string) {
  return value
    .split(/\n|；|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getGoalCopy(goalType: GoalType) {
  return goalOptions.find((option) => option.value === goalType) ?? goalOptions[0];
}

function getHorizonCopy(horizon: Horizon) {
  return horizonOptions.find((option) => option.value === horizon) ?? horizonOptions[1];
}

function getRiskCopy(riskLevel: RiskLevel) {
  return riskOptions.find((option) => option.value === riskLevel) ?? riskOptions[1];
}

function buildMilestones(form: IdeaForm) {
  const focusText = form.focusFlags.length
    ? focusOptions
        .filter((option) => form.focusFlags.includes(option.value))
        .map((option) => option.label)
        .join("、")
    : "核心体验";

  if (form.horizon === "today") {
    return [
      "锁定一个最小可验证场景，写清楚不做什么。",
      `完成 ${focusText} 的可运行草稿，并用真实输入走一遍。`,
      "修掉首轮明显问题，留下下一轮改进清单。"
    ];
  }

  if (form.horizon === "month") {
    return [
      "第 1 周：冻结目标、字段、页面路径和验收方法。",
      `第 2 周：完成 ${focusText} 的第一版闭环。`,
      "第 3 周：补齐失败态、空态、移动端和数据边界。",
      "第 4 周：复盘使用证据，决定迭代、保留或下线。"
    ];
  }

  return [
    "第 1 天：写清目标、用户场景、成功标准和范围边界。",
    `第 2-4 天：完成 ${focusText} 的端到端可用版本。`,
    "第 5 天：补齐错误态、回归测试和文案。",
    "第 6-7 天：真实使用一次，按证据做最后收敛。"
  ];
}

function buildTasks(form: IdeaForm) {
  const tasks = [
    "把原始想法改写成一句可验证的目标。",
    "列出输入、输出、状态、失败态和不做范围。",
    "实现最小闭环后，用真实样例验收，而不是只看静态页面。"
  ];

  if (form.focusFlags.includes("design")) {
    tasks.push("补齐桌面和移动端布局，检查文字不溢出、按钮有反馈、空态能读懂。");
  }

  if (form.focusFlags.includes("data")) {
    tasks.push("定义数据字段、默认值、迁移或本地持久化策略，避免后续无法追踪。");
  }

  if (form.focusFlags.includes("automation")) {
    tasks.push("明确触发时间、重试策略、失败文案和人工接管方式。");
  }

  if (form.focusFlags.includes("publish")) {
    tasks.push("上线前检查访问路径、构建输出、公开页面是否泄露敏感信息。");
  }

  if (form.effort >= 4) {
    tasks.push("把容易变复杂的部分拆成第二阶段，第一版只保留核心路径。");
  }

  return tasks;
}

function buildRisks(form: IdeaForm) {
  const risks = [
    "目标过宽会导致第一版无法验收，需要明确最小成功标准。",
    "如果输入样例太理想化，真实使用时可能暴露状态和边界缺口。"
  ];

  if (form.riskLevel === "low") {
    risks.push("保守模式下要警惕只做安全改动却没有实际价值，至少保留一个能改变工作流的核心动作。");
  }

  if (form.riskLevel === "bold") {
    risks.push("激进模式必须预先写清回滚点，避免大范围改造影响现有页面。");
  }

  if (form.focusFlags.includes("data")) {
    risks.push("数据字段一旦公开展示，需要区分可见摘要和内部细节。");
  }

  if (form.focusFlags.includes("automation")) {
    risks.push("自动化失败不能静默吞掉，需要把失败原因转成用户可理解的状态。");
  }

  if (form.constraints.trim()) {
    risks.push(...listFromText(form.constraints).map((item) => `约束：${item}`));
  }

  return risks.slice(0, 7);
}

function buildValidation(form: IdeaForm) {
  const validation = [
    "页面或工具能从空状态走到完整结果，不需要读说明才能使用。",
    "核心输入变化后，输出内容同步更新且不会丢失用户草稿。",
    "桌面和移动端的文字、按钮、列表都不重叠。"
  ];

  if (form.focusFlags.includes("publish")) {
    validation.push("生产构建通过，并确认公开页面不包含密钥或私有字段。");
  }

  if (form.focusFlags.includes("automation")) {
    validation.push("模拟一次失败路径，确认页面或日志能给出明确原因。");
  }

  if (form.successSignal.trim()) {
    validation.push(`用户验收信号：${form.successSignal.trim()}`);
  }

  return validation;
}

function toMarkdownList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function generateBrief(form: IdeaForm): Brief {
  const title = getTitle(form.idea);
  const goalCopy = getGoalCopy(form.goalType);
  const horizonCopy = getHorizonCopy(form.horizon);
  const riskCopy = getRiskCopy(form.riskLevel);
  const scope = [
    `目标类型：${goalCopy.label}，核心意图是${goalCopy.intent}。`,
    `时间尺度：${horizonCopy.label}，${horizonCopy.summary}`,
    `风险偏好：${riskCopy.label}，${riskCopy.summary}`,
    `面向对象：${form.audience.trim() || "尚未指定"}。`
  ];
  const milestones = buildMilestones(form);
  const tasks = buildTasks(form);
  const risks = buildRisks(form);
  const validation = buildValidation(form);
  const rawIdea = form.idea.trim() || "尚未填写。";
  const constraints = form.constraints.trim() || "无额外约束。";
  const successSignal = form.successSignal.trim() || "完成一次真实使用并能解释结果。";
  const oneLiner = `${goalCopy.intent}：${title}`;
  const codexPrompt = [
    "请在当前项目中推进以下任务，直到实现、验证和总结完成。",
    "",
    `目标：${oneLiner}`,
    `背景想法：${rawIdea}`,
    `目标用户：${form.audience.trim() || "未指定"}`,
    `时间尺度：${horizonCopy.label}`,
    `风险偏好：${riskCopy.label}`,
    `成功信号：${successSignal}`,
    `限制条件：${constraints}`,
    "",
    "请按以下顺序执行：",
    ...tasks.map((task, index) => `${index + 1}. ${task}`),
    "",
    "验收清单：",
    ...validation.map((item, index) => `${index + 1}. ${item}`),
    "",
    "完成后请说明：改了哪些文件、如何验证、还剩什么风险。"
  ].join("\n");
  const markdown = [
    `# ${title}`,
    "",
    `## 一句话目标`,
    "",
    oneLiner,
    "",
    "## 范围边界",
    "",
    toMarkdownList(scope),
    "",
    "## 里程碑",
    "",
    toMarkdownList(milestones),
    "",
    "## 行动拆解",
    "",
    toMarkdownList(tasks),
    "",
    "## 风险与假设",
    "",
    toMarkdownList(risks),
    "",
    "## 验收清单",
    "",
    toMarkdownList(validation),
    "",
    "## Codex Prompt",
    "",
    "```text",
    codexPrompt,
    "```"
  ].join("\n");

  return {
    title,
    oneLiner,
    scope,
    milestones,
    tasks,
    risks,
    validation,
    codexPrompt,
    markdown
  };
}

function downloadMarkdown(title: string, markdown: string) {
  const safeTitle = title.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 36) || "idea-lab";
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${safeTitle}.md`;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function IdeaLab() {
  const [form, setForm] = useState<IdeaForm>(defaultForm);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const brief = useMemo(() => generateBrief(form), [form]);

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(STORAGE_KEY);

    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft) as unknown;
        const nextForm = sanitizeForm(parsed);

        if (nextForm) {
          setForm(nextForm);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setHasLoadedDraft(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form, hasLoadedDraft]);

  function updateForm<T extends keyof IdeaForm>(key: T, value: IdeaForm[T]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
    setCopyState("idle");
  }

  function toggleFocus(flag: FocusFlag) {
    setForm((current) => {
      const exists = current.focusFlags.includes(flag);
      return {
        ...current,
        focusFlags: exists
          ? current.focusFlags.filter((item) => item !== flag)
          : [...current.focusFlags, flag]
      };
    });
    setCopyState("idle");
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(brief.codexPrompt);
      setCopyState("success");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
    }
  }

  function resetDraft() {
    setForm(defaultForm);
    setCopyState("idle");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <section className={styles.shell}>
        <div className={styles.topline}>
          <Link href="/tools" className={styles.backLink}>
            Back to Signal Lab
          </Link>
          <Link href="/" className={styles.backLinkSecondary}>
            Universe
          </Link>
        </div>

        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Idea Lab</p>
            <h1 className={styles.title}>把一个想法压成可执行简报。</h1>
            <p className={styles.description}>
              输入原始念头，调整目标、周期、风险和关注点，右侧会即时生成项目简报、
              行动拆解、风险假设、验收清单，以及可以直接交给 Codex 的任务提示词。
            </p>
          </div>
          <div className={styles.statusRail} aria-label="Idea Lab 状态">
            <span>Local Draft</span>
            <strong>{form.effort}/5</strong>
            <span>{getHorizonCopy(form.horizon).label}</span>
          </div>
        </div>

        <div className={styles.workspace}>
          <section className={styles.inputPanel} aria-labelledby="idea-input-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Input</p>
                <h2 id="idea-input-title" className={styles.panelTitle}>
                  原始材料
                </h2>
              </div>
              <button type="button" className={styles.ghostButton} onClick={resetDraft}>
                Reset
              </button>
            </div>

            <label className={styles.field} htmlFor="idea-lab-idea">
              <span className={styles.fieldLabel}>想法</span>
              <textarea
                id="idea-lab-idea"
                aria-label="想法"
                className={styles.textarea}
                value={form.idea}
                onChange={(event) => updateForm("idea", event.target.value)}
                rows={7}
                placeholder="写下你想做什么、为什么想做、现在卡在哪里。"
              />
            </label>

            <div className={styles.fieldGrid}>
              <label className={styles.field} htmlFor="idea-lab-audience">
                <span className={styles.fieldLabel}>目标用户</span>
                <input
                  id="idea-lab-audience"
                  aria-label="目标用户"
                  className={styles.input}
                  value={form.audience}
                  onChange={(event) => updateForm("audience", event.target.value)}
                  placeholder="例如：我自己、访客、自动化任务维护者"
                />
              </label>

              <label className={styles.field} htmlFor="idea-lab-effort">
                <span className={styles.fieldLabel}>投入强度</span>
                <div className={styles.rangeRow}>
                  <input
                    id="idea-lab-effort"
                    aria-label="投入强度"
                    className={styles.range}
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={form.effort}
                    onChange={(event) => updateForm("effort", Number(event.target.value))}
                  />
                  <span className={styles.rangeValue}>{form.effort}</span>
                </div>
              </label>
            </div>

            <label className={styles.field} htmlFor="idea-lab-success-signal">
              <span className={styles.fieldLabel}>成功信号</span>
              <input
                id="idea-lab-success-signal"
                aria-label="成功信号"
                className={styles.input}
                value={form.successSignal}
                onChange={(event) => updateForm("successSignal", event.target.value)}
                placeholder="例如：能在真实场景完成一次完整流程"
              />
            </label>

            <label className={styles.field} htmlFor="idea-lab-constraints">
              <span className={styles.fieldLabel}>限制条件</span>
              <textarea
                id="idea-lab-constraints"
                aria-label="限制条件"
                className={styles.textareaCompact}
                value={form.constraints}
                onChange={(event) => updateForm("constraints", event.target.value)}
                rows={4}
                placeholder="写下时间、技术、隐私、发布或数据限制。"
              />
            </label>
          </section>

          <section className={styles.controlPanel} aria-labelledby="idea-controls-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Controls</p>
                <h2 id="idea-controls-title" className={styles.panelTitle}>
                  决策拨盘
                </h2>
              </div>
            </div>

            <div className={styles.optionGroup}>
              <p className={styles.optionLabel}>目标类型</p>
              <div className={styles.segmentGrid}>
                {goalOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.segmentButton} ${
                      form.goalType === option.value ? styles.segmentButtonActive : ""
                    }`}
                    aria-pressed={form.goalType === option.value}
                    onClick={() => updateForm("goalType", option.value)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.summary}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.optionGroup}>
              <p className={styles.optionLabel}>时间尺度</p>
              <div className={styles.inlineSegments}>
                {horizonOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.inlineButton} ${
                      form.horizon === option.value ? styles.inlineButtonActive : ""
                    }`}
                    aria-pressed={form.horizon === option.value}
                    onClick={() => updateForm("horizon", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.optionGroup}>
              <p className={styles.optionLabel}>风险偏好</p>
              <div className={styles.inlineSegments}>
                {riskOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.inlineButton} ${
                      form.riskLevel === option.value ? styles.inlineButtonActive : ""
                    }`}
                    aria-pressed={form.riskLevel === option.value}
                    onClick={() => updateForm("riskLevel", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className={styles.optionHint}>{getRiskCopy(form.riskLevel).summary}</p>
            </div>

            <div className={styles.optionGroup}>
              <p className={styles.optionLabel}>关注点</p>
              <div className={styles.checkGrid}>
                {focusOptions.map((option) => (
                  <label key={option.value} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={form.focusFlags.includes(option.value)}
                      onChange={() => toggleFocus(option.value)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.summary}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.outputPanel} aria-labelledby="idea-output-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Brief</p>
                <h2 id="idea-output-title" className={styles.panelTitle}>
                  {brief.title}
                </h2>
              </div>
              <div className={styles.actionCluster}>
                <button type="button" className={styles.primaryButton} onClick={copyPrompt}>
                  Copy Prompt
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => downloadMarkdown(brief.title, brief.markdown)}
                >
                  Download MD
                </button>
              </div>
            </div>

            <p className={styles.oneLiner}>{brief.oneLiner}</p>
            <p className={styles.copyState} aria-live="polite">
              {copyState === "success"
                ? "提示词已复制。"
                : copyState === "error"
                  ? "复制失败，可以手动选中下方文本。"
                  : "草稿保存在本机浏览器。"}
            </p>

            <div className={styles.briefGrid}>
              <BriefBlock title="范围边界" items={brief.scope} />
              <BriefBlock title="里程碑" items={brief.milestones} />
              <BriefBlock title="行动拆解" items={brief.tasks} />
              <BriefBlock title="风险与假设" items={brief.risks} />
              <BriefBlock title="验收清单" items={brief.validation} />
            </div>

            <div className={styles.promptBlock}>
              <div className={styles.promptHeader}>
                <p className={styles.optionLabel}>Codex Prompt</p>
                <span>{brief.codexPrompt.length} chars</span>
              </div>
              <pre className={styles.promptText}>{brief.codexPrompt}</pre>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function BriefBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className={styles.briefBlock}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
