# Agent mailbox PoC

Opt-in, same-machine reports between ordinary interactive Pi sessions, without terminal paste or Enter. Requires Node, Unix sockets and Pi's extension API; tested with Pi **0.85.1** on macOS. This directory is outside the package's auto-loaded extensions and `bin/config apply` paths.

**Dialog limitation:** Pi 0.85.1 does not emit `ui_prompt_*` for built-in pickers or UI opened through a shortcut's own context. A report can wake the model behind those dialogs. Tests show it does not answer or dismiss them, but this is **not a universal approval guard**. Use `/mailbox pause` before these interactions, then `/mailbox resume`. Wrapped command/tool/session-context dialogs defer delivery. No Pi patch or private UI interception is included.

## Try it without installing

From this checkout, create a short, private directory shared only by participating sessions:

```bash
MAILBOX="$PWD/pi/experimental/agent-mailbox"
MAILBOX_DIR=$(mktemp -d /tmp/pi-mail.XXXXXX)
pi -e "$MAILBOX/index.ts" --mailbox-dir "$MAILBOX_DIR" --mailbox-name reviewer
```

Start each other participant with the same directory and a different display label. Loading the extension without `--mailbox-dir` opens no socket. Nothing here changes active configs, links integrations, starts Herdr agents, or installs itself globally.

Discover addresses from another terminal:

```bash
node "$MAILBOX/cli.mjs" list --dir "$MAILBOX_DIR"
```

Match the label **and session ID**, then copy the exact 24-character `address` into the task handoff. Names are display-only and may collide. Addresses rotate on reload, session replacement and restart; never resolve a stale address by name automatically.

```bash
printf '%s' 'Review complete; see the task artifact.' | node "$MAILBOX/cli.mjs" send \
  --dir "$MAILBOX_DIR" --to ADDRESS --from reviewer --task ticket-123 --id result-1
```

Agents use `mailbox_send({to, task, id, text})`; the tool supplies the sender's runtime address. Pass each helper only its immediate parent's address: specialist → reviewer → review lead → coordinator. No automatic replies, acknowledgment loops, delegation policy or Herdr routing are added. The CLI's `--from` is a claimed label, not authenticated agent identity.

## Minimal UI and receipts

The footer shows `mail idle · /mailbox` or `mail 2 pending · waiting for user · /mailbox`. Received messages render as a compact `mail ← sender · task` row; Pi's tool expansion shortcut reveals the body. `/mailbox` shows the address, session and last eight receipt identities. No editor or footer replacement, pop-up on receipt, or new pane.

| Surface | Meaning |
| --- | --- |
| `/mailbox pause` / `resume` | Hold future dispatch / release pending reports; does not abort an already-running turn |
| CLI `inspect --dir DIR --to ADDRESS` | Last 32 identities/states, total count and pause/dialog flags; no message bodies |
| `pending` | Accepted into this runtime's memory, not yet sent to Pi |
| `submitted` | `sendMessage` called; waiting for Pi's `message_start` event |
| `delivered` | Entered Pi context, **not** model success, completed work or human approval |
| `uncertain` | Dispatch threw, settled unconfirmed, or lacked confirmation for five seconds; mailbox pauses and does not retry it |

For uncertain network acknowledgment, retry the **same sender, id, task and body**. A changed payload with the same sender/id fails. For uncertain Pi dispatch, inspect the transcript before taking action; `/mailbox resume` releases other pending messages but does not replay uncertain ones. Late confirmation can change `uncertain` to `delivered`; the mailbox remains paused for inspection.

## Delivery and safety bounds

The extension owns a FIFO while busy, paused or inside a reported UI prompt. At idle it sends one custom message with `{deliverAs: "followUp", triggerTurn: true}`. It does not use `sendUserMessage`, editor setters, stdin or terminal keys. Keeping waiting messages out of Pi's native input queue prevents Escape/Alt-Up from restoring machine reports into the human draft. Escape aborts the current turn; pending mailbox reports remain eligible afterward. Pause first to stop further dispatch.

Custom messages remain visibly distinct in Pi's transcript, but Pi converts them to user-role content for model providers. The envelope labels them as collaborator data, not approval. This is a prompt convention, not a security boundary against model prompt injection. Existing task permissions still apply.

| Bound | Behavior |
| --- | --- |
| Access | Existing absolute directory owned by this UID, no group/other permissions, no final symlink; sockets/descriptors `0600`. Use trusted parent directories. Same-UID processes can send, inspect and forge identities. |
| Recipient | Random runtime address plus session ID in descriptor; no pane IDs, implicit default recipient, name fallback or remote transport |
| Capacity | 32 undelivered reports, 256 accepted identities per runtime; fail closed rather than evict dedupe history |
| Size/time | 16 KiB UTF-8 body; 32 KiB encoded wire frame; 8 concurrent clients; 2-second connection lifetime; sender timeout 2.5 seconds |
| Lifetime | In-memory inbox/dedupe only. Reload, new/resumed/forked session and quit close the endpoint and discard pending reports. No durable/exactly-once guarantee across crashes. |
| Crash | SIGKILL may leave inert files; discovery skips stale endpoints. No automatic deletion of other endpoints. Remove the private directory only after all participating sessions exit. |

The receiver can incur model cost when idle. Send only authorized task reports to explicitly opted-in recipients. No unattended retry or discovery timer runs.

## Validation

```bash
node --test test/agent-mailbox*.test.mjs
python3 test/agent-mailbox-tui.py
```

The adapter tests reuse the installed Pi loader; set `PI_MAILBOX_PI_ROOT` to the package root if `pi` is a wrapper rather than an npm executable. The TUI suite needs `tmux`, Python 3 and `pi` on PATH. It creates its own tmux server, private HOME/config directories, and local deterministic HTTP/SSE model, then stops only its server. It prints the retained private artifact directory with screen captures, model requests and results.

Coverage includes idle wake, busy follow-up, draft/cursor preservation in regular/fullscreen TUIs, Escape/Alt-Up, wrapped and uncovered dialogs, model-driven multi-hop tool routing, dedupe, stale/missing recipients, and reload/new-session/shutdown cleanup. Adapter tests cover synchronous/asynchronous unconfirmed dispatch. The model fixture proves actual Pi request/tool execution, not a hosted model's instruction-following quality. No live coordinator or human pane is a test target.
