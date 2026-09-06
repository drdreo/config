# Texlr authoring reference

## Minimal document

```tex
\documentclass{texlr}

\title{Project handoff}
\author{Authoring agent}
\date{\today}
\status{Handoff}
% Optional: fill these only with verified values.
% \project{Project name}
% \repository{https://github.com/owner/repository}
% \revision{commit SHA}

\begin{document}
\maketitle

\section{Executive summary}
State the purpose, current position, and most important next action.

\section{Current state}
Explain the relevant changes or findings and the evidence behind them.

\begin{callout}[Open question]
State an unresolved issue without presenting it as a decision.
\end{callout}

\section{Dependencies and risks}
Separate dependencies, constraints, assumptions, and mitigations.

\section{Next actions}
Name concrete actions. Include owners or dates only when supported by the input.

\end{document}
```

This is a structural example, not content to copy verbatim. Replace the title
and body with the actual material. Set `\author` to the real author or an honest
agent role, not an invented person. `\today` is the document generation date,
not evidence of when the work happened; use a verified date or `\date{}` when
appropriate. Omit unknown project, repository, and revision metadata. The class
defaults to “Handoff”; use `\status{}` to suppress it or set a supported status.
Use `\runningtitle{Short title}` when the full title is too long for a page header.

## Structure for the reader

Choose sections that answer the recipient's questions; these are prompts, not
mandatory templates:

- Implementation handoff: outcome, important changes, decisions and rationale,
  verification actually performed, remaining risks, and next actions.
- Architecture brief: problem and constraints, system boundaries/data flow,
  alternatives and tradeoffs, recommendation, and open decisions.
- Research report or plan: question and scope, sourced findings, uncertainties,
  proposed actions, dependencies, and decisions needed.

Keep detailed paths, commands, and evidence where the next person can find them.
Move long supporting material to an appendix only when it helps the main flow.

## Useful components

The `texlr` class already loads the packages used below and provides their
styling. Do not copy or recreate its class file or install another document
theme; Texlr supplies `texlr.cls` in the source bundle.

### Decision

```tex
\decision{Use a single acquisition funnel}{This reduces measurement ambiguity
while the first channel is being validated.}
```

Keep callouts and decisions brief: these boxes cannot break across pages.
Use ordinary sections or lists for long explanations.

### Code or commands

```tex
\begin{lstlisting}[language=bash,caption={Verification command}]
./bin/verify-growth-metrics
\end{lstlisting}
```

### Table

```tex
\begin{table}[ht]
  \centering
  \caption{Workstream summary.}
  \begin{tabularx}{\linewidth}{@{}l >{\raggedright\arraybackslash}X l@{}}
    \toprule
    Workstream & Outcome & State \\
    \midrule
    Positioning & Validated message & Active \\
    Distribution & Repeatable channel & Proposed \\
    \bottomrule
  \end{tabularx}
\end{table}
```

Use `>{\raggedright\arraybackslash}X` rather than bare `X`: justified narrow
columns reliably produce underfull-box warnings. Inside table cells prefer
`\texttt{...}` over `\path{...}`; `\path` interacts badly with `tabularx`
column measurement.

### Ordinary image

```tex
\begin{figure}[ht]
  \centering
  \includegraphics[width=0.88\linewidth]{images/funnel.pdf}
  \caption{Current acquisition funnel.}
  \label{fig:funnel}
\end{figure}
```

Supported image formats are PNG, JPEG, and PDF. Convert SVG before inclusion.

### Graphviz

`diagrams/dependencies.dot`:

```dot
digraph Dependencies {
  graph [rankdir=LR, bgcolor="transparent"];
  node [shape=box, style="rounded,filled", fillcolor="#F5F7FB",
        color="#3157D5", fontcolor="#172033", fontname="Helvetica"];
  edge [color="#667085", fontcolor="#475569"];
  "Positioning" -> "Outbound tests";
  "Instrumentation" -> "Channel decision";
  "Outbound tests" -> "Channel decision";
}
```

Use Texlr's restrained blue-gray palette by default. Semantic accent colors are
welcome when they clarify distinct node roles; keep the title and body typography
monochrome and high-contrast.

LaTeX:

```tex
\begin{figure}[ht]
  \centering
  \graphviz[width=0.86\linewidth]{diagrams/dependencies.dot}
  \caption{Dependencies between workstreams.}
  \label{fig:dependencies}
\end{figure}
```

### Mermaid

`diagrams/sequence.mmd`:

```text
flowchart LR
    Research --> Positioning
    Positioning --> Experiments
    Experiments --> Measurement
    Measurement --> Decision
```

LaTeX:

```tex
\begin{figure}[ht]
  \centering
  \mermaid[width=0.9\linewidth]{diagrams/sequence.mmd}
  \caption{Validation sequence.}
\end{figure}
```

## Diagram sizing

The text block is roughly 414 by 628 points. The `width=` option scales both
axes, so a diagram's natural aspect ratio decides both legibility and float
placement:

- Keep a diagram's natural width under about 750 points. Beyond four or five
  left-to-right stages, switch to `rankdir=TB` (Graphviz) or `flowchart TB`
  (Mermaid) — a very wide diagram scaled to `\linewidth` renders its labels
  unreadably small.
- A diagram naturally taller than about 500 points will not share a page with
  text; simplify it or accept a dedicated float page.
- Large floats can silently defer to the end of the document. Standard float
  tuning in the preamble (`\topfraction`, `\floatpagefraction`, `[htbp]`) is
  permitted when that happens.

## LaTeX safety

Escape ordinary text containing these characters:

| Input | LaTeX |
| --- | --- |
| `&` | `\&` |
| `%` | `\%` |
| `$` | `\$` |
| `#` | `\#` |
| `_` | `\_` |
| `{` | `\{` |
| `}` | `\}` |

Use `\textasciitilde{}` and `\textasciicircum{}` for literal tilde and caret.
Use `\textbackslash{}` for a literal backslash. Put URLs in `\url{...}` rather
than escaping them manually. Use `\path{...}` for file paths, route paths, and
long code identifiers so LaTeX can break them safely; reserve `\texttt{...}`
for short inline tokens. `\texttt` does not provide useful breakpoints within
long identifiers; whether it overflows depends on the available width. In a
narrow table cell, shorten the display label and put the full path below the
table rather than forcing a long unbreakable token into the column.

Do not paste Markdown fences, headings, tables, or emphasis syntax into the
LaTeX source. Convert them to LaTeX environments and commands.

## Conversion guidance

When converting a plan or Markdown source:

1. Preserve its hierarchy and all substantive content.
2. Consolidate repetition only when meaning is unchanged.
3. Label unsupported ownership, timing, or status as open rather than guessing.
4. Turn relationship-heavy content into one useful diagram when appropriate.
5. Keep detailed checklists as lists or tables; do not bury them in prose.
6. Include a final section for decisions needed or immediate next actions when
   the source supports it.

## Visual inspection

A successful compile is not a layout check. Read the published log, then render
the PDF to temporary images outside the authoring/source directory. For example,
with Ghostscript available on `PATH`:

```bash
preview_dir=$(mktemp -d)
gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r120 \
  -sOutputFile="$preview_dir/page-%03d.png" /absolute/path/to/handoff.pdf
```

Open every page with the harness's image-viewing tool. Check title and header
fit, page breaks, whitespace, table wrapping, missing glyphs, clipped content,
and diagram labels. Confirm figures land near the text that discusses them.
Use close-up renders if labels are too small to judge. Keep preview images out
of the delivered source bundle; remove your temporary previews after review.

If `gs` is not exposed on `PATH`, use an available PDF renderer such as
`pdftoppm`, or run it through Nix (`nix shell nixpkgs#ghostscript --command gs ...`).
If rendering or image viewing is unavailable, disclose that visual verification
is blocked; do not equate a clean log with a visually checked document.

## Failure handling

- `output_exists`: confirm replacement is intended, then retry with `--force`.
- `invalid_output`: correct overlapping or unsafe paths; do not bypass it.
- `diagram_failed`: inspect the DOT/Mermaid source and the reported log.
- `latex_failed`: inspect the retained build and compiler log, then fix the
  reported source line.
- Missing `texlr`: use the Nix fallback from `SKILL.md`.

A failed build intentionally retains its staging directory. Do not report the
failed staging path as the final source bundle.
