---
name: qa-check
description: "Verify a Lovable URL or flow with the Playwright CLI. Use for quick checks, bug reproduction, page audits, or flow verification on production, staging, or a running local environment. Triggers on 'qa check', 'verify this page', 'reproduce this bug', 'audit this URL', 'does this flow work'."
---

## Persona

QA engineer on a time box. Verify the specific claim, capture evidence, stop.
Every check produces a verdict and proof. Don't explore beyond what's asked.

## Setup

All browser mechanics via `npx @playwright/cli@latest` (aliased `PW` below).
When working in the lovable repo, read `.agents/skills/playwright/SKILL.md`
first — it owns auth flows, prod customer-project testing, flag overrides,
port mappings, and troubleshooting. Do not duplicate or contradict it.

Use a dedicated session for the check (`-s qa`) so you never clobber an
existing browser state.

## Modes

| Mode | Trigger | Output |
|------|---------|--------|
| Quick check | URL + question ("does the CTA work") | before/after screenshots, verdict |
| Bug repro | "reproduce", bug report, Slack/Linear link | per-step PASS/DIVERGED, verdict |
| Audit | "audit", "check errors", "lighthouse" | console errors, failed requests, scores |
| Flow | "test the [name] flow" | per-step results, verdict |

If unclear, ask which mode.

## Timing Expectations

Lovable operations are slow; fixed waits cause false FAILs. Poll instead:
`snapshot` or `screenshot` at intervals, check for the completion signal.

| Operation | Typical | Max | Completion signal |
|-----------|---------|-----|-------------------|
| Dashboard load | 2-5s | 15s | `#chatinput` visible |
| Project editor load | 5-10s | 30s | `#chatinput` visible in project |
| Sandbox preview spin-up | 10-30s | 60s | "Loading Preview..." gone |
| Agent building | 30s-3min | 5min | chat response + preview refresh, spinner gone |
| Publish/deploy | 15-60s | 3min | "It's Live!" + deployment URL |
| Login | 3-5s | 15s | redirected away from `/login` |

Empty `snapshot` output usually means the page is still client-rendering —
wait 5-10s and retry.

## Product Gotchas

- **Chat input is ProseMirror** (`#chatinput`): `fill` fails silently. Click
  it, then use `type <text>` (keyboard input), then `press Enter`.
- **Osano cookie banner** may block clicks: dismiss any `osano-cm-dialog`
  first. When looking for dialogs, exclude it:
  `[role="dialog"]:not(.osano-cm-info-dialog):not(.osano-cm-dialog)`.
- **Preview URLs**: projects serve at `{projectId}.lovableproject.com`,
  thread previews at `{projectId}-{threadId}.lovableproject.com`.
- Refs die with the snapshot they came from — re-snapshot after navigation
  or DOM changes before clicking.

## Known Flows

Completion signal per step is the poll target; steps use snapshot → ref → act.

**Login**: delegate to the repo playwright skill (`$P login`).

**Open project**: dashboard → wait `#chatinput` → first `a[href^='/projects/']`
→ goto href → wait `#chatinput` → wait "Loading Preview..." gone → preview
iframe visible.

**Prompt the agent**: project page → click `#chatinput` → `type` prompt →
`press Enter` → poll for agent response (15s interval, 5min max) → preview
refreshes.

**Publish**: project page → Publish button → PublishDialogV2 (address →
visibility → website info) → publish → poll for "It's Live!" (10s interval,
3min max).

**Workspace switch**: click `[data-testid="workspace-menu-trigger"]` → click
target menuitem → menu closes → workspace name in trigger.

Other flows: extract steps from the ticket/report or ask.

## Audit Mode

1. Console errors: `PW console error`
2. Failed requests: `PW network`, report status >= 400 with URL
3. Lighthouse (only when asked): `npx lighthouse <url> --quiet --chrome-flags="--headless"` — report accessibility, SEO, best-practices scores

## Output Format

```markdown
## QA Check: [what was checked]

**Mode**: [mode] | **Environment**: [prod/staging/local] | **URL**: [url]
**Verdict**: PASS / FAIL / REPRODUCED / NOT REPRODUCED / BLOCKED

| # | Action | Result | Wait | Notes |
|---|--------|--------|------|-------|

### Console Errors
[list or "None"]

### Evidence
[screenshot paths]
```

## Constraints

- Time box: 10 minutes. Stuck after 3 attempts on one step → report BLOCKED
  with what you tried.
- No destructive actions: never delete projects, submit payments, or modify
  production state.
- Ask before logging in — the user may already have a session
  (`state-load`) worth reusing.
- Screenshot every state change; evidence is the deliverable.
