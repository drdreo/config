import { randomBytes } from "node:crypto";
import { chmodSync, lstatSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { createConnection, createServer } from "node:net";

export const MAX_FRAME = 32 * 1024;
export const MAX_TEXT = 16 * 1024;
const ADDRESS = /^[a-f0-9]{24}$/;
const TOKEN = /^[a-zA-Z0-9_.:-]{1,96}$/;

// A same-user transport, not a sandbox against other processes owned by that user.
export function privateDirectory(directory) {
  if (!isAbsolute(directory)) throw new Error("Mailbox directory must be absolute");
  mkdirSync(directory, { mode: 0o700 });
}

export function checkDirectory(directory) {
  if (!isAbsolute(directory)) throw new Error("Mailbox directory must be absolute");
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077)) {
    throw new Error("Mailbox directory must be owned by you, not a symlink, and mode 0700");
  }
  return directory;
}

function socketPath(directory, address) {
  if (!ADDRESS.test(address)) throw new Error("Use an exact mailbox address (24 hex characters), not a name");
  const path = join(checkDirectory(directory), `${address}.sock`);
  if (Buffer.byteLength(path) > 100) throw new Error("Mailbox socket path exceeds 100 bytes; choose a shorter private directory");
  return path;
}

export function validateMessage(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) throw new Error("Invalid message");
  for (const field of ["id", "from", "task"]) {
    if (typeof message[field] !== "string" || !TOKEN.test(message[field])) throw new Error(`Invalid ${field}`);
  }
  if (typeof message.text !== "string" || !message.text.trim() || Buffer.byteLength(message.text) > MAX_TEXT) {
    throw new Error("Message text must contain 1–16384 UTF-8 bytes");
  }
  return { id: message.id, from: message.from, task: message.task, text: message.text };
}

export function readDescriptor(directory, address) {
  socketPath(directory, address);
  const path = join(directory, `${address}.json`);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) || stat.size > 4096) {
    throw new Error("Unsafe mailbox descriptor");
  }
  const descriptor = JSON.parse(readFileSync(path, "utf8"));
  if (descriptor.version !== 1 || descriptor.address !== address) throw new Error("Invalid mailbox descriptor");
  return descriptor;
}

export async function request(directory, address, body) {
  readDescriptor(directory, address);
  const path = socketPath(directory, address);
  const stat = lstatSync(path);
  if (!stat.isSocket() || stat.uid !== process.getuid() || (stat.mode & 0o077)) throw new Error("Unsafe mailbox socket");
  const frame = JSON.stringify({ ...body, version: 1, to: address }) + "\n";
  if (Buffer.byteLength(frame) > MAX_FRAME) throw new Error("Request too large");
  return new Promise((resolve, reject) => {
    const socket = createConnection(path);
    const timer = setTimeout(() => finish(new Error("Mailbox timeout; delivery may be uncertain. Retry only with the same id and content.")), 2500);
    let buffer = Buffer.alloc(0);
    let done = false;
    function finish(error, value) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.destroy();
      error ? reject(error) : resolve(value);
    }
    socket.on("error", (error) => finish(error));
    socket.on("end", () => finish(new Error("Mailbox closed before acknowledgement; delivery uncertain")));
    socket.on("connect", () => socket.write(frame));
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > MAX_FRAME) return finish(new Error("Response too large"));
      const end = buffer.indexOf(10);
      if (end < 0) return;
      try {
        const result = JSON.parse(buffer.subarray(0, end).toString("utf8"));
        if (result.ok !== true) return finish(new Error(result.error || "Mailbox rejected request"));
        finish(undefined, result);
      } catch (error) { finish(error); }
    });
  });
}

export async function listMailboxes(directory) {
  checkDirectory(directory);
  const results = [];
  for (const file of readdirSync(directory).filter((name) => /^[a-f0-9]{24}\.json$/.test(name))) {
    const address = file.slice(0, -5);
    try {
      const descriptor = readDescriptor(directory, address);
      await request(directory, address, { op: "ping" });
      results.push(descriptor);
    } catch { /* Stale/unsafe entries are not live recipients. Never delete others' files. */ }
  }
  return results;
}

export async function openMailbox(directory, identity, handle) {
  checkDirectory(directory);
  const address = randomBytes(12).toString("hex");
  const path = socketPath(directory, address);
  const descriptorPath = join(directory, `${address}.json`);
  const descriptor = { version: 1, address, sessionId: identity.sessionId, name: identity.name, pid: process.pid };
  const clients = new Set();
  const server = createServer((socket) => {
    if (clients.size >= 8) return socket.destroy();
    clients.add(socket);
    const timer = setTimeout(() => socket.destroy(), 2000);
    socket.on("close", () => { clearTimeout(timer); clients.delete(socket); });
    socket.on("error", () => {});
    let buffer = Buffer.alloc(0);
    let handled = false;
    socket.on("data", (chunk) => {
      if (handled) return;
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > MAX_FRAME) { handled = true; socket.end(JSON.stringify({ ok: false, error: "Request too large" }) + "\n"); return; }
      const end = buffer.indexOf(10);
      if (end < 0) return;
      handled = true;
      try {
        const body = JSON.parse(buffer.subarray(0, end).toString("utf8"));
        if (body.version !== 1 || body.to !== address) throw new Error("Wrong protocol or recipient");
        const result = body.op === "ping" ? {} : handle(body);
        socket.end(JSON.stringify({ ok: true, ...result }) + "\n");
      } catch (error) {
        socket.end(JSON.stringify({ ok: false, error: error.message }) + "\n");
      }
    });
  });
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    for (const client of clients) client.destroy();
    await new Promise((resolve) => server.close(resolve));
    for (const file of [descriptorPath, path]) {
      try { unlinkSync(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
  }
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(path, resolve); });
    chmodSync(path, 0o600);
    writeFileSync(descriptorPath, JSON.stringify(descriptor), { mode: 0o600, flag: "wx" });
  } catch (error) { await close(); throw error; }
  return { descriptor, close };
}

// Bounded lifetime dedupe: never evict an accepted id then accidentally execute it again.
export class Inbox {
  records = new Map();
  accept(raw) {
    const message = validateMessage(raw);
    const key = `${message.from}/${message.id}`;
    const existing = this.records.get(key);
    if (existing) {
      if (JSON.stringify(existing.message) !== JSON.stringify(message)) throw new Error("Id conflict: retry with identical content");
      return { duplicate: true, state: existing.state };
    }
    if (this.records.size >= 256) throw new Error("Mailbox lifetime capacity reached; start a fresh runtime");
    if ([...this.records.values()].filter((record) => record.state !== "delivered").length >= 32) throw new Error("Inbox full");
    this.records.set(key, { message, state: "pending" });
    return { duplicate: false, state: "pending" };
  }
  next() { return [...this.records.values()].find((record) => record.state === "pending"); }
  summary() {
    return [...this.records.values()].map(({ message: { text, ...identity }, state }) => ({ ...identity, state }));
  }
}

export function plain(text) {
  return String(text).replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, " ");
}
