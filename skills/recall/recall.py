"""Search past Claude Code sessions of one directory for a topic.

Usage: python3 -I recall.py [--days N] [--cwd DIR] [--subdirs] [--limit N] TERM [TERM ...]
A session matches when every term appears in one of its user or assistant messages.
"""
import argparse
import json
import os
import re
import time
from datetime import datetime

PROJECTS = os.path.expanduser("~/.claude/projects")


def norm(s):
    return s.replace("İ", "i").replace("I", "ı").lower().replace("i̇", "i")


def encode(path):
    return re.sub(r"[^A-Za-z0-9]", "-", path)


def texts(entry):
    msg = entry.get("message")
    if not isinstance(msg, dict):
        return []
    content = msg.get("content")
    if isinstance(content, str):
        return [content]
    out = []
    for block in content or []:
        if isinstance(block, dict) and block.get("type") == "text":
            out.append(block.get("text", ""))
    return out


def snippet(text, terms, width=220):
    low = norm(text)
    pos = min((low.find(t) for t in terms if low.find(t) >= 0), default=0)
    start = max(0, pos - width // 3)
    piece = text[start:start + width].replace("\n", " ")
    return ("…" if start else "") + piece + ("…" if start + width < len(text) else "")


def scan(path, terms):
    title, first_prompt, hits = None, None, []
    for line in open(path, encoding="utf-8", errors="replace"):
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        kind = entry.get("type")
        if kind in ("custom-title", "ai-title", "summary"):
            title = entry.get("customTitle") or entry.get("aiTitle") or entry.get("summary") or title
        if kind not in ("user", "assistant") or entry.get("isMeta"):
            continue
        for text in texts(entry):
            if kind == "user" and first_prompt is None and text.strip() and not text.startswith("<"):
                first_prompt = text.strip().replace("\n", " ")[:120]
            if all(t in norm(text) for t in terms):
                hits.append((kind, entry.get("timestamp", ""), snippet(text, terms)))
    return title or first_prompt or "(no title)", hits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("terms", nargs="+")
    ap.add_argument("--days", type=int, default=14)
    ap.add_argument("--cwd", default=os.getcwd())
    ap.add_argument("--subdirs", action="store_true")
    ap.add_argument("--limit", type=int, default=8)
    args = ap.parse_args()

    terms = [norm(t) for t in args.terms]
    base = encode(os.path.realpath(args.cwd))
    since = time.time() - args.days * 86400

    dirs = [d for d in os.listdir(PROJECTS)
            if d.lower() == base.lower() or (args.subdirs and d.lower().startswith(base.lower() + "-"))]
    if not dirs:
        print(f"No sessions folder for {args.cwd} (looked for {base} in {PROJECTS}).")
        return

    results = []
    for d in dirs:
        folder = os.path.join(PROJECTS, d)
        for name in os.listdir(folder):
            path = os.path.join(folder, name)
            if not name.endswith(".jsonl") or os.path.getmtime(path) < since:
                continue
            title, hits = scan(path, terms)
            if hits:
                results.append((os.path.getmtime(path), name[:-6], d, title, hits))

    results.sort(reverse=True)
    print(f"Searched {len(dirs)} folder(s), last {args.days} days, terms: {' '.join(args.terms)}")
    print(f"{len(results)} matching session(s)" + (f", showing {args.limit}" if len(results) > args.limit else ""))
    for mtime, sid, d, title, hits in results[:args.limit]:
        print()
        print(f"## {datetime.fromtimestamp(mtime):%Y-%m-%d %H:%M} · {title}")
        print(f"session: {sid}" + (f" · folder: {d}" if len(dirs) > 1 else "") + f" · {len(hits)} hit(s)")
        for kind, ts, text in hits[:3]:
            print(f"- [{kind} {ts[:16].replace('T', ' ')}] {text}")


if __name__ == "__main__":
    main()
