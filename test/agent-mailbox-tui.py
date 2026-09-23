#!/usr/bin/env python3
"""Real Pi TUIs in an owned tmux server, with a deterministic local SSE model.
No credentials, inherited agent config, Herdr input, or external model calls.
Artifacts stay in the printed private directory; the tmux server is always stopped.
"""
import http.server
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import socket
import subprocess
import tempfile
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
ART = Path(tempfile.mkdtemp(prefix="pi-mail-tui-", dir="/tmp"))
MAIL = ART / "mail"
MAIL.mkdir(mode=0o700)
SERVER = "mailbox-test-" + str(os.getpid())
PI = shutil.which("pi")
REQUESTS = []
LOCK = threading.Lock()
RELEASE = threading.Event()
TREE_STARTED = threading.Event()
TREE_RELEASE = threading.Event()


def wait(predicate, description, timeout=20):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            value = predicate()
            if value:
                return value
        except (FileNotFoundError, json.JSONDecodeError, ConnectionError):
            pass
        time.sleep(.08)
    raise AssertionError("Timed out: " + description)


class Model(http.server.BaseHTTPRequestHandler):
    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass  # Escape intentionally cancels streaming requests in this suite.

    def log_message(self, *_args):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        with LOCK:
            REQUESTS.append(body)
            (ART / "model-requests.json").write_text(json.dumps(REQUESTS, indent=2))
        last = body["messages"][-1]
        text = json.dumps(last.get("content", ""), ensure_ascii=False)
        call = None
        if "TREE_FAIL" in text or "TREE_CANCEL" in text:
            TREE_STARTED.set()
            TREE_RELEASE.wait(20)
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            try:
                self.wfile.write(b'{"error":{"message":"deliberate branch-summary fixture failure"}}')
            except BrokenPipeError:
                pass  # The cancellation test deliberately closes this request.
            return
        if last["role"] != "tool":
            if "BUSY_HOLD" in text:
                RELEASE.wait(20)
            chain = re.search(r"CHAIN:([a-f0-9,]+)", text)
            if chain:
                recipients = chain[1].split(",")
                call = ("mailbox_send", {"to": recipients[0], "id": "hop-" + str(len(recipients)), "task": "routing", "text": "CHAIN:" + ",".join(recipients[1:]) if len(recipients) > 1 else "CHAIN_COMPLETE"})
            elif "ASK_APPROVAL" in text:
                call = ("fixture_approval", {})
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.end_headers()
        delta = {"role": "assistant", "content": "MODEL_OK"}
        if call:
            delta = {"role": "assistant", "tool_calls": [{"index": 0, "id": "call_fixture", "type": "function", "function": {"name": call[0], "arguments": json.dumps(call[1])}}]}
        for data in [
            {"id": "fixture", "object": "chat.completion.chunk", "model": "fixture", "choices": [{"index": 0, "delta": delta, "finish_reason": None}]},
            {"id": "fixture", "object": "chat.completion.chunk", "model": "fixture", "choices": [{"index": 0, "delta": {}, "finish_reason": "tool_calls" if call else "stop"}]},
        ]:
            self.wfile.write(("data: " + json.dumps(data) + "\n\n").encode())
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()


def tmux(*args, check=True):
    return subprocess.run(["tmux", "-L", SERVER, *args], text=True, capture_output=True, check=check).stdout


def key(name, *keys):
    tmux("send-keys", "-t", name, *keys)
    if "Escape" in keys:
        time.sleep(.1)  # Let Pi disambiguate lone ESC before the next test keystroke.


def type_text(name, text):
    tmux("send-keys", "-t", name, "-l", text)


def state(name):
    return json.loads((ART / name / "state.json").read_text())


def capture(name, label):
    text = tmux("capture-pane", "-t", name, "-p", "-S", "-300")
    (ART / f"{name}-{label}.txt").write_text(text)
    return text


def addresses(name):
    return [json.loads(p.read_text()) for p in MAIL.glob("*.json") if json.loads(p.read_text())["name"] == name]


def rpc(address, op, message=None):
    with socket.socket(socket.AF_UNIX) as sock:
        sock.settimeout(4)
        sock.connect(str(MAIL / (address + ".sock")))
        sock.sendall((json.dumps({"version": 1, "to": address, "op": op, "message": message}) + "\n").encode())
        data = b""
        while b"\n" not in data:
            chunk = sock.recv(4096)
            if not chunk:
                raise ConnectionError("EOF")
            data += chunk
        result = json.loads(data.split(b"\n")[0])
        assert result["ok"], result
        return result


def send(address, identity, text):
    return rpc(address, "send", {"from": "test-driver", "id": identity, "task": "poc", "text": text})


def delivered(address, identity):
    return any(r["id"] == identity and r["state"] == "delivered" for r in rpc(address, "inspect")["records"])


def settle(name, address, identity):
    wait(lambda: delivered(address, identity), identity + " delivered")
    wait(lambda: state(name)["idle"], name + " idle")
    time.sleep(.15)


def command(name, text):
    # Only scratch agents, never a live user/coordinator pane.
    if state(name)["text"]:
        key(name, "C-c")
        wait(lambda: not state(name)["text"], "clear scratch draft")
    type_text(name, text)
    key(name, "Enter")


def start(name, port, mode="regular"):
    home = ART / name
    home.mkdir()
    config = home / "agent"
    config.mkdir()
    (config / "settings.json").write_text(json.dumps({"defaultProvider": "fixture", "defaultModel": "fixture", "compaction": {"enabled": False}, "retry": {"enabled": False}}))
    (config / "models.json").write_text(json.dumps({"providers": {"fixture": {"api": "openai-completions", "baseUrl": f"http://127.0.0.1:{port}/v1", "apiKey": "local-test", "models": [{"id": "fixture", "reasoning": False}]}}}))
    argv = [PI, "--offline", "--no-extensions", "--no-skills", "--no-prompt-templates", "--no-context-files", "--no-themes", "--no-approve", "--no-builtin-tools", "--tui-mode", mode, "-e", str(ROOT / "pi/experimental/agent-mailbox/index.ts"), "-e", str(ROOT / "test/fixtures/mailbox-ui.ts"), "--mailbox-dir", str(MAIL), "--mailbox-name", name]
    env = {"HOME": str(home), "PATH": os.environ["PATH"], "TERM": "xterm-256color", "PI_CODING_AGENT_DIR": str(config), "PI_OFFLINE": "1", "PI_TELEMETRY": "0", "MAILBOX_TEST_STATE": str(home / "state.json")}
    shell = "exec env -i " + " ".join(shlex.quote(k + "=" + v) for k, v in env.items()) + " " + shlex.join(argv)
    if name == "reviewer":
        tmux("-f", "/dev/null", "new-session", "-d", "-s", name, "-x", "120", "-y", "40", "-c", str(home), shell)
    else:
        tmux("new-session", "-d", "-s", name, "-x", "120", "-y", "40", "-c", str(home), shell)
    try:
        address = wait(lambda: addresses(name), name + " mailbox startup")[0]["address"]
        wait(lambda: state(name)["idle"], name + " ready")
        return address
    except Exception:
        print(capture(name, "startup-failure"))
        raise


RESULTS = []
def passed(text):
    RESULTS.append(text)
    print("PASS", text, flush=True)
    (ART / "results.json").write_text(json.dumps(RESULTS, indent=2))


def run(port):
    reviewer = start("reviewer", port)
    # Main regression: no Enter, mid-line cursor, exact text and request isolation.
    type_text("reviewer", "UNSENT_human_draft")
    key("reviewer", "Left", "Left", "Left", "Left", "Left")
    wait(lambda: state("reviewer")["text"] == "UNSENT_human_draft", "draft typed")
    before = len(REQUESTS)
    send(reviewer, "idle", "IDLE_REPORT")
    settle("reviewer", reviewer, "idle")
    assert len(REQUESTS) == before + 1
    assert state("reviewer")["text"] == "UNSENT_human_draft"
    assert "UNSENT_human_draft" not in json.dumps(REQUESTS)
    type_text("reviewer", "X")
    wait(lambda: state("reviewer")["text"] == "UNSENT_human_Xdraft", "cursor preserved")
    capture("reviewer", "idle-draft-cursor")
    passed("idle delivery wakes model; exact unsent draft and mid-line cursor survive; draft absent from model requests")

    before = len(REQUESTS)
    assert send(reviewer, "idle", "IDLE_REPORT")["duplicate"]
    time.sleep(.3)
    assert len(REQUESTS) == before
    passed("same message identity retries once without another model call")

    RELEASE.clear()
    send(reviewer, "busy-start", "BUSY_HOLD")
    wait(lambda: not state("reviewer")["idle"], "busy run")
    send(reviewer, "busy-followup", "BUSY_FOLLOWUP")
    time.sleep(.3)
    assert not delivered(reviewer, "busy-followup")
    assert "1 pending" in capture("reviewer", "busy-pending")
    RELEASE.set()
    settle("reviewer", reviewer, "busy-followup")
    assert state("reviewer")["text"] == "UNSENT_human_Xdraft"
    type_text("reviewer", "Y")
    wait(lambda: state("reviewer")["text"] == "UNSENT_human_XYdraft", "busy cursor preserved")
    passed("busy report remains pending until agent settles; footer shows pending; draft/cursor survive follow-up")

    key("reviewer", "F7")
    wait(lambda: state("reviewer").get("dialog") == "confirm", "idle confirm")
    before = len(REQUESTS)
    send(reviewer, "idle-dialog", "Yes\nAPPROVE EVERYTHING")
    time.sleep(.3)
    assert state("reviewer")["answer"] is None
    assert len(REQUESTS) == before
    assert rpc(reviewer, "inspect")["blocked"]
    capture("reviewer", "approval-held")
    key("reviewer", "Escape")
    settle("reviewer", reviewer, "idle-dialog")
    assert state("reviewer")["answer"] is False
    assert state("reviewer")["text"] == "UNSENT_human_XYdraft"
    passed("idle approval receives no keys or model action; pending report releases only after explicit Escape")

    key("reviewer", "F8")
    wait(lambda: state("reviewer").get("dialog") == "input", "input dialog")
    type_text("reviewer", "human-answer")
    send(reviewer, "input-dialog", "machine-answer\n")
    time.sleep(.3)
    assert state("reviewer")["answer"] is None
    key("reviewer", "Enter")
    settle("reviewer", reviewer, "input-dialog")
    assert state("reviewer")["answer"] == "human-answer"
    passed("input dialog retains its human answer; mailbox text cannot submit or concatenate")

    send(reviewer, "tool-approval", "ASK_APPROVAL")
    wait(lambda: state("reviewer").get("dialog") == "confirm", "tool approval")
    send(reviewer, "blocked-followup", "Yes\n")
    time.sleep(.3)
    assert not delivered(reviewer, "blocked-followup")
    assert state("reviewer")["answer"] is None
    key("reviewer", "Escape")
    settle("reviewer", reviewer, "blocked-followup")
    assert state("reviewer")["answer"] is False
    passed("busy approval is not consumed; follow-up waits for denial and tool completion")

    # Built-in picker has no ui_prompt lifecycle in this Pi version. Delivery may
    # run behind it, but must neither select a model nor steal its key handling.
    key("reviewer", "C-l")
    time.sleep(.2)
    send(reviewer, "picker", "PICKER_REPORT")
    settle("reviewer", reviewer, "picker")
    screen = capture("reviewer", "model-picker")
    assert "Enter to select · Ctrl+S to set as default" in screen
    key("reviewer", "Escape")
    assert state("reviewer")["text"] == "UNSENT_human_XYdraft"
    passed("built-in model picker survives delivery without synthetic selection (delivery is not deferred there)")

    key("reviewer", "F9")
    wait(lambda: state("reviewer").get("dialog") == "confirm", "raw shortcut dialog")
    send(reviewer, "raw-shortcut", "Yes\n")
    settle("reviewer", reviewer, "raw-shortcut")
    assert state("reviewer")["answer"] is None
    assert "TEST APPROVAL" in capture("reviewer", "raw-shortcut")
    key("reviewer", "Escape")
    wait(lambda: state("reviewer")["answer"] is False, "raw shortcut denied")
    passed("Pi shortcut-context lifecycle gap: model can wake, but dialog remains unanswered and receives no synthetic keys")

    specialist = start("specialist", port)
    lead = start("lead", port)
    coordinator = start("coordinator", port, "fullscreen")
    type_text("coordinator", "FULLSCREEN_DRAFT")
    key("coordinator", "Left", "Left")
    send(reviewer, "routing-start", f"CHAIN:{specialist},{reviewer},{lead},{coordinator}")
    wait(lambda: any(r["task"] == "routing" for r in rpc(coordinator, "inspect")["records"]), "routing reaches isolated coordinator")
    settle("coordinator", coordinator, "hop-1")
    assert state("coordinator")["text"] == "FULLSCREEN_DRAFT"
    type_text("coordinator", "Z")
    wait(lambda: state("coordinator")["text"] == "FULLSCREEN_DRAZFT", "fullscreen cursor preserved")
    capture("coordinator", "routed-report")
    passed("model-driven mailbox_send routes reviewer → specialist → reviewer → lead → isolated coordinator; fullscreen draft/cursor survive")

    command("reviewer", "/mailbox pause")
    wait(lambda: rpc(reviewer, "inspect")["paused"], "paused")
    before = len(REQUESTS)
    send(reviewer, "paused", "PAUSED_REPORT")
    time.sleep(.3)
    assert not delivered(reviewer, "paused")
    assert len(REQUESTS) == before
    command("reviewer", "/mailbox")
    time.sleep(.3)
    assert "paused" in capture("reviewer", "mailbox-inspect")
    command("reviewer", "/mailbox resume")
    settle("reviewer", reviewer, "paused")
    passed("pause/resume and minimal mailbox inspection work without injecting user messages")

    command("reviewer", "/mailbox pause")
    wait(lambda: rpc(reviewer, "inspect")["paused"], "pause before uncovered dialogs")
    before = len(REQUESTS)
    key("reviewer", "F9")
    wait(lambda: state("reviewer").get("dialog") == "confirm", "paused raw dialog")
    send(reviewer, "paused-raw", "Yes\n")
    time.sleep(.3)
    assert state("reviewer")["answer"] is None and len(REQUESTS) == before
    key("reviewer", "Escape")
    wait(lambda: state("reviewer")["answer"] is False, "paused raw dialog denied")
    key("reviewer", "C-l")
    time.sleep(.2)
    send(reviewer, "paused-picker", "PICKER_PAUSED")
    time.sleep(.3)
    assert len(REQUESTS) == before
    assert "Enter to select · Ctrl+S to set as default" in capture("reviewer", "paused-picker")
    key("reviewer", "Escape")
    command("reviewer", "/mailbox resume")
    settle("reviewer", reviewer, "paused-picker")
    assert delivered(reviewer, "paused-raw")
    passed("explicit pause prevents model wake during uncovered shortcut and built-in dialogs")

    for mode in ["fail", "cancel"]:
        TREE_STARTED.clear()
        TREE_RELEASE.clear()
        if mode == "fail":
            command("reviewer", "/fixture-tree")
        else:
            # Only the built-in tree UI wires Escape to abortBranchSummary().
            command("reviewer", "/tree")
            wait(lambda: "Session Tree" in tmux("capture-pane", "-t", "reviewer", "-p"), "tree selector")
            key("reviewer", *(["PPage"] * 10), "Enter")
            wait(lambda: "Summarize branch?" in tmux("capture-pane", "-t", "reviewer", "-p"), "summary choice")
            key("reviewer", "Down", "Down", "Enter")
            wait(lambda: "Custom summarization instructions" in tmux("capture-pane", "-t", "reviewer", "-p"), "summary prompt")
            type_text("reviewer", "TREE_CANCEL")
            key("reviewer", "Enter")
        wait(TREE_STARTED.is_set, "branch summary request")
        assert not state("reviewer")["idle"]
        send(reviewer, "tree-" + mode, "REPORT_DURING_SUMMARY")
        time.sleep(.3)
        assert not delivered(reviewer, "tree-" + mode)
        if mode == "cancel":
            key("reviewer", "Escape")
            # Prove cancellation/recovery BEFORE allowing the HTTP failure response.
            settle("reviewer", reviewer, "tree-cancel")
            assert not TREE_RELEASE.is_set()
            assert "Branch summarization cancelled" in capture("reviewer", "tree-cancel")
            key("reviewer", "Escape")  # Close the built-in tree selector reopened on cancellation.
            TREE_RELEASE.set()
        else:
            TREE_RELEASE.set()
            settle("reviewer", reviewer, "tree-fail")
            capture("reviewer", "tree-fail")
    passed("pending reports wake after branch-summary failure and cancellation without a completion event")

    type_text("reviewer", "ABORT_human_draft")
    key("reviewer", "Left", "Left")
    RELEASE.clear()
    send(reviewer, "abort-active", "BUSY_HOLD")
    wait(lambda: not state("reviewer")["idle"], "abortable model run")
    send(reviewer, "abort-pending", "MACHINE_MUST_NOT_RESTORE")
    key("reviewer", "M-Up")
    time.sleep(.15)
    assert state("reviewer")["text"] == "ABORT_human_draft"
    key("reviewer", "Escape")
    RELEASE.set()
    settle("reviewer", reviewer, "abort-pending")
    assert state("reviewer")["text"] == "ABORT_human_draft"
    type_text("reviewer", "Q")
    wait(lambda: state("reviewer")["text"] == "ABORT_human_draQft", "abort cursor preserved")
    assert "ABORT_human_draft" not in json.dumps(REQUESTS)
    capture("reviewer", "abort-no-restore")
    passed("Escape/Alt-Up cannot restore mailbox follow-ups into the human editor; draft/cursor survive abort")

    command("reviewer", "/reload")
    new_address = wait(lambda: [d for d in addresses("reviewer") if d["address"] != reviewer], "reload rotates address")[0]["address"]
    assert not (MAIL / (reviewer + ".sock")).exists()
    assert not (MAIL / (reviewer + ".json")).exists()
    assert rpc(new_address, "inspect")["records"] == []
    wait(lambda: "Reloaded keybindings" in tmux("capture-pane", "-t", "reviewer", "-p"), "reload UI finished")
    time.sleep(.3)
    old_session = state("reviewer")["sessionId"]
    old_file = state("reviewer")["sessionFile"]
    command("reviewer", "/clone")
    clone = wait(lambda: [d for d in addresses("reviewer") if d["address"] != new_address], "clone rotates address")[0]
    assert clone["sessionId"] != old_session
    assert not (MAIL / (new_address + ".sock")).exists()
    time.sleep(.3)
    command("reviewer", "/fixture-resume " + old_file)
    resumed = wait(lambda: [d for d in addresses("reviewer") if d["address"] != clone["address"]], "resume rotates address")[0]
    assert resumed["sessionId"] == old_session
    assert not (MAIL / (clone["address"] + ".sock")).exists()
    assert rpc(resumed["address"], "inspect")["records"] == []
    new_address = resumed["address"]
    time.sleep(.3)
    command("reviewer", "/new")
    newest = wait(lambda: [d for d in addresses("reviewer") if d["address"] != new_address], "new session rotates address")[0]
    assert newest["sessionId"] != old_session
    assert not (MAIL / (new_address + ".sock")).exists()
    time.sleep(.3)
    command("reviewer", "/quit")
    wait(lambda: not addresses("reviewer"), "shutdown descriptor cleanup")
    assert not (MAIL / (newest["address"] + ".sock")).exists()
    passed("reload/clone/resume/new-session/shutdown clean up endpoints and rotate identity; old recipients cannot reach replacements")

    # A killed process leaves inert files, not a reusable recipient.
    pid = addresses("specialist")[0]["pid"]
    os.kill(pid, 9)
    wait(lambda: tmux("list-panes", "-t", "specialist", check=False) == "", "killed scratch process")
    result = subprocess.run(["node", str(ROOT / "pi/experimental/agent-mailbox/cli.mjs"), "send", "--dir", str(MAIL), "--to", specialist, "--from", "driver", "--task", "stale", "--id", "stale"], input="stale report", text=True, capture_output=True)
    assert result.returncode != 0 and "ECONNREFUSED" in result.stderr, result
    missing = subprocess.run(["node", str(ROOT / "pi/experimental/agent-mailbox/cli.mjs"), "inspect", "--dir", str(MAIL), "--to", "0" * 24], text=True, capture_output=True)
    assert missing.returncode != 0
    passed("CLI fails safely for killed/stale and missing recipients; no terminal fallback")


if __name__ == "__main__":
    print("ARTIFACTS", ART, flush=True)
    assert PI and shutil.which("tmux"), "Requires installed pi and tmux"
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Model)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        run(server.server_port)
        (ART / "summary.json").write_text(json.dumps({"pi": subprocess.check_output([PI, "--version"], text=True).strip(), "passed": RESULTS, "model": "deterministic local HTTP SSE fixture; no external LLM"}, indent=2))
        print(f"PASS {len(RESULTS)} TUI scenarios; evidence: {ART}")
    finally:
        RELEASE.set()
        TREE_RELEASE.set()
        for name in ["reviewer", "specialist", "lead", "coordinator"]:
            try:
                capture(name, "final")
            except subprocess.CalledProcessError:
                pass
        tmux("kill-server", check=False)
        server.shutdown()
