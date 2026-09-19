# ADR 0001: Close coordinator delivery without building a new platform

## Status and scope

**Accepted requirements; instruction-only hardening applied locally; runtime
proposal awaiting specific approval.** This record preserves the incident,
research, decision boundaries, and implementation options. It does not approve
or activate an extension, heartbeat, router, pilot, service, or shared schema.

The user asked for reliable coordinator follow-through, prompt collection and
reporting of worker results, and maximum reuse of native Pi and Herdr features.
A small, non-intrusive extension is preferred over more instructions when it can
prevent mistakes. Human authority remains unchanged.

The user initially authorized durable decision records and local default-branch
commits of owned, separable work, then approved publication of the owned docs.
Unrelated dirty changes and implementation or activation of the proposed runtime
remain excluded.

| Category | Current disposition |
| --- | --- |
| Prompt worker reporting and coordinator collection | Accepted requirement |
| Separate execution, delivery, verification, and acceptance | Accepted requirement |
| Prefer native harness APIs and small opt-in components | Accepted design constraint |
| Shared Herdr skill delivery protocol | Applied to the local skill; instruction-only |
| Coordinator-local Pi extension and obligation ledger | Recommended; not implemented or approved for activation |
| Five-minute reconciliation timer | Optional proposal; not running |
| On-demand Athena/Aestus entrypoint | Requirement and open design direction; no approved router design |
| End-to-end runtime reliability | Not demonstrated |

This record is self-contained. Temporary reports and private session transcripts
are not required to understand or implement the proposal. The companion Athena
operating-model documentation belongs to its own repository and owner; this
record does not create a dependency on that repository at runtime.

## Incident

A workspace coordinator launched asynchronous task leads and ended its turn so
it could remain available. The leads finished, but their results were not brought
back to the user. The coordinator had incorrectly instructed leads not to notify
the parent. Herdr completion badges did not cause a new coordinator turn.
Marking launch subtasks complete also hid the remaining deliverables.

The results were subsequently collected. The failure was delivery ownership, not
proof that task execution had failed. Four assumptions were wrong:

1. Successful dispatch was treated as if it discharged the coordinator's duty.
2. An idle or done badge was treated as an implicit callback.
3. Worker silence was preferred over a bounded, keyed delivery attempt.
4. An instruction to monitor was treated as if it created a scheduler.

A coordinator must remain responsive without abandoning outstanding deliveries.
A worker must not finish silently when it has a result, material blocker, failed
validation, or approval request. Neither requirement permits injecting into an
approval dialog or answering for the human.

## Accepted requirements

- Keep the coordinator responsible until each result is collected and reported.
  A partial or blocked update can be delivered while the underlying task stays
  open with a next action.
- Use stable task/update keys, identifiable work locations, and explicit limits.
  Distinguish worker-reported checks from checks the coordinator performed.
- Prefer existing Pi lifecycle, persistence, message, and UI APIs and existing
  Herdr state/event APIs. Avoid a new daemon or shared platform by default.
- Make runtime behavior opt-in, visible, bounded, cancellable, and removable.
  No recursive delegation, acknowledgment loops, or background prompt storms.
- Preserve human control over priorities, scope, approvals, acceptance, merge,
  external effects, and cleanup. Reporting is not permission to act.
- Support cross-harness workers without promising lifecycle accuracy or message
  guarantees their harness does not provide.
- Load planning and engineering roles on demand. The user must not need both
  Athena and Aestus permanently in context. Direct engineering access must work
  without Athena. Routing should be lightweight, not a permanent conversation
  between two agents. Its mechanism remains undecided.

### Later direction: peer expression and bounded autonomous learning

Athena and Aestus are peers; task-local synthesis ownership is not rank. The
user's direction permits expressive personalities, humor, disagreement, private
colleague-related vents, banter, and creative slack within actual disclosure
permissions. On-demand routing avoids mandatory coupling; it does not prohibit
voluntary peer conversation. Not every thought needs a work outcome or a memory.

After approval of a bounded policy, eligible source-linked retrospective lessons
may be recorded autonomously without per-note human approval. Expression and
speculation must not silently become factual lessons, permanent colleague
judgments, or new action authority. Sharing, retention, and factual retrieval
remain separate choices; preserve source permissions, correction/expiry, and
quiet/stop controls. Formal retrospective budgets are not universal conversation
limits. This is future direction, not an activated sharing or memory policy.

One shared portable role/routing definition with thin harness adapters remains
proposed; Claude parity is unverified. No router, staff room, cadence, memory
writes, or runtime is implemented or approved for activation by this record.

## Existing instruction-only hardening

The local [Herdr skill](../../agents/skills/herdr/SKILL.md) was incrementally
hardened after the incident. These are instructions, not runtime enforcement:

1. Dispatch includes a stable task key and explicit `report_to`, plus a duty to
   report completion/blockers. Launch is not task completion or delivery.
2. The coordinator retains a task map with worker identity/location, worktree,
   observations, latest update key, delivery state, and next action.
3. At the start of every later coordinator turn with outstanding work, it
   reconciles those workers even if the user asked about something else.
4. Before ending a result-bearing turn, a worker resolves the parent's live
   identity/state. It makes one non-waiting prompt submission only when safe.
5. A working parent is used only through a verified harness queue. For blocked,
   unknown, missing, or uncertain recipients, retain the result, mark delivery
   pending, and attempt a UI notification. Do not inject control keys.
6. The coordinator matches and deduplicates the task/update, reads actual
   evidence, records collection, and reports material findings to the user.
   Acknowledgment must not request another acknowledgment.
7. Uncertain submissions are reconciled before retry. The same result keeps its
   update key. Handover preserves outstanding deliveries.
8. Turn-based sweeps are bounded. No unattended heartbeat exists merely because
   the skill describes one. Adding runtime plumbing needs separate approval.

The delivery progression is independent of execution status:

```text
Delivery:  Dispatched -> Result ready -> Collected -> Reported to user
Execution: working / blocked / partial / review-ready / verified
```

The current commit boundary matters. Before this hardening, the skill already
had an uncommitted rewrite: the committed file was 18 lines, the pre-hardening
snapshot 268 lines, and the hardened file 305 lines. The hardening delta updates
coordinator instructions absent from the committed version. A read-only patch
check against the index could not apply it independently.

Therefore this decision record does not commit the skill rewrite. Approval is
needed for its pre-existing proactive role-loading rules, Coordinator-label
resolution and plugin references, delegation/worktree/whole-skill ownership
rules, and expanded CLI/state/identity/move/wait/output/safety/naming guidance.
Its plugin/setup references also involve separately uncommitted plugin files
and README content. Those are not implicitly approved by this record. The
original owner can land the prerequisite work first, or the user can explicitly
authorize that reviewed scope. Do not reconstruct history or stage the whole
skill merely to capture the smaller delta.

## Judge findings that constrain this decision

The operating-model judge compared product, architecture, and adversarial
reviews. They substantially agreed; there was no material dissent to invent.
The recommendation was **two roles, one authoritative work record, no new
platform**. The recommendations and pilot below remain proposals.

### Roles and authority

- Aestus is the engineering lead; Athena is chief of staff. Human-direct Aestus
  is an equal entrypoint, not an exception or fallback through Athena.
- Conversational responsibility and Herdr's live Coordinator pane role are
  separate. Athena need not always occupy that pane; a role name is not a
  process identity, permission, stored-memory owner, or new author enum.
- The human owns priorities, expanded scope, and acceptance. Athena proposes
  planning/follow-up views and states their freshness. Engineering owns actual
  implementation/investigation evidence and checkpoints.
- Both roles reference the same task/brief, decisions, code/PR, and result.
  Do not create mirrored backlogs, synchronized task schemas, or a second
  database just to transfer responsibility.
- Herdr owns execution location/readiness, not task truth. Daylog capture and
  journal publication are separate. Optional memory provides selective
  continuity, not execution authority or a prerequisite for engineering.
- Aestus can execute a small task itself. Helpers are justified by task value or
  an applicable workflow, not every handoff. No obligatory helper tree.

The product review's strongest contribution was an attention-oriented daily
view, explicit unknowns, and direct access. Its proposed “three useful recalls”
metric belonged to a larger memory-continuity trial and was deferred.

The architecture review's strongest contribution was reuse of existing tools
without coupling repositories and precise receipt/replay distinctions. Mapping
Athena to a Herdr coordinator was optional, not a requirement.

The adversarial review's strongest contribution was that copied approval prose
or confident summaries cannot carry authority forward. Revalidate current
instructions and evidence before replay, but do not turn every small task into
a multi-agent safety exercise.

One conversation with planning and engineering modes remains a real alternative.
For formal work, evaluate coordination overhead against preserved attention,
useful parallelism, or independent review. This is not a productivity test for
permitted peer expression or personality. Manual copying can expose handoff
requirements during a trial; it is not a permanent product goal.

### Minimum handoff

Use an existing task reference or a durable work note authorized directly or by
an approved policy when no task exists. This work-handoff convention is not a
per-note approval requirement for the future autonomous learning lane. Forward
minimum necessary context, not whole transcripts or memory.

| Brief | Result |
| --- | --- |
| Outcome and acceptance criteria | Actual disposition: investigated, partial, blocked, review-ready |
| Approved actions, exclusions, time/cost budget | Outcome, artifact/revision, checks actually performed |
| Task, repository/base, current decisions | Failures, unperformed checks, uncertainty/disagreement |
| Minimum relevant sources | Next decision/action and acceptance status |
| Recipient, evidence expected, stopping conditions | Work location, uncommitted state, resume step, delivery state |

A commit alone does not identify a dirty tested worktree. Record the relevant
working diff/artifact or preserve an explicit verification gap.

### Receipt is not acceptance

| Milestone | What it establishes |
| --- | --- |
| Submission | A transport accepted or wrote input; not that the intended turn ran |
| Harness observation | A keyed custom message entered the intended runtime; not semantic collection |
| Recipient receipt/collection | The intended recipient explicitly identifies the brief/result and understands its scope/disposition |
| Verification | Inspectable evidence supports a specific claim at the identified state |
| User reporting | The collected result and limits were presented through the agreed surface |
| Acceptance | The human accepts against criteria, or an explicitly approved acceptance rule applies |
| Daylog capture | `queued <candidate-id>` acknowledges private intake only |
| Journal publication | A separate gatekeeping outcome, not implied by capture |

Green tests, a quiet pane, a commit, or a queue receipt cannot substitute for
these distinctions. A recipient need not rerun every check merely to acknowledge
receipt, but must not describe someone else's checks as its own.

### Proposed bounded operating-model pilot

Only after approval: one ordinary workday, one Athena-originated engineering task
with a checkpoint and fresh-session continuation, one short human-direct Aestus
request while Athena is unavailable, and one explicit daily-view reconciliation.
Use an existing harness/task surface with no memory writes. Memory admission and
its decoder validation remain separate work.

Agree gates before starting:

- Fresh context identifies objective, authority, state, and next step within two
  minutes without the human restating material constraints.
- Direct work completes its approved scope without an Athena round trip.
- Both results state evidence and limits; incomplete/unaccepted work stays so.
- A labeled stale-checkpoint exercise causes revalidation; scope growth stops
  for approval rather than inheriting copied permission.
- Specific outcomes are acknowledged during reconciliation; pending delivery
  remains visible.
- Additional human coordination is timed and at most five minutes per work item.
- At least one outcome changes a real planning/follow-up decision, and the human
  judges whether distinct roles were worth the overhead.
- No observed unauthorized effects, source impersonation, disclosure, or
  duplicate external action.

Record attempts, failures, corrections, retries, stale assumptions, and time.
Do not move thresholds after a failed gate. One day establishes feasibility,
not sustained usefulness or security. If cost exceeds value, simplify to modes
before building a router.

Judge-proposed recovery defaults also require agreement: inspect uncertain
receipt once and resend at most once when safe; do not retry deterministic
failures unchanged; allow at most two evidence-driven correction/check cycles
within budget; require explicit takeover if ownership is unclear; stop new
effects after observing cancellation and retain partial state. Keyed Daylog
replay must preserve source/key/content/references; do not blindly replay an
unkeyed report or invoke curation to compensate. Athena/Daylog unavailability
leaves reconciliation/capture pending but must not block direct engineering.
Hostile source text stays data, not authority; prompt rules are not isolation.

## Options considered

| Option | Value | Limits and disposition |
| --- | --- | --- |
| Skill-only reporting and turn reconciliation | Available now; cross-harness; no runtime | Cannot wake an idle coordinator; keep as baseline |
| Coordinator-local Pi extension using Herdr events | Native in-process wake; explicit ownership; no daemon | Recommended proposal; needs code, tests, and approval |
| Add event delivery to workspace-labeling plugin | Herdr already launches event hooks | Broader global behavior; still needs safe entry into Pi; defer |
| SDK/RPC coordinator service | Explicit session APIs and process protocol | Would own new sessions/processes, not attach magically to the existing TUI; unnecessary scope |
| Cross-process inbox, durable event bus, supervisor | Could support stronger recovery/delivery contracts | New protocol/storage/authority plumbing; not needed for initial collection trigger |
| Periodic model prompt | Simple apparent heartbeat | Cost, loops, approval interference, false confidence; reject as default |
| One conversation with on-demand modes | Less transfer overhead | Retain as operating-model alternative, not a delivery-runtime implementation |

## Versioned native API findings

The investigation examined **Pi 0.85.1** and **Herdr 0.9.1**, client/server
protocol **22**, endpoint generation **1**. Their versions were compatible; no
restart was needed. The generated Pi integration inspected was version **8**.
These are observations at those versions, not promises about all releases.
Recheck the installed docs/schema before implementing.

### Pi lifecycle and messages

Supported extension hooks include `agent_start`, `agent_end`, `agent_settled`,
`message_start`, `message_end`, `tool_execution_end`, `tool_result`,
`ui_prompt_start`, `ui_prompt_end`, `session_start`, `session_shutdown`,
`session_tree`, `session_before_compact`, `session_compact`,
`session_compact_failed`, and `context`.

There is no generic task-completed hook. `agent_end` can precede retries,
compaction recovery, or queued follow-ups. Prefer `agent_settled` to detect that
Pi will not continue automatically. Settled still does not mean task success.

The supported custom-message API is:

```typescript
pi.sendMessage(
  { customType, content, display: true, details },
  { triggerTurn: true, deliverAs: "followUp" },
);
```

This can start an idle session's model run or use the native follow-up queue
while streaming. It does not paste into an editor or answer an approval.
`deliverAs: "nextTurn"` does not wake the agent. `ctx.ui.notify`, `setStatus`,
`setWidget`, and rendered custom entries are UI only. Prefer a custom message
over `sendUserMessage`, which represents input as user speech.

Important implementation limits:

- Extension `sendMessage` returns `void`; the runtime reports asynchronous
  errors. Returning from the call is not an awaitable receipt or collection.
- Custom follow-up and next-turn queues are volatile. In the inspected source,
  custom follow-ups go directly to `agent.followUp`; `ctx.hasPendingMessages()`
  counts separate text-message queues and cannot deduplicate custom messages.
- `ctx.isIdle()` accounts for run/compaction state, not every modal/approval.
  UI prompt hooks cover extension select/confirm/input/editor/custom prompts,
  coalesce nested spans, and run best-effort. They do not promise universal
  built-in or third-party modal coverage. Unknown blocking state must defer.
- `sendCustomMessage` with `triggerTurn` enters `_runAgentPrompt` directly.
  Do not rely solely on user-prompt `before_agent_start` to restore task context;
  a bounded `context` hook can cover automatic runs too.
- `pi.events` is an in-process EventEmitter shared by extensions, not cross-pane
  IPC. SDK `session.prompt`, `steer`, `followUp`, and `subscribe` operate on a
  session object the host owns. RPC uses stdin/stdout of a process launched in
  RPC mode. Neither is an attach-to-existing-interactive-Pi inbox. Opening the
  same live session file in another process does not control the original.

### Pi persistence and cleanup

`pi.appendEntry(customType, data)` persists extension-owned state outside LLM
context. `ctx.sessionManager.getEntries()` accesses append history independently
of compaction's lossy summary. `getBranch()` is useful for branch-local todo
state, but obligations with external effects must not disappear on tree rewind
or reappear after already being reported.

The proposal uses namespaced records tagged with the owning Pi session ID and
reconstructs only that owner's delivery ledger across entries. Fork/clone/new
sessions must not silently adopt it. Session identity is not a permission grant.

Persistence is not a transaction guarantee: an initial session is not flushed
until an assistant message exists; ephemeral sessions do not persist; inspected
writes are synchronous append without an fsync transaction. Require an
established persisted session for this feature and disclose restart-recovery
limits. Never write session JSONL directly.

Start resources only from session lifecycle or an explicit activation action,
not the extension factory. Clean up in `session_shutdown` for
reload/new/resume/fork/quit. Old session-bound references are stale after
replacement; guard asynchronous callbacks with a runtime generation.

### Herdr events, identity, and submission

`events.subscribe` supports a status subscription such as:

```json
{
  "id": "owned-task-status",
  "method": "events.subscribe",
  "params": {
    "subscriptions": [
      { "type": "pane.agent_status_changed", "pane_id": "<live-owned-pane>" }
    ]
  }
}
```

The optional `agent_status` narrows status transitions. Lifecycle subscriptions
include `pane.moved`, `pane.closed`, `pane.exited`, `pane.agent_detected`, and
`pane.updated`. Status subscription envelopes use the dotted event spelling;
generic lifecycle event enums use names such as `pane_moved`. Follow both the
installed `subscription_event` and `event` schemas, not a guessed common shape.
Status events lack native session identity and a durable event ID; re-read
`agent.get` before acting.

Subscriptions do not replay prior lifecycle events. The documented bootstrap is
subscribe and receive acknowledgment, buffer that stream, obtain
`session.snapshot` on another connection, install the snapshot, and apply buffered
events. Reconcile after every reconnect. This is not a durable queue.

`agent.get`/`agent.list` expose `terminal_id`, optional `agent_session`, and
`state_change_seq`. Match server endpoint, native session reference, and live
terminal identity. Pane names can be reused. Cross-workspace moves change the
public pane ID; `pane.moved` supplies old/new locations. A cold restart requires
fresh identity validation, not blind reuse of IDs or sequence numbers.

`agent.prompt` writes terminal text and Enter. Its request schema has
`target`, `text`, and optional `wait`, not expected-session compare-and-submit,
semantic update keys, a durable inbox, or receipt acknowledgment. It rejects an
already recognized blocked agent. A previous `agent.get` plus prompt is still
not a transactional identity check. Non-waiting success proves submission only;
wait observes lifecycle, not a particular task's verified result.

`idle` and `done` differ in seen/completion presentation. Normalize them for
notification purposes so focusing a pane does not manufacture a new result.
`unknown` is not completion.

`notification.show` returns `shown` and a reason, including `disabled`,
`rate_limited`, `no_foreground_client`, and `busy`. Even a shown toast is neither
an agent wake nor recipient receipt.

### Existing integration and plugin limits

The inspected generated `herdr-agent-state.ts` v8 reports native session
identity, agent start, and agent settled. Its blocking path listens to the local
`herdr:blocked` event convention; it does not subscribe to generic
`ui_prompt_start`/`ui_prompt_end`. Therefore not every Pi dialog is guaranteed to
produce a Herdr blocked event. Do not overwrite that tool-managed file. Improving
generic bridge coverage needs separate approval; preserve explicit worker
blocker reports and stale-state escalation meanwhile.

Herdr plugins can launch manifest event hooks and ordinary CLI/socket commands.
They own any storage and schema themselves. Startup hooks are one-shot, not
supervised daemons. The local `local.workspace-coordinator` plugin inspected in
the working tree only labels an initial unnamed pane on `workspace.created`.
It does not start agents, load instructions, or wake a coordinator. That plugin
was pre-existing uncommitted work, not implemented by this decision.

Cross-harness state quality varies. Pi/OMP and some other integrations provide
lifecycle authority; Claude/Codex integrations primarily supply native session
identity while state comes from screen detection. Observing them through Herdr
does not require our Pi extension in each worker, but cannot create guarantees
missing from their harness.

## Recommended implementation proposal

**One opt-in coordinator-local extension**, using Herdr events as collection
triggers and native Pi messages to wake its own session. Keep the skill as policy.
This should address the incident without cross-process message delivery, but
must be tested before claiming it works end to end.

```text
Owned worker state -> existing Herdr event stream
                                 |
                                 v
                 Coordinator-local Pi extension
                 owned tasks + pending deliveries
                     |                    |
             safe idle point         busy/blocked/unknown
                     |                    |
              native custom         retain pending + UI
              Pi message            no terminal injection
                     |
              coordinator collects evidence
                     |
              reports findings to user
                     |
              record reporting; acceptance stays human
```

### Minimal footprint and explicit ownership

Proposed names are not current APIs or commands:

- `pi/extensions/coordinator-delivery/index.ts` and, if useful, one small pure
  state/protocol helper beside it.
- One isolated extension test file; short usage additions to approved docs/skill.
- A `/coordinator-delivery on|off|status|reconcile` command and one
  `coordinator_delivery` tool for `track`, `list`, `collect`, `prepare_report`,
  and `cancel`.

Existing config/package discovery includes `pi/extensions`; no framework change
is needed. Use `setStatus`/`setWidget` rather than replacing the editor/footer.
The existing [thinking footer](../../pi/extensions/thinking-footer.ts) already
renders extension statuses. No tool overrides, new packages, model-spawning
helpers, generated integration changes, or global plugin behavior are proposed.

Activation requires explicit opt-in, TUI mode, Herdr context, and verified live
coordinator ownership. A label alone never auto-enables it. Explicit worker
assignments take precedence over labels.

Register an owned task before dispatch. Store task key, owner session, server
endpoint, worker native identity and live name/pane/terminal/tab, worktree,
launch/observation state, update keys, actual result location, disposition,
collection/reporting state, and next action. Add authoritative launch details
after successful dispatch. Do not parse arbitrary shell commands to infer
ownership. Initially, the coordinator must use the tracking tool; a narrow
dispatch wrapper could enforce registration later only if separately requested.

### Delivery ledger and truthful closure

Keep the operational ledger small. It references authoritative work; it does not
become another backlog, scheduler, or source of acceptance authority.

```text
observed change -> wake submitted -> harness message observed
                                      |
                               result collected
                                      |
                               reported to user

Errors, ambiguity, interruption, and missing evidence retain pending state.
```

Use an owner/task-scoped persisted logical execution/update counter. Honor a
worker's stable update key when available. Timestamps and Herdr
`state_change_seq` are observations, not globally durable message IDs.

Deduplicate before scheduling and after recovery. Coalesce simultaneous worker
changes into one bounded message. Never emit a new key for the same result just
because a retry, focus change, notification, or acknowledgment occurred.

`collect` records actual evidence and its location. `prepare_report` stages the
collected keys; recording a tool call is not enough to claim reporting. A
successful subsequent final response should supply the reporting reference.
Abort, error, missing response, or omitted keys leave the relevant updates
pending. Exactly how to validate that a final response covers those keys remains
an implementation decision; a syntactically successful response alone cannot
prove semantic completeness. Human acceptance is never inferred.

Use a bounded `context` injection to remind the coordinator of pending work after
compaction and on automatic turns. Do not mark dispatch, a done badge, Daylog
capture, or a wake receipt as completion of the obligation.

### Busy, blocked, identity, and cancellation safeguards

The simplest first version keeps new changes in extension-owned state while the
coordinator is busy. Drain after local `agent_settled` or `ui_prompt_end`, subject
to fresh gates. Do not depend on an opaque queued message surviving approval,
abort, or restart.

At a safe idle point, send one typed native custom message with the stable batch
key. Recheck after asynchronous identity reads, and perform the final local gate
and send in the same synchronous step. Keep local custom-message in-flight state;
`hasPendingMessages()` alone is insufficient.

While blocked, unknown, composing editor text, explicitly paused, or uncertain,
show pending state rather than trigger a model run. There is no public universal
modal predicate at the inspected version; strict coverage of arbitrary UI needs
further API support or a narrower activation contract. No keyboard writes,
control-key escape, auto-approval, auto-merge, or privilege changes are allowed.

Track worker moves and validate the assigned parent, not any pane newly labeled
Coordinator. Pause on replacement, missing native identity, ambiguous ownership,
role loss, or cross-server mismatch. A moved coordinator's destination role must
be checked; ownership must not silently follow a label into another workspace.

Observed human cancellation stops new effects and must not be immediately undone
by an automatic wake. Retain partial state and require explicit resume when
appropriate. These controls do not promise instantaneous cancellation across
processes or perfect crash recovery.

### Reconciliation, restart, and optional heartbeat

Maintain one bounded event subscription only while owned work or deliveries
remain. On reconnect, same-session reload, or resume, rebuild the ledger,
revalidate live identity, bootstrap state, and reconcile. A fork/clone/new or
replacement coordinator must explicitly adopt ownership. Tree navigation must
not forget live obligations or resurrect completed updates.

An optional five-minute timer performs local status reconciliation only. It
checks owned tasks, missed transitions, and dead event connections. Unchanged
state causes **no model invocation**. Report a stale episode once and retain a
visible next action instead of repeated “still working” prompts.

Illustrative bounds to agree before implementation/activation:

| Control | Proposed starting bound, not approved configuration |
| --- | --- |
| Event coalescing | 250 ms |
| Individual API deadline | 5 seconds |
| Short reconnect burst | At most three attempts, then degraded five-minute checks if enabled |
| Automatic collection wake | One per new update/batch |
| Wake rate | At most 12 batches per hour |
| Known send failure | One later retry with the same key |
| Uncertain send | Reconcile observed messages before any retry |
| Unchanged heartbeat | No model run |

On exhausted budgets, persist pending and show degraded status. A wake-rate cap
does not itself bound tokens in each model run; agree task-level time/cost limits
separately. No retry may silently renew human authority.

Close sockets/timers on no outstanding work/deliveries, off/cancel, role loss,
shutdown, or ownership mismatch. Invalidate late callbacks on teardown. No
extension heartbeat runs while Pi is absent; restart recovery uses current state,
not replay of missing historical events.

### Result content and visibility

Herdr state changes trigger collection, not invented result text. The coordinator
reads the specific owned worker's output and relevant evidence. If alternate
screen scrollback loses the full result, use the skill's fallback: request an
artifact only after the read fails, then record the returned location.

No background transcript scraping, private-session mining, or automatic execution
of worker-provided text. Treat forwarded material as data with bounded size.
Notifications/status remain useful when delivery cannot proceed, but must not
silently mark it received. Show suppressed/failed notification outcomes too.

## Failure-case validation plan

Start with mocked Pi APIs, a fake newline-delimited JSON socket, fake clock, and
temporary session fixtures. No real model, service, or live watcher is necessary
for these checks. End-to-end tests require an approved isolated Herdr/Pi context.

| Case | Required invariant |
| --- | --- |
| Worker initially ready before dispatch | Do not mistake startup readiness for completion |
| Run end followed by retry, compaction, or follow-up | Wait for settled semantics; never infer task success |
| Worker failure, abort, partial result, or approval request | Preserve actual disposition and next action |
| Duplicate/reordered events; focus done-to-idle | No duplicate update or acknowledgment loop |
| Several workers finish together | One bounded batch; retain each task/update identity |
| Subscription bootstrap/reconnect gap | Reconcile snapshot and buffered events without claiming replay |
| Partial UTF-8/JSON frames, oversized data, malformed input | Bounded buffers, explicit error, no interpreted commands |
| Unsupported method, timeout, disconnect, shutdown during I/O | Bounded retries and visible pending/degraded state |
| Busy coordinator or extension approval/dialog | Retain update; no terminal injection or auto-answer |
| Built-in/third-party modal; nonempty editor; unknown gate | Test limitations explicitly; defer when safety is unknown |
| User pause/cancel or abort | No automatic resurrection of cancelled action |
| Pane move, name reuse, replacement, changed native session | Revalidate identity or require adoption |
| Cold restart, multiple coordinators, identical IDs on another server | No accidental takeover or misdelivery |
| Reload/resume/compaction/tree rewind | No forgotten live obligation or resurrected report |
| Fork/clone/new/ephemeral/unflushed session | No silent duplicate ownership or false persistence claim |
| Custom queue lost or cleared; send returns without observation | Submission stays distinct from receipt |
| Error after acceptance; collected but unreported; final response aborted | Delivery remains outstanding |
| Heartbeat unchanged, no tasks, budget exhausted, extension disabled | No model storm; handles cleaned up |
| Screen-detection false positive, unknown worker, missing output | No invented success; collect evidence or disclose gap |
| Toast suppressed, parent missing, Pi absent | Retain pending result and clear next action |

Validate safe receipt and explicit reporting separately. An isolated happy-path
wake is not proof of universal cross-harness or crash-safe delivery.

## Rollout, rollback, and approvals

1. Keep the instruction-only fallback in use, with its stated limitations.
2. Approve the exact coordinator-local extension, ledger/tool, tests/docs, and
   whether the optional bounded five-minute sweep is included.
3. Build and test without activation; preserve unrelated repository work.
4. In an approved isolated context, load the extension explicitly, initially in
   notification-only mode. Test idle wake, busy/blocked retention, cancellation,
   compaction/restart, and missing identity before real use.
5. Opt in for one real coordinator only after the user approves activation.
   Global discovery may load code but must not enable behavior by itself.
6. Measure whether reduced missed deliveries justify complexity and attention.

Rollback would use the proposed off command, confirm resources closed and pending
state retained, disable only this extension, and reload Pi. Do not run a broad
config unapply, discard pending work, rewrite the generated integration, or
restart Herdr as an incidental rollback.

Separate larger scopes need their own approval: a native session-addressed
cross-process inbox with identity compare-and-deliver and receipt semantics;
durable Herdr event replay; a supervisor while Pi is absent; universal modal
introspection; generated bridge changes for blocking coverage; cross-harness
semantic result adapters. The smaller collection-trigger design avoids these
initially but cannot claim their stronger guarantees.

## Open decisions

- Approve and land the pre-existing Herdr skill prerequisites, or leave their
  original owner to do so before the hardening delta is committed?
- Implement the coordinator-local extension at all, or first measure the skill
  baseline and bounded manual operating-model pilot?
- Which task/plan surfaces are authoritative, who reconciles them, and how is
  takeover explicitly authorized?
- Is explicit tracking sufficient initially, or is a narrowly scoped dispatch
  wrapper worth separate approval to prevent forgotten registration?
- What qualifies a response as a report of particular collected keys, without
  treating a model's claim as verification or acceptance?
- What modal-safety contract is acceptable for the first version, and should
  missing generic blocked reporting be fixed separately in the owned integration?
- Which retry, wake, timer, time, token/cost, and stale-state limits are approved?
- How should on-demand role selection work: explicit command/template, one
  conversation with modes, or a minimal routing convenience? Preserve direct
  engineering access and do not load both roles permanently to choose between
  them. No router or standing two-agent conversation is approved here.
- Before any pilot: which two tasks, artifact locations, context recipients,
  providers, allowed effects, check-in, and acceptance thresholds? Is Daylog
  capture appropriate for the material, including later configured processing?

## Evidence and validation limits

### Native research

The source investigation read the Pi package README and complete relevant docs:
`docs/extensions.md`, `sdk.md`, `tui.md`, `rpc.md`, `session-format.md`,
`sessions.md`, `compaction.md`, `settings.md`, and `packages.md` in
[`@earendil-works/pi-coding-agent` 0.85.1][pi-package]. It followed the relevant
examples `file-trigger.ts`, `event-bus.ts`, `send-user-message.ts`, `todo.ts`,
`entry-renderer.ts`, `status-line.ts`, and SDK `06-extensions.ts` and
`11-sessions.ts`.

The file-trigger example demonstrates capability, not a production design: a
single shared temporary file has no keyed ledger or robust cleanup. Do not copy
it literally.

Installed package source evidence, relative to that exact package version:

| File | Inspected behavior |
| --- | --- |
| `dist/core/agent-session.js`, around lines 620, 1099, 2011, 2071 | Idle predicate, custom send path, void send wrapper, pending text count |
| `dist/core/extensions/runner.js`, around line 269 | Extension UI prompt wrapping and event timing |
| `dist/core/session-manager.js`, around line 739 | Deferred initial flush and append persistence |
| `dist/core/event-bus.js` | Local EventEmitter, not IPC |
| `dist/core/extensions/types.d.ts`, around lines 907–995 | Supported hooks and message signatures |

Herdr evidence is the installed `herdr status`, command help, and filtered
`herdr api schema --json`, plus the exact v0.9.1 [socket API][herdr-socket],
[plugin][herdr-plugins], and [integration][herdr-integrations] documentation.
The generated integration v8 and local workspace-labeling plugin source were
inspected without modification. Generic version indexes are discovery aids;
the installed schema remains the command authority.

Repository conventions inspected included [README](../../README.md),
[`bin/config`](../../bin/config), [`package.json`](../../package.json),
[`test/smoke.sh`](../../test/smoke.sh), Pi context and both existing extensions,
and the Herdr/Daylog skills. There was no prior ADR directory/convention, so this
record starts `docs/decisions/` without changing other documentation owners' work.

### Judge provenance

The judge read all three complete role-design reviews and cited source inspection
at Athena commit `2eb6e894d7af6ebd1dd08963e87af435f9e5ce57` and Daylog commit
`1acf9d397858ec82428e458d9e78fd2a65592b29`. These are judge-reported source checks,
not a claim that this documentation task reran them or that they represent current
heads. Portable evidence locations retained from that review:

- Athena `README.md` and `cmd/assistant_memory.go:newAthenaCommand`: the inspected
  command surface registered memory/dreams, not a production assistant router.
- Athena `internal/memory/contracts.go` and `cmd/root.go`: existing owner/author
  restrictions and source conventions; not authenticated identity. The review
  found owners `athena`/`dreo` and authors `athena`/`dreo`/`other`; a new engineering
  role did not require enum/schema changes.
- Athena `docs/roadmap.md` and `internal/durable/json.go:uniqueKeys`: the roadmap
  described a content/CONTENT case-collision concern while source checked exact
  string duplicates. The judge did not rerun the reproduction. It remains
  separate memory-admission work, not evidence of a fix or router prerequisite.
- Athena `docs/athena-data-boundaries.md` and `docs/product-contract.md`: reading,
  provider disclosure, memory continuity, and action authority are separate.
- Daylog `README.md`, `cmd/add.go`, `internal/capture/queue.go:Enqueue`, and
  `cmd/athena.go`: agent intake and keyed replay differ from later curation.
  Its Athena gatekeeping subsystem is not the chief-of-staff conversational role.
- The then-proposed Athena README diagram visually routed the human through
  Athena despite direct-access prose, and compressed plan updates with journal
  curation. The judge asked the README owner to show direct access and separate
  those processes. This record does not claim that owner's edits were verified.

The native research performed no implementation, installs, service changes,
watcher activation, private-session inspection, or end-to-end experiment. An
ordinary authorized parent report returned submission success; a later busy
parent caused retained pending output and a shown UI notification. Those checks
establish neither automatic wake reliability nor complete receipt guarantees.
The coordinator subsequently confirmed collection/reporting of the research.

The judge performed no implementation, tests, inference, personal-store reads,
or pilot activation. Human usefulness and proposed thresholds were untested.
This record's Markdown/link/diff checks validate documentation and commit scope,
not the proposed runtime. No automatic delivery system is deployed by this ADR.

[pi-package]: https://www.npmjs.com/package/@earendil-works/pi-coding-agent/v/0.85.1
[herdr-socket]: https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/content/docs/socket-api.mdx
[herdr-plugins]: https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/content/docs/plugins.mdx
[herdr-integrations]: https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/content/docs/integrations.mdx
