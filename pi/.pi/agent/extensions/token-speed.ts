import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "token-speed";
const WINDOW_MS = 1000;
const TOKEN_REGEX = /\w+|[^\s\w]/g;

type Sample = {
	at: number;
	tokens: number;
};

// A small, dependency-free estimate is enough for a live display. The final
// message usage (when the provider reports it) replaces this estimate.
function estimateTokens(delta: string): number {
	if (!delta) return 0;
	return delta.match(TOKEN_REGEX)?.length || 1;
}

type SpeedColor = "accent" | "success" | "warning" | "error";

function speedColor(tps: number): SpeedColor {
	if (tps >= 45) return "accent";
	if (tps >= 30) return "success";
	if (tps >= 15) return "warning";
	return "error";
}

function setStatus(ctx: ExtensionContext, tps?: number, ttftMs?: number): void {
	const speed = tps === undefined ? "--" : `${tps.toFixed(1)} tok/s`;
	const renderedSpeed = ctx.ui.theme.fg(tps === undefined ? "dim" : speedColor(tps), speed);
	const ttft = ttftMs === undefined ? "--" : `${Math.round(ttftMs)} ms`;
	const text = `${ctx.ui.theme.fg("dim", "TPS:")} ${renderedSpeed} ${ctx.ui.theme.fg("dim", `TTFT: ${ttft}`)}`;
	ctx.ui.setStatus(STATUS_KEY, text);
}

export default function tokenSpeedExtension(pi: ExtensionAPI): void {
	let startedAt = 0;
	let totalTokens = 0;
	let samples: Sample[] = [];
	let ttftStartedAt = 0;
	let ttftMs: number | undefined;

	function reset(ctx: ExtensionContext): void {
		startedAt = 0;
		totalTokens = 0;
		samples = [];
		setStatus(ctx, undefined, ttftMs);
	}

	function markFirstToken(ctx: ExtensionContext): void {
		if (ttftStartedAt === 0 || ttftMs !== undefined) return;
		ttftMs = Date.now() - ttftStartedAt;
		setStatus(ctx, undefined, ttftMs);
	}

	function start(): void {
		if (startedAt === 0) startedAt = Date.now();
	}

	function record(delta: string, ctx: ExtensionContext): void {
		const tokens = estimateTokens(delta);
		if (tokens === 0) return;

		const now = Date.now();
		markFirstToken(ctx);
		start();
		totalTokens += tokens;
		samples.push({ at: now, tokens });
		samples = samples.filter((sample) => now - sample.at <= WINDOW_MS);

		const recentTokens = samples.reduce((sum, sample) => sum + sample.tokens, 0);
		const firstSample = samples[0]?.at ?? now;
		const seconds = Math.max((now - firstSample) / 1000, 0.1);
		setStatus(ctx, recentTokens / seconds, ttftMs);
	}

	function finish(ctx: ExtensionContext, providerTokens?: number): void {
		if (startedAt === 0) return;
		if (providerTokens && providerTokens > 0) totalTokens = providerTokens;

		const seconds = Math.max((Date.now() - startedAt) / 1000, 0.001);
		setStatus(ctx, totalTokens / seconds, ttftMs);
		startedAt = 0;
		ttftStartedAt = 0;
		samples = [];
	}

	pi.on("session_start", async (_event, ctx) => {
		ttftStartedAt = 0;
		ttftMs = undefined;
		reset(ctx);
	});

	pi.on("message_start", (event, ctx) => {
		if (event.message.role === "user") {
			ttftStartedAt = Date.now();
			ttftMs = undefined;
			return;
		}
		if (event.message.role === "assistant") reset(ctx);
	});

	pi.on("message_update", (event, ctx) => {
		const update = event.assistantMessageEvent;

		if (update.type === "text_start" || update.type === "thinking_start" || update.type === "toolcall_start") {
			markFirstToken(ctx);
			start();
			return;
		}

		if (update.type === "text_delta" || update.type === "thinking_delta" || update.type === "toolcall_delta") {
			record(update.delta, ctx);
		}
	});

	pi.on("message_end", (event, ctx) => {
		if (event.message.role === "assistant") finish(ctx, event.message.usage.output);
	});

	// Covers aborted/error streams where message_end may not carry the final
	// assistant message in the normal path.
	pi.on("agent_end", (event, ctx) => {
		if (startedAt === 0) return;
		const lastAssistant = [...event.messages].reverse().find((message) => message.role === "assistant");
		if (lastAssistant?.role === "assistant") finish(ctx, lastAssistant.usage.output);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setStatus(STATUS_KEY, undefined);
	});
}
