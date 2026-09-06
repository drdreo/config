---
name: code-review
description: "Review the changes since a fixed point (commit, branch, tag, or merge-base) along three axes: Standards (does the code follow this repo's documented coding standards?), Spec (does the code match what the originating issue/spec asked for?), and Correctness (bugs, edge cases, regression risk). Runs the reviews in parallel sub-agents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to \"review since X\"."
---

Three-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards**: does the code conform to this repo's documented coding standards?
- **Spec**: does the code faithfully implement the originating issue / spec?
- **Correctness**: is the code free of bugs, unhandled edge cases, and silent regressions?

All axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.

### Pi execution contract

The parent agent owns clarification and orchestration. Sub-agents run in isolated, non-interactive sessions:

- If input is missing, require it to return `BLOCKED: <reason>`.
- Before launching reviewers, run `test "${HERDR_ENV:-}" = 1`.
- When the check passes, launch every reviewer through Herdr so its pane and lifecycle remain visible. Run `herdr --skill`, then inspect `herdr workspace`, `herdr tab`, `herdr pane`, and `herdr agent`; the installed CLI is the syntax authority. Do not launch child Pi processes directly through Bash.
- When the check fails, use detached Pi subprocesses unless the user explicitly requested Herdr. An explicit Herdr request outside Herdr is blocked; report that Herdr is unavailable and stop.
- Record every reviewer pane, process, and temporary file created by the run so cleanup cannot affect user-owned resources.

Prefer the repository's project-local issue-tracker guidance and fall back to the PR body.

## Process

### 1. Pin the fixed point

Whatever the user said is the fixed point (a commit SHA, branch name, tag, `main`, `HEAD~5`, etc.). If they didn't specify one, ask for it.

Capture the diff command once: `git diff <fixed-point>...HEAD` (three-dot, so the comparison is against the merge-base). Also note the list of commits via `git log <fixed-point>..HEAD --oneline`.

Before going further, confirm the fixed point resolves (`git rev-parse <fixed-point>`) and the diff is non-empty. A bad ref or empty diff should fail here, not inside two parallel sub-agents.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.), fetched via the applicable repository guidance.
2. A path the user passed as an argument.
3. A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

### 3. Identify the standards sources

Anything in the repo that documents how code should be written, such as `CODING_STANDARDS.md` or `CONTRIBUTING.md`.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below: a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation. Like any standard here, skip anything tooling already enforces.

Each smell reads *what it is* → *how to fix*; match it against the diff:

- **Mysterious Name**: a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps**: the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession**: a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches**: the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man**: a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest**: a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 4. Spawn the sub-agents in parallel

When running through Herdr:

1. For a PR review, rename the current Herdr workspace/window after the PR before creating panes. Prefer `pr-<number>`; if no number resolves, use a very short kebab-case summary. If the installed CLI cannot rename the workspace/window, rename the current tab instead. Target `$HERDR_WORKSPACE_ID` or `$HERDR_TAB_ID` explicitly and do not change focus.
2. Create one sibling pane per active axis in the current tab, with the review working directory as its `cwd` and without changing focus.
3. Start a Pi agent in each pane, using concise role names such as `standards-review`, `spec-review`, and `correctness-review`. Preserve the parent review's provider, model, thinking level, approval mode, and isolation flags.
4. Start all agents first, then submit every prompt without waiting. After all prompts are in flight, wait for and read each result. Do not serialize the review by using a wait flag on the first prompt.
5. Keep the panes available through aggregation and immediate follow-up work. Close panes this run created once their results are consumed and no reviewer follow-up is pending; keep them only when the user asked to inspect them or the workflow explicitly awaits another reviewer turn.

Include this reporting instruction in **every active sub-agent's prompt**:
"After your findings, note up to two concrete strengths supported by the diff
or inspected tests, with a file/symbol reference and why they matter. Do not
invent praise or treat an absence of findings as proof of correctness. State
any review limitation; distinguish tests inspected from tests actually run.
Keep these notes separate from findings and within the stated word budget."

**Standards sub-agent prompt** should include:

- The full diff command and commit list.
- The list of standards-source files you found in step 3, **plus the smell baseline from step 3** pasted in full (the sub-agent has no other access to it).
- The brief: "You are running as a detached, non-interactive Pi sub-agent. Do not call `ask_user_question`, invoke a skill, delegate, or start a workflow; return `BLOCKED: <reason>` if required input is unavailable. Report, per file/hunk where relevant, (a) every place the diff violates a documented standard: cite the standard (file + the rule); and (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgement calls: documented-standard breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words."

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

### 5. Aggregate

Present the detailed findings under `## Standards`, `## Spec`, and
`## Correctness` headings, verbatim or lightly cleaned. Keep strengths and review
limitations distinct from findings. Do **not** merge or rerank the detailed
findings, because the axes are deliberately separate (see _Why separate axes_).

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

This summary is an explanation of the change and its quality, **not a violation
scoreboard**. Do not use per-axis counts, severity tallies, or “worst issue per
axis” as the summary. Priorities and source locations belong in the detailed
findings. If no actionable issues were found, say so with the review's scope
and limitations; do not imply the change is proven correct. Do not force an
equal number of positives and negatives.

Illustrative summary (use only facts established for the actual review):

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

### 6. PR comments (optional)

Only if the review targets a PR — detected because the user referenced one, or `gh pr view` resolves the current branch to an open PR. 
Otherwise skip this step silently.

1. Fetch existing review comments; drop any finding already raised.
2. Select findings to post. A finding qualifies for an inline comment only if
   BOTH hold:
   - it is a documented-standard violation, a Spec finding, or a Correctness
     finding (baseline smells only if clearly severe), AND
   - its cited source is verifiable and directly on point: the quoted rule or
     spec line exists verbatim in the source file and plainly covers the case.
     If the citation requires stretching or paraphrase to fit, downgrade:
     severe findings move to the summary comment as observations; the rest
     are dropped.
3. Draft one inline comment per finding, anchored to file + line:
   one-sentence issue + cited source, then a fix at the strongest honest level:
   - suggestion block, only when the fix is small, mechanical, and certain;
   - one-sentence direction, when the fix is known but needs context;
   - acceptance condition or a question to the author, when the fix is not
     known. Never invent a fix to satisfy the format.
4. **Validate line targets against the diff** before showing drafts — this
   prevents API 422 errors and misplaced comments:
   - Fetch per-file patches: `gh api repos/{owner}/{repo}/pulls/{n}/files --jq '.[] | {filename, patch}'`.
   - Parse `@@ -old,count +new,count @@` hunk headers. A single-line comment's
     line must fall within a hunk's new-file range; a range comment needs both
     ends in the same hunk (if split across hunks, use the last line only).
   - A line outside every hunk → convert to a file-level comment
     (`subject_type: "file"`, prepend `**Line {n}:** ` to the body).
   - Read the actual file at each target line and confirm the code there
     matches the finding; if it's blank or unrelated, adjust to the correct
     nearby line within the same hunk. Note every adjustment in the draft.
5. Draft one summary comment using the narrative format from §5 (Aggregate):
   **What this PR does**, **What went well**, and **What needs attention**.
   Reflect the verified review outcome, not just the subset selected for new
   inline comments; already-raised issues may still matter to the overall
   explanation. Do not turn it back into per-axis counts or severity tallies.
   May include up to two one-sentence observations for findings downgraded in
   step 2; label them as observations or judgement calls, not confirmed defects.
6. Show the narrative summary first, followed by the inline-comment drafts,
   before posting to the PR. The final pre-post summary must explain the PR and
   what went well or needs attention; do not append a count-based recap that
   replaces it. If draft validation changed or dropped a finding, update the
   summary to match the verified evidence before showing it.

### 7. Clean up reviewers

After aggregation and any immediate PR-comment work:

1. Confirm every reviewer has settled and its result was captured.
2. Close only Herdr panes created by this run. Wait for and reap detached reviewer processes; remove run-owned temporary prompt/result files.
3. Verify the recorded reviewer resources are gone. If a follow-up turn is explicitly pending, keep only the resources it needs and clean them up as soon as that turn finishes.

## Why separate axes

A change can pass one axis and fail another:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**
- Code that matches the spec and every convention but drops an edge case or silently changes a caller's behavior → **Spec and Standards pass, Correctness fail.**

Reporting detailed findings separately stops one axis from masking another.
The narrative summary may synthesize related themes for readability; it must
not collapse the axes into one score, hide a failed axis, or replace the
underlying findings.
