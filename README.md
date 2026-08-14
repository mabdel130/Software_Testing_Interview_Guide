# QA Interview Guide

A single-page, interactive interview prep guide for Software Testing / QA roles — 231 expert-curated Q&As across 10 topics, from beginner fundamentals to real-world scenario questions.

**Live site:** https://mabdel130.github.io/Software_Testing_Interview_Guide/

## Topics Covered

- Manual Testing
- API Testing (incl. REST Assured)
- Selenium + TestNG
- Playwright
- Mobile Testing (incl. Appium)
- Performance Testing
- Database Testing
- GenAI & AI Testing (incl. ISTQB CT-GenAI)
- CI/CD Testing
- Git & GitHub

## Features

- Search across all questions
- Filter by topic and difficulty (Beginner / Intermediate / Advanced / Situation)
- Mark questions as reviewed or saved for later
- Quiz mode for self-testing
- No build step, no dependencies — a single `index.html` file

## Development

The entire site is one file, `index.html`. All content is driven by a single JS object (`SDATA`) embedded in the page; the rest of the markup, styles, and interactivity render from it at load time.

To add new questions or topics, use the `add-qa-content` skill in `.claude/skills/` (local tooling, not tracked in this repo) rather than hand-editing `SDATA` directly.

## Deployment

Published via GitHub Pages from the `main` branch root. Any push to `main` redeploys automatically within a minute or two.
