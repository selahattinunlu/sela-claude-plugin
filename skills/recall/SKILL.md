---
name: recall
description: "Finds what was said in earlier Claude Code sessions of the current directory — a decision, an idea, a number, an offer, a file — by searching the saved session transcripts, not memory, git or the web. Use when the user refers to a past conversation — e.g. 'eski konuşmalara bak', 'bunu konuşmuştuk', 'hatırlıyor musun', 'geçen gün ne demiştik', 'önceki oturumda', 'what did we decide about X', 'we talked about this', '/sela:recall'. Trigger it even when the user does not say 'skill' or 'session', as long as the answer is in an earlier conversation."
---

# sela:recall

Search the saved transcripts of earlier sessions in **this directory** and answer from them.

## Language

Answer in the language the user uses, with simple, short sentences.

## Step 1 — Pick search terms

- Take 1–3 distinctive words from the user's question: names, products, numbers, rare words (e.g. `citro`, `payoneer`, `neon`). Avoid common words.
- A session matches only when **all** terms appear in the same message, so start with one strong term.

## Step 2 — Run the search

Run: `python3 -I ${CLAUDE_SKILL_DIR}/recall.py --days 14 TERM [TERM ...]`

Options:
- `--days N`: how far back (default 14). The user may say "1 hafta" → 7.
- `--subdirs`: also search sessions started in sub-folders of this directory.
- `--cwd DIR`: search another directory's sessions, only when the user names one.
- `--limit N`: how many sessions to show (default 8).

The output lists matching sessions newest first, with title, session id and up to 3 snippets.

If nothing matches: try one other term, then `--subdirs`, then `--days 30`. Stop after three searches and tell the user what you searched (terms, folders, days) and that nothing was found. Do not search the whole `~/.claude/projects` or `history.jsonl` unless the user asks for all projects.

## Step 3 — Read more only if needed

If the snippets do not answer the question, read the relevant part of that one session file (`~/.claude/projects/<folder>/<session>.jsonl`) with `grep -n` around the term. Do not read a whole transcript.

## Step 4 — Answer

- Give the answer first, then where it came from: date and session title.
- Quote the key sentence when the exact words matter (a price, a promise, a decision).
- If the user wants to open that session: `claude --resume <session id>`.
