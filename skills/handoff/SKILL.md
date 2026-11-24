---
name: handoff
description: "Saves the current work to .notes/<task>/PLAN.md and .notes/<task>/HANDOFF.md so it can continue in a fresh session, then gives a one-line prompt to paste there. Use when the user wants to hand off, continue in a new session, or says the context is full — e.g. 'handoff yap', 'yeni session'da devam edelim', 'context doldu', 'devam etmek için prompt yaz', 'write a handoff', '/sela:handoff'."
---

# sela:handoff

Save the state of the current work so a fresh session can continue it without this conversation.

## Language

- Write PLAN.md, HANDOFF.md and the resume prompt in **English**.
- Talk to the user in **the language they use in this conversation**, with simple, short sentences.
- The resume prompt must tell the next session to reply in that same language (e.g. "Reply to me in Turkish.").

## Step 0 — Make sure `.notes/` is ignored by git

Skip this step if the current directory is not a git repo.

Run `git check-ignore -q .notes/` at the repo root. This covers the global gitignore and the repo's own `.gitignore`.

- Exit code 0: `.notes/` is ignored. Go to Step 1.
- Otherwise: stop. Do not write any files. Tell the user `.notes/` is not ignored, so the handoff files could be committed by mistake. Ask if you should add `.notes/` to their global gitignore.
  - If they say yes: find the file with `git config --global core.excludesFile`. If it is empty, use `~/.config/git/ignore` (create it if needed). Add a `.notes/` line to it, run the check again, then go to Step 1.
  - If they say no: stop. Do not write the handoff.

## Step 1 — Find the task folder

Every task has its own folder: `.notes/YYYY-MM-DD-<short-slug>/` at the repo root (or the current working directory if not a git repo).

- If this session started by reading a folder under `.notes/`, use that same folder.
- If not, check the existing folders in `.notes/`. If one looks like the same task, ask the user if you should use it.
- If none matches, create a new folder. Use today's date and a short kebab-case slug from the task (e.g. `2026-11-17-login-refactor`).
- If it is not clear which folder this work belongs to, ask the user. Do not guess.

## Step 2 — Update PLAN.md (long-lived)

Do not delete old content. Update and add to it.

```markdown
# <Task title>

## Goal
<What we are building or fixing, and why.>

## Steps
- [x] Done step
- [ ] Open step

## Decisions
- <Decision> — <why>. (<date>)
```

## Step 3 — Rewrite HANDOFF.md (short-lived)

Rewrite it from scratch each time.

```markdown
# Handoff — <date>

## Current state
<Where the work stands right now. What works, what does not.>

## Changed files
- `path/to/file` — <what changed>

## Tried and did not work
- <Approach> — <why it failed>

## Next step
<The exact next thing to do.>
Ask the user before starting. If this step waits for an input (audio, a file, a decision) that has not arrived, do not move to another step on your own: ask.

## Notes from the user
<Anything the user asked to focus on in this handoff. Omit if none.>
```

Rules:
- Be specific: file paths, function names, commands, error messages. The next session has none of this conversation.
- "Tried and did not work" matters most. Without it, the next session repeats the same mistakes.
- Do not write things the next session can learn from the code or git history.
- If the user added a note when calling the skill (e.g. "focus on the API part"), follow it.

## Step 4 — Give the resume prompt

Tell the user, in their language, that the files are saved, then give the prompt in a code block:

```
Read .notes/<folder>/PLAN.md and .notes/<folder>/HANDOFF.md. Summarize the current state and what you plan to do from "Next step", then wait for my OK before you change anything. Reply to me in <language>.
```

Also copy the exact same prompt to the clipboard, without a trailing newline:

```bash
printf '%s' 'Read .notes/<folder>/PLAN.md and .notes/<folder>/HANDOFF.md. Summarize the current state and what you plan to do from "Next step", then wait for my OK before you change anything. Reply to me in <language>.' | pbcopy
```

`pbcopy` is for macOS. On other systems pipe to the first one that exists: `wl-copy` or `xclip -selection clipboard` (Linux), `clip` (Windows). If none is available, skip this and do not mention it. If it works, tell the user the prompt is already on the clipboard.
