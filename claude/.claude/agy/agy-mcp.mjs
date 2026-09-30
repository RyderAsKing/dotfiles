#!/usr/bin/env node
// Minimal stdio MCP server that delegates tasks to Antigravity CLI (agy) subagents.
// Agents are read from ~/.claude/agy/agents/*.md (frontmatter: name, description, model).
// `model` is a name from `agy models`, e.g. gemini-3.7-flash-medium.
//
// agy has no system-prompt or tool-restriction flags, so the agent body is prepended to the
// task and read-only agents rely on their instructions. Headless agy can't prompt for
// permissions, hence --dangerously-skip-permissions.

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";

const AGENTS_DIR = process.env.AGY_AGENTS_DIR || path.join(os.homedir(), ".claude/agy/agents");
const AGY_BIN = process.env.AGY_BIN || "agy";
const TIMEOUT_MS = Number(process.env.AGY_MCP_TIMEOUT_MS || 45 * 60 * 1000);
const OUTPUT_CAP = 100 * 1024;
const EFFORT = { low: "low", medium: "medium", high: "high" };

function parseAgent(file) {
	const text = fs.readFileSync(file, "utf-8");
	const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!m) return null;
	const fm = {};
	for (const line of m[1].split(/\r?\n/)) {
		const i = line.indexOf(":");
		if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
	}
	if (!fm.name || !fm.description) return null;
	return { name: fm.name, description: fm.description, model: fm.model, body: m[2].trim() };
}

function loadAgents() {
	const agents = new Map();
	let entries = [];
	try {
		entries = fs.readdirSync(AGENTS_DIR);
	} catch {
		return agents;
	}
	for (const name of entries) {
		if (!name.endsWith(".md")) continue;
		try {
			const a = parseAgent(path.join(AGENTS_DIR, name));
			if (a) agents.set(a.name, a);
		} catch {}
	}
	return agents;
}

function toolDefs() {
	const agents = loadAgents();
	const list = [...agents.values()].map((a) => `- ${a.name} (${a.model || "default model"}): ${a.description}`).join("\n");
	return [
		{
			name: "delegate",
			description:
				"Delegate a self-contained task to an Antigravity (agy) subagent running in its own isolated context, and return its final report. " +
				"The subagent sees nothing of this conversation, so the task must include every path, symbol, constraint and success criterion it needs. " +
				"Independent tasks can be delegated in parallel by issuing several calls at once.\n\nAvailable agents:\n" +
				list,
			inputSchema: {
				type: "object",
				properties: {
					agent: { type: "string", enum: [...agents.keys()], description: "Which agy agent to run" },
					task: { type: "string", description: "Complete, self-contained task description" },
					cwd: { type: "string", description: "Absolute working directory for the agent (defaults to the current project directory)" },
					effort: { type: "string", enum: Object.keys(EFFORT), description: "Override the agent model's reasoning tier" },
				},
				required: ["agent", "task"],
			},
		},
	];
}

function runAgy(agent, task, cwd, effort) {
	const args = ["--output-format", "json", "--dangerously-skip-permissions"];
	if (agent.model) {
		let model = agent.model;
		if (effort) model = model.replace(/-(low|medium|high)$/, "") + "-" + EFFORT[effort];
		args.push("--model", model);
	}
	const prompt = agent.body ? `${agent.body}\n\n---\n\n# Task\n\n${task}` : task;
	// Attached form so a prompt starting with "-" is never parsed as a flag.
	args.push(`--print=${prompt}`);

	return new Promise((resolve) => {
		const child = spawn(AGY_BIN, args, { cwd, stdio: ["ignore", "pipe", "pipe"], env: process.env });
		let out = "";
		let err = "";
		const timer = setTimeout(() => child.kill("SIGTERM"), TIMEOUT_MS);
		child.stdout.on("data", (d) => (out += d));
		child.stderr.on("data", (d) => (err += d));
		child.on("error", (e) => {
			clearTimeout(timer);
			resolve({ ok: false, text: `Failed to start agy: ${e.message}` });
		});
		child.on("close", (code, signal) => {
			clearTimeout(timer);
			const raw = () => `stdout:\n${out.trim().slice(-4000)}\n\nstderr:\n${err.trim().slice(-4000)}`;
			if (code !== 0) {
				const why = signal ? `killed by ${signal}${signal === "SIGTERM" ? " (timeout)" : ""}` : `exit code ${code}`;
				return resolve({ ok: false, text: `agy ${why}\n\n${raw()}` });
			}
			let r;
			try {
				r = JSON.parse(out);
			} catch {
				return resolve({ ok: false, text: `agy returned non-JSON output\n\n${raw()}` });
			}
			let text = (r.response || "").trim();
			if (text.length > OUTPUT_CAP) text = text.slice(0, OUTPUT_CAP) + "\n\n[output truncated]";
			if (r.denied_actions?.length) text += `\n\n[agy denied: ${r.denied_actions.map((d) => d.display_name || d.action).join(", ")}]`;
			const ok = !r.status || r.status === "SUCCESS";
			resolve({ ok, text: (ok ? "" : `agy status ${r.status}\n\n`) + (text || "(agent returned no output)") });
		});
	});
}

function send(msg) {
	process.stdout.write(JSON.stringify(msg) + "\n");
}

async function handle(msg) {
	const { id, method, params } = msg;
	if (id === undefined) return; // notification
	try {
		if (method === "initialize") {
			return send({
				jsonrpc: "2.0",
				id,
				result: {
					protocolVersion: params?.protocolVersion || "2025-06-18",
					capabilities: { tools: {} },
					serverInfo: { name: "agy", version: "0.1.0" },
				},
			});
		}
		if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });
		if (method === "tools/list") return send({ jsonrpc: "2.0", id, result: { tools: toolDefs() } });
		if (method === "tools/call") {
			const { name, arguments: a = {} } = params;
			if (name !== "delegate") throw new Error(`Unknown tool: ${name}`);
			const agent = loadAgents().get(a.agent);
			if (!agent) {
				return send({ jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: `Unknown agent: ${a.agent}` }] } });
			}
			const cwd = a.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
			const r = await runAgy(agent, a.task, cwd, a.effort);
			return send({ jsonrpc: "2.0", id, result: { isError: !r.ok, content: [{ type: "text", text: r.text }] } });
		}
		send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
	} catch (e) {
		send({ jsonrpc: "2.0", id, error: { code: -32603, message: String(e?.message || e) } });
	}
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
	if (!line.trim()) return;
	let msg;
	try {
		msg = JSON.parse(line);
	} catch {
		return;
	}
	handle(msg); // not awaited: concurrent calls run in parallel
});
