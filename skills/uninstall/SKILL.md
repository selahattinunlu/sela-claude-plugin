---
name: uninstall
description: "Removes a macOS app completely — the .app plus every leftover file it spread across the system (Application Support, Caches, Preferences, Containers, HTTPStorages, Logs, LaunchAgents/Daemons, helper tools, pkg receipts, Homebrew, dotfiles). First finds everything and shows it as a table with sizes, then moves items to the Trash step by step, asking the user before each step. Make sure to use this skill whenever the user wants to uninstall, remove or clean up an app on their Mac, or free disk space by getting rid of an app — e.g. 'şu uygulamayı kaldır', 'X'i sistemden tamamen sil', 'geride dosya kalmasın', 'bu uygulamanın artıklarını temizle', 'uninstall Docker completely', 'remove Zoom and all its files', '/sela:uninstall'. Trigger it even if the user only names an app and says 'kaldıralım' or 'silelim'."
---

# sela:uninstall

Remove a macOS app and all of its leftover files, with the user's approval at every step.

This skill works on macOS only. On any other system, tell the user that and stop.

The user wants two things: **nothing useless left behind**, and **nothing deleted by mistake**. Every rule below serves one of those two goals.

Talk to the user in simple Turkish (B1 level), short sentences.

## Step 1 — Scan (read-only)

Run the bundled scan script. It never deletes anything.

Run: `${CLAUDE_SKILL_DIR}/scripts/scan.sh "<App Name>" [extra terms...]`

- Use part of the app's real name as it appears in `/Applications` (e.g. `GeForce`, not `NVIDIA GeForce Now`). If nothing is found, `ls /Applications` and try again with the right spelling.
- The script reads the bundle ID and code-signing Team ID from the app and adds them as search terms. This matters because many folders are named `com.vendor.app`, not after the app.
- Add extra terms when useful: the vendor name (`NVIDIA`, `Adobe`), or the CLI name for tools without a `.app` (e.g. `ollama`).
- **Don't use very short terms (3–4 letters like `gfn`).** They match random strings. Example: `gfn` matched a Chrome extension ID inside Claude's process.

If the app is not a `.app` (CLI tool, Homebrew formula, npm global), still run the script with its name; then also check `brew list`, `npm ls -g --depth=0`, `pipx list`, and the relevant dotfolder (`~/.toolname`).

## Step 2 — Check each result

The scan output is raw. It is not a delete list. Go through every path and sort it into one of these groups:

- **Belongs to the app** → goes in the table.
- **False positive** → another app that only mentions this one. For example, an icon cache in ClickUp named after the app, or an IDE extension with a similar name. Leave it out, but mention it in one line if it looks confusing.
- **Shared vendor folder** (e.g. `~/Library/Application Support/NVIDIA`, `~/Library/Caches/Adobe`) → `ls` it first. If it holds **only** this app's data, delete the whole parent folder (an empty vendor folder is useless). If other products from the same vendor live there, delete only the app's subfolder.
- **Team ID matches** can hit other apps from the same vendor. Check each one.
- **Personal data** (documents, game saves, projects, exported files, or anything in `~/Documents`) → put it in the table, but mark it clearly. The user decides.

Also check:
- Is the app running? If yes, ask the user to quit it first. Or offer `osascript -e 'quit app "<Name>"'`. Deleting a running app's files can break things and the files may come back.
- Homebrew cask → prefer `brew uninstall --cask --zap <name>`. It knows the app's own leftovers. Run the scan again afterwards for anything it missed.
- pkg receipt → `pkgutil --files <pkg-id>` shows what the installer put on disk. `sudo pkgutil --forget <pkg-id>` removes the receipt at the end.
- LaunchAgent/Daemon → before moving the `.plist`, unload it: `launchctl bootout gui/$(id -u) <plist>` (user) or `sudo launchctl bootout system <plist>` (system). Otherwise the service keeps running until reboot.

## Step 3 — Show the report

Show one table, biggest first, with the total size:

| # | Yol | Boyut | Ne işe yarar |
|---|-----|-------|--------------|
| 1 | `/Applications/X.app` | 875 MB | Uygulamanın kendisi |
| 2 | `~/Library/Application Support/X` | 113 MB | Ayarlar, loglar, oturum verisi |
| … | | | |

Under the table, write a short note:
- whether the app is running, and whether it has a background service, Homebrew record or pkg receipt
- anything you left out (false positives) and why
- anything that needs `sudo`

Then ask about the first step.

## Step 4 — Move to Trash, one step at a time

**Approval rule:** Ask before each step and wait for "evet". Ask about big or important items (the `.app`, Application Support, anything over ~50 MB, personal data, anything that needs `sudo`) **one by one**. Group small leftovers (caches, HTTPStorages, prefs, empty folders) into **one question**, and offer to ask about them one by one. If the user asks for one-by-one, do that for the rest of the session.

Approval for one step does not cover the next step.

**Move to Trash, don't `rm`.** The Trash lets the user undo a mistake. Use Finder, so "Put Back" works:

```bash
osascript -e 'tell application "Finder" to delete POSIX file "<absolute path>"' >/dev/null; \
test -e "<absolute path>" && echo STILL_EXISTS || echo MOVED
```

- Always check with `test -e` afterwards. Don't trust the exit code. Finder prints the new Trash path and `ls` on the old path fails, so a successful move can look like an error.
- Use absolute paths (`/Users/<user>/...`). Don't use `~` inside the AppleScript string.
- Paths under `/Library` or owned by root: Finder will show a password dialog to the user. Tell them before you run it. If that fails, ask the user to run `! sudo mv "<path>" ~/.Trash/` themselves.
- After each step, say in one line what moved, then ask about the next step.

## Step 5 — Verify and finish

1. Run the scan script again with the same terms. Confirm nothing that belongs to the app is left.
2. Tell the user the total size now in the Trash. Disk space is only freed when the Trash is emptied. Don't empty the Trash yourself; it may hold other files the user wants. Tell them how: Finder → right-click Trash → "Çöp Kutusunu Boşalt".
3. Ask if there is another app to remove.

Note: `du ~/.Trash` usually fails because of macOS privacy protection (TCC). Add up the sizes from your table instead.
