---
name: add-qa-content
description: Add new interview questions to an existing topic, or add a whole new topic, to index.html (the QA Interview Guide). Use whenever the user wants to add/expand questions, add a topic/category, or update the guide's content.
---

# Add QA Content

`index.html` renders entirely from one JS object, `SDATA` (a single very long line).
Never hand-edit that line directly — one mistake breaks the whole page. Always go
through `scripts/add-content.js`, which parses `SDATA`, mutates it, regenerates the
per-card HTML, and rewrites the file (with a `.bak` backup each time).

Read `references/data-schema.md` once per session before the first edit — it explains
the exact schema, `cid` numbering, difficulty-class mapping, and accent-color rule the
script depends on.

## Workflow

1. **Figure out what the user wants**: new question(s) in an existing topic, or a brand
   new topic. Ask for the topic key if ambiguous (list current keys with
   `node scripts/add-content.js list-topics`).
2. **Fill a template**, don't invent the JSON by hand:
   - Adding question(s) to an existing topic/group → copy
     `templates/question.template.json`, fill in one object per question.
   - Adding a new topic → copy `templates/topic.template.json`, fill in topic metadata
     plus its first group(s) of questions (each question uses the same shape as
     `question.template.json`).
   Write the filled-in file to a scratch path, e.g. `.claude/skills/add-qa-content/.tmp/payload.json`.
3. **Run the script**:
   - Add questions to an existing group:
     `node scripts/add-content.js add-question --topic <key> --group "<Group Name>" --file <payload.json>`
     (creates the group if it doesn't exist yet in that topic)
   - Add a new topic:
     `node scripts/add-content.js add-topic --file <payload.json>`
4. **Verify**: the script prints a summary (new counts, cid range). Skim the diff of
   `index.html` for the touched region only — do not open/print the whole file, it is
   huge. Delete the scratch payload file when done.
5. Tell the user what was added and remind them to commit + push (see the repo's
   normal git workflow) to publish via GitHub Pages.

## Rules

- Never write directly into `index.html`'s `SDATA` line — always via the script.
- Keep `q`/`a` (search fields) plain-text and lowercase; the script lowercases them
  automatically from the template's `question`/`concept`/`steps` fields, so just write
  those naturally.
- One topic key per topic; reuse the existing group name exactly (case-sensitive) to
  append into that group instead of creating a duplicate.
- If the user only gives a question and rough answer with no structured steps, still
  fill the template's `steps` array yourself (break the answer into 3-6 labeled
  points) — the rendered card looks broken without at least one step.
