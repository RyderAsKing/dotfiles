/**
 * ctx-ui-probe.ts
 *
 * An extension for Pi Coding Agent that exercises every `ctx.ui` method to
 * evaluate and compare behavior between the Pi TUI and PiChamber (web UI
 * bridging ctx.ui over RPC).
 *
 * Usage:
 *   /ui-probe          - Prompts to select a probe section interactively
 *   /ui-probe all      - Runs fire, editor, theme, dialogs, custom, and messages in order
 *   /ui-probe fire     - Probes notifications, status bar, widgets, indicators, headers, footers
 *   /ui-probe dialogs  - Probes select, confirm, input, editor, timeout/abort, and form
 *   /ui-probe custom   - Probes custom components, overlay rendering, and raw terminal input
 *   /ui-probe editor   - Probes editor text access, paste, autocomplete, and editor components
 *   /ui-probe theme    - Probes theme inspection, theme listing, and theme loading
 *   /ui-probe messages - Probes custom messages and session entries (kv widgets)
 *   /ui-probe clear    - Undoes and clears all widgets, statuses, headers, footers, and indicators
 */

import type {
	ExtensionAPI,
	ExtensionCommandContext,
	ExtensionContext,
	ReadonlyFooterDataProvider,
	Theme,
} from "@earendil-works/pi-coding-agent";

interface ProbeResult {
	name: string;
	ok: boolean;
	summary: string;
	error?: string;
	ms: number;
}

const STATUS_KEYS = {
	plain: "probe-status-plain",
	ansi: "probe-status-ansi",
	theme: "probe-status-theme",
};

const WIDGET_KEYS = {
	above: "probe-widget-above",
	below: "probe-widget-below",
	component: "probe-widget-component",
};

const SECTIONS = ["all", "fire", "dialogs", "custom", "editor", "theme", "messages", "clear"] as const;
type SectionName = (typeof SECTIONS)[number];

function detectHost(): string {
	const isPiChamber =
		Boolean((globalThis as unknown as { __PICHAMBER__?: unknown }).__PICHAMBER__) ||
		process.env.PICHAMBER === "1";
	return isPiChamber ? "PiChamber" : "Pi TUI";
}

async function probe(name: string, fn: () => Promise<unknown> | unknown): Promise<ProbeResult> {
	const start = Date.now();
	try {
		const res = await fn();
		const ms = Date.now() - start;
		let summary: string;
		if (res === undefined) {
			summary = "undefined";
		} else {
			const type = typeof res;
			let json: string;
			try {
				json = JSON.stringify(res);
				if (json === undefined) json = String(res);
			} catch {
				json = String(res);
			}
			summary = `${type}: ${json}`;
		}
		if (summary.length > 120) {
			summary = summary.slice(0, 117) + "...";
		}
		return { name, ok: true, summary, ms };
	} catch (err: unknown) {
		const ms = Date.now() - start;
		const error = err instanceof Error ? err.message : String(err);
		const summary = `error: ${error}`;
		return {
			name,
			ok: false,
			summary: summary.length > 120 ? summary.slice(0, 117) + "..." : summary,
			error,
			ms,
		};
	}
}

function createProbeCustomComponent(theme: Theme | undefined, done: (result: string) => void) {
	let timer: NodeJS.Timeout | undefined = setTimeout(() => {
		done("timeout");
	}, 5000);

	return {
		render(width: number): string[] {
			const text = "Press any key (auto-closes in 5s)";
			const styled = theme?.fg ? theme.fg("accent", text) : text;
			const borderW = Math.max(10, Math.min(width - 2, 40));
			return [
				`┌${"─".repeat(borderW)}┐`,
				`│ ${styled}`,
				`└${"─".repeat(borderW)}┘`,
			];
		},
		handleInput(data: string): void {
			if (timer) {
				clearTimeout(timer);
				timer = undefined;
			}
			done("key:" + JSON.stringify(data));
		},
		invalidate(): void {},
		dispose(): void {
			if (timer) {
				clearTimeout(timer);
				timer = undefined;
			}
		},
	};
}

async function runFireSection(ctx: ExtensionContext, results: ProbeResult[]): Promise<void> {
	// Notifications
	results.push(await probe("ctx.ui.notify(info)", () => ctx.ui.notify("ui-probe: notify info", "info")));
	results.push(await probe("ctx.ui.notify(warning)", () => ctx.ui.notify("ui-probe: notify warning", "warning")));
	results.push(await probe("ctx.ui.notify(error)", () => ctx.ui.notify("ui-probe: notify error", "error")));
	results.push(await probe("ctx.ui.notify(default)", () => ctx.ui.notify("ui-probe: notify default (no-level)")));

	// Statuses
	results.push(await probe("ctx.ui.setStatus(plain)", () => ctx.ui.setStatus(STATUS_KEYS.plain, "probe: plain text status")));
	results.push(await probe("ctx.ui.setStatus(24-bit ANSI)", () => ctx.ui.setStatus(STATUS_KEYS.ansi, "\x1b[38;2;255;140;0mprobe: 24-bit ANSI orange\x1b[0m")));
	results.push(await probe("ctx.ui.setStatus(theme.fg)", () => ctx.ui.setStatus(STATUS_KEYS.theme, ctx.ui.theme.fg("accent", "probe: theme accent"))));
	// Clear the plain status so exactly two statuses (ansi and theme) are left set
	results.push(await probe("ctx.ui.setStatus(plain clear -> 2 left)", () => ctx.ui.setStatus(STATUS_KEYS.plain, undefined)));

	// Widgets
	results.push(await probe("ctx.ui.setWidget(aboveEditor string[])", () =>
		ctx.ui.setWidget(WIDGET_KEYS.above, ["┌── probe widget above ──┐", "└── multi-line line 2 ──┘"], { placement: "aboveEditor" })
	));
	results.push(await probe("ctx.ui.setWidget(belowEditor string[])", () =>
		ctx.ui.setWidget(WIDGET_KEYS.below, ["probe widget below line 1", "probe widget below line 2"], { placement: "belowEditor" })
	));
	results.push(await probe("ctx.ui.setWidget(component-factory)", () =>
		ctx.ui.setWidget(WIDGET_KEYS.component, (_tui, theme: Theme) => ({
			render: (_width: number) => [theme.fg("accent", "[probe-widget-component factory active]")],
			invalidate() {},
			dispose() {},
		}))
	));

	// Title
	results.push(await probe("ctx.ui.setTitle", () => ctx.ui.setTitle("ui-probe: active title")));

	// Working messages and indicator
	results.push(await probe("ctx.ui.setWorkingMessage", () => ctx.ui.setWorkingMessage("Probing…")));
	results.push(await probe("ctx.ui.setWorkingVisible", () => ctx.ui.setWorkingVisible(true)));
	results.push(await probe("ctx.ui.setWorkingIndicator", () => ctx.ui.setWorkingIndicator({ frames: ["◐", "◓", "◑", "◒"], intervalMs: 120 })));
	results.push(await probe("ctx.ui.setHiddenThinkingLabel", () => ctx.ui.setHiddenThinkingLabel("probe-thinking")));

	// Footer factory
	results.push(await probe("ctx.ui.setFooter", () =>
		ctx.ui.setFooter((_tui, theme: Theme, footerData: ReadonlyFooterDataProvider) => ({
			render: (_width: number) => {
				const branch = footerData.getGitBranch() ?? "no-branch";
				const statuses = footerData.getExtensionStatuses?.();
				const statusCount = statuses ? (statuses.size !== undefined ? statuses.size : "present") : "n/a";
				return [theme.fg("dim", `[probe-footer] branch=${branch} | statuses=${statusCount}`)];
			},
			invalidate() {},
			dispose() {},
		}))
	));

	// Header factory
	results.push(await probe("ctx.ui.setHeader", () =>
		ctx.ui.setHeader((_tui, theme: Theme) => ({
			render: (_width: number) => [theme.fg("accent", "[probe-header] active custom header component")],
			invalidate() {},
			dispose() {},
		}))
	));

	// getToolsExpanded / setToolsExpanded
	let prevExpanded = false;
	results.push(await probe("ctx.ui.getToolsExpanded", () => {
		prevExpanded = ctx.ui.getToolsExpanded();
		return prevExpanded;
	}));
	results.push(await probe("ctx.ui.setToolsExpanded(toggle)", () => ctx.ui.setToolsExpanded(!prevExpanded)));
	results.push(await probe("ctx.ui.setToolsExpanded(restore)", () => ctx.ui.setToolsExpanded(prevExpanded)));
}

async function runDialogsSection(ctx: ExtensionContext, results: ProbeResult[]): Promise<void> {
	// 1. select (3 options)
	results.push(await probe("ctx.ui.select(3 options)", () =>
		ctx.ui.select("ui-probe: select test", ["Option 1", "Option 2", "Option 3"])
	));

	// 2. confirm
	results.push(await probe("ctx.ui.confirm", () =>
		ctx.ui.confirm("ui-probe: confirm test", "Please confirm to continue probe")
	));

	// 3. input with placeholder
	results.push(await probe("ctx.ui.input", () =>
		ctx.ui.input("ui-probe: input test", "type probe text here...")
	));

	// 4. editor with prefill
	results.push(await probe("ctx.ui.editor", () =>
		ctx.ui.editor("ui-probe: editor test", "# ui-probe prefilled content\nLine 2 of editor test")
	));

	// 5. select with { timeout: 5000 } (expect auto-dismiss -> undefined)
	results.push(await probe("ctx.ui.select(timeout 5s)", () =>
		ctx.ui.select("ui-probe: select timeout (auto-dismiss in 5s)", ["Option A", "Option B"], { timeout: 5000 })
	));

	// 6. confirm with AbortController aborted after 3s
	results.push(await probe("ctx.ui.confirm(abort in 3s)", async () => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 3000);
		try {
			return await ctx.ui.confirm(
				"ui-probe: abort confirm",
				"This dialog will be aborted in 3 seconds...",
				{ signal: controller.signal }
			);
		} finally {
			clearTimeout(timer);
		}
	}));

	// 7. ctx.ui.form if typeof function
	results.push(await probe("ctx.ui.form", async () => {
		const uiAny = ctx.ui as unknown as {
			form?: (title: string, fields: unknown[], opts?: unknown) => Promise<unknown>;
		};
		if (typeof uiAny.form === "function") {
			return await uiAny.form("ui-probe: form test", [
				{ id: "text_field", label: "Text Field", type: "text", placeholder: "sample text", required: true },
				{ id: "textarea_field", label: "Textarea Field", type: "textarea", placeholder: "sample multiline text" },
				{ id: "number_field", label: "Number Field", type: "number", min: 0, max: 100 },
				{ id: "select_field", label: "Select Field", type: "select", options: ["Choice A", "Choice B", "Choice C"] },
				{ id: "checkbox_field", label: "Checkbox Field", type: "checkbox" },
			]);
		}
		return "not available";
	}));
}

async function runCustomSection(ctx: ExtensionContext, results: ProbeResult[]): Promise<void> {
	// 1. ctx.ui.custom
	results.push(await probe("ctx.ui.custom", () =>
		ctx.ui.custom<string>((_tui, theme: Theme, _keybindings, done) =>
			createProbeCustomComponent(theme, done)
		)
	));

	// 2. ctx.ui.custom with overlay: true
	results.push(await probe("ctx.ui.custom(overlay: true)", () =>
		ctx.ui.custom<string>(
			(_tui, theme: Theme, _keybindings, done) => createProbeCustomComponent(theme, done),
			{ overlay: true }
		)
	));

	// 3. onTerminalInput
	results.push(await probe("ctx.ui.onTerminalInput", () => {
		let eventCount = 0;
		const unsub = ctx.ui.onTerminalInput((_data: string) => {
			eventCount++;
			return undefined;
		});
		const returnType = typeof unsub;
		setTimeout(() => {
			if (typeof unsub === "function") {
				try {
					unsub();
				} catch {
					// ignore
				}
			}
			ctx.ui.notify(`ui-probe: onTerminalInput received ${eventCount} events in 8s`, "info");
		}, 8000);
		return `subscribed (return type: ${returnType})`;
	}));
}

async function runEditorSection(ctx: ExtensionContext, results: ProbeResult[]): Promise<void> {
	// 1. getEditorText
	results.push(await probe("ctx.ui.getEditorText", () => ctx.ui.getEditorText()));

	// 2. setEditorText
	results.push(await probe("ctx.ui.setEditorText", () => ctx.ui.setEditorText("ui-probe: setEditorText")));

	// 3. pasteToEditor
	results.push(await probe("ctx.ui.pasteToEditor", () => ctx.ui.pasteToEditor(" + pasted")));

	// 4. addAutocompleteProvider
	results.push(await probe("ctx.ui.addAutocompleteProvider", () => {
		ctx.ui.addAutocompleteProvider((current) => ({
			triggerCharacters: current?.triggerCharacters ?? ["@"],
			async getSuggestions(lines, cursorLine, cursorCol, options) {
				return current ? current.getSuggestions(lines, cursorLine, cursorCol, options) : null;
			},
			applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
				if (current) return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
				return { lines, cursorLine, cursorCol };
			},
			shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
				return current?.shouldTriggerFileCompletion
					? current.shouldTriggerFileCompletion(lines, cursorLine, cursorCol)
					: false;
			},
		}));
		return "provider added";
	}));

	// 5. getEditorComponent
	results.push(await probe("ctx.ui.getEditorComponent", () => {
		const factory = ctx.ui.getEditorComponent();
		return typeof factory === "function" ? "custom factory function" : typeof factory;
	}));

	// 6. setEditorComponent(undefined)
	results.push(await probe("ctx.ui.setEditorComponent(undefined)", () => {
		ctx.ui.setEditorComponent(undefined);
		return "restored default editor";
	}));
}

async function runThemeSection(ctx: ExtensionContext, results: ProbeResult[]): Promise<void> {
	// 1. read ctx.ui.theme
	results.push(await probe("ctx.ui.theme(inspection)", () => {
		const th = ctx.ui.theme;
		return {
			type: typeof th,
			hasFg: typeof th?.fg === "function",
			hasBg: typeof th?.bg === "function",
			hasBold: typeof th?.bold === "function",
			accentFgJson: th?.fg ? JSON.stringify(th.fg("accent", "x")) : "n/a",
		};
	}));

	// 2. getAllThemes()
	let allThemes: { name: string; path?: string }[] = [];
	results.push(await probe("ctx.ui.getAllThemes", () => {
		allThemes = ctx.ui.getAllThemes();
		return {
			count: allThemes.length,
			names: allThemes.map((t) => t.name),
		};
	}));

	// 3. getTheme(first name)
	results.push(await probe("ctx.ui.getTheme(first name)", () => {
		const firstName = allThemes[0]?.name;
		if (!firstName) return "no themes found";
		const th = ctx.ui.getTheme(firstName);
		return { firstName, loaded: Boolean(th), name: th?.name };
	}));

	// 4. setTheme(current theme only if determinable)
	results.push(await probe("ctx.ui.setTheme(current theme)", () => {
		const currentName = ctx.ui.theme?.name;
		if (typeof currentName === "string" && currentName.length > 0) {
			return ctx.ui.setTheme(currentName);
		}
		return "skipped: current theme name not determinable from ctx.ui.theme.name";
	}));
}

async function runMessagesSection(pi: ExtensionAPI, _ctx: ExtensionContext, results: ProbeResult[]): Promise<void> {
	const host = detectHost();
	const isPiChamber = host === "PiChamber";

	// 1. sendMessage display: true
	results.push(await probe("pi.sendMessage(display: true)", () => {
		pi.sendMessage({
			customType: "ctx-ui-probe.note",
			content: "visible custom message",
			display: true,
			details: { n: 1 },
		});
		return "sent display:true";
	}));

	// 2. sendMessage display: false
	results.push(await probe("pi.sendMessage(display: false)", () => {
		pi.sendMessage({
			customType: "ctx-ui-probe.note",
			content: "hidden custom message",
			display: false,
			details: { n: 2 },
		});
		return "sent display:false";
	}));

	// 3. appendEntry secret state
	results.push(await probe("pi.appendEntry(ctx-ui-probe.state)", () => {
		pi.appendEntry("ctx-ui-probe.state", { secret: "private state — should NOT render" });
		return "appended private state entry";
	}));

	// 4. appendEntry pichamber.ui kv widget
	results.push(await probe("pi.appendEntry(pichamber.ui)", () => {
		pi.appendEntry("pichamber.ui", {
			id: "ctx-ui-probe",
			title: "ctx.ui probe",
			component: "kv",
			props: {
				rows: [
					{ label: "host", value: isPiChamber ? "PiChamber" : "Pi TUI" },
					{ label: "probes", value: String(results.length) },
				],
			},
		});
		return "appended pichamber.ui entry";
	}));
}

async function runClearSection(pi: ExtensionAPI, ctx: ExtensionContext, results: ProbeResult[]): Promise<void> {
	// Statuses
	results.push(await probe("ctx.ui.setStatus(plain, undefined)", () => ctx.ui.setStatus(STATUS_KEYS.plain, undefined)));
	results.push(await probe("ctx.ui.setStatus(ansi, undefined)", () => ctx.ui.setStatus(STATUS_KEYS.ansi, undefined)));
	results.push(await probe("ctx.ui.setStatus(theme, undefined)", () => ctx.ui.setStatus(STATUS_KEYS.theme, undefined)));

	// Widgets
	results.push(await probe("ctx.ui.setWidget(above, undefined)", () => ctx.ui.setWidget(WIDGET_KEYS.above, undefined)));
	results.push(await probe("ctx.ui.setWidget(below, undefined)", () => ctx.ui.setWidget(WIDGET_KEYS.below, undefined)));
	results.push(await probe("ctx.ui.setWidget(component, undefined)", () => ctx.ui.setWidget(WIDGET_KEYS.component, undefined)));

	// Footer & Header
	results.push(await probe("ctx.ui.setFooter(undefined)", () => ctx.ui.setFooter(undefined)));
	results.push(await probe("ctx.ui.setHeader(undefined)", () => ctx.ui.setHeader(undefined)));

	// Working state & Title
	results.push(await probe("ctx.ui.setWorkingMessage()", () => ctx.ui.setWorkingMessage()));
	results.push(await probe("ctx.ui.setWorkingIndicator()", () => ctx.ui.setWorkingIndicator()));
	results.push(await probe("ctx.ui.setWorkingVisible(true)", () => ctx.ui.setWorkingVisible(true)));
	results.push(await probe("ctx.ui.setHiddenThinkingLabel()", () => ctx.ui.setHiddenThinkingLabel()));
	results.push(await probe("ctx.ui.setTitle('pi')", () => ctx.ui.setTitle("pi")));

	// Clear PiChamber UI widget
	results.push(await probe("pi.appendEntry(pichamber.ui, removed: true)", () => {
		pi.appendEntry("pichamber.ui", { id: "ctx-ui-probe", removed: true });
		return "cleared pichamber.ui entry";
	}));
}

async function publishReport(
	pi: ExtensionAPI,
	ctx: ExtensionCommandContext,
	section: string,
	results: ProbeResult[]
): Promise<void> {
	const host = detectHost();
	const totalCalls = results.length;
	const failedCalls = results.filter((r) => !r.ok).length;

	const lines: string[] = [];
	lines.push(`# ctx.ui Probe Report: \`${section}\``);
	lines.push("");
	lines.push(`- **Host**: ${host}`);
	lines.push(`- **hasUI**: \`${ctx.hasUI}\``);
	lines.push(`- **Mode**: \`${ctx.mode}\``);
	lines.push(`- **Total Calls**: ${totalCalls}`);
	lines.push(`- **Failures / Thrown**: ${failedCalls}`);
	lines.push("");
	lines.push("| # | call | ok | result | ms |");
	lines.push("|---|------|----|--------|----|");

	results.forEach((r, idx) => {
		const safeCall = r.name.replace(/\|/g, "\\|").replace(/\n/g, " ");
		const safeOk = r.ok ? "✓" : "✗";
		const safeResult = r.summary.replace(/\|/g, "\\|").replace(/\n/g, " ");
		lines.push(`| ${idx + 1} | ${safeCall} | ${safeOk} | ${safeResult} | ${r.ms}ms |`);
	});

	const markdown = lines.join("\n");

	pi.sendMessage({
		customType: "ctx-ui-probe.report",
		content: markdown,
		display: true,
		details: {
			host,
			hasUI: ctx.hasUI,
			section,
			results,
		},
	});

	ctx.ui.notify(
		`ui-probe: ${totalCalls} calls, ${failedCalls} threw`,
		failedCalls > 0 ? "warning" : "info"
	);
}

export default function (pi: ExtensionAPI): void {
	pi.registerCommand("ui-probe", {
		description: "Probe every ctx.ui method to compare behavior across UI environments",
		getArgumentCompletions: (argumentPrefix: string) => {
			return SECTIONS
				.filter((s) => s.startsWith(argumentPrefix.toLowerCase()))
				.map((s) => ({ value: s, label: s }));
		},
		handler: async (args: string, ctx: ExtensionCommandContext): Promise<void> => {
			const results: ProbeResult[] = [];
			let section = args.trim().toLowerCase() as SectionName | "";

			if (!section) {
				let selectedVal: string | undefined;
				const selectProbe = await probe("ctx.ui.select(pick section)", async () => {
					selectedVal = await ctx.ui.select("Select probe section", [...SECTIONS]);
					return selectedVal;
				});
				results.push(selectProbe);

				if (!selectedVal) {
					ctx.ui.notify("ui-probe: selection cancelled", "warning");
					await publishReport(pi, ctx, "cancelled", results);
					return;
				}
				section = selectedVal as SectionName;
			}

			if (!SECTIONS.includes(section as SectionName)) {
				ctx.ui.notify(`ui-probe: unknown section "${section}". Choices: ${SECTIONS.join(", ")}`, "error");
				return;
			}

			switch (section) {
				case "fire":
					await runFireSection(ctx, results);
					break;
				case "dialogs":
					await runDialogsSection(ctx, results);
					break;
				case "custom":
					await runCustomSection(ctx, results);
					break;
				case "editor":
					await runEditorSection(ctx, results);
					break;
				case "theme":
					await runThemeSection(ctx, results);
					break;
				case "messages":
					await runMessagesSection(pi, ctx, results);
					break;
				case "clear":
					await runClearSection(pi, ctx, results);
					break;
				case "all":
					// "all runs fire, editor, theme, dialogs, custom, messages in that order (not clear)."
					await runFireSection(ctx, results);
					await runEditorSection(ctx, results);
					await runThemeSection(ctx, results);
					await runDialogsSection(ctx, results);
					await runCustomSection(ctx, results);
					await runMessagesSection(pi, ctx, results);
					break;
			}

			await publishReport(pi, ctx, section, results);
		},
	});
}
