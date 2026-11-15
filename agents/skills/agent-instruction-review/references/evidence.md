# Evidence on instruction length, skills and context

Checked 2026-10-22; E16–E19 added 2026-11-15 from the full text (E17 without its threats section). Results are author-reported, not reproduced. Use these to justify or refuse an edit; cite the limit together with the claim.

## Contents
- What is supported
- What is not established
- Source notes E1–E19
- Practitioner sources

## What is supported

- Extra instructions can change behavior and raise cost without raising task success (E8).
- Curated, task-specific skills can materially raise pass rates, and can also hurt on some tasks (E10).
- Selecting a skill and executing it correctly are different failures; measure both (E2, E3).
- Long, distracting context and very high constraint density degrade performance under the studied conditions (E11–E13).
- Vendor guides already recommend restraint, evaluations before documentation, and conditional references (E1, E5, E6).
- Stale paths and claims in a skill led the agent into failures in one study of three repositories (E18).
- Grading a document's text can raise the grade and leave the agent unchanged; compare runs with and without the document instead (E18).
- One vendor reports cutting most of a system prompt for newer models with no measured loss, by replacing rigid rules and examples with goals (E19).

## What is not established

- A universal line, token or instruction budget (the "150–200 instructions" figure comes from a keyword-inclusion benchmark, E11).
- That shorter always wins; the AGENTS.md paper found no clear relationship between file length and success or cost (E8).
- That capitalized MUST/ALWAYS is harmful; repetition even helped non-reasoning models in one study (E14).
- That moving text to references by itself improves task success.
- That AI-assisted drafting is inferior to human-only drafting (E10 measured self-generated skills under one setup).
- That a prose prohibition is enforcement (E5).
- That a smell's prevalence shows harm; neither smell catalog measured task outcomes (E16, E17).
- That an optimizer's few-point gain on a skill is real at one repository's task count (E18).
- That fewer rules suit every model or harness; E19 covers two models, one harness and unpublished evaluations.

## Source notes

| ID | Source | Finding | Limit |
|---|---|---|---|
| E1 | Anthropic, Skill authoring best practices (living doc) | "Create evaluations BEFORE writing extensive documentation." Baseline without skill, three gap scenarios, minimal instructions. "You don't need special system prompts or a 'writing skills' skill." Body under 500 lines. | Vendor heuristic, not an experiment. Some of its own examples use ALWAYS and duplicate checklists. |
| E2 | Anthropic skill-creator, commit b0cbd3d (2026-03-06) | With-skill vs baseline runs, grading, token/time aggregation, trigger-description optimizer. "Keep the prompt lean. Remove things that aren't pulling their weight." | Asks for "pushy" descriptions while warning against heavy MUSTs. `run_eval.py` judges triggering at the first tool decision via a command stub. `run_loop.py` picks the best iteration by its test split, so that split is a selection set; keep a separate final set. |
| E3 | OpenAI, Testing Agent Skills Systematically with Evals (living doc) | Prompt → captured run → checks → score. Separates selection, execution, output, efficiency; near-miss negative controls. | Tutorial graders accept "command appeared" and "file exists", which do not prove correctness. |
| E4 | Agent Skills specification + skills-ref | Required name/description; progressive disclosure; validator checks naming and frontmatter. | Format conformance says nothing about routing, safety or quality. Validator is demonstration-only by its README. |
| E5 | Claude Code memory docs (living) | Context not enforced configuration; imports load at launch; AGENTS.md support from v2.1.277; `/doctor prompt-audit` from v2.1.283. | Claude-specific; version-bound. |
| E6 | Codex AGENTS.md, skills and prompting docs (living) | Root-to-cwd chain, nearer later, 32 KiB default cap; skill metadata budget can truncate. | Codex-specific; not a universal AGENTS.md standard. |
| E7 | OpenAI skill-creator, commit 4ab6e0f (2026-02-09) | Examples → resources → scaffold → validate. "Prefer concise examples over verbose explanations." | No comparative evaluation loop. `quick_validate.py` checks frontmatter only. |
| E8 | Gloaguen et al., Evaluating AGENTS.md, arXiv 2602.11988 v3 (2026-09-29) | 300 SWE-bench Lite + 138 CTXbench tasks; four model–agent pairs. Generated files +20–23% mean cost; success vs no file not significant (p=.87/.37); developer files vs none p=.21; developer beat generated (p=.038). No clear dependency between file length and success or cost. | Python only, single run per task. Documentation-removal ablation found generated context useful when other docs were absent. Not "delete all instructions". |
| E9 | Lulla et al., On the Impact of AGENTS.md Files on Efficiency, arXiv 2601.20404 v2 (2026-03-30) | 124 PR tasks, 10 repos, Codex + GPT-5.2-Codex. Median runtime 98.57→70.34 s (−28.64%); median output tokens 2,925→2,440 (−16.58%). | "A comprehensive evaluation of the output quality ... is beyond the scope." Small tasks; selected files with real project content. Counterevidence to "files always cost more", not proof of equal correctness. |
| E10 | Li et al., SkillsBench, arXiv 2602.12670 v4 (2026-06-14) | 87 tasks, 8 domains, 18 configurations, 3 trials. Curated skills: 33.9→50.5% mean pass (+16.6 pp); 13 of 87 tasks got worse; self-generated skills worse on dedicated harnesses. | Skill packages include code and resources; tasks selected for measurable condition differences; "compact" vs "comprehensive" buckets compare different tasks, not controlled rewrites. |
| E11 | Jaroslawicz et al., IFScale, arXiv 2507.11538 (2025-07-15) | 20 models, 7 providers; 10–500 keyword-inclusion constraints in a business report. Best model about 68% at 500. | Lexical constraints, not semantic workflow or safety rules. Does not yield a transferable instruction budget. |
| E12 | Liu et al., Lost in the Middle (2023/TACL 2024) | Position sensitivity in multi-document QA and key-value retrieval. | Old models, retrieval tasks. Supports testing placement, not a size cap. |
| E13 | Chroma, Context Rot (2025) | 18 models; degradation with input length at fixed task complexity; non-uniform distractor effects. | Retrieval vendor; simple tasks; does not isolate instruction length. |
| E14 | Leviathan et al., Prompt Repetition Improves Non-Reasoning LLMs, arXiv 2512.14982 (2025-12-17, Google Research) | Repeating the whole input: 47 wins, 0 losses in 70 model–task tests (McNemar p<.1); with step-by-step reasoning 5 wins, 1 loss, 22 ties. | Experiments Feb–Mar 2025; permissive threshold; Anthropic models got slower on very long requests. Not about repeating MUST in skills. |
| E15 | Diátaxis, Reference | "Neutral description is the key imperative of technical reference." Consistent structure, facts, examples, links to procedures. | Human documentation design; applying it to agent knowledge files is synthesis. |
| E16 | dos Santos et al., Configuration Smells in AGENTS.md Files, arXiv 2606.15828 v5 (2026-07-30), SCAM 2026 | 100 popular repositories (39 AGENTS.md, 61 CLAUDE.md); six smells from a 14-document grey-literature review. LLM-flagged → confirmed by the first author: lint leakage 62 → 58, skill leakage 35 → 29, conflicting instructions 28 → 16, blind reference 16 → 14. Threshold-only: context bloat 42 (200 lines or more), init fossilization 24 (single commit). 91 files had at least one smell. | No task-outcome measurement; harm is assumed, not shown. The abstract reports flagged counts. Context bloat reuses the vendor 200-line target as its detector. One author confirmed the flags; skill-leakage precision is 86% in the text and 82% in the table. |
| E17 | Hong et al., From Anatomy to Smells: An Empirical Study of SKILL.md in Agent Skills, arXiv 2607.01456 v2 (2026-07-03) | 238 sampled skills; 26 smells made by inverting best practices from a 29-source review, by majority vote where sources disagreed; 20 of 26 are absences. Detector: 5 by script, 21 by an LLM classifier, weighted F1 0.78 on 53 labeled skills. Mean 10.5 smells per skill; one skill smell-free. Both under-specified and over-prescribed guidance count as smells. | Impact on agent performance "remains an open question". Smells restate practitioner advice, so prevalence is not harm; the most common (no guard against skipping steps) is in 94% of skills. The prevalence table says 228 skills, the text 238. |
| E18 | Kozyrev et al., Skill Issue: Lessons from Optimizing Repository SKILLs for Coding Agents, arXiv 2609.12742 (2026-09-11) | Three Kotlin repositories, Claude Code with Sonnet 4.6, tasks mined from merged pull requests reverted at one base commit, each run paired against an empty-document run. GEPA +4.9 pp mean, SkillOpt +0.1 pp. Skills optimized across historical commits stated layouts that no longer existed, and "the agent followed that advice into failures". Grading the document itself raised the grade and left the agent unchanged. | Not significant: 20–26 held-out tasks per repository, best sign-test p = 0.29; the authors place the gain inside run-to-run variance. One maintainer reviewed the documents. |
| E19 | Anthropic (Shihipar), The new rules of context engineering for Claude 5 generation models, claude.dev/blog (2026-07-24) | Reports removing over 80% of Claude Code's system prompt for Opus 5 and Fable 5 with "no measurable loss on our coding evaluations". Rigid rules gave way to goals; examples were found to narrow what newer models try; conflicting instructions across system prompt, skills and user requests cost extra reasoning. Skills should not be "overconstrained, except in highly important areas". | Vendor post; evaluations unpublished; one harness, two models. Not evidence for older models or other vendors' models. |

## Practitioner sources

- HumanLayer, Writing a good CLAUDE.md: good critique of irrelevant instructions and pointers over prose; its 150–200 instruction budget overgeneralizes E11; its "Anthropic has no official recommendation" is outdated against E5.
- obra/superpowers writing-skills: useful failure-first testing, negative cases, fresh-context repeats. Its "NO SKILL WITHOUT A FAILING TEST FIRST" and delete-untested-drafts rules are a project methodology, not an established law. Its advice that descriptions say only when to use conflicts with the spec's what-plus-when.
- softaworks skill-judge: useful split of expert, activation (known but not applied unprompted) and redundant knowledge, and matching rigidity to the cost of a mistake. Its 120-point score, grade bands and ratio targets are unvalidated, and E19 advises against its MANDATORY and NEVER prescriptions for newer models.
- Addy Osmani, Audit your agent files (2026-08-27): useful habit of archiving, then rerunning a task without the local skills. It tests whole skills, not single lines, and its figures are second-hand (E16's flagged counts among them).
- ctxlint: deterministic stale-path and stale-command checks are sound. Its "74%" headline is never calculated, its 91% precision is self-reported on a handful of repositories, and root-relative path checks misfire in monorepos.
- Inkeep, Writing high-quality prompts: sub-agent prompts carry scope and non-goals, an output format treated as a shared interface, and escalation rules; handoffs carry goal, evidence and constraints. Vendor convention; no measurement.
