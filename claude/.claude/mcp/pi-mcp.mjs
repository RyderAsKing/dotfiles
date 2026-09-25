#!/usr/bin/env node
// Minimal stdio MCP server that delegates tasks to pi subagents.
// Agents are read from ~/.pi/agent/agents/*.md (frontmatter: name, description, model, tools).

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";

const AGENTS_DIR = process.env.PI_AGENTS_DIR || path.join(os.homedir(), ".pi/agent/agents");
const PI_BIN = process.env.PI_BIN || "pi";
const EXCLUDED = new Set((process.env.PI_MCP_EXCLUDE || "").split(",").map((s) => s.trim()).filter(Boolean));
const TIMEOUT_MS = Number(process.env.PI_MCP_TIMEOUT_MS || 45 * 60 * 1000);
const OUTPUT_CAP = 100 * 1024;

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
	return { name: fm.name, description: fm.description, model: fm.model, tools: fm.tools, body: m[2].trim() };
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
			if (a && !EXCLUDED.has(a.name)) agents.set(a.name, a);
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
				"Delegate a self-contained task to a pi subagent running in its own isolated context, and return its final report. " +
				"The subagent sees nothing of this conversation, so the task must include every path, symbol, constraint and success criterion it needs. " +
				"Independent tasks can be delegated in parallel by issuing several calls at once.\n\nAvailable agents:\n" +
				list,
			inputSchema: {
				type: "object",
				properties: {
					agent: { type: "string", enum: [...agents.keys()], description: "Which pi agent to run" },
					task: { type: "string", description: "Complete, self-contained task description" },
					cwd: { type: "string", description: "Absolute working directory for the agent (defaults to the current project directory)" },
					thinking: {
						type: "string",
						enum: ["off", "minimal", "low", "medium", "high", "xhigh", "max"],
						description: "Override the agent's thinking level",
					},
				},
				required: ["agent", "task"],
			},
		},
	];
}

function runPi(agent, task, cwd, thinking) {
	const args = ["-p", "--no-session"];
	if (agent.model) {
		let model = agent.model;
		if (thinking) model = model.replace(/:[a-z]+$/, "") + ":" + thinking;
		args.push("--model", model);
	} else if (thinking) {
		args.push("--thinking", thinking);
	}
	if (agent.tools) args.push("--tools", agent.tools.split(",").map((t) => t.trim()).join(","));
	if (agent.body) args.push("--append-system-prompt", agent.body);
	args.push("--", task);

	return new Promise((resolve) => {
		const child = spawn(PI_BIN, args, { cwd, stdio: ["ignore", "pipe", "pipe"], env: process.env });
		let out = "";
		let err = "";
		const timer = setTimeout(() => child.kill("SIGTERM"), TIMEOUT_MS);
		child.stdout.on("data", (d) => (out += d));
		child.stderr.on("data", (d) => (err += d));
		child.on("error", (e) => {
			clearTimeout(timer);
			resolve({ ok: false, text: `Failed to start pi: ${e.message}` });
		});
		child.on("close", (code, signal) => {
			clearTimeout(timer);
			if (out.length > OUTPUT_CAP) out = out.slice(0, OUTPUT_CAP) + "\n\n[output truncated]";
			if (code === 0) return resolve({ ok: true, text: out.trim() || "(agent returned no output)" });
			const why = signal ? `killed by ${signal}${signal === "SIGTERM" ? " (timeout)" : ""}` : `exit code ${code}`;
			resolve({ ok: false, text: `pi ${why}\n\nstdout:\n${out.trim()}\n\nstderr:\n${err.trim().slice(-4000)}` });
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
					serverInfo: { name: "pi", version: "0.1.0" },
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
			const r = await runPi(agent, a.task, cwd, a.thinking);
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
