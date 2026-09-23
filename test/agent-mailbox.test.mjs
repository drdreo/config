import assert from "node:assert/strict";
import { chmodSync, existsSync, lstatSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { join } from "node:path";
import { test } from "node:test";
import { Inbox, checkDirectory, listMailboxes, openMailbox, plain, request, validateMessage } from "../pi/experimental/agent-mailbox/transport.mjs";

const message = { from: "reviewer", id: "update-1", task: "poc", text: "Report" };
function directory(t) {
  // macOS tmpdir can exceed the Unix socket length limit.
  const dir = mkdtempSync("/tmp/pi-mail-unit-");
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
async function endpoint(t, dir, inbox = new Inbox()) {
  const mailbox = await openMailbox(dir, { sessionId: "session-1", name: "test" }, (body) => {
    if (body.op === "send") return inbox.accept(body.message);
    throw new Error("Unknown operation");
  });
  t.after(() => mailbox.close());
  return mailbox;
}

test("private directory rejects shared permissions, symlinks and relative paths", (t) => {
  const dir = directory(t);
  chmodSync(dir, 0o755);
  assert.throws(() => checkDirectory(dir), /0700/);
  chmodSync(dir, 0o700);
  const alias = `${dir}-alias`;
  symlinkSync(dir, alias);
  t.after(() => rmSync(alias));
  assert.throws(() => checkDirectory(alias), /symlink/);
  assert.throws(() => checkDirectory("relative"), /absolute/);
});

test("validation bounds identity and UTF-8 text; strips unknown fields", () => {
  for (const patch of [{ from: "../x" }, { id: "" }, { task: "a\nx" }, { text: " " }, { text: null }, { text: "😀".repeat(4097) }]) {
    assert.throws(() => validateMessage({ ...message, ...patch }));
  }
  assert.equal(validateMessage({ ...message, text: "😀".repeat(4096) }).text.length, 8192);
  assert.deepEqual(validateMessage({ ...message, extra: "discard" }), message);
});

test("duplicates keep state; id conflicts fail; sender namespaces ids", () => {
  const inbox = new Inbox();
  assert.deepEqual(inbox.accept(message), { duplicate: false, state: "pending" });
  inbox.next().state = "delivered";
  assert.deepEqual(inbox.accept(message), { duplicate: true, state: "delivered" });
  assert.throws(() => inbox.accept({ ...message, text: "Different" }), /conflict/);
  assert.equal(inbox.accept({ ...message, from: "specialist" }).duplicate, false);
});

test("queue and lifetime bounds fail without evicting dedupe", () => {
  const inbox = new Inbox();
  for (let i = 0; i < 32; i++) inbox.accept({ ...message, id: String(i) });
  assert.throws(() => inbox.accept({ ...message, id: "full" }), /full/);
  for (const record of inbox.records.values()) record.state = "delivered";
  for (let i = 32; i < 256; i++) {
    inbox.accept({ ...message, id: String(i) });
    inbox.next().state = "delivered";
  }
  assert.throws(() => inbox.accept({ ...message, id: "capacity" }), /capacity/);
  assert.equal(inbox.accept({ ...message, id: "0" }).duplicate, true);
});

test("socket delivery, permissions, live discovery, exact addressing and cleanup", async (t) => {
  const dir = directory(t);
  const mailbox = await endpoint(t, dir);
  const { address } = mailbox.descriptor;
  for (const suffix of ["json", "sock"]) assert.equal(lstatSync(join(dir, `${address}.${suffix}`)).mode & 0o777, 0o600);
  assert.equal((await listMailboxes(dir))[0].sessionId, "session-1");
  assert.equal((await request(dir, address, { op: "send", message })).duplicate, false);
  assert.equal((await request(dir, address, { op: "send", message })).duplicate, true);
  await assert.rejects(request(dir, "test", { op: "ping" }), /exact/);
  await assert.rejects(request(dir, address, { op: "other" }), /Unknown/);
  await mailbox.close();
  await mailbox.close();
  assert.equal(existsSync(join(dir, `${address}.json`)), false);
  assert.equal(existsSync(join(dir, `${address}.sock`)), false);
  await assert.rejects(request(dir, address, { op: "send", message }), /ENOENT/);
});

test("fresh runtime address, stale descriptor excluded, unsafe descriptor rejected", async (t) => {
  const dir = directory(t);
  const first = await endpoint(t, dir);
  const stale = first.descriptor;
  await first.close();
  writeFileSync(join(dir, `${stale.address}.json`), JSON.stringify(stale), { mode: 0o600 });
  const second = await endpoint(t, dir);
  assert.notEqual(first.descriptor.address, second.descriptor.address);
  assert.equal((await listMailboxes(dir)).length, 1);
  await assert.rejects(request(dir, stale.address, { op: "ping" }), /ENOENT/);
  chmodSync(join(dir, `${second.descriptor.address}.json`), 0o644);
  await assert.rejects(request(dir, second.descriptor.address, { op: "ping" }), /Unsafe/);
});

async function raw(dir, address, text) {
  return new Promise((resolve, reject) => {
    const socket = createConnection(join(dir, `${address}.sock`));
    let data = "";
    socket.on("connect", () => socket.write(text));
    socket.on("data", (chunk) => { data += chunk; });
    socket.on("end", () => resolve(data));
    socket.on("error", reject);
  });
}

test("malformed, wrong recipient, oversized and incomplete frames fail safely", async (t) => {
  const dir = directory(t);
  const mailbox = await endpoint(t, dir);
  const { address } = mailbox.descriptor;
  for (const frame of ["{\n", JSON.stringify({ version: 1, to: "0".repeat(24), op: "ping" }) + "\n", "x".repeat(32769)]) {
    assert.equal(JSON.parse(await raw(dir, address, frame)).ok, false);
  }
  assert.equal(await raw(dir, address, "{"), "");
  assert.equal((await request(dir, address, { op: "ping" })).ok, true);
});

test("one request per connection and Unicode roundtrip", async (t) => {
  const dir = directory(t);
  const inbox = new Inbox();
  const mailbox = await endpoint(t, dir, inbox);
  const frame = JSON.stringify({ version: 1, to: mailbox.descriptor.address, op: "send", message: { ...message, text: "😀" } }) + "\n";
  await raw(dir, mailbox.descriptor.address, frame + frame.replace("update-1", "update-2"));
  assert.equal(inbox.records.size, 1);
  assert.equal(inbox.next().message.text, "😀");
});

test("terminal previews strip control and directional escapes", () => {
  assert.equal(plain("x\x1b[31m\ny\u202ez"), "x [31m y z");
});
