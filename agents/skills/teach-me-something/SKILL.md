---
name: teach-me-something
description: Teach one engaging, code-grounded lesson from the current repository in under five minutes. Use for /teach-me-something, a daily codebase lesson, or requests to learn something interesting about the project's architecture, language features, tests, tooling, or behavior.
---

# Teach me something

Give the learner one small, satisfying discovery about their actual codebase. Make the lesson useful enough that they can explain one new idea or recognize it next time they see the code. Deliver one lesson per invocation; treat daily use as a habit, without scheduling anything unless requested.

## Find today's idea

- Use the repository selected by the user or active in the workspace. Follow its applicable instructions. If several repositories are equally plausible, ask which one. If no repository or relevant source is accessible, ask for a repository, path, or uploaded source; do not substitute an unrelated checkout or invent a lesson about their code.
- Honor an optional topic or path, such as `/teach-me-something tests`, `/teach-me-something architecture`, or `/teach-me-something src/auth`. Otherwise choose the topic yourself without an onboarding questionnaire or topic menu.
- Briefly orient using the repository instructions, top-level structure, relevant manifests, and accessible learning history. Then inspect a small, purposeful slice of source and its callers, tests, or configuration. Use targeted search; avoid an exhaustive repository tour. Stop researching once one worthwhile idea is supported.
- Look for a useful surprise: an architectural boundary, a language feature used well, a test fixture or isolation mechanism, a build convention, a subtle data flow, a performance tradeoff, or a domain rule encoded in the implementation. Rotate categories when recent history is available. Choose among worthwhile candidates rather than sampling arbitrary files. Prefer a concept that changes how the learner reads, writes, tests, or debugs this project.
- Use accessible conversation history or existing personal learning notes to avoid recently covered takeaways, including the same concept under another title. Respect known familiarity and requests for easier or deeper explanations. When durable history is unavailable, do not claim to remember lessons across sessions. Do not create or modify repository files just to track learning.

## Ground the lesson

- Read the actual implementation before teaching it. Verify relationships in the relevant callers, tests, or configuration; distinguish what the code demonstrates from an inferred design rationale. Say “this allows…” rather than claiming why the team chose something without evidence.
- Cite one to three precise source locations next to the claims or example. Use the environment's supported clickable source links and include a relevant symbol when useful. Keep the lesson understandable without opening the files.
- Use a short, faithful excerpt when code or configuration helps. Mark omitted sections or a simplified adaptation explicitly. Never present invented code as a repository excerpt. For a language-feature lesson, verify its use locally; avoid unsupported claims that it is new or recently adopted.
- Inspect code read-only. Do not install dependencies, run the full suite, modify code, or start a refactor to teach a lesson. If execution is unnecessary, reason from the source and describe test behavior without claiming tests were run.

## Deliver a lesson that fits in five minutes

Aim for two to four minutes of reading plus a 20–30 second mental exercise, with a hard ceiling of five minutes of learner effort. Usually use 250–400 words; stay below 500 words including the exercise and its answer, and use at most one snippet of 15 lines. Shorten further if the concept is dense. Teach one idea and only the prerequisites needed to understand it.

Use this natural progression, with compact formatting rather than a rigid slide deck:

1. **Hook:** Open with a specific question, surprising behavior, or practical situation. Name the topic and give a realistic reading-time estimate.
2. **Real example:** Point to where this happens in the project. Show the smallest useful excerpt or explain a small flow in plain language.
3. **Explanation:** Connect the example to the concept and explain why it matters during everyday work. Include one consequence or tradeoff when it clarifies the idea. Define unfamiliar terms inline; assume an intelligent teammate who may be new to this part of the stack.
4. **Tiny check:** Ask one low-pressure prediction, “what would change if…?”, or explain-it-back question answerable from the lesson in 20–30 seconds. Supply a short answer after a clear pause cue or supported disclosure so the lesson is complete in one response. Do not require another turn, a coding task, or a multiple-choice quiz.
5. **Takeaway:** End with one crisp sentence stating the reusable thing to remember, specific enough to help the learner recognize or apply it later.

Be warm, curious, and concrete. Let the code's interesting behavior create engagement. Avoid trivia with no payoff, exaggerated novelty, jargon piles, unnecessary metaphors, and a broad architecture overview disguised as one lesson. Do not append bonus lessons, reading lists, or homework. If the learner replies to the check, respond briefly and correct the reasoning gently; expand or teach another topic only when asked.
