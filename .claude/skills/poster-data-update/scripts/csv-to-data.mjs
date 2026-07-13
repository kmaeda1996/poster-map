#!/usr/bin/env node
// 掲示場所 CSV から src/data.js を再生成する。
// 使い方: node csv-to-data.mjs <入力CSV> [出力先 (省略時 src/data.js)]
//
// ヘッダー行は日本語・英語どちらでも自動判別する。
// 対応列: id/No/番号, address/住所, description/設置箇所/設置場所, lat/緯度, lng/経度, status/座標確認
// status 列が無い場合はすべて 'ok' になる。

import { readFileSync, writeFileSync } from 'node:fs';

const [, , csvPath, outPath = 'src/data.js'] = process.argv;
if (!csvPath) {
  console.error('使い方: node csv-to-data.mjs <入力CSV> [出力先]');
  process.exit(1);
}

// --- CSV パース (引用符・カンマ入りセル対応) ---
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(v => v !== '')) rows.push(row);
  return rows;
}

// --- ヘッダー列の対応表 ---
const COLUMN_ALIASES = {
  id: ['id', 'no', 'no.', '番号', 'ナンバー', '掲示場番号'],
  address: ['address', '住所', '所在地'],
  description: ['description', '設置箇所', '設置場所', '場所', '備考'],
  lat: ['lat', 'latitude', '緯度'],
  lng: ['lng', 'lon', 'longitude', '経度'],
  status: ['status', '座標確認', '確認状況', 'ステータス'],
};

function mapHeader(header) {
  const mapping = {};
  header.forEach((raw, idx) => {
    const name = raw.replace(/^﻿/, '').trim().toLowerCase();
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(name) && mapping[key] === undefined) mapping[key] = idx;
    }
  });
  for (const required of ['id', 'address', 'description', 'lat', 'lng']) {
    if (mapping[required] === undefined) {
      console.error(`必須列「${required}」がヘッダーに見つかりません。ヘッダー: ${header.join(', ')}`);
      console.error('対応する列名: ' + COLUMN_ALIASES[required].join(' / '));
      process.exit(1);
    }
  }
  return mapping;
}

const rows = parseCSV(readFileSync(csvPath, 'utf8'));
const col = mapHeader(rows[0]);

const esc = s => String(s).trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const entries = rows.slice(1).map(row => {
  const id = parseInt(row[col.id], 10);
  const lat = row[col.lat] === '' ? null : Number(row[col.lat]);
  const lng = row[col.lng] === '' ? null : Number(row[col.lng]);
  const status = col.status !== undefined && row[col.status] ? row[col.status].trim() : 'ok';
  return { id, address: row[col.address], description: row[col.description], lat, lng, status };
}).sort((a, b) => a.id - b.id);

const body = entries.map(e => `  {
    id: ${e.id},
    address: '${esc(e.address)}',
    description: '${esc(e.description)}',
    lat: ${e.lat},
    lng: ${e.lng},
    status: '${esc(e.status)}'
  }`).join(',\n');

writeFileSync(outPath, `var POSTER_DATA = [\n${body}\n];\n`);
console.log(`${entries.length}件を ${outPath} に書き出しました`);
