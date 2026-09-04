---
name: ship-ticket
description: >-
  Implement a Linear or GitHub ticket end-to-end: resolve the spec, create a
  drdreo/* branch in an isolated worktree, implement and validate the change,
  open one GitHub PR or an ordered GitHub PR stack, and optionally babysit CI
  and review feedback until merge-ready. Use for "implement this ticket",
  "take this ticket home", "ship SCA-123", or "do this and open a PR".
compatibility: Requires git and gh. Linear tickets require the linear CLI; stack mode requires the github/gh-stack extension; babysitting requires Pi's scheduled Agent tool.
metadata:
  owner: drdreo
tier: safety-critical
---

# Ship Ticket

Own one ticket through a reviewable, merge-ready change. Do not merge, enable
auto-merge, bypass a gate, or write to the issue tracker unless the user
explicitly asks.

## Usage

`/skill:ship-ticket <ticket-key-or-url> [--single|--stack] [--draft] [--babysit]`

Defaults: choose single versus stack from the change shape, publish ready for
review, and stop after opening the PR. `--babysit` authorizes recurring GitHub
reads, code fixes, pushes, and replies to review comments; it still does not
authorize merging.

## End State

- The ticket's acceptance criteria are implemented without unrelated cleanup.
- Every branch starts with `drdreo/` and lives in a sibling worktree.
- The change is validated, reviewed, committed, and pushed.
- One PR or a dependency-ordered GitHub PR stack is open with accurate metadata.
- With `--babysit`, monitoring stops when merge-ready or human action is needed.

## 1. Resolve and Resume

1. Require one ticket key or URL. Ask only when the ticket or a blocking product
   decision cannot be resolved from available context.
2. Confirm the authenticated GitHub login is `drdreo`:
   `gh api user --jq '.login | ascii_downcase'`. Stop on any other login.
3. Resolve the repository root, `origin`, and default branch. Read root guidance
   plus the nearest guidance for every directory likely to change.
4. Fetch the ticket and its comments. For Lovable Linear tickets use
   `linear issue view <KEY> --workspace lovable --json --no-pager`; follow linked
   specs and PRs. Resolve `linear.app/lovable/review/...` URLs by searching the
   review slug with `linear issue query`; if no issue matches, resolve the
   corresponding GitHub PR and use its body as the fallback spec. For a GitHub
   issue use `gh issue view` with comments.
5. Extract acceptance criteria, non-goals, rollout constraints, and manual
   verification. Keep the ticket as the Spec source for review.
6. Search open and closed PRs, local branches, remote branches, and worktrees for
   the ticket key. Inspect any merged match against the acceptance criteria and
   confirm it was not reverted before ending the run.
7. Resume only an open PR authored by `drdreo` whose head is the expected
   `drdreo/...` branch in this repository. Resume a local worktree only when its
   branch and remote match that PR. Treat another author's work as coordination
   evidence: report it and ask before changing anything.

Never change Linear status or post a Linear comment unless the invocation asks
for that write explicitly.

## 2. Branch and Worktree

Fetch `origin` before choosing a base. Never branch from a stale local trunk.
Use a sibling path outside the repository, such as
`../<repo>-<ticket-lower>-<slug>`; never create a worktree inside the repo.

Choose the branch name in this order:

1. The ticket's recommended branch name when it starts with `drdreo/`.
2. Otherwise `drdreo/<ticket-lower>-<short-kebab-slug>`.

Keep the suffix lowercase, concise, and free of additional `/`. If the repo has
an executable branch-name checker, run it. In Lovable this is
`scripts/branch-name-check.sh`.

Resume an existing matching worktree after verifying its branch and ticket. For
a new branch, create the sibling worktree from `origin/<trunk>`. Never delete,
reset, overwrite, or reuse an unrelated worktree to resolve a collision.

Follow the repository's fresh-worktree setup. In Lovable, read
`AGENTS-REFERENCE.md` § Worktree recipes before validation and prefix devenv
commands with `direnv exec .`.

## 3. Choose One PR or a Stack

`--single` and `--stack` override judgment. Otherwise use one PR by default.
Choose a stack only when the ticket has two or more dependency-ordered units
that are independently understandable, testable, and reviewable. Do not stack
merely because the diff spans backend and frontend.

Before editing, write the intended units and dependency order. Foundational
contracts go below consumers. Every stack branch must use
`drdreo/<ticket-lower>-<layer-slug>`.

For stack mode, load the registered `gh-stack` skill before running stack
commands. All commands must be non-interactive. Initialize the first existing
branch against trunk, add later layers only from the stack top, and put each
change on the lowest branch that owns it. `gh stack` uses branch names verbatim;
it will not add the `drdreo/` prefix.

Resume a published stack by stack or PR number with `gh stack checkout`, never
by reinitializing its branches. Verify local tracking and PR bases first. If a
conflicting local stack blocks checkout, follow the `gh-stack` skill's
`unstack --local` recovery only after proving it preserves the same remote
branches and PRs; otherwise stop for human direction.

## 4. Implement

1. Track the work as an explicit task list and keep exactly one implementation
   step in progress.
2. Read target symbols and their call sites before editing. Read nested guidance
   and invoke any domain skill required by the repository.
3. Implement the full acceptance criteria. Do not leave TODOs or defer the hard
   part unless the ticket says to.
4. Add or update tests for behavior that can regress. For user-facing behavior,
   make the repository-required analytics decision.
5. Keep unrelated findings out of the diff. Report blockers instead of fixing
   broken trunk as a side quest.

All reads, edits, commands, and delegated work must target the ticket worktree,
not the main checkout. A delegated agent must receive the absolute worktree path
and must not commit or push unless its brief explicitly assigns one stack layer.

## 5. Validate and Review

Run the repository-prescribed format, lint, typecheck, test, and generation
commands for changed areas. Preserve full exit codes; do not pipe validation
through output filters. In Lovable, run commands through `direnv exec .` and
follow the worktree-safe validation guidance.

Then:

1. Inspect the complete diff and status for accidental files, generated drift,
   secrets, debug code, stale comments, and unowned added paths.
2. Run any repository pre-review sweep. In Lovable, use
   `tools/pr/PRE_REVIEW_SWEEP.md` when present and run the CODEOWNERS coverage
   check before pushing.
3. Run the registered `code-review` skill with the ticket as Spec. Review a
   single PR against `origin/<trunk>`; review each stack layer against its
   immediate parent.
4. Fix every verified Standards, Spec, and Correctness finding at or above
   medium severity, then rerun affected validation.
5. Do not submit with failing checks or unresolved correctness/spec findings.

If an unrelated failure also occurs on `origin/<trunk>`, record evidence and
report the blocker. Do not open an unsolicited fix for trunk.

## 6. Commit and Submit

Commit cohesive units with the host repository's convention. In Lovable use
`type(scope): imperative description`, first line at most 80 characters, and
commit via `direnv exec . git commit ...` so hooks run. Never use `--no-verify`.

Fetch trunk again before submission. Rebase safely, rerun validation affected by
conflict resolution, and never use a destructive reset. Confirm the diff and
commit list contain only this ticket.

### Single PR

Push with upstream tracking and create or update the PR with `gh`. A new PR is
ready for review unless `--draft` was supplied. Use the default branch as base
and the exact `drdreo/...` branch as head.

### GitHub PR stack

Use `gh stack submit --auto --open` for ready PRs, or omit `--open` only for
`--draft`. Verify with `gh stack view --json`. Then run `gh pr edit` for every PR
because auto-generated metadata is not the final review contract. Keep each PR's
base pointed at the branch directly below it.

### PR metadata

Use a semantic title valid for the repository. The body contains:

- `## Summary`: what changed and why, including the ticket key.
- Stack position and dependency when stacked.
- `## Test plan` only for manual verification actually performed or explicit
  reviewer instructions.

Do not list CI, lint, typecheck, or automated test commands in Lovable PR test
plans. Keep title and body true to the final diff after every review-driven
change. Apply special labels or bypasses only when repository guidance permits
and explain the reason in the PR body.

## 7. Optional Babysitting

Run this section only with `--babysit` or equivalent explicit wording.

After submission, call the Pi `Agent` tool with
`subagent_type: general-purpose`, `schedule: "+10m"`, `isolation: off`, and a
self-contained prompt containing the absolute worktree, ticket key, trunk,
ordered branch/PR list, acceptance criteria, stack mode, and this monitoring
contract. Save the returned job handle. If scheduled agents are unavailable,
run one immediate pass, report that recurring babysitting was not started, and
never emulate it with `sleep`.

Use chained one-shot schedules, not a permanent interval: when a pass ends in a
non-terminal wait, it schedules the same self-contained monitor for `+10m`; on
a terminal condition it schedules nothing. Store state in
`<worktree>/.ship-ticket-<key>.scratch.md`, including start time, pass count,
last head SHA, observed check runs, handled comment/thread IDs, completed
external actions, and consecutive clean passes.

Acquire ownership with an atomic `mkdir <state>.lock`; if it already exists,
exit without mutation because another pass owns the PR. Remove the lock on exit.
Write state to a sibling temporary file and atomically rename it. Journal an
action ID before any push, reply, retry, or resolution; after an uncertain API
failure, re-read remote state before retrying.

Each monitor pass must:

1. Fetch PR state, head SHA, required checks, failed-run logs, reviews, issue
   comments, inline comments, and unresolved review threads. Include the named
   automated reviewers required by repository guidance; ignore approvals and
   non-actionable status bots. In Lovable, wait for triage-bot reviews and apply
   the risk-tier approval rules from root `AGENTS.md`.
2. Deduplicate by check run, comment/thread ID, and head SHA. Never reply twice.
3. Before editing, fetch `origin`, require the PR head still equals the observed
   SHA, and synchronize the local branch. Use `git pull --ff-only` for a single
   branch. For a stack, use the `gh-stack` sync path, inspect output for a
   successful sync rather than trusting exit 0, and verify every local/remote
   head. Stop on divergence or uncommitted local work.
4. Distinguish branch failures from flaky infrastructure and failures already on
   trunk. Retry only a clearly flaky run; never patch trunk from this ticket.
5. For branch-caused failures or valid feedback, edit the owning branch, run
   focused validation, commit, re-fetch, re-check the remote head, and push. In
   Lovable, pull again before the next push after a lint failure because
   `pr-lint-autofix` may have pushed. In stack mode fix the lowest owning layer,
   rebase its upstack, and push according to the `gh-stack` skill.
6. Reply to actionable comments only after the fix is pushed. For questions or
   rejected feedback, reply with concise evidence. Append
   `🤖 Automated by ship-ticket` to every automated GitHub reply.
7. Resolve a thread only after its concern is fixed or answered. Never dismiss a
   High/P1 finding without explicit human approval.
8. Refresh stale PR titles/bodies after implementation changes.

Stop monitoring and report when any terminal condition holds:

- PR or stack is closed or merged.
- All required checks pass, required approval is present, every repository-named
  automated review has landed, no actionable thread remains, and activity is
  unchanged across two passes: report **merge-ready**, but do not merge.
- Progress requires a product decision, secret/access, high-risk human approval,
  destructive action, gate bypass, or a fix outside ticket scope: report the
  exact human action needed.
- A repository-required automated review has not appeared within 40 minutes of
  the current head, or total babysitting exceeds 24 hours: stop and report the
  stalled signal instead of scheduling forever.
- The same fix fails twice: stop retrying and report commands plus evidence.

## Final Report

Return the ticket key, PR URL(s) in dependency order, branch name(s), worktree
path, validation performed, review dispositions, and any manual follow-up. With
`--babysit`, also report the scheduled monitor handle or its terminal result.
