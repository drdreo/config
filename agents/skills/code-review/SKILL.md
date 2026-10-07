---
name: code-review
description: "Review the changes since a fixed point (commit, branch, tag, or merge-base) along three axes: Standards (does the code follow this repo's documented coding standards?), Spec (does the code match what the originating issue/spec asked for?), and Correctness (bugs, edge cases, regression risk). By default, runs the reviews in parallel sub-agents, reports them side by side, and ends with a go/no-go verdict (one-way or two-way door) that approves the PR with LGTM or posts the blocking findings. With quick, simple, --quick, or an explicit quick/simple review request, runs a single in-session bugs/regressions pass instead. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to \"review since X\"."
---

## Mode selection

If the user passes `quick`, `simple`, or `--quick` as a mode argument, or explicitly
asks for a quick/simple review, follow only **Quick review** below, then stop.
Remove the mode argument before interpreting the remaining target/instructions.
Otherwise follow **Full review** unchanged.

Examples: `/code-review quick main`, `/code-review simple <PR-URL>`, or
`/skill:code-review quick main`. Without a mode, `/code-review main` uses the
full review. `quick` and `simple` are aliases for the same lightweight mode.

## Quick review

A lightweight, read-only review in the current agent session. No sub-agents,
Herdr orchestration, spec discovery, standards/baseline audit, or mandatory
three-pass exploration. Do not run the full-review process or post PR comments.

1. **Choose scope.** Honor an explicit ref, PR, or working-tree scope. For a ref,
   verify it resolves and use `git diff <ref>...HEAD`. For a PR, use its actual
   base/head diff, not an unrelated local checkout. Without a target, inspect
   `git status --short`: review staged and unstaged changes against `HEAD` plus
   relevant untracked source files (do not read likely secrets or generated
   artifacts). With a clean tree, use the merge-base with the local ref for the
   repository's configured default branch; ask only if that cannot be determined
   unambiguously. State the scope; stop if there is no diff. Do not change branches
   or modify the working tree to obtain the diff.
2. **Inspect once.** Read the diff and enough surrounding code, direct callers,
   and relevant tests to check likely bugs, regressions, error handling, and
   security issues. Follow repository instructions, but skip style/naming nits,
   speculative refactors, and external issue/spec lookup unless the user supplies
   that context. Prioritize risky changes; disclose anything left unreviewed
   rather than silently escalating to the full workflow.
3. **Report briefly.** Link the PR when reviewing one (never a bare number).
   Give a sentence describing the change, then one list of
   actionable findings ordered by severity. Each finding needs `file:line`, a
   concrete failure scenario/impact, and a fix direction when known. No three-axis
   headings, quotas, or forced praise. If none, say "No actionable issues found
   in this quick pass." End with scope limitations and tests run versus merely
   inspected. Do not claim tests ran unless they did; run only focused, inexpensive
   checks when useful, never a full suite by default.

## Full review

Three-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards**: does the code conform to this repo's documented coding standards?
- **Spec**: does the code faithfully implement the originating issue / spec?
- **Correctness**: is the code free of bugs, unhandled edge cases, and silent regressions?

All axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.

### Pi execution contract

The **review lead** is the agent executing this full-review workflow. It owns
clarification, helper orchestration and aggregation. References below to the
parent or current session mean this review lead, not the workspace coordinator
that may have delegated the review.

```text
Workspace coordinator (when present)
└─ Review lead — reports the combined review to the coordinator
   ├─ Standards — reports only to the review lead
   ├─ Spec — reports only to the review lead
   └─ Correctness — reports only to the review lead
```

Keep the lead's upstream `report_to` separate from helper routing. Never copy
that upstream recipient into a helper prompt. Helpers do not discover or target
a pane labeled `Coordinator`; their immediate parent is the review lead. A
standalone review has no upstream coordinator: the lead reports to the user.

Sub-agents run in isolated, non-interactive sessions:

- If input is missing, require it to return `BLOCKED: <reason>`.
- Before launching reviewers, run `test "${HERDR_ENV:-}" = 1`.
- When the check passes, launch every reviewer through Herdr so its pane and lifecycle remain visible. Run `herdr --skill` once per review and follow it; the installed CLI is the syntax authority. Use the caller context Herdr injects instead of discovering topology, and open a command group's help only when the guide doesn't cover a step or a command fails. Do not launch child Pi processes directly through Bash.
- When the check fails, use detached Pi subprocesses unless the user explicitly requested Herdr. An explicit Herdr request outside Herdr is blocked; report that Herdr is unavailable and stop.
- Record every reviewer pane, process, and temporary file created by the run so cleanup cannot affect user-owned resources.

Prefer the repository's project-local issue-tracker guidance and fall back to the PR body.

## Process

### 1. Pin the fixed point

Use the ref or PR the user gave; ask if there is none. Review the diff against
the merge-base (for a PR, its actual base/head), and confirm it resolves and is
non-empty before spawning reviewers.

### 1a. Consider the PR stack

If the PR is part of a stack, understand its place in it before judging scope or
rollout safety. Review only this PR's diff, using the other members as context.
Do not flag work that a later member owns. Do check that this PR is safe if it
deploys alone. Give every reviewer the same stack context, and report what you
could not verify.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.), fetched via the applicable repository guidance.
2. A path the user passed as an argument.
3. A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

### 3. Identify the standards sources

Anything in the repo that documents how code should be written, such as `CODING_STANDARDS.md`, `CONTRIBUTING.md`, or prompting guidance for knowledge files.

On top of whatever the repo documents, the Standards axis flags design problems that agent-written code still tends to introduce, even when the repo documents nothing:

- Speculative abstraction, parameters, or fallbacks the spec doesn't need.
- Logic duplicated within the change, or reimplemented where an existing helper fits.
- Dead code, leftover scaffolding, or comments that narrate the change.
- Knowledge files (skills, prompts, AGENTS.md, agent docs): instructions that do not change useful behavior or that the agent would infer by itself; instructions it cannot follow with its actual context and tools; ambiguous wording; restrictions broader than intended; rules that duplicate, contradict, or sit at the wrong scope relative to existing guidance; and volatile details that should point to their source. Every word should earn its place: propose the simpler wording that keeps the meaning.

These are judgement calls, not hard violations, and default to `minor`. An instruction the agent cannot follow, or a restriction broader than intended, can be `major` because it changes agent behavior. A documented repo standard overrides them, and anything tooling enforces is skipped.

### 4. Spawn the sub-agents in parallel

When running through Herdr:

- Name the workspace and tab after the review (for a PR, `pr-<number>` and a
  short intent such as `Review login timeout fix`), keeping user-chosen names.
- Open one sibling pane per active axis, labeled `Standards`, `Spec`, or
  `Correctness`, without stealing focus. Start a Pi agent in each with the
  lead's own provider, model, thinking level, and approval settings.
- Start every reviewer before waiting on any, so the axes run in parallel.

Include this routing instruction in **every active sub-agent's prompt**, with
real values filled in:
"You are the <axis> helper for review task <task-key>. Report only to the
review lead <lead-agent-identity> at report_to=<lead-pane-id>, never to the
workspace coordinator or sibling reviewers. Return findings or BLOCKED as your
final output; send approval needs and failures to the lead the same way. If
delivery fails, keep the result and mark it pending instead of rerouting it."

For detached subprocesses, collect each reviewer's output directly.

Include this reporting instruction in **every active sub-agent's prompt**:
"After your findings, note up to two concrete strengths supported by the diff
or inspected tests, with a file/symbol reference and why they matter. Do not
invent praise or treat an absence of findings as proof of correctness. State
any review limitation; distinguish tests inspected from tests actually run.
Keep these notes separate from findings and within the stated word budget.
Tag every finding with one severity: `blocker` — merging now risks an outage,
data loss or corruption, a security exposure, a broken main user flow, or an
unsafe irreversible rollout; `major` — a real defect, spec gap, or uncovered
regression that callers or users will hit, which must be fixed before merge;
`minor` — an improvement, judgement call, or nit that never blocks merge.
Judgement calls are `minor` unless you can show concrete harm."

**Standards sub-agent prompt** should include:

- The full diff command and commit list.
- The list of standards-source files you found in step 3, **plus the design baseline from step 3** pasted in full (the sub-agent has no other access to it).
- The brief: "You are running as a detached, non-interactive Pi sub-agent. Do not call `ask_user_question`, invoke a skill, delegate, or start a workflow; return `BLOCKED: <reason>` if required input is unavailable. Report, per file/hunk where relevant, (a) every place the diff violates a documented standard: cite the standard (file + the rule); and (b) any baseline finding you spot: name it and quote the hunk. Distinguish hard violations from judgement calls: documented-standard breaches can be hard, but baseline findings are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words."

**Spec sub-agent prompt** should include:

- The diff command and commit list.
- The path or fetched contents of the spec.
- The brief: "You are running as a detached, non-interactive Pi sub-agent. Do not call `ask_user_question`, invoke a skill, delegate, or start a workflow; return `BLOCKED: <reason>` if required input is unavailable. Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note this in the final report.

**Correctness sub-agent prompt** should include:

- The diff command and commit list.
- The brief: "You are running as a detached, non-interactive Pi sub-agent. Do not call `ask_user_question`, invoke a skill, delegate, or start a workflow; return `BLOCKED: <reason>` if required input is unavailable. Focus exclusively on: bugs and logic errors; edge cases (empty, nil, max values, boundaries); race conditions and concurrency; error handling and propagation; resource leaks; data integrity and state; regression risk — read the call sites of changed functions and check the changes preserve their assumptions. Do not cover style, naming, or spec conformance; other reviewers handle those. Quote the hunk for each finding. Under 400 words plus the three passes below."
- The three mandatory exploration passes, pasted in full (report their deltas as findings):
  1. **Entrypoint comparison**: for each changed route, handler, job, consumer, command, or UI surface, compare its cross-cutting stack (authn/authz, limits and abuse controls, audit/observability, retry/idempotency, error handling) against the nearest genuinely comparable sibling. Say why the sibling is comparable; distinguish intentional differences from gaps.
  2. **Reachability delta**: for every changed flag, permission, gate, eligibility rule, or dispatch condition, enumerate what becomes newly reachable and audit that code as if this diff added it.
  3. **Contract delta**: for every changed validation, schema, predicate, or parsing/normalization rule, diff the accepted-value space old vs new (null vs undefined vs empty vs missing key, type coercions, size caps). When a sibling implementation of the same rule exists in another language or service, diff their behavior on the same inputs.
- **Conditional lenses** — append to the prompt only when the diff triggers them:

  | Lens | Append when the diff touches | Adds |
  |------|------------------------------|------|
  | Security | auth, API endpoints, user input, env vars/secrets | injection, authz bypass, secret/data exposure |
  | Performance | DB queries, loops over data, batch operations, hot paths | N+1 queries, algorithmic cost, caching |
  | Deployment safety | migrations, API schemas, config/infra files | breaking changes, rollback safety, flag/migration ordering |

### 5. Aggregate for the user

This report is for the requesting user or coordinator, not the PR thread.
Keep the narrative summary, review process, evidence and limitations here;
GitHub receives only the author-facing feedback defined in §6.

The review lead collects every active axis result before delivering the combined
review. Missing or blocked axes remain explicit limitations, not successful
reviews. Only the lead reports upstream: send the aggregate to its assigned
coordinator using the Herdr delivery protocol, or answer the user directly for a
standalone review. Do not forward routine individual helper completions. A
material blocker, failed validation or approval need may be reported upstream
before all axes finish, clearly labeled partial and summarized by the lead.

Present the detailed findings under `## Standards`, `## Spec`, and
`## Correctness` headings, verbatim or lightly cleaned. Keep strengths and review
limitations distinct from findings. Do **not** merge or rerank the detailed
findings, because the axes are deliberately separate (see _Why separate axes_).

Start the report with a title line that links the PR, such as
`[PR #123: Fix login timeout](https://github.com/<owner>/<repo>/pull/123): <verdict>`.
Take the URL from `gh pr view --json url,title`. Link the PR wherever the
report names it; never leave a bare PR number.

End with a short, reader-facing summary in this order:

1. **What this PR does** — 1–5 short lines in plain language explaining the
   purpose and actual behavior changed: what becomes possible or different,
   and for whom. Ground this in the diff and spec, not just the PR title or
   author claims. Distinguish intended behavior from incomplete implementation.
   For a non-PR review, use **What this change does** instead.
2. **What went well** — 1–3 concise bullets about concrete strengths of the
   implementation, such as clear boundaries, preserved behavior, or meaningful
   test coverage. Explain why they help. Use only evidence from the review;
   omit this section if no meaningful strength was established.
3. **What needs attention** — 1–3 concise bullets explaining the main problems
   and their practical consequences, grouping related findings into themes
   rather than repeating the finding list. Preserve distinctions between
   standards, spec gaps, and correctness where relevant; do not compute a
   cross-axis score or let strengths cancel out bugs. Include important review
   limitations here (for example, a missing spec or tests not run).
4. **Verdict** — a merge gate, not a score. Write three lines:
   - `Go — LGTM` or `No-go`.
   - **Door:** `Two-way` (a normal revert or redeploy fully undoes it) or
     `One-way`, which names the irreversible part (for example, a destructive
     migration, a public API or webhook contract, data sent to external systems,
     or a published package).
   - **Why:** for No-go, the blocking findings by axis and `file:line`. For Go,
     state that no blocker or major finding was found within the review scope,
     and that minor improvements are non-blocking.

   Give `Go` only when all of these are true: no completed axis has a `blocker`
   or `major` finding; the Correctness axis completed (not blocked or missing);
   and, for a one-way door, the irreversible part was actually inspected and is
   gated, reversible by a forward fix, or has a stated rollback path. Otherwise
   give `No-go`. A one-way door raises the bar: a concern about the irreversible
   part that could cause permanent harm counts as `major`, and unresolved doubt
   about it is a No-go with a question to the author. A two-way door lowers it:
   do not block on minor or speculative concerns. Other limitations, such as a
   missing spec or tests that were not run, stay visible but do not block on
   their own.

This summary is an explanation of the change and its quality, **not a violation
scoreboard**. Do not use per-axis counts, severity tallies, or “worst issue per
axis” as the summary. Priorities and source locations belong in the detailed
findings. If no actionable issues were found, say so with the review's scope
and limitations; do not imply the change is proven correct. Do not force an
equal number of positives and negatives.

Illustrative summary (use only facts established for the actual review):

> **[PR #123: Move document generation to a job](https://github.com/example/app/pull/123): No-go**
>
> **What this PR does**
> Moves document generation into a background job so users can leave the page
> while work continues, and ties billing to the job's outcome.
>
> **What went well**
> - The job boundary keeps request handling small, and retry tests cover duplicate delivery.
>
> **What needs attention**
> - The default generation path can fail before producing a document, blocking the main user flow.
> - Abandoned jobs can still be billed, which does not match the cancellation requirements.
>
> **Verdict:** No-go
> **Door:** Two-way — the job runner and billing hook revert cleanly.
> **Why:** Correctness blocker in `jobs/generate.ts:42` and a Spec major on cancellation billing.

### 6. Post the review

Only if the review targets a PR — detected because the user referenced one, or `gh pr view` resolves the current branch to an open PR. 
Otherwise skip this step silently.

1. Fetch existing review comments; do not duplicate findings already raised.
   Keep unresolved findings in the verdict; add material new evidence to their
   existing thread rather than repeating it in the review body.
2. Select findings to post. A `blocker` or `major` finding qualifies for an
   inline comment only if BOTH hold:
   - it is a documented-standard violation, a Spec finding, or a Correctness
     finding (baseline findings only if clearly severe), AND
   - its cited source is verifiable and directly on point: the quoted rule or
     spec line exists verbatim in the source file and plainly covers the case.
     If the citation requires stretching or paraphrase to fit, downgrade:
     severe findings remain observations in the private report; the rest
     are dropped. Do not publish an unverified claim as a blocker.

   A `minor` finding, including a baseline judgement call, qualifies when it
   names the concrete hunk and the benefit of changing it. Prefix it with
   `Non-blocking:`, keep only those worth the author's time, and never present
   it as a defect. Minor comments are allowed with either verdict.
3. Draft one inline comment per finding, anchored to file + line:
   one-sentence issue + cited source, then a fix at the strongest honest level:
   - suggestion block, only when the fix is small, mechanical, and certain;
   - one-sentence direction, when the fix is known but needs context;
   - acceptance condition or a question to the author, when the fix is not
     known. Never invent a fix to satisfy the format.
4. **Validate line targets** before posting. Each comment must land on
   a line inside the PR's diff hunks that shows the code the finding describes;
   GitHub rejects lines outside a hunk. Move a misplaced comment to the right
   line in the same hunk, or make it a file-level comment, and note the change.
5. Keep the review body minimal:
   - Go: exactly `LGTM`, with worthwhile non-blocking comments inline.
   - No-go: leave the body empty when new or existing inline/file-level
     comments cover the blockers. Only when a verified blocker cannot be
     covered there, use one short sentence stating the problem and needed fix.
   Never copy §5's report into GitHub: no change summary, praise section,
   axis recap, door classification, test log, or repeated inline findings.
6. If draft validation changed or dropped a finding, reconcile the private
   report and verdict before posting. Deduplication does not resolve a blocker.
7. Post without waiting for confirmation. Submit the inline comments and minimal
   body as one review: `gh api repos/{owner}/{repo}/pulls/{n}/reviews` with
   `commit_id` set to the reviewed head SHA, `comments`, and `event`:
   - Go → `APPROVE`, with `body: "LGTM"`.
   - No-go → `COMMENT`, omitting `body` when it is empty. If the API requires
     a nonempty body, use only `See inline comments.`

   If all blockers already have comments and there is no new feedback, skip
   posting another No-go review; report the verdict privately instead.
   If the PR head moved since the review, review the new commits first; never
   approve unreviewed commits. GitHub rejects approval of your own PR. When the
   viewer is the PR author, use `COMMENT` and keep the LGTM body.
8. Report back with the PR link, the verdict, and what was posted. Flag to the
   user, at the top, only what needs their judgement: a one-way door, a
   blocker with real user or data impact, or a decision the code cannot settle.
   Hold the post and flag instead when posting could do harm: a review axis did
   not complete, the head moved and could not be re-reviewed, or a finding
   would expose an exploitable security detail in a public thread.

### 7. Clean up reviewers

Once every result is captured and no reviewer follow-up is pending, close the
panes, processes, and temporary files this run created, and nothing else.

## Why separate axes

A change can pass one axis and fail another:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**
- Code that matches the spec and every convention but drops an edge case or silently changes a caller's behavior → **Spec and Standards pass, Correctness fail.**

Reporting detailed findings separately stops one axis from masking another.
The narrative summary may synthesize related themes for readability; it must
not collapse the axes into one score, hide a failed axis, or replace the
underlying findings.
