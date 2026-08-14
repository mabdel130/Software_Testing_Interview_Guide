# index.html data schema

Everything the page renders comes from one object, `var SDATA = {...};`, which sits on
a single line (found by searching for the line starting with `var SDATA = `). It is
valid JSON once you strip the `var SDATA = ` prefix and the trailing `;`.

## Shape

```
SDATA = {
  "<topicKey>": {
    "icon": "🧪",                 // emoji shown in sidebar + topic card
    "title": "Manual Testing",
    "sub": "STLC · Defect Management · Test Design · Risk",
    "grad": "linear-gradient(135deg,#047857,#059669)",  // 2nd color = accent color
    "qc": 26,                     // TOTAL question count in this topic (sum of group counts)
    "groups_count": 3,            // number of groups
    "groups": [
      {
        "name": "Core Concepts",
        "count": 10,              // number of cards in this group
        "cards": [
          {
            "cid": "manual-0-0",  // "<topicKey>-<groupIndex>-<cardIndexInGroup>", all 0-based
            "diff": "beginner",   // beginner | intermediate | advanced | scenario
            "sec": "manual",      // == topicKey
            "q": "what is software testing ...?",   // plain lowercase text, used for search
            "a": "plain lowercase answer text ...",  // used for search
            "html": "<div class=\"qref\">...full pre-rendered card markup..."
          }
        ]
      }
    ]
  }
}
```

## Key rules the script enforces

- **`cid` numbering**: `groupIndex` and `cardIndexInGroup` are positional — recomputed
  whenever cards are appended, never hand-assigned.
- **Difficulty → CSS class / label**:
  - `beginner` → class `db`, label `Beginner`
  - `intermediate` → class `di`, label `Intermediate`
  - `advanced` → class `da`, label `Advanced`
  - `scenario` → class `ds`, label `Situation`
- **Accent color**: the second hex color in `grad` (e.g. `#059669` for manual). Used
  for the `qnum` badge background in every card's `html`.
- **`html` field**: fully self-contained rendered markup for the card (question row +
  expandable answer + Mark Reviewed / Save buttons), built from: a reference line
  (optional), a concept paragraph, an ordered list of labeled steps, and an optional
  "Key Insight" note. The script generates this from the simpler template fields — you
  should never write raw HTML by hand.
- **Search fields `q`/`a`**: plain lowercase text (no markup). `q` = the question,
  `a` = concept + step labels/details joined. Used by `dataset.q.includes(searchTerm)`
  client-side, so keep them lowercase or search breaks for that card.

## Places outside `SDATA` that must also stay in sync (script handles these)

- `<title>QA Interview Guide — N Questions</title>` (line ~6) — `N` = grand total
  across all topics.
- Hero subtitle `"N expert-curated Q&As across M testing topics..."` (line ~371) —
  `M` = number of topic keys.
- Sidebar nav list (`<div class="ni" data-sec="...">`, around lines 395-405) — **only**
  relevant when adding a brand-new topic; the script appends a new `.ni` row here.
  Adding questions to an existing topic does NOT need this (the `<span id="c-<key>">`
  counter is updated by client-side JS at page load from `SDATA`, not hardcoded).

## Everything else on the page

The topic grid ("All Topics" view), group headers, and question counts are all built
dynamically from `SDATA` at runtime (`buildAll()` in the inline `<script>`), so once
`SDATA` and (for new topics) the sidebar row are correct, no other HTML needs to change.
