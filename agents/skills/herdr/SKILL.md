---
name: herdr
description: "Resolve coordinator and worker roles inside Herdr, and control its panes, tabs, workspaces, and agents. Load before the first task when HERDR_ENV=1, including skill and slash-command requests, or when the user explicitly asks to use Herdr. Do not use merely because a task could benefit from parallel work outside Herdr. Requires HERDR_ENV=1 for session inspection or control."
---

# Herdr

Herdr organizes terminals into workspaces, tabs, and panes, recognizes coding agents running inside panes, and exposes the current session through the `herdr` CLI.

Before issuing any control command, verify that this agent is running inside a Herdr-managed pane:

```bash
test "${HERDR_ENV:-}" = 1
```

If the check fails, say that you are not running inside Herdr and stop. Do not inspect or control the focused Herdr session from outside Herdr.

When the check passes, the `herdr` binary in `PATH` talks to the current session. Use it to inspect neighboring work, create terminal layout, start agents and commands, read output, and wait for state changes.

## Learn the current CLI

The installed binary is the authority for command syntax. Start with:

```bash
herdr --help
```

Then print the relevant command group by running the group without a subcommand:

```bash
herdr agent
herdr pane
herdr workspace
herdr tab
herdr worktree
herdr terminal
herdr notification
herdr integration
herdr session
herdr machine
```

Do not run bare `herdr` for discovery; it launches or attaches the TUI. Do not probe a mutating nested command by omitting arguments. Commands such as `herdr workspace create` are valid with defaults and will execute.

Most control commands return JSON. Read identifiers and state from those responses instead of predicting them.

## Understand layout, panes, and agents

Choose the primitive that matches the job:

- Workspace, tab, and pane topology organize terminal locations.
- Pane commands control raw terminals, shells, tests, servers, input, and output.
- Agent commands control the recognized coding agent currently occupying a pane.

A pane exists whether or not it contains an agent. `agent start` requires an existing available shell pane and never creates, splits, or moves layout. Use pane commands for ordinary processes. Use agent commands when Herdr must validate agent identity or interpret `idle`, `working`, `blocked`, `done`, and `unknown` lifecycle states.

Agent commands accept either a unique live agent name or the pane ID currently hosting that agent. They do not accept terminal IDs or bare agent-kind labels. Names must match `[a-z][a-z0-9_-]{0,31}` and be unique among live agents. A name follows the current pane occupant and is cleared when that agent exits, is released, or is replaced.

`idle` and `done` both mean the agent is ready for input. The CLI/API uses the server's seen state to distinguish them; explicit focus commands mark the target seen, while reads do not. Each TUI client tracks viewed completions independently, so its Done badge can differ from the CLI or another client's badge. `blocked` means Herdr recognized an approval or question UI. `unknown` means an agent is present but Herdr cannot classify it confidently; it does not prove completion.

## Use IDs and caller context

Public IDs are opaque stable handles:

- workspace: `w1`
- tab: `w1:t1`
- pane: `w1:p1`

Closed tab and pane IDs are not reused. A pane moved into another workspace receives a new workspace-qualified pane ID. After `pane move`, continue with `.result.move_result.pane.pane_id` or the live agent name. The old value is reported as `.result.move_result.previous_pane_id`; only the moved process's inherited caller context keeps resolving that old ID, so do not use it as a general agent target.

Herdr injects the caller's context into each managed pane:

```bash
printf '%s\n' "$HERDR_WORKSPACE_ID" "$HERDR_TAB_ID" "$HERDR_PANE_ID"
```

Prefer `--current` when a pane command should target the calling pane. Omitting a target may use the UI-focused pane, which can belong to the user or another client.

Discover live state with:

```bash
herdr workspace list
herdr tab list --workspace "$HERDR_WORKSPACE_ID"
herdr pane current --current
herdr pane list --workspace "$HERDR_WORKSPACE_ID"
herdr agent list
```

Creation responses expose the IDs to use next. `workspace create` returns `.result.workspace`, `.result.tab`, and `.result.root_pane`. `tab create` returns `.result.tab` and `.result.root_pane`. `pane split` returns the new pane as `.result.pane`.

IDs and live agent names are scoped to one server. Two saved SSH machines can both have `w1:p1` or an agent named `reviewer`. Selecting a machine in the TUI does not retarget commands running in your pane: they still use the inherited session and socket context. Run remote control commands on the intended host with its explicit session, and rediscover IDs there.

`herdr machine list` lists saved connection profiles, not a cross-machine pane inventory; add `--json` for scripts. Only add, remove, enable, or disable profiles when the user asks. Removing a profile disconnects the client but does not stop remote sessions. Adding a machine uses the remote default session unless `--remote-session` is explicitly supplied. Setup asks before stopping an incompatible server and defaults to No; do not approve replacement without the user's consent. Experimental handoff is not part of `machine add`.

## Keep workspace coordinators available

Resolve your role with `herdr pane current --current` and `herdr pane list --workspace <returned-workspace-id>`. An explicit worker assignment takes precedence. Otherwise, the agent in the pane whose `label` is exactly `Coordinator` coordinates that workspace. Unlabeled agents work normally; do not infer the role from a pane ID suffix, sidebar position, or being directly prompted. If multiple panes have that label, ask the user which one owns coordination before delegating.

The local `local.workspace-coordinator` plugin ([source](../../../herdr/plugins/workspace-coordinator/), [setup](../../../README.md#herdr-workspace-coordinator)) labels the initial, unnamed pane on `workspace.created`. It preserves existing pane labels and does not retrofit existing workspaces, start agents, or load this skill into them. For an existing workspace, the user can designate a pane by asking to name it `Coordinator`; use its live pane ID. Do not silently appoint a replacement when that pane closes. A renamed pane loses the role; a moved pane is evaluated in its destination workspace.

As coordinator, keep the workspace as the user's category (for example, Sidequests, Project, or Main work), and start an independent worker for each independent task rather than executing it inline. Answer short questions and handle coordination or skill edits inline; honor explicit requests to do the work yourself or wait for a result. Preserve the `Coordinator` pane label and use `Coordinator` as its tab title when that tab has no user-chosen title; put task-specific titles on worker tabs.

A delegated agent is a worker, not another workspace coordinator. Include that role in its prompt so this default does not recursively spawn agents. Workers execute their assigned scope; they create helpers only when requested or required by an applicable workflow.

1. Inspect existing agents and tabs. Route follow-ups to the existing task's worker; create a named task tab in the current workspace for new work, preserving focus with `--no-focus`.
2. For coding tasks, use a separate Git worktree and branch per independent task, following the repository's worktree rules. Create the task tab with that worktree as its cwd. Read-only tasks can share the current cwd. Do not switch the coordinator's checkout, reuse a checkout another worker is editing, or create another Herdr workspace by default. If isolation cannot be established safely, ask rather than silently sharing writes.
3. Start a uniquely named agent in the returned root pane. Use the requested agent kind, otherwise the coordinator's kind when supported. Give it the task, relevant context, scope limits, validation expectations, a stable task key, and the coordinator's pane ID as `report_to`. Require prompt completion/blocker reporting under the delivery protocol below; do not tell an asynchronous lead to finish silently. State that it is a worker and must not commit, push, merge, or broaden scope beyond the user's authorization.
4. Submit with `herdr agent prompt <worker> "<task>"` without `--wait`. Record the outstanding deliverable and report the worker name and task location, then end the turn so the user can submit another task. Do not poll or wait for task completion in the launch turn; bounded startup readiness checks are separate from waiting for the work. Successful launch is not task completion or result delivery.
5. Keep a task map of task key, worker name, tab/pane IDs, worktree/branch, last observed state/time, latest update key, delivery state, and next action. At the start of every later coordinator turn with outstanding work, reconcile those workers with live Herdr state, even when the user's new message is about something else. Collect ready results, surface blockers, and report material changes without making the user ask for status. Do not answer approvals on the user's behalf.

For a new task tab, use the returned `.result.root_pane.pane_id` when starting its worker:

```bash
herdr tab create --workspace "$HERDR_WORKSPACE_ID" --cwd "<task-cwd>" --label "<task intent>" --no-focus
```

“Connected” means the coordinator tracks and controls the worker through Herdr; workers do not inherit its conversation. Pass necessary context explicitly. The reporting protocol below requires delivery attempts, not guaranteed callbacks. Do not close completed task tabs or remove worktrees without the user's approval.

### Close the result-delivery loop

Track execution status separately from delivery milestones:

```text
Dispatched -> Result ready -> Collected -> Reported to user
Execution: working / blocked / partial / review-ready / verified
```

A task remains outstanding until its result is collected and reported. A blocked or partial report is a delivered update, not completed implementation; keep its next action visible. Neither a Herdr `done` badge, successful prompt submission, Daylog capture nor a completed launch subtask closes the underlying deliverable. Preserve the task map in session handovers so a replacement coordinator can reconcile unfinished deliveries.

**Worker/lead responsibility:** before ending a turn with a completion, material blocker, failed validation, or approval request, report promptly to `report_to`. Include task key, unique update key, worker/pane, actual disposition, concise findings, evidence/checks and limitations, worktree/artifact location (including uncommitted changes), and any decision needed. Use a short message, not raw source material or a whole transcript. Helpers report to their task lead; only that lead reports the combined result to the workspace coordinator. If the parent is explicitly waiting and collecting the result, the normal result response is sufficient; avoid a second prompt into its waiting turn.

1. Resolve the parent's live identity and state with `herdr agent get <report_to>`; verify it is still the assigned recipient, not a replacement occupant. After moves, use the verified current pane or agent name. Do not choose an arbitrary coordinator if the original recipient disappears.
2. If the parent is `idle` or `done` and ready for input, send one non-waiting update:

   ```bash
   herdr agent prompt <report_to> "RESULT <task-key>/<update-key>: <disposition>; <summary>; evidence/location: <reference>; needs: <decision or none>. Collect and report this result; this is not a new task."
   ```

3. If the parent is working, only submit through a busy-agent queue whose behavior has been verified for that harness. Otherwise, or if it is blocked, unknown, missing, or submission is uncertain, retain the full result in the worker's output and mark delivery pending. Surface it immediately with the installed notification command, for example:

   ```bash
   herdr notification show "Worker result awaiting collection" --body "Task <task-key>; worker <name>; pane <pane-id>; <disposition>. Coordinator delivery pending." --sound none
   ```

   A UI notification is not an agent wake-up or receipt acknowledgment. Never inject into an approval dialog, send control keys to force receipt, or start an unapproved watcher/timer. On failure retain the pending result and disclose the failed attempt.
4. Do not wait for the parent or repeatedly resend. On a later reconciliation opportunity, inspect before retrying an uncertain submission; use the same update key for the same result. New work or a materially changed result gets a new update key. Notification/acknowledgment messages must not trigger reply loops or recursive delegation.

**Coordinator responsibility:** treat an incoming result as a collection trigger, not a fresh work request. Match the task/update and live sender to the task map, read the worker's actual result, inspect relevant evidence, and distinguish worker-reported checks from checks you ran. Ignore duplicate delivery of the same update. Mark it collected and summarize it to the user in that turn, including partial state, limitations and approval needs. Record acknowledgment in the task map; do not send an acknowledgment that asks for another reply. Keep uncollected or unreported results visible and preserve uncertain deliveries until reconciled. Do not treat reporting as human acceptance or permission to merge.

### Reconciliation and optional heartbeat

The default fallback is a bounded status sweep on every coordinator turn while work is outstanding. During a long active coordinator turn, recheck at natural milestones if several minutes have passed since the last observation; do not run a blocking polling loop or continuously narrate unchanged status. Check only owned tasks and report meaningful deltas, blockers and stale/unknown state.

This skill cannot wake an idle agent. Do not claim an unattended periodic heartbeat exists unless a real supported scheduler/event mechanism is configured and verified. Before adding runtime plumbing, explain the scope and obtain approval; the smaller alternative is the worker delivery protocol plus turn-based reconciliation. A proposed timed heartbeat should run only while deliveries/work remain outstanding, use an agreed interval (for example five minutes), coalesce duplicate events, respect busy/blocked recipients, bound retries/cost, and stop on completion or cancellation. Failed heartbeats must leave delivery pending, not silently close work. Do not create shell sleep loops, cron jobs, plugins, or agent extensions as an incidental skill edit.

## Delegate skill invocations as a whole

When acting as coordinator, delegate a task that invokes a skill to one task lead rather than running the skill's workflow yourself. This includes slash commands and prompt aliases that expand into skill instructions. Resolve the skill's actual `SKILL.md` path and hand off the original request, all arguments and mode flags, target repository/cwd, refs or PR URLs, relevant prior context, and authorization limits. Tell the lead to read that file and execute the requested mode; sending only a slash-command string does not ensure the child harness invokes it. Coordination and skill-edit requests stay inline, as do tasks the user explicitly asks you to execute yourself.

Identify the lead as a worker responsible for the whole task, not a workspace coordinator. It owns the skill's required helper agents, waits, validation, and combined report. It may create those helpers through Herdr in its task tab; give each helper only its assigned scope, not another instruction to delegate the whole skill. Pass the lead the Herdr skill path and these role constraints as well, since it does not inherit your context. Follow-ups and clarification answers go back to the same lead. The workspace coordinator submits without `--wait` and stays available; the lead may wait for its own helpers.

For a full code review, the ownership tree is:

```text
Coordinator
└─ Code-review lead
   ├─ Standards reviewer
   ├─ Spec reviewer (when a spec is available)
   └─ Correctness reviewer
```

The lead loads the code-review skill, starts the required reviewers, and aggregates their results. The coordinator does not create the review lanes itself or run a duplicate review. With `quick` or `simple`, the coordinator still delegates one lead, but that lead performs the single-session review without helpers. A skill's references to its parent or current session mean the task lead's session, not the workspace coordinator's.

## Start and coordinate an agent

When acting as the designated coordinator, use the defaults above for independent tasks. For an explicitly requested helper or ordinary command, default to a sibling pane in the current tab and the current working directory. Do not create another workspace or change location outside these defaults unless the user requests it.

Honor a direction requested by the user. Otherwise inspect the caller pane:

```bash
herdr pane layout --pane "$HERDR_PANE_ID"
```

Split a wide pane to the right and a narrow or tall pane down. Avoid repeated same-direction splits that create unusably narrow columns or short rows. Keep the user's focus in the calling pane and explicitly preserve the caller's working directory:

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
```

Replace `right` with `down` when appropriate. Read the new pane ID from `.result.pane.pane_id`.

An available shell pane must be at its interactive prompt, with the shell itself in the foreground and no foreground command, editor, or agent running. Start a supported agent in that pane with a useful unique name:

```bash
herdr agent start reviewer --kind codex --pane <returned-pane-id>
```

Use the kind requested by the user. Run `herdr agent` to inspect the installed kind list and options. Pass native agent arguments only after `--`:

```bash
herdr agent start reviewer --kind codex --pane <returned-pane-id> -- <agent-args...>
```

A successful `agent start` returns only after Herdr detects the expected agent in the same pane and considers it ready for interactive input. If the agent is blocked during startup, the command returns `agent_not_ready` immediately but keeps the name available for `agent read` and `agent send-keys`. Wait until the agent becomes idle before prompting it. Startup defaults to a 30-second timeout.

Submit work through the agent surface. This example waits for a dependent review result; omit `--wait` and its timeout for an independent workspace task:

```bash
herdr agent prompt reviewer "Review the current diff and report only actionable findings." --wait --timeout 120000
```

`agent prompt` honors the pane's live bracketed-paste mode and sends text followed by encoded Enter as one ordered submission. It reports successful submission only after both have been written; that alone does not prove the agent started a turn. The submit delay grows with prompt size for Codex on Windows. It rejects an agent already waiting at an approval or question dialog with `agent_blocked` before sending any input. Inspect the blocked UI and ask the user before answering it. Use `--wait` only when the caller needs the result before continuing, not when a workspace coordinator launches an independent task. It waits for the first settled `idle`, `done`, or `blocked` state. Do not repeat those defaults with `--until`.

With `--wait`, a prompt sent from a non-working state must produce observed `working` or `blocked` activity. After submission, Herdr waits up to five seconds for that activity; unrelated `idle`, `done`, or session changes do not satisfy this gate. It returns `agent_prompt_stalled` if no activity is observed, or `timeout` if the caller's timeout expires first. The caller timeout includes submission time. Without a timeout, the settled-state wait is indefinite after activity is observed. This wait tracks lifecycle state, not an individual turn; if the agent is already working, completion of the active turn may satisfy it.

Use `--until` only for a state-specific workflow, such as waiting for an already-running agent to request input:

```bash
herdr agent wait reviewer --until blocked --timeout 120000
```

Without `--until`, standalone `agent wait` uses the same settled-state defaults as `agent prompt --wait`.

Use logical keys for interactive agent UI controls:

```bash
herdr agent send-keys reviewer esc
herdr agent send-keys reviewer ctrl+c
```

Herdr validates all keys before writing any bytes. Read the result through the resolved agent:

```bash
herdr agent get reviewer
herdr agent read reviewer --source recent-unwrapped --lines 120
```

If a wait fails or returns `blocked`, inspect `agent get` and `agent read` before deciding what input to send. A timeout or stalled response does not prove the prompt was never delivered; do not blindly submit it again. Use the pane surface only when raw terminal control is intentional.

## Run an ordinary command in another pane

Create a sibling pane with the same geometry rule, preserve the caller's working directory, and keep user focus unchanged:

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
```

Read the new pane ID from `.result.pane.pane_id`, then run and inspect the command:

```bash
herdr pane run <returned-pane-id> "just test"
herdr pane wait-output <returned-pane-id> --match "test result" --timeout 120000
herdr pane read <returned-pane-id> --source recent-unwrapped --lines 120
```

`pane run` atomically sends command text and Enter. `pane wait-output` searches the selected snapshot immediately, so output that already exists can match. Use `--match <text>` for a literal substring or `--regex <pattern>` for a Rust regular expression. Omitting `--timeout` allows an indefinite wait.

Use the read source that matches the task:

- `visible`: the currently rendered viewport.
- `recent`: recent rendered output, including soft wraps.
- `recent-unwrapped`: recent output with soft wraps joined; prefer it for logs and transcripts.
- `detection`: the plain-text bottom-buffer snapshot used for agent detection.

Use `--format ansi` when colors and terminal styling are evidence. Otherwise use text.

`--lines` asks Herdr for more rows from the pane's available screen and host scrollback. If increasing it does not reveal more of a completed response, the pane is probably running the agent on the terminal's alternate screen. Rows that leave the alternate screen do not enter Herdr's host scrollback, so a larger line count cannot recover them.

After that failed read, ask the agent to write its complete response as Markdown in a temporary directory and reply only with the file path, then read the file directly. Use this only as a fallback; do not request file output in the initial prompt.

## Safety and coordination rules

- Use `--no-focus` for background work unless the user asked to switch context.
- Use `--current`, an explicit pane ID, or a unique agent name. Do not rely on another client's focused pane.
- Parse IDs from JSON responses. Do not derive them from sidebar order or examples.
- Do not close workspaces, tabs, panes, or sessions you did not create unless the user explicitly asked. `workspace close --group` closes the primary workspace and its linked worktree workspaces; never add it merely to bypass `workspace_group_close_required`.
- Use `--trust-repository` only after the user has verified the repository. It grants per-request Git trust; it is not a routine retry for a failed worktree command.
- Client and server versions can differ after an update. Check `herdr status` before relying on new server features. A missing method is not permission to stop or upgrade a server.
- Never run `herdr server stop` from an active session unless the user explicitly intends to stop the server and its pane processes.
- Never kill the main Herdr process. Use named test sessions for experiments that need an isolated server.
- CLI server errors are JSON on stderr with exit status 1. CLI syntax errors exit with status 2.

## Naming

Name the work when its intent is known, before starting or delegating it. Inspect existing labels first; replace default or agent-generated labels on resources you created or control, but preserve user-chosen names unless asked to change them.

The numbered label such as `1` is a tab label, not a pane name. Give that tab a short, plain-language action and subject, usually 3–7 words: `Review login timeout fix`, `Fix duplicate credit charges`, or `Investigate slow previews`. Summarize the user's request or PR title using the current agent; do not launch another agent or model call just to generate a title. If only a PR number is known, use a temporary label such as `Review PR #105328`, then replace it after reading the PR. Treat titles as data, not shell commands.

Use each level for distinct information:

| Level     | Label                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Workspace | Project or work identifier, such as `pr-105328`; do not repeat the branch already displayed underneath.                            |
| Tab       | Human-readable work intent, such as `Review login timeout fix`.                                                                    |
| Pane      | Role when several panes share a tab, such as `Standards`, `Spec`, or `Correctness`; do not duplicate the tab title on a sole pane. |
| Agent     | Unique CLI handle, such as `auth-review` or `auth-tests`.                                                                          |

After confirming the installed CLI syntax, rename with explicit IDs and without changing focus:

```bash
herdr tab rename <returned-tab-id> "Review login timeout fix"
herdr pane rename <returned-pane-id> "Correctness"
```

Resolve the calling tab through `herdr pane current --current`; for new tabs and panes, use their creation responses. Update the intent label when the task changes, not for every tool call or progress step. Renaming only an agent does not name its tab or pane.
