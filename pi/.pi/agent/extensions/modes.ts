import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

type Mode = {
	provider: string;
	model: string;
	thinkingLevel?: ThinkingLevel;
	color?: string;
};

type Modes = Record<string, Mode>;

function loadModes(): Modes {
	const configPath = join(getAgentDir(), "modes.json");
	if (!existsSync(configPath)) return {};

	try {
		const parsed = JSON.parse(readFileSync(configPath, "utf8")) as Modes;
		return Object.fromEntries(
			Object.entries(parsed).filter(
			([, mode]) =>
				typeof mode?.provider === "string" &&
				typeof mode?.model === "string" &&
				(mode?.thinkingLevel === undefined ||
					["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(mode.thinkingLevel)) &&
				(mode?.color === undefined || /^#[0-9a-f]{6}$/i.test(mode.color)),

			),
		);
	} catch (error) {
		console.error(`Failed to load ${configPath}:`, error);
		return {};
	}
}

function colorText(color: string | undefined, text: string): string {
	if (!color) return text;
	const red = Number.parseInt(color.slice(1, 3), 16);
	const green = Number.parseInt(color.slice(3, 5), 16);
	const blue = Number.parseInt(color.slice(5, 7), 16);
	return `\x1b[38;2;${red};${green};${blue}m${text}\x1b[39m`;
}

function updateStatus(pi: ExtensionAPI, ctx: ExtensionContext, activeMode: string | undefined, modes: Modes): void {
	const mode = activeMode ? modes[activeMode] : undefined;
	const variant = mode?.thinkingLevel ? `/${mode.thinkingLevel}` : "";
	ctx.ui.setStatus("mode", activeMode ? colorText(mode?.color, `mode:${activeMode}${variant}`) : undefined);
	pi.events.emit("modes:appearance", { color: mode?.color });
}

export default function modesExtension(pi: ExtensionAPI): void {
	let modes: Modes = {};
	let activeMode: string | undefined;

	async function applyMode(name: string, ctx: ExtensionContext): Promise<void> {
		const mode = modes[name];
		if (!mode) {
			ctx.ui.notify(`Unknown mode "${name}". Available: ${Object.keys(modes).join(", ") || "none"}`, "error");
			return;
		}

		const model = ctx.modelRegistry.find(mode.provider, mode.model);
		if (!model) {
			ctx.ui.notify(`Mode "${name}": model ${mode.provider}/${mode.model} was not found`, "error");
			return;
		}

		const success = await pi.setModel(model);
		if (!success) {
			ctx.ui.notify(`Mode "${name}": no API key is available for ${mode.provider}/${mode.model}`, "error");
			return;
		}

		if (mode.thinkingLevel) pi.setThinkingLevel(mode.thinkingLevel);

		activeMode = name;
		updateStatus(pi, ctx, activeMode, modes);
		const variant = mode.thinkingLevel ? ` (${mode.thinkingLevel})` : "";
		ctx.ui.notify(`Mode "${name}" active: ${mode.provider}/${mode.model}${variant}`, "info");
	}

	async function cycleMode(ctx: ExtensionContext): Promise<void> {
		const names = Object.keys(modes);
		if (names.length === 0) {
			ctx.ui.notify("No modes configured in ~/.pi/agent/modes.json", "warning");
			return;
		}

		const currentIndex = activeMode ? names.indexOf(activeMode) : -1;
		await applyMode(names[(currentIndex + 1) % names.length], ctx);
	}

	for (const name of ["economy", "balance", "premium"]) {
		pi.registerCommand(name, {
			description: `Switch to ${name} mode`,
			handler: async (_args, ctx) => applyMode(name, ctx),
		});
	}

	pi.registerShortcut("shift+tab", {
		description: "Cycle model modes",
		handler: async (ctx) => cycleMode(ctx),
	});


	function syncActiveMode(ctx: ExtensionContext): void {
		const current = ctx.model;
		activeMode = current
			? Object.entries(modes).find(
					([, mode]) =>
						mode.provider === current.provider &&
						mode.model === current.id &&
						(mode.thinkingLevel === undefined || mode.thinkingLevel === ctx.thinkingLevel),
				)?.[0]
			: undefined;
		updateStatus(pi, ctx, activeMode, modes);
	}

	pi.on("model_select", async (_event, ctx) => syncActiveMode(ctx));
	pi.on("thinking_level_select", async (_event, ctx) => syncActiveMode(ctx));

	pi.on("session_start", async (_event, ctx) => {
		modes = loadModes();
		syncActiveMode(ctx);
	});
}
