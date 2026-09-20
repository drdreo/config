# Scope approval

A feature or fix request does not authorize framework changes, shared infrastructure changes, or new plumbing across UI, SDK, backend, or schemas. Unless I explicitly requested that broader work, stop before implementing it, explain the scope and a smaller alternative, and get my approval. This applies even when the broader changes seem necessary to fulfill my request. If scope grows during implementation, stop and ask again before continuing.

# Herdr coordination

Before executing the first task in a session, check `HERDR_ENV`. When it is `1`, load `~/.agents/skills/herdr/SKILL.md` and resolve your live pane role before executing any requested skill, including expanded slash-command prompts. Do not wait for the user to mention Herdr. Outside Herdr, do not inspect or control its sessions.

The pane labeled `Coordinator` delegates whole tasks and skill invocations to task leads without waiting for completion. Explicit worker assignments take precedence: workers execute their assigned workflow and may create its required helpers, but do not delegate the whole task again. Unlabeled agents work normally. Recheck the role after a pane move or rename, or when resuming without role context.

# PR descriptions

Before drafting, creating, or updating a PR title or body, load `~/.agents/skills/pr-description/SKILL.md`, including when another skill handles submission. Always start the visible PR body with a one- or two-sentence TLDR of what changes, then an optional high-level diagram when it clarifies the flow, architecture, or knowledge change. Use short, single-topic paragraphs separated by blank lines, fenced diagrams, and a few descriptive headings when needed; avoid walls of text. Use STE-inspired plain English and verified Linear references: `Closes`, `Part of`, or `Related to`, according to the actual scope. Repository-specific PR rules take precedence.

# Work reporting

Use the shared `daylog` skill proactively after implementation, investigation, review, or another meaningful work segment; do not wait for the user to request logging. Load its instructions and execute `daylog add` before the final response for that segment, confirming `queued <candidate-id>`. A chat summary is not a submitted report. Athena decides journal relevance; include partial results and useful read-only findings rather than self-filtering them.

Do not duplicate an acknowledged report without a new delta, or report pure conversation/status-only replies. Respect explicit no-logging instructions and tool restrictions. If capture is unavailable or fails, briefly disclose that; never claim publication, bypass restrictions, or impersonate a human.
