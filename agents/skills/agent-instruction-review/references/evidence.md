# Evidence on instruction length, skills and context

Checked 2026-10-22. Results are author-reported, not reproduced. Use these to justify or refuse an edit; cite the limit together with the claim.

## Contents
- What is supported
- What is not established
- Source notes E1–E15
- Practitioner sources

## What is supported

- Extra instructions can change behavior and raise cost without raising task success (E8).
- Curated, task-specific skills can materially raise pass rates, and can also hurt on some tasks (E10).
- Selecting a skill and executing it correctly are different failures; measure both (E2, E3).
- Long, distracting context and very high constraint density degrade performance under the studied conditions (E11–E13).
- Vendor guides already recommend restraint, evaluations before documentation, and conditional references (E1, E5, E6).

## What is not established

- A universal line, token or instruction budget (the "150–200 instructions" figure comes from a keyword-inclusion benchmark, E11).
- That shorter always wins; the AGENTS.md paper found no clear relationship between file length and success or cost (E8).
- That capitalized MUST/ALWAYS is harmful; repetition even helped non-reasoning models in one study (E14).
- That moving text to references by itself improves task success.
- That AI-assisted drafting is inferior to human-only drafting (E10 measured self-generated skills under one setup).
- That a prose prohibition is enforcement (E5).

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

## Practitioner sources

- HumanLayer, Writing a good CLAUDE.md: good critique of irrelevant instructions and pointers over prose; its 150–200 instruction budget overgeneralizes E11; its "Anthropic has no official recommendation" is outdated against E5.
- obra/superpowers writing-skills: useful failure-first testing, negative cases, fresh-context repeats. Its "NO SKILL WITHOUT A FAILING TEST FIRST" and delete-untested-drafts rules are a project methodology, not an established law. Its advice that descriptions say only when to use conflicts with the spec's what-plus-when.
