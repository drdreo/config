# drdreo/config

Portable configuration for my agent harnesses and, eventually, my Omarchy
workstation. The repository is the source of truth; a small dependency-free
Bash CLI links each managed item into place without taking over runtime state.

## Quick start

```bash
git clone https://github.com/drdreo/config.git ~/.config/drdreo
cd ~/.config/drdreo

./bin/config status
./bin/config apply --dry-run
./bin/config apply
```

`apply` creates one symlink per skill or extension. Existing paths are moved to
a timestamped backup under `~/.config-backups/drdreo-config/` before linking.
This lets managed files coexist with sessions, credentials, generated
integrations, and customizations owned by other tools.

Pulling updates is enough after the first apply because the links point into the
checkout:

```bash
git -C ~/.config/drdreo pull --ff-only
```

## Layout

```text
agents/skills/   Cross-harness Agent Skills
pi/extensions/   Personal Pi extensions
memory/          Policy and future curated durable context
omarchy/         Future Omarchy/Arch customization groups
bin/config       Apply, inspect, import, or unlink managed config
test/smoke.sh    Isolated-home smoke test
```

### Add a customization

Use the CLI:

```bash
./bin/config add skill ~/.agents/skills/my-skill
./bin/config add pi-extension ~/.pi/agent/extensions/my-extension.ts
./bin/config apply
```

Or copy it directly and apply:

```bash
cp -R /path/to/my-skill agents/skills/
cp /path/to/my-extension.ts pi/extensions/
./bin/config apply
```

Useful commands:

```bash
./bin/config status       # exits non-zero if anything needs applying
./bin/config apply        # safely backs up conflicts, then links
./bin/config unapply      # removes only links owned by this checkout
./test/smoke.sh           # tests against a temporary HOME
```

Override `AGENTS_HOME`, `PI_CODING_AGENT_DIR`, or `CONFIG_BACKUP_DIR` for a
nonstandard installation.

### Pi-only alternative

This repository is also a [Pi package](https://pi.dev/docs/packages.html), so Pi
can load the same extensions and skills directly:

```bash
pi install git:github.com/drdreo/config
```

Use either the Pi package installation **or** `./bin/config apply`, not both, to
avoid duplicate resource discovery. The config CLI is preferred because
`.agents/skills` remains available to multiple harnesses.

## Toolchain inventory

### Harnesses and companion CLIs

| Tool | Role | Integration here |
| --- | --- | --- |
| [Pi](https://pi.dev) | Extensible terminal coding harness | Two personal extensions and all skills |
| [Herdr](https://herdr.dev) | Terminal workspaces, worktrees, and agent orchestration | `herdr` skill; its generated Pi bridge stays tool-managed |
| [daylog](https://github.com/drdreo/daylog) | Append-only daily trail of substantive human and agent work | `daylog` skill; journal data stays local |
| [Texlr](https://github.com/drdreo/texlr) | Polished PDF and self-contained LaTeX handoffs | `texlr-handoff` skill |
| [Notion CLI (`ntn`)](https://ntn.dev) | Notion API, pages, files, and worker operations | `notion-cli` skill |
| [Playwright CLI](https://github.com/microsoft/playwright-cli) | Browser-driven verification | `qa-check` skill |
| [GitHub CLI](https://cli.github.com/) | Issues, PRs, and repository automation | Used by review and shipping workflows |

### Skills

| Skill | Purpose |
| --- | --- |
| [`build-to-rebuild`](agents/skills/build-to-rebuild/) | Disposable architecture probe followed by a clean reimplementation |
| [`code-review`](agents/skills/code-review/) | Parallel standards, specification, and correctness review |
| [`daylog`](agents/skills/daylog/) | Record only durable, substantive outcomes |
| [`herdr`](agents/skills/herdr/) | Inspect and control Herdr sessions safely |
| [`notion-cli`](agents/skills/notion-cli/) | Drive `ntn` using its live CLI documentation |
| [`qa-check`](agents/skills/qa-check/) | Time-boxed browser QA with evidence |
| [`ship-ticket`](agents/skills/ship-ticket/) | Take Linear or GitHub tickets through implementation and PR |
| [`teach-me-something`](agents/skills/teach-me-something/) | Short, code-grounded lessons from the active repository |
| [`texlr-handoff`](agents/skills/texlr-handoff/) | Produce designed PDF handoff documents |

### Pi extensions

| Extension | Purpose |
| --- | --- |
| [`pi-env.ts`](pi/extensions/pi-env.ts) | Applies global and trusted project `env` settings to Pi sessions |
| [`thinking-footer.ts`](pi/extensions/thinking-footer.ts) | Compact footer with model, thinking, usage, cache, cost, and git context |

## What belongs here

Track declarative, reviewable source: skills, extensions, prompts, themes,
non-secret preferences, package lists, and portable OS configuration.

Do **not** track credentials, API keys, `auth.json`, session logs, caches,
`trust.json`, daylog data, generated model stores, or machine-specific runtime
state. Keep raw or private memory out of this public repository; see
[`memory/README.md`](memory/README.md).

The Herdr-generated `herdr-agent-state.ts` extension is intentionally not
managed here because Herdr owns and overwrites it.

## Future Omarchy organization

Add Omarchy changes as small groups under [`omarchy/`](omarchy/) and extend the
source/target arrays in `bin/config`. Keep package manifests separate from
Hyprland, Waybar, shell, and host-specific layers so each group can be applied
or removed independently.
