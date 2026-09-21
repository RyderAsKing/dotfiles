import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem } from "@earendil-works/pi-tui";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, normalize, resolve } from "node:path";

interface StoredSnippet {
  name: string;
  content: string;
  description?: string;
  aliases?: string[];
  scope: "global" | "project";
  directory?: string | null;
}

interface SnippetsFile {
  snippets?: unknown;
}

const SNIPPET_TOKEN = /(^|\s)#([A-Za-z0-9][A-Za-z0-9_-]*)/g;
const SNIPPET_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function snippetsPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(configHome, "pichamber", "pi", "snippets.json");
}

function isSnippet(value: unknown): value is StoredSnippet {
  if (!value || typeof value !== "object") return false;
  const snippet = value as Partial<StoredSnippet>;
  return (
    typeof snippet.name === "string" &&
    SNIPPET_NAME.test(snippet.name) &&
    typeof snippet.content === "string" &&
    snippet.content.length > 0 &&
    (snippet.description === undefined || typeof snippet.description === "string") &&
    (snippet.aliases === undefined ||
      (Array.isArray(snippet.aliases) && snippet.aliases.every((alias) => typeof alias === "string" && SNIPPET_NAME.test(alias)))) &&
    (snippet.scope === "global" || snippet.scope === "project") &&
    (snippet.directory === undefined || snippet.directory === null || typeof snippet.directory === "string")
  );
}

function sameDirectory(left: string, right: string): boolean {
  return normalize(resolve(left)) === normalize(resolve(right));
}

function loadSnippets(directory: string): StoredSnippet[] {
  try {
    const parsed = JSON.parse(readFileSync(snippetsPath(), "utf8")) as SnippetsFile;
    if (!Array.isArray(parsed.snippets)) return [];

    return parsed.snippets.filter(
      (snippet): snippet is StoredSnippet =>
        isSnippet(snippet) &&
        (snippet.scope === "global" ||
          (typeof snippet.directory === "string" && sameDirectory(snippet.directory, directory))),
    );
  } catch {
    return [];
  }
}

function snippetLookup(snippets: StoredSnippet[]): Map<string, StoredSnippet> {
  const ordered = [...snippets].sort(
    (left, right) => Number(right.scope === "project") - Number(left.scope === "project"),
  );
  const lookup = new Map<string, StoredSnippet>();

  for (const snippet of ordered) {
    for (const token of [snippet.name, ...(snippet.aliases ?? [])]) {
      const key = token.toLowerCase();
      if (!lookup.has(key)) lookup.set(key, snippet);
    }
  }

  return lookup;
}

export function expandSnippets(text: string, snippets: StoredSnippet[]): string {
  if (!text || !text.includes("#")) return text;
  const lookup = snippetLookup(snippets);
  if (lookup.size === 0) return text;

  return text.replace(SNIPPET_TOKEN, (match, prefix: string, name: string) => {
    const snippet = lookup.get(name.toLowerCase());
    return snippet ? `${prefix}${snippet.content}` : match;
  });
}

function completionItems(snippets: StoredSnippet[], query: string): AutocompleteItem[] {
  const lowerQuery = query.toLowerCase();
  return [...snippetLookup(snippets).entries()]
    .filter(([token]) => token.includes(lowerQuery))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([token, snippet]) => ({
      value: `#${token} `,
      label: `#${token}`,
      description: snippet.description,
    }));
}

export default function pichamberSnippetsExtension(pi: ExtensionAPI) {
  pi.on("input", (event, ctx) => {
    if (!event.text.includes("#")) return { action: "continue" };
    const expanded = expandSnippets(event.text, loadSnippets(ctx.cwd));
    if (expanded === event.text) return { action: "continue" };
    return { action: "transform", text: expanded, images: event.images };
  });

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    ctx.ui.addAutocompleteProvider((current) => ({
      triggerCharacters: [...new Set([...(current.triggerCharacters ?? []), "#"])],
      async getSuggestions(lines, cursorLine, cursorCol, options) {
        const beforeCursor = (lines[cursorLine] ?? "").slice(0, cursorCol);
        const match = beforeCursor.match(/(?:^|\s)#([A-Za-z0-9][A-Za-z0-9_-]*)?$/);
        if (!match) return current.getSuggestions(lines, cursorLine, cursorCol, options);

        const query = match[1] ?? "";
        const items = completionItems(loadSnippets(ctx.cwd), query);
        if (items.length === 0) return current.getSuggestions(lines, cursorLine, cursorCol, options);
        return { prefix: `#${query}`, items };
      },
      applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
        return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
      },
      shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
        return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
      },
    }));
  });
}
