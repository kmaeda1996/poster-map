---
name: poster-data-update
description: 掲示場所データ (src/data.js) を CSV・Excel から更新する。「CSVからデータを更新して」「掲示場所を追加・修正して」「緯度経度を直して」「address_list を反映して」と言われたとき、または座標修正・件数変更の依頼があったときに使う。
---

# 掲示場所データ更新

掲示場所の元データ (Excel/CSV) から `src/data.js` を安全に再生成・修正するスキル。

## 前提知識

- `src/data.js` はこのアプリの正本データ。`POSTER_DATA` 配列に 240 件(2026-07 時点)の掲示場所が入っている。
- 各要素は `id / address / description / lat / lng / status` を持つ。id は 1 始まりの連番で欠番なし。
- 元データはユーザーが Excel で管理しており、CSV (例: `address_list_with_latlng_0704_01.csv`) で渡されることが多い。
- 座標の妥当範囲は越前市エリア: 緯度 35.7〜36.1、経度 135.9〜136.6。

## 手順

### A. CSV ファイル一括反映の場合

1. CSV の先頭数行を読み、ヘッダーと文字コードを確認する(Shift_JIS なら `iconv -f SHIFT_JIS -t UTF-8` で変換してから使う)。
2. 変換スクリプトを実行する:
   ```
   node .claude/skills/poster-data-update/scripts/csv-to-data.mjs <CSVファイル> src/data.js
   ```
   ヘッダー列は日本語(番号/住所/設置箇所/緯度/経度/座標確認)・英語どちらも自動判別する。未知の列名でエラーになったらスクリプトの `COLUMN_ALIASES` に別名を1行足す。
3. 検証を実行する: `node scripts/validate-data.mjs`
4. `git diff --stat src/data.js` と変更行を確認し、**変更された id の一覧と変更内容(座標修正◯件・住所修正◯件など)をユーザーに報告**する。想定外の大量差分(全件の座標が微妙にずれる等)があれば、コミット前にユーザーに確認する。

### B. 個別の修正(「No.58 の座標を直して」等)の場合

1. `src/data.js` 内の該当 id を Edit で直接修正する。
2. `node scripts/validate-data.mjs` で検証する。
3. コミットメッセージに **修正対象の id と根拠(元にした CSV 名や指示内容)** を含める。
   例: `Fix lat/lng for No.58 and No.59 based on address_list_with_latlng_0704_01.csv`

## 必ず守ること

- data.js を書き換えたら、コミット前に必ず `node scripts/validate-data.mjs` を実行し、警告ゼロを確認する。
- 件数が変わる場合(追加・削除)は、`index.html` 側の表示に影響がないか `setMode` / `count-info` 周りを確認する。
- 配分表示 (`src/distribution.js`) が参照している id を削除する場合は、配分側も合わせて更新する(validate スクリプトが検出する)。
- 元 CSV はコミットに含めない(.gitignore 済みの想定)。ただしファイル名はコミットメッセージに残す。
