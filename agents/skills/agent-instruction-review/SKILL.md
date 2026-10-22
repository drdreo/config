---
name: agent-instruction-review
description: Reviews and trims agent instruction files (CLAUDE.md, AGENTS.md, SKILL.md, system or task prompts, knowledge and reference files) so each sentence prevents an observable mistake or supplies a missing fact. Use when asked to review, audit, lean down, de-bloat or "de-manifesto" a prompt, skill, rules file or knowledge file, or when asked whether an instruction set is too long or too shouty. Not for writing a brand-new skill from scratch (use the official skill-creator) and not for reviewing application code.
---

# Agent instruction review

Goal: a smaller instruction set that keeps measured behavior and every safety or permission boundary. Optimize useful behavior, not word count. Output is a review plus proposed edits; do not rewrite live files unless the user asks.

## 1. Establish the facts

1. Read the whole target file and every file it imports or links. Note the harness (Claude Code, Codex, other) and, when it matters, the version. Loading semantics differ; see [placement and loading](references/placement-and-loading.md).
2. Identify the kind of each file: always-loaded rules, task prompt, skill, reference, or executable control. Mixed files are the usual root cause of bloat.
3. Collect evidence of actual failures the file is meant to prevent: user complaints, transcripts, past incidents. An instruction with no observed failure behind it is a candidate for deletion.

## 2. Classify every paragraph

For each paragraph ask: what observable mistake does it prevent, or what unavailable fact does it supply? Tag it:

- **Keep.** Non-obvious project facts, output contracts, scope and permission limits, consequential safety constraints. State condition and action directly. Never soften a real prohibition to "prefer".
- **Delete.** Duplicates, generic "be excellent" advice, background the model already has, unsupported guarantees ("ensures perfect results"), persona inflation ("world-class engineer").
- **Move.** Rare procedures go to a focused skill. Schemas, examples and background go to a named reference with an explicit "read when" condition. Prerequisites and safety boundaries stay visible before risky actions.
- **Enforce mechanically.** Formatting, schema validity, forbidden tool calls and test gates belong in formatters, schemas, permissions, tests or narrow hooks. Prose explains the rule and the recovery; it does not enforce. Adding a hook is a separate implementation decision; flag it, do not assume it.
- **Test.** Anything whose effect you cannot predict from reading. Mark it for the pilot in step 5.

Use the placement table in [placement and loading](references/placement-and-loading.md) to decide where moved content belongs.

## 3. Rewrite overstatement as checkable behavior

Replace impossible certainty and overbroad triggers with a condition, an action and a verification. Patterns and before/after pairs are in [templates](references/templates.md). Rules:

- Reserve MUST, ALWAYS and NEVER for genuine requirements. Capitalization is not evidence of importance and is not proven harmful either; the test is whether the rule is real.
- Skill descriptions state what the skill produces and when to use it, plus one near-miss it is not for. Not a workflow, not a guarantee.
- Reference files are neutral facts with source, version and known gaps. No motivational language, no global behavioral commands.
- Keep references one level deep from the main file and say when to read each.

## 4. Check claims against evidence, not folklore

Do not justify an edit with a number you cannot source. Common unsupported claims: a universal 150–200 instruction budget, "shorter always wins", "capitals break models", "moving text to references improves success". What the research does and does not support is summarized in [evidence](references/evidence.md). Cite from there, with its stated limits, or say "untested".

## 5. Propose the test before claiming improvement

A review that changes behavior needs a before/after pilot. Give the user the pilot design from [templates](references/templates.md): about 12 cases (normal, near-miss, edge/safety), fresh sessions, identical model and permissions, pass rate plus trigger precision/recall plus scope violations plus tokens and latency. Keep some cases unseen during editing. Adopt only with no safety regression. State plainly that this is a regression screen, not proof.

## 6. Report

Deliver, in this order:

1. Verdict in one or two sentences: how much can go, what must stay, main risk.
2. Table of paragraphs or sections with tag (keep, delete, move, enforce, test) and a one-line reason.
3. Proposed rewritten file or diff, clearly marked as a proposal. Preserve every permission and safety line, or call out explicitly where one changed and why.
4. Items that need infrastructure (hooks, schemas, tests) listed separately.
5. The pilot plan and what was not verified.

## Boundaries

- Never remove or weaken a safety, permission or data-handling rule to make a file shorter. If one looks redundant, keep it and note the duplicate.
- Do not edit live rule files, skills or configs without an explicit go-ahead. Review output is a proposal.
- Do not claim the lean version performs better. Claim it is shorter and that behavior is untested until the pilot runs.
- When the harness version is unknown, say which loading claims depend on it rather than asserting them.
