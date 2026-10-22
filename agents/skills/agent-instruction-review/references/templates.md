# Templates: rewrites, skeletons, pilot

## Contents
- Rewrite patterns
- Workflow skill skeleton
- Reference file skeleton
- Before/after pilot
- Review report shape

## Rewrite patterns

Illustrative only; never present them as edits to someone's live rules.

**Impossible certainty**

Before: "You are a world-class engineer. ALWAYS read ALL documentation. NEVER skip testing. You MUST ensure everything works perfectly before finishing."

After: "Read the touched package's test guide. Run its relevant tests and report the command and result. If a prerequisite blocks testing, state what remains unverified; do not report the change as tested."

Note: this is not permission to weaken an existing mandatory full-suite gate.

**Overbroad triggering**

Before: "ALWAYS use this skill whenever reports, charts, metrics, dashboards or business data are mentioned. It guarantees accurate financial insights."

After (description): "Builds monthly revenue reports from billing exports. Use for an exported monthly revenue report; not for live dashboards or general finance questions."

After (workflow rule): "Before calculating revenue, read `references/revenue-definition.md`. If currency or refund treatment is unspecified, ask rather than assume."

**Duplicated global rule inside a skill**

Before: "Remember to never commit secrets and always follow the repository's commit conventions."

After: delete; the always-loaded rules already carry it. If the skill performs a commit, keep one pointer: "Commit per the repository rules in CLAUDE.md."

**Prose pretending to be enforcement**

Before: "NEVER run destructive git commands."

After: keep a one-line statement of the boundary and recovery, and flag separately: "Enforce with a permission deny rule or PreToolUse hook; prose alone does not block the call."

## Workflow skill skeleton

```markdown
---
name: task-name
description: Produces [artifact] from [input]. Use for [trigger]; not [near-miss].
---
# Task name
Inputs: [required inputs]. Output: [artifact and location].
Scope: [allowed actions]. Ask before [consequential action].

1. Check [prerequisite]; if absent, [stop/ask/fallback].
2. For [specific condition], read [reference](references/topic.md).
3. Perform [non-obvious steps; omit routine explanation].
4. Verify [observable acceptance check].

Return [result, checks, unresolved limitations].
```

## Reference file skeleton

```markdown
# Topic reference
Applies to: [system/version/scope]
Source of truth: [canonical URL or path + revision]
Verified: [date; omit rather than invent]

## Facts
- [Definition, units, invariant or schema detail]
- [Known exception and its exact condition]

## Example
[One small valid example; label illustrative values]

## Gaps
[Unknown, disputed or stale items; how to resolve them]
Procedure: [link to the relevant workflow, if needed]
```

## Before/after pilot

Proposed regression screen, not a validated sample size.

- Cases: about 12. Four normal tasks, four adjacent requests that should not trigger, four edge or safety cases (missing input, missing tool, stale or conflicting reference, unauthorized side effect). Mix explicit invocation and natural phrasing. Run with the real competing skill library.
- Conditions: current vs lean, fresh isolated sessions, identical inputs, model, harness and permissions. For a new skill add a no-skill baseline. Three repeats per case as a variability check.
- Hold-out: keep some final cases unseen while editing. If an optimizer picks by a test split, that split is a selection set; add another.
- Metrics: task pass rate; trigger precision and recall; scope violations; needed-reference retrieval; input, output and cached tokens, billed cost, latency. Mark infrastructure failures separately. Score full task success separately from success after correct triggering.
- Judging: inspect artifacts and full traces; deterministic checks where possible; blinded human review for subjective quality. "Command appeared" and "file exists" are not pass criteria.
- Decision: adopt when the targeted failure improves, no safety regression appears, and quality meets a predeclared tolerance at acceptable cost. If unclear, keep the simpler baseline and collect more real failures.

## Review report shape

1. Verdict (one or two sentences).
2. Section table: section, tag (keep / delete / move / enforce / test), reason.
3. Proposed file or diff, marked as proposal; safety and permission lines unchanged or explicitly called out.
4. Infrastructure items (hooks, schemas, tests) listed separately.
5. Pilot plan and what remains unverified.
