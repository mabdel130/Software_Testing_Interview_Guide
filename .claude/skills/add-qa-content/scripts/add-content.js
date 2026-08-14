#!/usr/bin/env node
/**
 * Safely add questions/topics to index.html's SDATA blob.
 * Usage:
 *   node add-content.js list-topics [--file <index.html>]
 *   node add-content.js add-question --topic <key> --group "<Group Name>" --file <payload.json> [--index <index.html>]
 *   node add-content.js add-topic --file <payload.json> [--index <index.html>]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DIFF_MAP = {
  beginner: { cls: 'db', label: 'Beginner' },
  intermediate: { cls: 'di', label: 'Intermediate' },
  advanced: { cls: 'da', label: 'Advanced' },
  scenario: { cls: 'ds', label: 'Situation' },
};

function findRepoRoot() {
  // scripts/ -> add-qa-content/ -> skills/ -> .claude/ -> repo root
  return path.resolve(__dirname, '..', '..', '..', '..');
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      out[a.slice(2)] = argv[i + 1];
      i++;
    } else {
      out._.push(a);
    }
  }
  return out;
}

function loadIndexHtml(indexPath) {
  const content = fs.readFileSync(indexPath, 'utf8');
  const lines = content.split('\n');
  const lineIdx = lines.findIndex((l) => l.startsWith('var SDATA = '));
  if (lineIdx === -1) throw new Error('Could not find "var SDATA = " line in ' + indexPath);
  const raw = lines[lineIdx];
  const prefix = 'var SDATA = ';
  if (!raw.endsWith(';')) throw new Error('Unexpected SDATA line ending; refusing to edit.');
  const jsonText = raw.slice(prefix.length, -1);
  const SDATA = JSON.parse(jsonText);
  return { content, lines, lineIdx, SDATA };
}

function accentColor(grad) {
  const matches = grad.match(/#[0-9a-fA-F]{6}/g);
  if (!matches || matches.length < 2) throw new Error('Could not parse two hex colors from grad: ' + grad);
  return matches[1];
}

function buildCardHtml({ cid, diff, question, reference, concept, steps, note, color }) {
  const d = DIFF_MAP[diff];
  if (!d) throw new Error('Unknown diff "' + diff + '". Use beginner|intermediate|advanced|scenario.');
  const num = parseInt(cid.split('-').pop(), 10) + 1;

  const refHtml = reference
    ? `<div class="qref"><span class="qref-icon">📖</span><span>${escapeHtml(reference)}</span></div>`
    : '';

  const stepsHtml = (steps || [])
    .map(
      (s) =>
        `<li><div class="ans-step-inner"><strong class="ans-lbl">${escapeHtml(s.label)}</strong>` +
        `<span class="ans-sep"> — </span><span class="ans-detail">${escapeHtml(s.detail)}</span></div></li>`
    )
    .join('\n');

  const noteHtml = note
    ? `<div class="ans-note"><span class="ans-note-icon">🎯</span><span>🎯 ${escapeHtml(note)}</span></div>`
    : '';

  return (
    refHtml +
    `<div class="qrow" onclick="tQ('${cid}')">` +
    `<div class="qnum" style="background:${color}">${num}</div>` +
    `<div class="qtxt">${escapeHtml(question)}</div>` +
    `<div class="qdiff ${d.cls}">${d.label}</div>` +
    `<span class="qchev">▼</span></div>` +
    `<div class="qans" id="ans-${cid}"><div class="acontent">` +
    `<div class="ans-concept">${escapeHtml(concept)}</div>\n` +
    `<ol class="ans-ol">\n${stepsHtml}\n</ol>\n` +
    noteHtml +
    `</div><div class="aact">` +
    `<button class="abtn" id="mk-${cid}" onclick="mR('${cid}',event)">✓ Mark Reviewed</button>` +
    `<button class="abtn" id="bm-${cid}" onclick="mS('${cid}',event)">🔖 Save</button>` +
    `</div></div>`
  );
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function searchText({ question, concept, steps }) {
  const stepText = (steps || []).map((s) => `${s.label}: ${s.detail}`).join(' ');
  return { q: question.toLowerCase(), a: `${concept} ${stepText}`.toLowerCase() };
}

function buildCard(topicKey, groupIdx, cardIdx, color, payload) {
  const cid = `${topicKey}-${groupIdx}-${cardIdx}`;
  const { q, a } = searchText(payload);
  const html = buildCardHtml({
    cid,
    diff: payload.diff,
    question: payload.question,
    reference: payload.reference,
    concept: payload.concept,
    steps: payload.steps,
    note: payload.note,
    color,
  });
  return { cid, diff: payload.diff, sec: topicKey, q, a, html };
}

function writeBack(indexPath, lines, lineIdx, SDATA) {
  const backupPath = indexPath + '.bak';
  fs.copyFileSync(indexPath, backupPath);
  lines[lineIdx] = 'var SDATA = ' + JSON.stringify(SDATA) + ';';
  fs.writeFileSync(indexPath, lines.join('\n'), 'utf8');
  return backupPath;
}

function grandTotal(SDATA) {
  return Object.keys(SDATA).reduce((sum, k) => sum + SDATA[k].qc, 0);
}

function syncHardcodedCounts(content, SDATA) {
  const total = grandTotal(SDATA);
  const topicCount = Object.keys(SDATA).length;
  content = content.replace(
    /<title>QA Interview Guide — \d+ Questions<\/title>/,
    `<title>QA Interview Guide — ${total} Questions</title>`
  );
  content = content.replace(
    /\d+ expert-curated Q&amp;As across \d+ testing topics/,
    `${total} expert-curated Q&amp;As across ${topicCount} testing topics`
  );
  return content;
}

function cmdListTopics(indexPath) {
  const { SDATA } = loadIndexHtml(indexPath);
  Object.keys(SDATA).forEach((k) => {
    const s = SDATA[k];
    console.log(`${k}\t${s.title}\t${s.qc} questions\tgroups: ${s.groups.map((g) => g.name).join(' | ')}`);
  });
}

function cmdAddQuestion(indexPath, opts) {
  const { topic, group, file } = opts;
  if (!topic || !group || !file) throw new Error('Requires --topic, --group, --file');
  const payloads = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(payloads) ? payloads : [payloads];

  const { content, lines, lineIdx, SDATA } = loadIndexHtml(indexPath);
  const topicObj = SDATA[topic];
  if (!topicObj) {
    throw new Error(`Unknown topic "${topic}". Known: ${Object.keys(SDATA).join(', ')}`);
  }
  const color = accentColor(topicObj.grad);

  let groupIdx = topicObj.groups.findIndex((g) => g.name === group);
  let created = false;
  if (groupIdx === -1) {
    topicObj.groups.push({ name: group, count: 0, cards: [] });
    groupIdx = topicObj.groups.length - 1;
    topicObj.groups_count = topicObj.groups.length;
    created = true;
  }
  const groupObj = topicObj.groups[groupIdx];

  const added = [];
  for (const payload of list) {
    const cardIdx = groupObj.cards.length;
    const card = buildCard(topic, groupIdx, cardIdx, color, payload);
    groupObj.cards.push(card);
    groupObj.count = groupObj.cards.length;
    added.push(card.cid);
  }
  topicObj.qc = topicObj.groups.reduce((sum, g) => sum + g.count, 0);

  let newContent = syncHardcodedCounts(content, SDATA);
  const newLines = newContent.split('\n');
  const backup = writeBack(indexPath, newLines, lineIdx, SDATA);

  console.log(`Added ${added.length} question(s) to "${topic}" / "${group}"${created ? ' (new group)' : ''}.`);
  console.log('New cids:', added.join(', '));
  console.log(`Topic "${topic}" now has ${topicObj.qc} questions.`);
  console.log('Backup written to', backup);
}

function cmdAddTopic(indexPath, opts) {
  const { file } = opts;
  if (!file) throw new Error('Requires --file');
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { key, icon, title, sub, navLabel, colorFrom, colorTo, groups } = payload;
  if (!key || !icon || !title || !colorFrom || !colorTo || !groups || !groups.length) {
    throw new Error('Topic payload requires key, icon, title, colorFrom, colorTo, groups[]');
  }

  const { content, lines, lineIdx, SDATA } = loadIndexHtml(indexPath);
  if (SDATA[key]) throw new Error(`Topic "${key}" already exists.`);

  const grad = `linear-gradient(135deg,${colorFrom},${colorTo})`;
  const color = colorTo;

  const builtGroups = groups.map((g, groupIdx) => {
    const cards = g.questions.map((q, cardIdx) => buildCard(key, groupIdx, cardIdx, color, q));
    return { name: g.name, count: cards.length, cards };
  });
  const qc = builtGroups.reduce((sum, g) => sum + g.count, 0);

  SDATA[key] = {
    icon,
    title,
    sub: sub || '',
    grad,
    qc,
    groups_count: builtGroups.length,
    groups: builtGroups,
  };

  let newContent = syncHardcodedCounts(content, SDATA);

  // Insert sidebar nav row after the last existing `.ni` row.
  const niRegex = /<div class="ni"[^>]*data-sec="[^"]*"[\s\S]*?<\/div>\n/g;
  let lastMatch = null;
  let m;
  while ((m = niRegex.exec(newContent)) !== null) lastMatch = m;
  if (!lastMatch) throw new Error('Could not locate sidebar nav rows to insert after.');

  const label = navLabel || title;
  const navRow =
    `  <div class="ni" data-sec="${key}" onclick="nav('${key}')"><span class="nic">${icon}</span>` +
    `${escapeHtml(label)}<span class="ncnt" id="c-${key}">${qc}</span></div>\n`;
  const insertPos = lastMatch.index + lastMatch[0].length;
  newContent = newContent.slice(0, insertPos) + navRow + newContent.slice(insertPos);

  const newLines = newContent.split('\n');
  const backup = writeBack(indexPath, newLines, lineIdx, SDATA);

  console.log(`Added new topic "${key}" (${title}) with ${qc} questions across ${builtGroups.length} group(s).`);
  console.log('Backup written to', backup);
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const opts = parseArgs(argv.slice(1));
  const indexPath = opts.index ? path.resolve(opts.index) : path.join(findRepoRoot(), 'index.html');

  if (!cmd) {
    console.error('Usage: add-content.js <list-topics|add-question|add-topic> [options]');
    process.exit(1);
  }

  try {
    if (cmd === 'list-topics') cmdListTopics(indexPath);
    else if (cmd === 'add-question') cmdAddQuestion(indexPath, opts);
    else if (cmd === 'add-topic') cmdAddTopic(indexPath, opts);
    else throw new Error('Unknown command: ' + cmd);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
