#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: run-agent.sh <review|rebuild> --cwd <directory> --prompt <file> --output <file> [--thinking <level>]

Runs a fresh Pi agent with openai-codex/gpt-5.6-sol.

Options:
  --cwd <directory>   Working directory for the agent
  --prompt <file>     Markdown role brief
  --output <file>     Captured final agent response
                       Progress is mirrored live and saved to <file>.updates.log
  --thinking <level>  Pi thinking level (default: xhigh)
  --help              Show this help

Prints "BUILD-TO-REBUILD DONE <output>" on success and "BUILD-TO-REBUILD FAILED"
on any failure, so a supervisor can wait on /BUILD-TO-REBUILD (DONE|FAILED)/.
EOF
}

abspath() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *) printf '%s/%s\n' "$PWD" "$1" ;;
  esac
}

if [[ ${1:-} == "--help" || ${1:-} == "-h" ]]; then
  usage
  exit 0
fi

tmp=""
clean_tmp=""
on_exit() {
  status=$?
  if [[ -n "$tmp" ]]; then
    rm -f "$tmp"
  fi
  if [[ -n "$clean_tmp" ]]; then
    rm -f "$clean_tmp"
  fi
  if [[ $status -ne 0 ]]; then
    printf 'BUILD-TO-REBUILD FAILED\n'
  fi
}
trap on_exit EXIT

role=${1:-}
if [[ "$role" != "review" && "$role" != "rebuild" ]]; then
  usage >&2
  exit 2
fi
shift

cwd=""
prompt=""
output=""
thinking="xhigh"
while (($#)); do
  case "$1" in
    --cwd)
      cwd=${2:-}
      shift 2
      ;;
    --prompt)
      prompt=${2:-}
      shift 2
      ;;
    --output)
      output=${2:-}
      shift 2
      ;;
    --thinking)
      thinking=${2:-}
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$cwd" || -z "$prompt" || -z "$output" || -z "$thinking" ]]; then
  usage >&2
  exit 2
fi
if [[ ! -d "$cwd" ]]; then
  printf 'Working directory does not exist: %s\n' "$cwd" >&2
  exit 2
fi
if [[ ! -f "$prompt" ]]; then
  printf 'Prompt file does not exist: %s\n' "$prompt" >&2
  exit 2
fi
if ! command -v pi >/dev/null 2>&1; then
  printf 'pi is not available on PATH\n' >&2
  exit 2
fi

# The agent runs after a cd into --cwd; relative paths must survive that.
prompt=$(abspath "$prompt")
output=$(abspath "$output")

mkdir -p "$(dirname "$output")"
tmp="${output}.tmp.$$"
clean_tmp="${output}.clean.tmp.$$"
updates="${output}.updates.log"
: >"$updates"

progress_prompt='For observability during long runs, emit a standalone line exactly matching "BUILD-TO-REBUILD UPDATE <phase>: <completed milestone>; next: <next step>" after initial orientation, then only at meaningful milestones or after roughly five minutes without visible output. Keep it to one short line, never narrate routine tool calls, and never include secrets. Finish with the requested deliverable.'

args=(
  --model openai-codex/gpt-5.6-sol
  --thinking "$thinking"
  --no-session
  --print
)
if [[ "$role" == "review" ]]; then
  args+=(
    --no-skills
    --append-system-prompt "You are a detached, non-interactive, read-only architecture reviewer. Never mutate files, git state, GitHub state, or external systems. Return BLOCKED with the missing input instead of asking a question. ${progress_prompt}"
    --tools read,bash,symbol_search,project_report,module_report,read_symbol,read_enclosing,lsp_diagnostics,lens_diagnostics
  )
else
  args+=(
    --append-system-prompt "You are a detached, non-interactive implementation agent. Return BLOCKED with the missing input instead of asking a question. ${progress_prompt}"
  )
fi

set +e
(
  cd "$cwd"
  pi "${args[@]}" "@$prompt" "Execute the attached role brief. Follow the progress-line contract during execution, then finish with the requested deliverable."
) | tee "$tmp" | awk -v updates="$updates" '
  /^BUILD-TO-REBUILD UPDATE / {
    print
    fflush()
    print >> updates
    close(updates)
  }
'
pipeline_status=("${PIPESTATUS[@]}")
set -e

if ((pipeline_status[0] != 0 || pipeline_status[1] != 0 || pipeline_status[2] != 0)); then
  printf 'Agent pipeline failed: pi=%s tee=%s monitor=%s\n' \
    "${pipeline_status[0]}" "${pipeline_status[1]}" "${pipeline_status[2]}" >&2
  exit 1
fi

awk '!/^BUILD-TO-REBUILD UPDATE /' "$tmp" >"$clean_tmp"
if [[ ! -s "$clean_tmp" ]]; then
  printf 'Agent returned empty output\n' >&2
  exit 1
fi
if [[ ! -s "$updates" ]]; then
  printf 'Agent emitted no BUILD-TO-REBUILD UPDATE line\n' >&2
fi

mv "$clean_tmp" "$output"
printf 'BUILD-TO-REBUILD DONE %s (%s lines; updates: %s)\n' \
  "$output" "$(wc -l <"$output" | tr -d ' ')" "$updates"
