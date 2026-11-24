# sela — a Claude Code plugin

Small tools I use every day with Claude Code: hand off work to a fresh session, search old sessions, re-check findings, comment on answers, see usage limits, and more.

## What is inside

| Kind | Name | What it does |
|---|---|---|
| Skill | `/sela:handoff` | Saves the work to `.notes/<task>/` so a new session can continue |
| Skill | `/sela:recall` | Searches earlier sessions of the current folder |
| Skill | `/sela:crosscheck` | Re-checks findings with fresh, independent agents |
| Skill | `/sela:uninstall` | Removes a macOS app and its leftovers |
| Command | `/sela:comment` | Opens the last answer in the browser to comment on parts of it |
| Mod | Limit band | 5-hour and weekly limit above the prompt, toast at 50% and 80% |
| Mod | `/sela-discuss` | Discussion mode: Claude reads and talks, cannot change files |
| Mod | Handoff resume | Offers to continue a recent `.notes` handoff, lists older ones; toast at 30% context. `/sela-resume` shows the list again (needed in Claude Desktop) |
| Mod | `/sela-record on\|off` | Hides emails, money and private data on screen while recording |

## Install

```
claude plugin marketplace add selahattinunlu/sela-claude-plugin
claude plugin install sela@sela
```

To work on the plugin from a local clone (edits apply after `/reload-plugins`):

```
claude plugin marketplace add /path/to/sela-claude-plugin
claude plugin install sela@sela
```

## Requirements

- `/sela:recall` and `/sela:comment` need `python3`.
- `/sela:uninstall` works on macOS only. Everything else works on macOS, Linux and Windows.

## License

[MIT](LICENSE)
