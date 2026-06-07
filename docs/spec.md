# muscle-log — 設計書

## コンセプト
> トレーニングのログを手軽に残して振り返ることで、モチベーションを維持・向上させる

---

## ターゲットユーザー
- 週2〜5回ジムや自宅でトレーニングをしている人
- 記録はしたいが、既存アプリが複雑すぎると感じている人
- スマホでもPCでも使いたい人（英語圏含む）

---

## 差別化ポイント
- **入力が速い**：タップ数を最小限に、ジムの合間に30秒で記録できる
- **機能を絞る**：必要なものだけ、迷わない
- **スマホ・Web両対応**：インストール不要、どこでも使える
- **クラウド保存**：デバイスが変わってもデータが消えない
- **JSONエクスポート/インポート**：データ移行が簡単

---

## 機能一覧

### Must（Phase 1 / MVP）
- [ ] 認証（メール/パスワード）
- [ ] トレーニング種目の選択（プリセット＋カスタム追加）
- [ ] セットごとの記録（重量・回数・時間から選択）
- [ ] kg / lbs 切り替え
- [ ] 体重の入力
- [ ] 履歴の表示
- [ ] グラフ表示（重量推移・体重推移）
- [ ] JSONエクスポート/インポート
- [ ] クラウドへのデータ保存・同期（Supabase）

### Want（Phase 2）
- [ ] Googleログイン
- [ ] 前回の記録をワンタップでコピー
- [ ] セッションメモ欄

### Future（Phase 3）
- [ ] レストタイマー

---

## プリセット種目（初期データ）

### Chest
- Bench Press / Dumbbell Fly / Pec Deck

### Back
- Deadlift / Lat Pulldown / Bent Over Row

### Legs
- Squat / Leg Press / Leg Curl

### Shoulders
- Shoulder Press / Lateral Raise

### Arms
- Barbell Curl / Triceps Pressdown

### Cardio
- Running / Bike

---

## 画面構成（英語UI）

### Tab 1：Log
```
[Today's Training]
Date: 2026-05-21

[+ Add Exercise]
  → Category selection
  → Exercise selection or custom input

[Bench Press]
  Set 1: 60kg × 10 reps  [Copy] [Delete]
  Set 2: 80kg × 8 reps
  [+ Add Set]

[Body Weight] 70.5 kg

[Save]
```

### Tab 2：Charts
```
[Period: Week / Month / All]

[Body Weight Chart]

[Exercise Progress]
  Select exercise: [Bench Press ▼]
  Chart display

[Stats]
  Total Sessions / Max Weight / Avg Weight (7 days)
```

### Tab 3：Data
```
[Export] Download JSON
[Import] Select JSON file
[Delete All]
```

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | HTML / CSS / Vanilla JS |
| グラフ | Chart.js |
| 認証 | Supabase Auth（メール/パスワード） |
| DB | Supabase PostgreSQL |
| デプロイ | Vercel |

### Supabaseテーブル設計

```
users（Supabase Authで自動管理）

sessions
  id, user_id, date, created_at

sets
  id, session_id, exercise_id, weight, reps, duration, unit（kg/lbs）, order

exercises
  id, user_id, name, category, is_preset

body_weights
  id, user_id, date, weight, unit（kg/lbs）
```

---

## デザイン方針
- シンプル・最低限のスタイル
- モバイルファースト（ジムでの片手操作を想定）
- ボタンは大きめ、タップ領域を広く
- ダークモード
- 言語：英語のみ

---

## 開発ステップ（pushする単位）

### Phase 1：MVP

| Step | 内容 | 状態 |
|---|---|---|
| Step 1 | プロジェクト基盤 | [x] |
| Step 2 | Supabase接続 | [x] |
| Step 3 | 認証 | [x] |
| Step 4 | 種目マスタ | [x] |
| Step 5 | トレーニング記録 | [x] |
| Step 6 | 体重記録 | [x] |
| Step 7 | 履歴表示 | [x] |
| Step 8 | グラフ | [x] |
| Step 9 | データ管理 | [ ] |

#### Step 1：プロジェクト基盤
- HTMLファイル作成（空のテンプレート）
- CSSの基本スタイル（ダークモード・カラー変数）
- タブ切り替えの骨組み
- Vercelデプロイ確認

#### Step 2：Supabase接続
- Supabaseプロジェクト作成
- テーブル作成（sessions・sets・exercises・body_weights）
- RLS設定
- Vercel環境変数にキーを登録

#### Step 3：認証
- メール/パスワードログイン
- ログイン/ログアウト画面

#### Step 4：種目マスタ
- プリセット種目の初期データ投入
- 種目選択UI
- カスタム種目の追加

#### Step 5：トレーニング記録
- セット入力（重量・回数）
- kg/lbs切り替え
- Supabaseへの保存

#### Step 6：体重記録
- 体重入力UI
- Supabaseへの保存

#### Step 7：履歴表示
- セッション一覧
- セット詳細の表示

#### Step 8：グラフ
- Chart.js導入
- 体重推移グラフ
- 種目別重量推移グラフ

#### Step 9：データ管理
- JSONエクスポート
- JSONインポート
- 全削除

### Phase 2：改善
- [ ] 前回の記録をワンタップでコピー
- [ ] セッションメモ欄

### Phase 3：拡張
- [ ] レストタイマー
