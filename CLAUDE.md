# 選挙ポスター掲示場所マップ

越前市の選挙ポスター掲示場所 240 件を Google Maps 上に表示する静的 Web アプリ。ビルド工程なし(`index.html` を開くだけで動く)。フレームワーク不使用の plain JS。

## 構成

- `index.html` — エントリ。Google Maps JS API を callback=initMap で読み込む
- `src/data.js` — 掲示場所の正本データ。`POSTER_DATA`(id/address/description/lat/lng/status)。元データはユーザーが Excel/CSV で管理
- `src/distribution.js` — 配分表示用。`DISTRIBUTION_GROUPS`(色ごとの担当 id リスト)。Excel のセル背景色による配分管理を反映したもの
- `src/app.js` — 地図ロジック。モード1=全表示(赤/緑の2色)、モード2=配分表示(8色・配分済みのみ)
- `scripts/validate-data.mjs` — データ検証 CLI

## 開発ルール

- **データを変更したら必ず `node scripts/validate-data.mjs` を実行**し、警告ゼロを確認してからコミットする
- 座標の妥当範囲: 緯度 35.7〜36.1 / 経度 135.9〜136.6(越前市エリア)
- id は 1 始まりの連番・欠番なしを維持する
- コミットメッセージは日本語または「Fix/Add + 内容」。データ修正の場合は対象 id と元にした CSV ファイル名を含める
- スマホでの現地利用が主用途。UI 変更時は幅 375px 相当での表示崩れ・詳細パネルのスライド動作を確認する
- 元 CSV / Excel はリポジトリにコミットしない

## スキル

- `poster-data-update` — CSV から src/data.js を再生成・個別修正
- `distribution-update` — 色分け配分の更新(色対応表は同スキル内に記載)
- `ronten-seiri` — 実装前の論点整理・意思決定の相談
