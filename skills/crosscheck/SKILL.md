---
name: crosscheck
description: "Checks findings (review findings, bug claims, analysis conclusions) with fresh, independent agents that see the code but not the original reasoning, so false flags are dropped before the user acts on them. Use when the user doubts a finding or wants a second look — e.g. 'false flag mı', 'bunu doğrulat', 'bağımsız bir agent'a kontrol ettir', 'bu bulgular gerçek mi', 'crosscheck', 'second opinion', '/sela:crosscheck'. Trigger it even when the user does not say 'skill', as long as they want claims already on the table re-checked."
---

# sela:crosscheck

Re-check findings with agents that did not produce them. An agent that is told the expected answer tends to agree with it, so each checker gets the claim as an open question and the code — never the earlier reasoning or verdict.

## Language

Talk to the user in the language they use in this conversation, with simple, short sentences. Write the agent prompts in English.

## Step 1 — List the findings

- Take the findings the user points at. If they say "bunlar" / "these" / "bu iki madde", use the ones from the latest message they refer to. If it is unclear which findings they mean, ask once.
- Number them. For each, write down: the claim in one sentence, and the files / lines / commands it is about.
- More than 6 findings: group related ones so you start at most 6 agents. Tell the user how many agents you will start.

## Step 2 — Start one fresh agent per finding (in parallel)

Send all Agent calls in one message so they run at the same time. Use `subagent_type: "general-purpose"`. Do not use `fork` — a fork inherits this conversation and its bias.

Each prompt must contain only:
- The working directory and the files / lines / commands to look at.
- The claim, phrased as a neutral question: "Is it true that …? " Do not say who found it, how sure they were, or why they think so.
- This instruction block:

```
Your job is to decide whether the claim is true by reading the actual code (and running read-only commands if useful).
Try to disprove it first: look for callers, guards, config, tests or later code that make it false.
Do not change any file.
Answer in this exact format:
VERDICT: CONFIRMED | REJECTED | UNSURE
EVIDENCE: file:line references with a short quote for each
REASON: 2-4 sentences
If the claim is partly true, say which part holds.
```

## Step 3 — Report

Show one table, in the user's language:

| # | Finding | Verdict | Evidence | Note |
|---|---------|---------|----------|------|

- Verdict: ✅ confirmed, ❌ rejected (false flag), ❓ unsure.
- Evidence: the file:line the agent gave.
- If the agent's verdict differs from what was claimed earlier in this conversation, say so plainly in one line. Do not defend the earlier claim; the code decides.
- For ❓ items, say what would settle it (a test to run, a file nobody read, a question for the user).

End with one line: which findings still stand. Do not start fixing anything unless the user asks.

## Extra second look

If the user also asks for the advisor ("advisor da baksın"), call the advisor after the table and add its view under the table as one short section.
