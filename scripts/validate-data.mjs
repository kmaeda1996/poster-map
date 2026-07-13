#!/usr/bin/env node
// 掲示場所データ (src/data.js) と配分データ (src/distribution.js) をコミット前に検証する。
// 使い方: node scripts/validate-data.mjs
// 警告が 1 件でもあれば終了コード 1 を返す。

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(join(root, 'src/data.js'), 'utf8'), ctx);
vm.runInContext(readFileSync(join(root, 'src/distribution.js'), 'utf8'), ctx);

const data = ctx.POSTER_DATA;
const groups = ctx.DISTRIBUTION_GROUPS;

// 越前市の座標範囲 (src/app.js の validatePosterData と同じ値)
const LAT_MIN = 35.7, LAT_MAX = 36.1, LNG_MIN = 135.9, LNG_MAX = 136.6;

let warnings = 0;
function warn(msg) { console.warn('⚠ ' + msg); warnings++; }

// --- data.js の検証 ---
const seenIds = new Map();
const seenCoords = new Map();
for (const item of data) {
  const prefix = `[No.${item.id}]`;
  if (seenIds.has(item.id)) warn(`${prefix} id が重複しています`);
  else seenIds.set(item.id, item);
  if (!item.address) warn(`${prefix} address が空です`);
  if (!item.description) warn(`${prefix} description が空です`);
  if (item.lat == null || item.lng == null) { warn(`${prefix} lat/lng が欠損しています`); continue; }
  if (typeof item.lat !== 'number' || typeof item.lng !== 'number') { warn(`${prefix} lat/lng が数値型ではありません`); continue; }
  if (item.lat < LAT_MIN || item.lat > LAT_MAX || item.lng < LNG_MIN || item.lng > LNG_MAX) {
    warn(`${prefix} 座標が越前市エリア外です (${item.lat}, ${item.lng})`);
  }
  const coordKey = `${item.lat},${item.lng}`;
  if (seenCoords.has(coordKey)) warn(`${prefix} が No.${seenCoords.get(coordKey)} と同一座標です`);
  else seenCoords.set(coordKey, item.id);
}

const ids = [...seenIds.keys()].sort((a, b) => a - b);
for (let i = 0; i < ids.length - 1; i++) {
  for (let m = ids[i] + 1; m < ids[i + 1]; m++) warn(`[欠番] id=${m}`);
}

// --- distribution.js の検証 (ブラウザ側には無いチェック) ---
const assigned = new Map(); // id -> グループ名
for (const group of groups) {
  for (const id of group.ids) {
    if (!seenIds.has(id)) warn(`[配分:${group.name}] id=${id} は data.js に存在しません`);
    if (assigned.has(id)) warn(`[配分:${group.name}] id=${id} は「${assigned.get(id)}」にも割り当てられています`);
    else assigned.set(id, group.name);
  }
  const dupInGroup = group.ids.filter((id, i) => group.ids.indexOf(id) !== i);
  for (const id of new Set(dupInGroup)) warn(`[配分:${group.name}] グループ内で id=${id} が重複しています`);
}

// --- サマリ ---
console.log(`掲示場所: ${data.length}件 / 配分グループ: ${groups.length}色 / 配分済み: ${assigned.size}件`);
for (const group of groups) console.log(`  ${group.name}: ${group.ids.length}件`);

if (warnings > 0) {
  console.error(`\n検証 NG: ${warnings}件の警告があります`);
  process.exit(1);
}
console.log('\n検証 OK: 警告はありません');
