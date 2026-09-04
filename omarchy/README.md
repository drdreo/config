# Omarchy

Future home for portable [Omarchy](https://omarchy.org/) and Arch Linux
customizations.

Prefer small, independently installable groups (for example `hypr/`, `waybar/`,
`shell/`, and `packages/`) rather than mirroring all of `$HOME`. When the first
files land, add their mappings to `bin/config` and cover them in
`test/smoke.sh`.

Keep hardware-specific values and secrets in ignored `*.local` files with
tracked `*.example` templates where useful.
