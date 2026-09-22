import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

// Reworded prompt — placed at the very top of the system prompt when juicer is active.
// Must remain decisive and end-to-end, without asking questions.
const JUICER_PROMPT = `You are in JUICER mode — autonomous end-to-end execution.

Rules:
- Complete the user's goal fully end-to-end without asking follow-up questions or waiting for approval.
- Do not stop early or pause for confirmation — keep working until the request is entirely finished.
- When you encounter ambiguity, trade-offs, or multiple viable options, autonomously choose the most optimal, realistic, and logical path and proceed.
- Prefer decisive action over clarification. Make reasonable assumptions, document them briefly if needed, and continue.
- Stay comprehensive: cover implementation, tests, and follow-through implied by the goal.`;

const TARGET_PROVIDER = "openai-codex";
const TARGET_MODEL = "gpt-6-sol";
const TARGET_THINKING: ThinkingLevel = "high";
// 1.05M is the real OpenAI long-context limit; using 1050000 satisfies the "1M" request and matches docs.
const TARGET_CONTEXT = 1050000;

const SUBAGENT_TOOL = "subagent";

export default function juicerExtension(pi: ExtensionAPI) {
  let juicerActive = false;
  let previousModelId: { provider: string; id: string } | undefined;
  let previousThinking: ThinkingLevel | undefined;
  let previousTools: string[] | undefined;
  let patchedProvider = false;

  function updateStatus(ctx: ExtensionContext) {
    if (juicerActive) {
      ctx.ui.setStatus(
        "juicer",
        ctx.ui.theme.fg("accent", `juicer:${TARGET_MODEL}/high • 1M • no-subagents`),
      );
    } else {
      ctx.ui.setStatus("juicer", undefined);
    }
  }

  function ensureSubagentEnabled(ctx: ExtensionContext) {
    try {
      const all = pi.getAllTools().map((t) => t.name);
      if (!all.includes(SUBAGENT_TOOL)) return;
      const active = pi.getActiveTools();
      if (!active.includes(SUBAGENT_TOOL)) {
        pi.setActiveTools([...active, SUBAGENT_TOOL]);
      }
    } catch {}
  }

  function disableSubagent() {
    try {
      const all = pi.getAllTools().map((t) => t.name);
      if (!all.includes(SUBAGENT_TOOL)) return false;
      const active = pi.getActiveTools();
      if (active.includes(SUBAGENT_TOOL)) {
        pi.setActiveTools(active.filter((n) => n !== SUBAGENT_TOOL));
        return true;
      }
    } catch {}
    return false;
  }

  function patchContextTo1M(ctx: ExtensionContext) {
    try {
      const all = ctx.modelRegistry.getAll().filter((m: any) => m.provider === TARGET_PROVIDER);
      if (all.length === 0) return;

      const patched: any[] = all.map((m: any) => ({
        id: m.id,
        name: m.name ?? m.id,
        api: m.api,
        baseUrl: m.baseUrl,
        reasoning: m.reasoning ?? false,
        thinkingLevelMap: m.thinkingLevelMap,
        input: m.input ?? ["text"],
        cost: m.cost ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: m.id === TARGET_MODEL ? TARGET_CONTEXT : m.contextWindow,
        maxTokens: m.maxTokens ?? 16384,
        headers: m.headers,
        compat: m.compat,
        samplingParams: (m as any).samplingParams,
      }));

      // This replaces the extension-layer models for openai-codex.
      // The built-in catalog remains the base; unregistering restores 272K.
      (pi as any).registerProvider(TARGET_PROVIDER, { models: patched });
      patchedProvider = true;

      // Also mutate the live instance for immediate footer/context-usage reflection
      // in case the registry caches the previous object.
      try {
        const live = ctx.modelRegistry.find(TARGET_PROVIDER, TARGET_MODEL) as any;
        if (live) live.contextWindow = TARGET_CONTEXT;
      } catch {}
    } catch (e) {
      // Fallback: at least mutate live model
      try {
        const live = ctx.modelRegistry.find(TARGET_PROVIDER, TARGET_MODEL) as any;
        if (live) {
          live.contextWindow = TARGET_CONTEXT;
          patchedProvider = false;
        }
      } catch {}
    }
  }

  function restoreContext() {
    if (!patchedProvider) return;
    try {
      (pi as any).unregisterProvider(TARGET_PROVIDER);
    } catch {}
    patchedProvider = false;
  }

  async function activate(ctx: ExtensionContext) {
    if (juicerActive) {
      ctx.ui.notify("Juicer already active — gpt-6-sol/high, 1M, subagents off", "info");
      return;
    }

    // Snapshot state for restore
    previousModelId = ctx.model ? { provider: ctx.model.provider, id: ctx.model.id } : undefined;
    try {
      previousThinking = pi.getThinkingLevel() as ThinkingLevel;
    } catch {
      previousThinking = undefined;
    }
    try {
      previousTools = [...pi.getActiveTools()];
    } catch {
      previousTools = undefined;
    }

    // 1) Extend context to 1M before model switch so the new model instance carries it
    patchContextTo1M(ctx);

    // 2) Switch model to openai-codex/gpt-6-sol
    const target = ctx.modelRegistry.find(TARGET_PROVIDER, TARGET_MODEL) as any;
    if (!target) {
      ctx.ui.notify(`Juicer: model ${TARGET_PROVIDER}/${TARGET_MODEL} not found`, "error");
    } else {
      const ok = await pi.setModel(target);
      if (!ok) {
        ctx.ui.notify(`Juicer: no API key for ${TARGET_PROVIDER}/${TARGET_MODEL} — model not switched`, "warning");
      }
      // Ensure contextWindow is 1M even if setModel fetched a stale instance
      try {
        if ((target as any).contextWindow !== TARGET_CONTEXT) (target as any).contextWindow = TARGET_CONTEXT;
        if ((ctx.model as any)?.id === TARGET_MODEL) (ctx.model as any).contextWindow = TARGET_CONTEXT;
      } catch {}
    }

    // 3) High thinking
    try {
      pi.setThinkingLevel(TARGET_THINKING);
    } catch {}

    // 4) Disable subagents
    const disabled = disableSubagent();

    juicerActive = true;
    try {
      pi.appendEntry("juicer-state", { active: true, ts: Date.now() });
    } catch {}

    updateStatus(ctx);
    ctx.ui.notify(
      `Juicer ON — ${TARGET_PROVIDER}/${TARGET_MODEL} @ high • 1M context • subagents ${disabled ? "disabled" : "off/not-found"} • autonomous end-to-end`,
      "info",
    );
  }

  async function deactivate(ctx: ExtensionContext) {
    if (!juicerActive) {
      ctx.ui.notify("Juicer is not active", "info");
      // Still ensure normal-mode invariant: subagent enabled
      ensureSubagentEnabled(ctx);
      return;
    }

    restoreContext();

    // Restore model if we have a previous one and it's not the juicer target itself
    if (previousModelId) {
      try {
        const prev = ctx.modelRegistry.find(previousModelId.provider, previousModelId.id) as any;
        if (prev) {
          await pi.setModel(prev);
        }
      } catch {}
    }

    if (previousThinking) {
      try {
        pi.setThinkingLevel(previousThinking);
      } catch {}
    }

    if (previousTools) {
      try {
        // Ensure subagent is present in restored set for normal mode
        const all = pi.getAllTools().map((t) => t.name);
        const toRestore = [...previousTools];
        if (all.includes(SUBAGENT_TOOL) && !toRestore.includes(SUBAGENT_TOOL)) {
          toRestore.push(SUBAGENT_TOOL);
        }
        pi.setActiveTools(toRestore);
      } catch {}
    } else {
      ensureSubagentEnabled(ctx);
    }

    juicerActive = false;
    try {
      pi.appendEntry("juicer-state", { active: false, ts: Date.now() });
    } catch {}

    // Enforce normal-mode invariant
    ensureSubagentEnabled(ctx);
    updateStatus(ctx);
    ctx.ui.notify("Juicer OFF — restored model/thinking/tools • subagents enabled", "info");
  }

  pi.registerCommand("juicer", {
    description: "Toggle Juicer autonomous mode (gpt-6-sol/high, 1M context, subagents off)",
    handler: async (args, ctx) => {
      const arg = args.trim().toLowerCase();
      if (arg === "on" || arg === "enable" || arg === "start") {
        await activate(ctx);
        return;
      }
      if (arg === "off" || arg === "disable" || arg === "stop") {
        await deactivate(ctx);
        return;
      }
      if (arg === "status") {
        ctx.ui.notify(
          juicerActive
            ? `Juicer ON — ${TARGET_PROVIDER}/${TARGET_MODEL} @ high • 1M • subagents off`
            : "Juicer OFF — normal mode, subagents enabled",
          "info",
        );
        return;
      }
      // Toggle if no arg
      if (juicerActive) await deactivate(ctx);
      else await activate(ctx);
    },
  });

  // Inject prompt at the very top of the system prompt when active.
  // Chain: prepend juicer prompt before Pi's assembled prompt (which already includes other extensions).
  pi.on("before_agent_start", async (event) => {
    if (!juicerActive) return;
    return {
      systemPrompt: `${JUICER_PROMPT}\n\n${event.systemPrompt}`,
    };
  });

  // Keep subagent disabled while juicer is active — block any activation via tools
  pi.on("tool_call", async (event) => {
    if (!juicerActive) return;
    if (event.toolName === SUBAGENT_TOOL) {
      return {
        block: true,
        reason: "Subagent tool is disabled in Juicer mode (autonomous end-to-end, no delegation). Use /juicer off to re-enable.",
      };
    }
  });

  // Session lifecycle
  pi.on("session_start", async (_event, ctx) => {
    // Restore juicer state from persisted custom entry if any
    try {
      const entries = ctx.sessionManager.getEntries() as any[];
      const last = [...entries]
        .reverse()
        .find((e) => e.type === "custom" && (e as any).customType === "juicer-state");
      if (last && (last as any).data?.active) {
        // Re-apply juicer without snapshotting again (already active)
        // Patch context and re-assert model/thinking/subagent state
        juicerActive = true;
        patchContextTo1M(ctx);
        const target = ctx.modelRegistry.find(TARGET_PROVIDER, TARGET_MODEL) as any;
        if (target && ctx.model?.id !== TARGET_MODEL) {
          // Don't force switch on restore if user changed model manually; just ensure context patched
          // But ensure thinking is high if they stayed on juicer model
          if (ctx.model?.id === TARGET_MODEL) {
            try {
              pi.setThinkingLevel(TARGET_THINKING);
            } catch {}
          }
        }
        disableSubagent();
        updateStatus(ctx);
      } else {
        juicerActive = false;
        // Normal mode invariant: subagent should be enabled
        ensureSubagentEnabled(ctx);
        updateStatus(ctx);
      }
    } catch {
      updateStatus(ctx);
      if (!juicerActive) ensureSubagentEnabled(ctx);
    }
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    ctx.ui.setStatus("juicer", undefined);
  });
}
