#!/bin/zsh
# Usage: scan.sh "<App Name or search term>" [extra-term ...]
# Read-only. Finds an app, its bundle ID and every leftover path, with sizes.
# Never deletes anything.
setopt NULL_GLOB

[[ -z "$1" ]] && { echo "usage: scan.sh <app name> [extra terms...]"; exit 1; }

terms=("$@")

echo "== APP BUNDLES =="
apps=()
for t in "${terms[@]}"; do
  for a in /Applications/*${t}*.app /Applications/*/*${t}*.app ~/Applications/*${t}*.app; do
    apps+=("$a")
  done
done
apps=(${(u)apps})
for a in "${apps[@]}"; do
  bid=$(defaults read "$a/Contents/Info" CFBundleIdentifier 2>/dev/null)
  echo "$(du -sh "$a" 2>/dev/null | cut -f1)	$a	bundle_id=$bid"
  [[ -n "$bid" ]] && terms+=("$bid")
  team=$(codesign -dv "$a" 2>&1 | sed -n 's/^TeamIdentifier=//p')
  [[ -n "$team" && "$team" != "not set" ]] && terms+=("$team")
done
terms=(${(u)terms})
echo "search terms: ${terms[*]}"

echo
echo "== LEFTOVER PATHS (size, path) =="
expr=()
for t in "${terms[@]}"; do expr+=(-o -iname "*${t}*"); done
expr=("${(@)expr[2,-1]}")
find ~/Library /Library /private/var/db/receipts ~/.config ~/.local/share \
  -maxdepth 4 \( "${expr[@]}" \) -prune 2>/dev/null \
  | grep -v -E '^/(System|Applications)/' \
  | while read -r p; do echo "$(du -sh "$p" 2>/dev/null | cut -f1)	$p"; done

echo
echo "== HOME DOTFILES =="
for t in "${terms[@]}"; do ls -d ~/.*${t}* 2>/dev/null; done | sort -u

echo
echo "== LAUNCHD (agents/daemons/helpers) =="
for d in ~/Library/LaunchAgents /Library/LaunchAgents /Library/LaunchDaemons /Library/PrivilegedHelperTools; do
  for t in "${terms[@]}"; do ls -d "$d"/*${t}* 2>/dev/null; done
done | sort -u
for t in "${terms[@]}"; do launchctl list 2>/dev/null | grep -i -- "$t"; done | sort -u

echo
echo "== PKG RECEIPTS =="
for t in "${terms[@]}"; do pkgutil --pkgs 2>/dev/null | grep -i -- "$t"; done | sort -u

echo
echo "== HOMEBREW =="
if command -v brew >/dev/null; then
  for t in "${terms[@]}"; do brew list --cask 2>/dev/null | grep -i -- "$t"; brew list --formula 2>/dev/null | grep -i -- "$t"; done | sort -u
fi

echo
echo "== RUNNING PROCESSES =="
for a in "${apps[@]}"; do pgrep -fl -- "$a" 2>/dev/null; done
for t in "${terms[@]}"; do pgrep -il -- "$t" 2>/dev/null; done | sort -u

echo
echo "== LOGIN ITEMS =="
osascript -e 'tell application "System Events" to get the name of every login item' 2>/dev/null
