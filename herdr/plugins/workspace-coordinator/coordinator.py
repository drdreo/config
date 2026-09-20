import json
import os
import subprocess


def main():
    if os.environ.get("HERDR_PLUGIN_EVENT") != "workspace.created":
        return

    context = json.loads(os.environ.get("HERDR_PLUGIN_CONTEXT_JSON", "{}"))
    pane_id = context.get("focused_pane_id")
    workspace_id = context.get("workspace_id")
    if not pane_id or not workspace_id:
        return

    herdr = os.environ["HERDR_BIN_PATH"]
    result = subprocess.run(
        [herdr, "pane", "get", pane_id],
        check=True,
        capture_output=True,
        text=True,
        timeout=10,
    )
    pane = json.loads(result.stdout)["result"]["pane"]
    if pane["workspace_id"] != workspace_id or pane.get("label"):
        return

    subprocess.run(
        [herdr, "pane", "rename", pane_id, "Coordinator"],
        check=True,
        timeout=10,
    )


if __name__ == "__main__":
    main()
