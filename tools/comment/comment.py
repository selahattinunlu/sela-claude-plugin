#!/usr/bin/env python3
"""Open Claude's last response in a local browser page, collect comments, print them.

Usage: comment.py [--print-last]
Runs a server on 127.0.0.1 only. Nothing leaves this computer.
"""
import json
import os
import re
import secrets
import subprocess
import sys
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

PROJECTS = Path.home() / ".claude" / "projects"
HTML_FILE = Path(__file__).with_name("comment.html")
WAIT_SECONDS = 9 * 60 + 30  # Claude's Bash tool stops at 10 minutes


def find_transcript():
    project_dir = PROJECTS / re.sub(r"[^A-Za-z0-9]", "-", os.getcwd())
    files = list(project_dir.glob("*.jsonl")) or list(PROJECTS.glob("*/*.jsonl"))
    return max(files, key=lambda p: p.stat().st_mtime) if files else None


def is_real_prompt(entry):
    if entry.get("type") != "user" or entry.get("isMeta") or entry.get("isSidechain"):
        return False
    content = (entry.get("message") or {}).get("content")
    if isinstance(content, str):
        return True
    return isinstance(content, list) and any(
        isinstance(b, dict) and b.get("type") == "text" for b in content
    )


def last_response(transcript):
    turns = []  # text blocks of Claude, one list per user prompt
    for line in transcript.open(encoding="utf-8"):
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        if is_real_prompt(entry):
            turns.append([])
        elif entry.get("type") == "assistant" and not entry.get("isSidechain") and turns:
            message = entry.get("message") or {}
            if message.get("model") == "<synthetic>":  # e.g. "No response requested." after /restart
                continue
            for block in message.get("content") or []:
                if isinstance(block, dict) and block.get("type") == "text" and block.get("text", "").strip():
                    turns[-1].append(block["text"])
    # The last turn is the /comment call itself, so skip it.
    for texts in reversed(turns[:-1]):
        if texts:
            return "\n\n".join(texts)
    return None


def format_result(data):
    comments = data.get("comments") or []
    general = (data.get("general") or "").strip()
    if not comments and not general:
        return "The user opened the comment page but sent no comments."
    out = ["The user reviewed your previous response and left these comments. Answer each one.", ""]
    for i, c in enumerate(comments, 1):
        out.append(f"### Comment {i}")
        out += ["> " + l for l in c.get("quote", "").strip().splitlines()]
        out += ["", c.get("comment", "").strip(), ""]
    if general:
        out += ["### General comment", general, ""]
    return "\n".join(out)


def serve(text):
    token = secrets.token_urlsafe(16)
    state = {"result": None}
    page = HTML_FILE.read_bytes()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def send(self, code, body=b"", ctype="text/plain; charset=utf-8"):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path == f"/{token}/":
                self.send(200, page, "text/html; charset=utf-8")
            elif self.path == f"/{token}/data":
                self.send(200, json.dumps({"text": text}).encode(), "application/json")
            else:
                self.send(404)

        def do_POST(self):
            if self.path not in (f"/{token}/submit", f"/{token}/cancel"):
                return self.send(404)
            length = min(int(self.headers.get("Content-Length") or 0), 2_000_000)
            body = self.rfile.read(length)
            if self.path.endswith("/cancel"):
                state["result"] = "The user cancelled the comment page. No comments."
            else:
                try:
                    state["result"] = format_result(json.loads(body))
                except ValueError:
                    return self.send(400)
            self.send(200, b"ok")

    server = HTTPServer(("127.0.0.1", 0), Handler)
    server.timeout = 1
    url = f"http://127.0.0.1:{server.server_port}/{token}/"
    print(f"Comment page: {url}", file=sys.stderr)
    if sys.platform == "darwin":
        subprocess.run(["open", url], check=False)
    else:
        webbrowser.open(url)
    deadline = time.time() + WAIT_SECONDS
    while state["result"] is None and time.time() < deadline:
        server.handle_request()
    server.server_close()
    return state["result"] or "The comment page timed out. The user sent no comments."


def main():
    transcript = find_transcript()
    text = last_response(transcript) if transcript else None
    if not text:
        print("No previous Claude response found in this session.")
        return
    if "--print-last" in sys.argv:
        print(text)
        return
    print(serve(text))


if __name__ == "__main__":
    main()
