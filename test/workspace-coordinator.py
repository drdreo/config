#!/usr/bin/env python3
"""Exercise the plugin without contacting a running Herdr session."""

import importlib.util
import json
import os
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch


PLUGIN = Path(__file__).resolve().parents[1] / "herdr/plugins/workspace-coordinator/coordinator.py"
spec = importlib.util.spec_from_file_location("coordinator", PLUGIN)
coordinator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coordinator)


class CoordinatorTest(unittest.TestCase):
    def invoke(self, *, event="workspace.created", context=None, pane=None, error=None):
        env = {
            "HERDR_PLUGIN_EVENT": event,
            "HERDR_PLUGIN_CONTEXT_JSON": json.dumps(
                context if context is not None else {
                    "focused_pane_id": "w1:p1", "workspace_id": "w1"
                }
            ),
            "HERDR_BIN_PATH": "/synthetic/herdr",
        }
        response = subprocess.CompletedProcess(
            [], 0, stdout=json.dumps({"result": {"pane": pane or {"workspace_id": "w1"}}})
        )
        with patch.dict(os.environ, env, clear=True), patch.object(
            coordinator.subprocess, "run", return_value=response, side_effect=error
        ) as run:
            coordinator.main()
        return run

    def test_labels_only_initial_unnamed_pane(self):
        run = self.invoke()
        self.assertEqual(run.call_count, 2)
        run.assert_any_call(
            ["/synthetic/herdr", "pane", "get", "w1:p1"],
            check=True, capture_output=True, text=True, timeout=10,
        )
        run.assert_any_call(
            ["/synthetic/herdr", "pane", "rename", "w1:p1", "Coordinator"],
            check=True, timeout=10,
        )

    def test_ignores_other_events(self):
        self.invoke(event="pane.created").assert_not_called()

    def test_requires_both_context_ids(self):
        for context in ({}, {"focused_pane_id": "w1:p1"}, {"workspace_id": "w1"}):
            with self.subTest(context=context):
                self.invoke(context=context).assert_not_called()

    def test_preserves_existing_labels(self):
        for label in ("Custom", "Coordinator"):
            with self.subTest(label=label):
                self.assertEqual(self.invoke(pane={"workspace_id": "w1", "label": label}).call_count, 1)

    def test_does_not_label_a_moved_pane(self):
        self.assertEqual(self.invoke(pane={"workspace_id": "w2"}).call_count, 1)

    def test_stops_on_failed_lookup(self):
        with self.assertRaises(subprocess.CalledProcessError):
            self.invoke(error=subprocess.CalledProcessError(1, ["synthetic-herdr"]))

    def test_stops_on_timed_out_lookup(self):
        with self.assertRaises(subprocess.TimeoutExpired):
            self.invoke(error=subprocess.TimeoutExpired(["synthetic-herdr"], 10))


if __name__ == "__main__":
    unittest.main()
