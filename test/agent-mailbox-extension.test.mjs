import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { request } from "../pi/experimental/agent-mailbox/transport.mjs";

// Reuse the installed Pi loader/dependencies without adding repo-wide plumbing.
let root = process.env.PI_MAILBOX_PI_ROOT || dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()));
while (!existsSync(join(root, "node_modules/jiti")) && dirname(root) !== root) root = dirname(root);
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const requirePi = createRequire(join(root, "package.json"));
const jiti = createJiti(import.meta.url, { alias: {
  "@earendil-works/pi-tui": requirePi.resolve("@earendil-works/pi-tui"),
  "typebox": requirePi.resolve("typebox"),
} });
const extension = await jiti.import("../pi/experimental/agent-mailbox/index.ts", { default: true });

async function setup(t, sendMessage, enabled = true) {
  const dir = mkdtempSync("/tmp/pi-mail-adapter-");
  const handlers = new Map(), commands = new Map(), notices = [], sent = [];
  let idle = true;
  const ctx = {
    mode: "tui", isIdle: () => idle,
    sessionManager: { getSessionId: () => "session-test" },
    ui: { setStatus() {}, notify: (message) => notices.push(message) },
  };
  const pi = {
    registerFlag() {}, registerTool() {}, registerMessageRenderer() {},
    registerCommand: (name, value) => commands.set(name, value),
    getFlag: (name) => name === "mailbox-dir" && enabled ? dir : undefined,
    on: (event, fn) => handlers.set(event, fn),
    sendMessage: (message, options) => { sent.push({ message, options }); sendMessage?.(message, options); },
  };
  extension(pi);
  await handlers.get("session_start")({}, ctx);
  const address = readdirSync(dir).find((file) => file.endsWith(".json"))?.slice(0, -5);
  t.after(async () => { await handlers.get("session_shutdown")(); rmSync(dir, { recursive: true, force: true }); });
  const send = (id = "update") => request(dir, address, { op: "send", message: { from: "lead", task: "test", id, text: "report" } });
  const inspect = () => request(dir, address, { op: "inspect" });
  return { pi, ctx, handlers, commands, notices, sent, dir, address, send, inspect, busy: (value) => { idle = !value; } };
}

test("no opt-in flag means no socket or directory contents", async (t) => {
  const state = await setup(t, undefined, false);
  assert.deepEqual(readdirSync(state.dir), []);
});

test("sendMessage options and message_start confirmation", async (t) => {
  const state = await setup(t);
  await state.send();
  await delay(20);
  assert.equal(state.sent.length, 1);
  assert.deepEqual(state.sent[0].options, { deliverAs: "followUp", triggerTurn: true });
  assert.equal((await state.inspect()).records[0].state, "submitted");
  await state.handlers.get("message_start")({ message: { role: "custom", ...state.sent[0].message } });
  await state.handlers.get("agent_settled")();
  assert.equal((await state.inspect()).records[0].state, "delivered");
  assert.equal((await state.inspect()).paused, false);
});

test("busy and blocked states retain reports outside Pi's restorable input queue", async (t) => {
  const state = await setup(t);
  state.busy(true);
  await state.send();
  await delay(20);
  assert.equal(state.sent.length, 0);
  state.busy(false);
  state.handlers.get("ui_prompt_start")();
  state.handlers.get("agent_settled")();
  await delay(20);
  assert.equal(state.sent.length, 0);
  state.handlers.get("ui_prompt_end")();
  await delay(20);
  assert.equal(state.sent.length, 1);
});

test("synchronous dispatch failure pauses with uncertainty, never retries", async (t) => {
  const state = await setup(t, () => { throw new Error("closed runtime"); });
  await state.send();
  await delay(20);
  const result = await state.inspect();
  assert.equal(result.paused, true);
  assert.equal(result.records[0].state, "uncertain");
  await state.send();
  await delay(20);
  assert.equal(state.sent.length, 1);
});

test("asynchronous failure settling before confirmation cannot strand dispatching", async (t) => {
  const state = await setup(t); // Pi catches async rejection internally; no returned promise.
  await state.send();
  await delay(20);
  state.handlers.get("agent_settled")();
  assert.equal((await state.inspect()).records[0].state, "uncertain");
  assert.equal((await state.inspect()).paused, true);
  await state.send("second");
  await state.commands.get("mailbox").handler("resume", state.ctx);
  await delay(20);
  assert.equal(state.sent.length, 2); // New pending message, not the uncertain first one.
  assert.equal(state.sent[1].message.details.id, "second");
});

test("missing async confirmation times out closed; shutdown removes timers and endpoint", async (t) => {
  const state = await setup(t);
  await state.send();
  await delay(5100);
  assert.equal((await state.inspect()).paused, true);
  assert.equal((await state.inspect()).records[0].state, "uncertain");
  assert.match(state.notices[0], /unconfirmed/);
  await state.handlers.get("session_shutdown")();
  assert.deepEqual(readdirSync(state.dir), []);
});
