---
description: Open the last response in the browser, select parts of it and comment
allowed-tools: Bash(python3 -I ${CLAUDE_PLUGIN_ROOT}/tools/comment/comment.py)
---
Do not write any text first. Run this command right away with the Bash tool, with `timeout: 600000` and not in the background:

`python3 -I ${CLAUDE_PLUGIN_ROOT}/tools/comment/comment.py`

It opens the user's browser and waits until the user sends comments on your previous response. Then read its output and answer each comment in order. If the output says there are no comments, just say so in one short line.
