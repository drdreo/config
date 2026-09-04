---
name: build-to-rebuild
description: Build a disposable first implementation and draft PR, have a read-only gpt-5.6-sol xhigh agent judge its architecture and produce a handover, then give that handover to a fresh agent that reimplements the solution from the original base in a new worktree. Use for "build to rebuild", "implement then rethink", "architecture spike then clean rewrite", or when the first implementation should reveal the right design rather than become the final substrate.
compatibility: Requires git, gh, pi with openai-codex/gpt-5.6-sol, and the global ship-ticket skill. herdr (optional) provides the live orchestration UI and the probe information barrier.
metadata:
  owner: drdreo
  maturity: poc
tier: safety-critical
allowed-tools: Skill, Read, Write, Edit, Bash(mkdir:*), Bash(test:*), Bash(herdr:*), Bash(git:*), Bash(gh:*), Bash(~/.agents/skills/build-to-rebuild/scripts/run-agent.sh:*)
---

# Build to Rebuild

Use implementation as architecture research. The first PR is a disposable probe; the second implementation starts from the original base and may use only the spec, the unchanged codebase, and the review handover as design input.

## Invocation

`/skill:build-to-rebuild <ticket-key-or-url>`

Require one ticket or an equally concrete spec. Confirm before starting that the user authorizes two PRs and accepts the first as a permanent draft that must not merge.

## Orchestration surface

Check `test "${HERDR_ENV:-}" = 1` once at the start.

- **Inside herdr**: use herdr as the run UI. Print `herdr --skill` and follow it for syntax. Give each phase its own sibling pane with `--no-focus` so the user can watch without losing their place. Run the probe as a separate herdr agent (§1). Run the judge and rebuild scripts with `pane run`, then `pane wait-output --regex "BUILD-TO-REBUILD (DONE|FAILED)"` — the script prints exactly one of those sentinels.
- **Outside herdr**: run both script invocations in the background and poll. A foreground shell call is killed at the harness timeout long before an xhigh run finishes; treat a run that ends without a sentinel as failed.

## Artifacts

Store orchestration files outside the repository under:

`~/.agents/runs/build-to-rebuild/<ticket-or-slug>-<utc-timestamp>/`

Use `.scratch.md` for every Markdown artifact. Record the repository path, ticket/spec, initial PR, original base SHA, probe SHA, worktrees, orchestration surface, and final PR in `run-state.scratch.md` after each phase. If a run directory for the same ticket already exists, offer to resume from the last recorded phase instead of starting over.

### Progress contract

Long-running judge and rebuild agents must emit occasional standalone progress lines in this exact form:

`BUILD-TO-REBUILD UPDATE <phase>: <completed milestone>; next: <next step>`

Emit the first update after initial orientation, then only at meaningful milestones or after roughly five minutes without visible output. Keep each update to one short line, never narrate routine tool calls, and never include secrets. `run-agent.sh` mirrors these lines live to its supervisor and stores them in `<output>.updates.log`; it strips them from the final deliverable so the output file remains clean and atomic. The updates log may remain after failure for diagnosis. Inside herdr, inspect the pane output; outside herdr, tail the updates log while polling for the terminal sentinel.

## 1. Build the probe

Inside herdr: start a fresh agent (`herdr agent start probe --kind pi` in a sibling pane) and prompt it with `/skill:ship-ticket <ticket> --single --draft`. The probe agent never loads this skill, so the information barrier is real — it invests as if its PR were final. Wait on its lifecycle; relay a `blocked` state to the user instead of answering approval dialogs yourself.

Outside herdr: load and execute the global `ship-ticket` skill inline with `--single --draft` and without `--babysit`. There is no information barrier in this mode — the probe is built by the same context that knows about the rewrite. Note that in `run-state.scratch.md` so the comparison is honest.

The probe PR stays a draft for its entire life. Draft status is the only disposability marker — no do-not-merge labels, title prefixes, or comments. Never mark it ready for review except through the endorsement path in §3.

Stop if the probe PR is not open or its checks reveal that the implementation never exercised the hard part of the problem.

## 2. Freeze the comparison

Capture these values from the probe PR and git:

| Value | Meaning |
| --- | --- |
| `BASE_SHA` | Merge-base of the probe head and its target branch |
| `PROBE_SHA` | Exact probe head reviewed by the architecture agent |
| `PROBE_PR` | Draft PR URL and number |
| `SPEC` | Ticket plus linked acceptance criteria and constraints |

Re-read the head immediately before §4 with `gh pr view <PROBE_PR> --json headRefOid --jq .headRefOid`; if it no longer equals `PROBE_SHA`, rerun the architecture review.

Create a detached sibling review worktree at `PROBE_SHA` (inside herdr, `herdr worktree create` also gives it a visible workspace). The judge is read-only by instruction and tool list but keeps bash for git archaeology; the detached worktree is the containment, not a guarantee. Record its path and remove it only after the handover is accepted.

## 3. Run the architecture judge

Write `architecture-review-prompt.scratch.md` in the run directory. Include the repository path, `BASE_SHA`, `PROBE_SHA`, `PROBE_PR`, spec source, acceptance criteria, and this brief:

- Act as a read-only principal architect, not a line-level bug reviewer.
- Reconstruct the end-to-end flow and show a compact ASCII component/data-flow diagram.
- Judge boundaries, ownership, coupling, state, failure handling, extensibility, knowledge conciseness, operational cost, and fit with nearby architecture.
- Separate strengths worth preserving from weaknesses caused by the chosen shape.
- Compare at least two materially different alternatives, including the simplest viable one.
- Treat implementation effort and sunk cost as non-factors.
- Recommend one clean architecture and explain why it wins. If the probe's architecture is genuinely the best alternative, say so plainly and recommend promoting the probe — do not invent a rewrite.
- Produce an implementation plan from the original base. Do not produce patches or reuse instructions.
- Cite repository paths and symbols for factual claims. Label uncertain claims.

Require these headings: `System map`, `Probe approach`, `Strengths`, `Weaknesses`, `Alternatives`, `Recommended architecture`, `Clean rebuild plan`, `Acceptance and validation`, `Risks and open questions`.

Run the pinned read-only model (via `pane run` inside herdr, in the background otherwise):

```bash
~/.agents/skills/build-to-rebuild/scripts/run-agent.sh review \
  --cwd <detached-review-worktree> \
  --prompt <run-dir>/architecture-review-prompt.scratch.md \
  --output <run-dir>/architecture-handover.scratch.md
```

Reject the handover if it merely restates the diff, lacks alternatives, or does not give the fresh agent enough decisions to implement without seeing the probe code. A reasoned endorsement of the probe's shape is a valid verdict, not a failure.

**Handover gate.** Present the recommendation, the rejected alternatives, and open questions to the user and wait for their decision:

- Rewrite accepted → continue to §4.
- Probe endorsed → offer to mark the probe PR ready for review; skip §4–6.
- Recommendation hinges on a product decision → stop.

## 4. Create a clean room

Create a new sibling worktree outside the repository from `BASE_SHA`, never from `PROBE_SHA` or the probe branch (inside herdr: `herdr worktree create --base <BASE_SHA> --branch <user>/<ticket>-rebuild`). The branch must follow repository naming rules.

Do not merge, rebase, cherry-pick, copy files, or apply patches from the probe. Do not close or modify the probe PR; it remains evidence until the new PR is reviewed.

## 5. Run the rebuild agent

Write `rebuild-prompt.scratch.md` with:

- the absolute clean worktree path and branch;
- the original spec and acceptance criteria;
- the absolute `architecture-handover.scratch.md` path;
- repository-specific validation and PR rules already discovered.

Never give the rebuild agent the probe PR number, branch, or worktree path — with `gh` available, an identifier is one `gh pr diff` away from breaking the clean room.

The brief must say:

- Read the handover, spec, and code at `BASE_SHA` before planning.
- This is a detached, non-interactive run. Return `BLOCKED: <reason>` instead of asking a question when required input is missing.
- Implement the recommended architecture from scratch; preserve strengths only as abstract properties described in the handover.
- Record any deviation from the handover and its evidence.
- Run repository-required tests, formatters, diagnostics, and review.
- Rebase safely onto the latest target branch before submission and rerun affected validation.
- Open a new PR without referencing any prior work; provenance is added afterward.

Run the fresh implementation agent (via `pane run` inside herdr, in the background otherwise):

```bash
~/.agents/skills/build-to-rebuild/scripts/run-agent.sh rebuild \
  --cwd <clean-worktree> \
  --prompt <run-dir>/rebuild-prompt.scratch.md \
  --output <run-dir>/rebuild-result.scratch.md
```

After the rebuild PR opens, the orchestrator runs `gh pr edit` on it to add: the probe PR as architectural prior art, a statement that no probe commits were reused, deviations recorded in `rebuild-result.scratch.md`, and that it supersedes the draft probe. Do not close either PR.

## 6. Verify the handoff

Before reporting completion, from the rebuild worktree:

1. Ancestry — the first must pass, the second must fail:

```bash
git merge-base --is-ancestor "$BASE_SHA" HEAD
git merge-base --is-ancestor "$PROBE_SHA" HEAD
```

2. No cherry-picks — the patch-id intersection must be empty:

```bash
git rev-list "$BASE_SHA..$PROBE_SHA" | while read -r c; do git show "$c" | git patch-id --stable; done | cut -d' ' -f1 | sort > <run-dir>/probe.ids
git rev-list "$(git merge-base origin/<target> HEAD)..HEAD" | while read -r c; do git show "$c" | git patch-id --stable; done | cut -d' ' -f1 | sort > <run-dir>/rebuild.ids
comm -12 <run-dir>/probe.ids <run-dir>/rebuild.ids
```

3. Compare the final diff to the spec and the `Recommended architecture` section.
4. Confirm the orchestrator-added provenance on the rebuild PR is accurate.
5. Run the repository's normal review skill against the new PR.

Report both PR URLs, which one is the disposable probe, the handover path, the clean worktree, validation performed, architecture deviations, and unresolved decisions. Never merge either PR as part of this skill. Offer to close the probe PR once the rebuild PR merges; do not close it during the run.

## Failure rules

| Failure | Action |
| --- | --- |
| Probe does not reach the hard architectural path | Fix the probe before review |
| Probe agent blocked on an approval or question (herdr) | Relay to the user; never answer it yourself |
| Judge output is shallow or restates the diff | Tighten the prompt and rerun the judge |
| Judge endorses the probe architecture | Handover gate: offer to promote the probe, skip the rebuild |
| Recommended architecture needs a product decision | Stop before creating the rebuild worktree |
| Rebuild agent reads or incorporates probe code | Discard the rebuild branch and restart from `BASE_SHA` |
| Original base no longer rebases safely | Report the conflict; do not fall back to building on the probe |
| Script run ends without a `BUILD-TO-REBUILD` sentinel | Treat the output file as absent and rerun the phase |
