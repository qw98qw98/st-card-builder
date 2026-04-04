#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function extractWorldbookImportJSON(text) {
  let raw = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!raw) return '';
  if (raw[0] !== '{' && raw[0] !== '[') {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence && fence[1]) raw = fence[1].trim();
  }
  return raw;
}

function parseWorldbookImportJSON(text) {
  const raw = extractWorldbookImportJSON(text);
  if (!raw) throw new Error('empty');
  function findJsonBounds(text, openChar, closeChar) {
    const start = text.indexOf(openChar);
    if (start < 0) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === openChar) depth += 1;
      if (ch === closeChar) {
        depth -= 1;
        if (depth === 0) return [start, i + 1];
      }
    }
    return null;
  }

  const bounds = findJsonBounds(raw, '{', '}') || findJsonBounds(raw, '[', ']');
  if (bounds) return JSON.parse(raw.slice(bounds[0], bounds[1]));
  throw new Error('no json bounds');
}

function isPureWorldbookPayload(json) {
  if (!json || typeof json !== 'object') return false;
  if (!json.entries) return false;
  const root = json.data && typeof json.data === 'object' ? json.data : json;
  if (!root || typeof root !== 'object') return false;
  return !(
    root.first_mes !== undefined ||
    root.creator_notes !== undefined ||
    root.mes_example !== undefined ||
    root.alternate_greetings !== undefined ||
    root.character_book !== undefined ||
    root.nickname !== undefined ||
    root.gender !== undefined ||
    root.statusBlockConfig !== undefined ||
    root.personality !== undefined ||
    root.scenario !== undefined ||
    root.creator !== undefined ||
    root.character_version !== undefined
  );
}

const file = process.argv[2] || '/Users/huhaoran/Downloads/涅普色色辞典0.1测试版 (3).json';
const text = readFileSync(file, 'utf8');
const payload = parseWorldbookImportJSON(text);

if (!isPureWorldbookPayload(payload)) {
  throw new Error('expected pure worldbook payload');
}
if (!payload.entries || typeof payload.entries !== 'object') {
  throw new Error('missing root.entries object');
}
const keys = Object.keys(payload.entries);
if (!keys.length) throw new Error('entries empty');

console.log('ok');
console.log(`entries=${keys.length}`);
