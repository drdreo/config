// Test-only observer/dialogs. Never loaded by the mailbox or config package.
import { writeFileSync } from "node:fs";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function fixture(pi: ExtensionAPI) {
  let timer: ReturnType<typeof setInterval>;
  let context: ExtensionContext;
  let dialog: string | undefined;
  let answer: unknown = null;
  const save = () => writeFileSync(process.env.MAILBOX_TEST_STATE!, JSON.stringify({
    text: context.ui.getEditorText(), idle: context.isIdle(), sessionId: context.sessionManager.getSessionId(), sessionFile: context.sessionManager.getSessionFile(), dialog, answer,
  }));
  const confirm = async (ctx: ExtensionContext) => {
    dialog = "confirm"; answer = null; save();
    answer = await ctx.ui.confirm("TEST APPROVAL", "Only a real test key may answer this.");
    dialog = undefined; save();
    return answer;
  };
  pi.on("session_start", (_event, ctx) => { context = ctx; timer = setInterval(save, 40); save(); });
  pi.on("session_shutdown", () => clearInterval(timer));
  // Session contexts wrap UI lifecycle events; Pi 0.85.1 shortcut contexts do not.
  pi.registerShortcut("f7", { description: "Test wrapped idle dialog", handler: () => confirm(context) });
  pi.registerShortcut("f9", { description: "Test raw shortcut dialog", handler: confirm });
  pi.registerShortcut("f8", { description: "Test wrapped input dialog", handler: async () => {
    dialog = "input"; answer = null; save();
    answer = await context.ui.input("TEST INPUT"); dialog = undefined; save();
  } });
  pi.registerCommand("fixture-resume", {
    description: "Test session replacement cleanup",
    handler: async (path, ctx) => { await ctx.switchSession(path); },
  });
  pi.registerCommand("fixture-tree", {
    description: "Test branch-summary failure/cancellation",
    handler: async (args, ctx) => {
      const target = ctx.sessionManager.getEntries().find((entry) => entry.type === "custom_message");
      if (!target) throw new Error("Test needs an existing mailbox message");
      await ctx.navigateTree(target.id, { summarize: true, customInstructions: args === "cancel" ? "TREE_CANCEL" : "TREE_FAIL" });
    },
  });
  pi.registerTool({ name: "fixture_approval", label: "Test approval", description: "Test-only approval gate", parameters: Type.Object({}),
    async execute(_id, _params, _signal, _update, ctx) {
      return { content: [{ type: "text", text: `approved=${await confirm(ctx)}` }], details: {} };
    },
  });
}
