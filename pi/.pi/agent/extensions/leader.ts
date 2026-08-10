import { CustomEditor, DynamicBorder, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Container, Input, Key, SelectList, Spacer, Text, matchesKey, type SelectItem } from "@earendil-works/pi-tui";

const BUILTIN_COMMANDS: SelectItem[] = [
	["settings", "Open settings menu"],
	["model", "Select a model"],
	["scoped-models", "Configure models for Ctrl+P cycling"],
	["export", "Export the current session"],
	["import", "Import and resume a session"],
	["share", "Share the current session"],
	["copy", "Copy the last assistant message"],
	["name", "Set the session name"],
	["session", "Show session information"],
	["changelog", "Show changelog entries"],
	["hotkeys", "Show all keyboard shortcuts"],
	["fork", "Fork from a previous user message"],
	["clone", "Clone the current session"],
	["tree", "Open the session tree"],
	["trust", "Manage project trust"],
	["login", "Configure provider authentication"],
	["logout", "Remove provider authentication"],
	["new", "Start a new session"],
	["compact", "Compact the session context"],
	["resume", "Resume a previous session"],
	["reload", "Reload Pi configuration"],
	["quit", "Quit Pi"],
].map(([name, description]) => ({ value: `/${name}`, label: `/${name}`, description }));

function fuzzyScore(query: string, text: string): number | undefined {
	let cursor = 0;
	let score = 0;
	let consecutive = 0;

	for (const character of query.toLowerCase()) {
		const found = text.toLowerCase().indexOf(character, cursor);
		if (found === -1) return undefined;
		score += found - cursor;
		consecutive = found === cursor ? consecutive + 1 : 0;
		score -= consecutive * 2;
		cursor = found + 1;
	}
	return score;
}

class FuzzySelectList extends SelectList {
	private readonly allItems: SelectItem[];

	constructor(items: SelectItem[], maxVisible: number, theme: ConstructorParameters<typeof SelectList>[2]) {
		super(items, maxVisible, theme);
		this.allItems = items;
	}

	override setFilter(filter: string): void {
		const query = filter.trim().replace(/^\//, "");
		const state = this as unknown as { filteredItems: SelectItem[]; selectedIndex: number };
		if (!query) {
			state.filteredItems = this.allItems;
			state.selectedIndex = 0;
			return;
		}

		state.filteredItems = this.allItems
			.map((item) => {
				const commandScore = fuzzyScore(query, item.label.replace(/^\//, ""));
				const descriptionScore = item.description ? fuzzyScore(query, item.description) : undefined;
				const score = Math.min(commandScore ?? Number.POSITIVE_INFINITY, descriptionScore ?? Number.POSITIVE_INFINITY);
				return { item, score };
			})
			.filter(({ score }) => Number.isFinite(score))
			.sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label))
			.map(({ item }) => item);
		state.selectedIndex = 0;
	}
}

class CommandPalette {
	private readonly search = new Input();
	private readonly container = new Container();
	private readonly list: SelectList;
	private _focused = false;

	get focused(): boolean {
		return this._focused;
	}

	set focused(value: boolean) {
		this._focused = value;
		this.search.focused = value;
	}

	constructor(items: SelectItem[], tui: { requestRender(): void }, theme: any, done: (value?: string) => void) {
		this.container.addChild(new DynamicBorder((text: string) => theme.fg("accent", text)));
		this.container.addChild(new Text(theme.fg("accent", theme.bold("Command Palette")), 1, 0));
		this.container.addChild(new Text(theme.fg("muted", "Type to search • ↑↓ navigate • Enter select • Esc cancel"), 1, 0));
		this.container.addChild(new Text(theme.fg("muted", "Search:"), 1, 0));
		this.container.addChild(this.search);
		this.container.addChild(new Spacer(1));

		this.list = new FuzzySelectList(items, 10, {
			selectedPrefix: (text: string) => theme.fg("accent", text),
			selectedText: (text: string) => theme.fg("accent", text),
			description: (text: string) => theme.fg("muted", text),
			scrollInfo: (text: string) => theme.fg("dim", text),
			noMatch: (text: string) => theme.fg("warning", text),
		});
		this.list.onSelect = (item) => done(item.value);
		this.list.onCancel = () => done(undefined);
		this.container.addChild(this.list);
		this.container.addChild(new DynamicBorder((text: string) => theme.fg("accent", text)));

		this.search.onEscape = () => done(undefined);
		this.search.onSubmit = () => {
			const item = this.list.getSelectedItem();
			if (item) done(item.value);
		};
		void tui;
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.escape)) {
			this.search.onEscape?.();
			return;
		}
		if (matchesKey(data, Key.up) || matchesKey(data, Key.down) || matchesKey(data, Key.pageUp) || matchesKey(data, Key.pageDown)) {
			this.list.handleInput(data);
			return;
		}
		if (matchesKey(data, Key.enter)) {
			this.search.onSubmit?.();
			return;
		}

		this.search.handleInput(data);
		this.list.setFilter(this.search.getValue());
	}

	render(width: number): string[] {
		return this.container.render(width);
	}

	invalidate(): void {
		this.container.invalidate();
	}
}

class LeaderEditor extends CustomEditor {
	private leaderPending = false;
	private readonly defaultBorderColor: (text: string) => string;

	constructor(
		tui: any,
		theme: any,
		keybindings: any,
		private readonly openPalette: (editor: LeaderEditor) => void,
		private readonly setLeaderStatus: (active: boolean) => void,
	) {
		super(tui, theme, keybindings);
		this.defaultBorderColor = theme.borderColor;
	}

	handleInput(data: string): void {
		if (this.leaderPending) {
			this.leaderPending = false;
			this.setLeaderStatus(false);

			if (matchesKey(data, Key.escape)) return;
			if (matchesKey(data, "p")) {
				this.openPalette(this);
				return;
			}
			if (matchesKey(data, "r")) {
				this.actionHandlers.get("app.session.resume")?.();
				return;
			}
			if (matchesKey(data, "m")) {
				this.actionHandlers.get("app.model.select")?.();
				return;
			}
			if (matchesKey(data, "t")) {
				this.actionHandlers.get("app.thinking.cycle")?.();
				return;
			}
			return;
		}

		if (matchesKey(data, Key.ctrl("x"))) {
			this.leaderPending = true;
			this.setLeaderStatus(true);
			return;
		}

		super.handleInput(data);
	}

	setModeColor(color: string | undefined): void {
		if (!color) {
			this.borderColor = this.defaultBorderColor;
			return;
		}
		const red = Number.parseInt(color.slice(1, 3), 16);
		const green = Number.parseInt(color.slice(3, 5), 16);
		const blue = Number.parseInt(color.slice(5, 7), 16);
		this.borderColor = (text: string) => `\x1b[38;2;${red};${green};${blue}m${text}\x1b[39m`;
	}

	executeCommand(command: string): void {
		this.setText(command);
		super.handleInput("\r");
	}
}

export default function leaderExtension(pi: ExtensionAPI): void {
	let activeEditor: LeaderEditor | undefined;

	pi.events.on("modes:appearance", (appearance: { color?: string }) => {
		setTimeout(() => activeEditor?.setModeColor(appearance.color), 0);
	});

	pi.on("session_start", async (_event, ctx) => {
		const showPalette = async (editor: LeaderEditor): Promise<void> => {
			const extensionCommands = pi.getCommands().map((command) => ({
				value: `/${command.name}`,
				label: `/${command.name}`,
				description: command.description,
			}));
			const command = await ctx.ui.custom<string | undefined>((tui, theme, _keybindings, done) => {
				const palette = new CommandPalette([...BUILTIN_COMMANDS, ...extensionCommands], tui, theme, done);
				return {
					render: (width) => palette.render(width),
					handleInput: (data) => {
					palette.handleInput(data);
					tui.requestRender();
					},
					invalidate: () => palette.invalidate(),
					get focused() {
						return palette.focused;
					},
					set focused(value: boolean) {
						palette.focused = value;
					},
				};
			});
			if (command) editor.executeCommand(command);
		};

		ctx.ui.setEditorComponent((tui, theme, keybindings) => {
			activeEditor = new LeaderEditor(tui, theme, keybindings, showPalette, (active) => {
				ctx.ui.setStatus("leader", active ? ctx.ui.theme.fg("accent", "C-x") : undefined);
			});
			return activeEditor;
		});
	});
}
