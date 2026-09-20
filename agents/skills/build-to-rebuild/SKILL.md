---
name: build-to-rebuild
description: Build a disposable first implementation and draft PR, have a read-only gpt-6-astra high agent judge its architecture and produce a handover, then give that handover to a fresh agent that reimplements the solution from the original base in a new worktree. Use for "build to rebuild", "implement then rethink", "architecture spike then clean rewrite", or when the first implementation should reveal the right design rather than become the final substrate.
compatibility: Requires an active Herdr session (HERDR_ENV=1), git, gh, Pi with openai-codex/gpt-6-astra, and the global herdr and ship-ticket skills.
metadata:
  owner: drdreo
tier: safety-critical
allowed-tools: Skill Read Write Edit Bash(mkdir:*) Bash(test:*) Bash(herdr:*) Bash(git:*) Bash(gh:*)
---

# Build to Rebuild

Use implementation as architecture research. The first PR is a disposable probe; the second implementation starts from the original base and may use only the spec, the unchanged codebase, and the review handover as design input.

## Invocation

`/skill:build-to-rebuild <ticket-key-or-url>`

Require one ticket or an equally concrete spec. Confirm before starting that the user authorizes two PRs and accepts the first as a permanent draft that must not merge.

## Orchestration surface

Require `test "${HERDR_ENV:-}" = 1` before starting or resuming. If it fails, ask the user to reopen this task inside Herdr and stop. Load the global `herdr` skill and print `herdr --skill`; discover current syntax through its command groups.

Herdr owns every child agent: probe, architect, and rebuild. Start interactive Pi through `herdr agent start`, never through `pane run`, a shell wrapper, a background process, or an external terminal. Do not use `--print`, `--no-session`, or inherit/fork the orchestrator's session.

Use a separate pane for each phase, with a concise unique role-plus-ticket agent name such as `architect-dx123`. Keep focus with the user (`--no-focus`). Prefer a sibling pane when it remains readable; worktree workspaces provide room for the review and rebuild. Record the returned IDs, not guessed sidebar positions. Keep completed agents visible until the user chooses to close them.

Before starting an agent, ensure its pane is at an available shell prompt in the intended worktree. Follow the repository's worktree setup; if direnv or Pi project trust requires approval, relay it to the user rather than bypassing it or starting without the required environment.

## Artifacts

Store orchestration files outside the repository under:

`~/.agents/runs/build-to-rebuild/<ticket-or-slug>-<utc-timestamp>/`

Use `.scratch.md` for every Markdown artifact. Record the repository path, ticket/spec, original base SHA, probe SHA and PR, worktrees, final PR, and accepted handover in `run-state.scratch.md`. For each phase, record its status, Herdr workspace/pane IDs, agent name, and Pi session path when available. Checkpoint immediately after creation or an external action and after each phase's validation.

If a run for the same ticket exists, offer to resume. Inspect its recorded agent, cwd, session identity, git state, and PR before sending input or starting a replacement. A timeout or lost pane is not permission to duplicate a running agent, create another PR, or discard completed work. Resume legacy artifacts without restarting their old shell runner.

### Observe and collect

Send the role brief with `herdr agent prompt <agent> <text> --wait --timeout 120000`. Give long briefs as an instruction to read their absolute file path. Use bounded `herdr agent wait` calls for subsequent waits; a wait timeout leaves the agent running. Follow progress with `herdr agent read <agent> --source recent-unwrapped --lines 120`. Ordinary Pi tool output is the live view; no custom progress-line protocol or log filtering.

On `blocked`, inspect the UI and relay the question to the user; never answer approval dialogs yourself. On `unknown`, a stalled prompt, or a wait error, inspect `agent get` and `agent read` before sending more input. Do not resend a brief until you know whether it was received.

`idle` or `done` means the agent is available, not that the task succeeded. Read the response and validate the phase's deliverable before advancing. The orchestrator saves the complete architect response to `architecture-handover.scratch.md` and the rebuild response to `rebuild-result.scratch.md`; these are not log captures. If terminal scrollback is incomplete, read the agent's saved Pi session. If that is unavailable, ask for the missing sections in smaller responses. Never persist a clipped read or a `BLOCKED` response as a completed handover.

## 1. Build the probe

Start a fresh Pi agent in a sibling pane and prompt it with `/skill:ship-ticket <ticket> --single --draft`, without `--babysit`. Give it only the ticket/spec and implementation constraints, not this skill, the review plan, or the run-state file. The probe invests as if its PR were final. Its brief must require Herdr for any further delegation and keep its working pane in the worktree it creates. Follow the global Herdr skill to open that worktree visibly if needed.

The probe PR stays a draft for its entire life. Draft status is the only disposability marker — no do-not-merge labels, title prefixes, or comments. Never mark it ready for review except through the endorsement path in §3.

Stop if the probe PR is not open or its checks reveal that the implementation never exercised the hard part of the problem.

## 2. Freeze the comparison

Capture these values from the probe PR and git:

| Value       | Meaning                                                |
| ----------- | ------------------------------------------------------ |
| `BASE_SHA`  | Merge-base of the probe head and its target branch     |
| `PROBE_SHA` | Exact probe head reviewed by the architecture agent    |
| `PROBE_PR`  | Draft PR URL and number                                |
| `SPEC`      | Ticket plus linked acceptance criteria and constraints |

Re-read the head immediately before §4 with `gh pr view <PROBE_PR> --json headRefOid --jq .headRefOid`; if it no longer equals `PROBE_SHA`, rerun the architecture review.

Create a detached sibling review worktree with `git worktree add --detach <review-worktree> <PROBE_SHA>`, then expose it with `herdr worktree open --cwd <repo> --path <review-worktree> --label <review-label> --no-focus`. Do not invent a detach flag for Herdr. The judge is read-only by instruction and tool list but keeps bash for git archaeology; this is not a security sandbox. Record its path and retain it through handover acceptance.

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

Start the architect in the review workspace's available shell pane:

```bash
herdr agent start <architect-name> --kind pi --pane <review-pane-id> -- \
  --model openai-codex/gpt-6-astra --thinking high \
  --tools read,grep,find,ls,bash,symbol_search,project_report,module_report,read_symbol,read_enclosing,lsp_diagnostics,lens_diagnostics \
  --append-system-prompt "You are a read-only architecture reviewer. Never mutate files, git state, GitHub state, or external systems. Do not delegate. Return your complete review in the conversation; the orchestrator saves it. Stop and report missing input when blocked."
```

Wait for startup readiness, then prompt it to read `architecture-review-prompt.scratch.md` by absolute path. Collect and save its complete response using § Observe and collect. Do not grant write tools just to save the handover.

Reject the handover if it merely restates the diff, lacks alternatives, or does not give the fresh agent enough decisions to implement without seeing the probe code. A reasoned endorsement of the probe's shape is a valid verdict, not a failure.

**Handover gate.** Present the recommendation, the rejected alternatives, and open questions to the user and wait for their decision:

- Rewrite accepted → continue to §4.
- Probe endorsed → offer to mark the probe PR ready for review; skip §4–6.
- Recommendation hinges on a product decision → stop.

## 4. Create a clean room

Create a new sibling worktree outside the repository from `BASE_SHA`, never from `PROBE_SHA` or the probe branch. Use `herdr worktree create --cwd <repo> --base <BASE_SHA> --branch <user>/<ticket>-rebuild --path <clean-worktree> --label <rebuild-label> --no-focus`. The branch must follow repository naming rules.

Do not merge, rebase, cherry-pick, copy files, or apply patches from the probe. Do not close or modify the probe PR; it remains evidence until the new PR is reviewed.

## 5. Run the rebuild agent

Prepare `rebuild-handover.scratch.md` from the accepted architecture review: retain the architecture decisions, rationale, abstract strengths, implementation plan, validation, and unresolved constraints. Remove probe identifiers, code excerpts, diffs, and citations to probe-only symbols; retain useful references to code that exists at `BASE_SHA`. Do not silently change the accepted design.

Write `rebuild-prompt.scratch.md` with:

- the absolute clean worktree path, branch, and `BASE_SHA`;
- the original spec and acceptance criteria;
- the absolute `rebuild-handover.scratch.md` path;
- repository-specific validation and PR rules already discovered.

Never give the rebuild agent the probe PR number, branch, worktree path, full review, or run-state file — with `gh` available, an identifier is one `gh pr diff` away from breaking the clean room. Check linked spec material for probe references before passing it through; provide the acceptance text instead when necessary.

The brief must say:

- Read the supplied handover, spec, and code at `BASE_SHA` before planning; do not inspect other implementations, sibling worktrees, or other run artifacts.
- Stop and ask when required input is missing; the orchestrator relays the question to the user.
- Use Herdr for any further delegation, passing only these same permitted inputs.
- Implement the recommended architecture from scratch; preserve strengths only as abstract properties described in the handover.
- Record any deviation from the handover and its evidence.
- Run repository-required tests, formatters, diagnostics, and review.
- Rebase safely onto the latest target branch before submission and rerun affected validation.
- Open a new PR without referencing any prior work; provenance is added afterward.

Start a fresh interactive agent in the clean workspace's available shell pane:

```bash
herdr agent start <rebuild-name> --kind pi --pane <rebuild-pane-id> -- \
  --model openai-codex/gpt-6-astra --thinking medium
```

Prompt it to read `rebuild-prompt.scratch.md` by absolute path, then observe and collect its result. Require a new PR URL, validation evidence, deviations, and unresolved decisions before treating the phase as complete. Verify the PR and worktree directly, not only the agent's completion claim.

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

| Failure                                                     | Action                                                                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Probe does not reach the hard architectural path            | Fix the probe before review                                                                     |
| Herdr unavailable                                           | Stop; ask the user to resume inside Herdr                                                       |
| Any agent blocked on an approval or question                | Relay to the user; never answer it yourself                                                     |
| Judge output is shallow or restates the diff                | Tighten the prompt and rerun the judge                                                          |
| Judge endorses the probe architecture                       | Handover gate: offer to promote the probe, skip the rebuild                                     |
| Recommended architecture needs a product decision           | Stop before creating the rebuild worktree                                                       |
| Rebuild agent reads or incorporates probe code              | Discard the rebuild branch and restart from `BASE_SHA`                                          |
| Original base no longer rebases safely                      | Report the conflict; do not fall back to building on the probe                                  |
| Wait times out or lifecycle is unknown                      | Inspect the existing agent; do not launch a replacement                                         |
| Agent exits or its pane disappears                          | Inspect saved session, artifacts, git and PR state; resume only after ruling out duplicate work |
| Agent is idle/done but deliverable is missing or incomplete | Continue that phase; do not advance on lifecycle state alone                                    |
