#!/usr/bin/env node
import { readSync } from "node:fs";
import { parseArgs } from "node:util";
import { listMailboxes, privateDirectory, request } from "./transport.mjs";

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: Object.fromEntries(["dir", "to", "id", "from", "task"].map((name) => [name, { type: "string" }])),
  });
  const [command] = positionals;
  if (positionals.length !== 1 || !values.dir || !["init", "list", "send", "inspect"].includes(command)) {
    throw new Error("Usage: node cli.mjs init|list|inspect|send --dir /private/path [--to ADDRESS --from LABEL --task TASK --id UPDATE] (send reads text from stdin)");
  }
  let result;
  if (command === "init") { privateDirectory(values.dir); result = { directory: values.dir }; }
  else if (command === "list") result = await listMailboxes(values.dir);
  else if (command === "inspect") result = await request(values.dir, values.to, { op: "inspect" });
  else {
    // Bound reads rather than buffering arbitrary piped input in memory.
    const buffer = Buffer.alloc(16385);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(0, buffer, length, buffer.length - length, null);
      if (!count) break;
      length += count;
    }
    if (length > 16384) throw new Error("Message exceeds 16 KiB");
    result = await request(values.dir, values.to, { op: "send", message: {
      id: values.id, from: values.from, task: values.task, text: buffer.subarray(0, length).toString("utf8"),
    } });
  }
  process.stdout.write(JSON.stringify(result) + "\n");
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
