import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const SECTION = "herdr";

const GUIDANCE =
  "This session runs inside Herdr (HERDR_ENV=1). Before the first task, " +
  "including skill and slash-command requests, load the `herdr` skill and " +
  "resolve your pane role.";

export default function herdrContextExtension(pi: ExtensionAPI): void {
  pi.on("before_agent_start", (event) => {
    if (process.env.HERDR_ENV === "1") {
      event.systemPromptOptions.sections[SECTION] = GUIDANCE;
    } else {
      delete event.systemPromptOptions.sections[SECTION];
    }
  });
}
