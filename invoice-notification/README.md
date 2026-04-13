# invoice-notification — 請求予定日メール通知

Google スプレッドシートの請求予定日が近づくと、自動で通知メールを送信する GAS スクリプトです。

## 機能

- 請求予定日の **7日前・3日前・1日前・当日** にメール通知（`config.js` で変更可能）
- スプレッドシートのヘッダー名ベースでカラムを取得（列の並び替えに強い）
- 複数の送信先・CC に対応

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `config.js` | スプレッドシートID・メール送信先・通知日数などの設定値 |
| `utils.js` | 日付計算・金額フォーマットなどの汎用ユーティリティ |
| `main.js` | メイン処理（データ取得 → 判定 → メール送信） |
| `appsscript.json` | GAS マニフェスト（タイムゾーン: Asia/Tokyo） |

## セットアップ

### 1. GAS プロジェクトを作成

対象のスプレッドシートを開き、「拡張機能」>「Apps Script」で GAS プロジェクトを作成します。

### 2. clasp を設定

```bash
# .clasp.json を作成（Script ID は GAS の設定画面から取得）
cp .clasp.json.example .clasp.json
# scriptId を実際の値に書き換え

# 依存関係をインストール
npm install
```

### 3. config.js を編集

`config.js` を開いて以下の値を設定します。

- `SPREADSHEET_ID` — 対象スプレッドシートの ID
- `SHEET_NAME` — シート名
- `MAIN_RECIPIENTS` / `CC_RECIPIENTS` — メール送信先
- `COLUMNS` — スプレッドシートのヘッダー名に合わせて修正

### 4. デプロイ

```bash
# リポジトリルートから
../deploy.sh .

# または
npm run push   # clasp push のみ
```

### 5. トリガーを設定

GAS 編集画面の「トリガー」から、`sendInvoiceNotifications` を「時間主導型 > 日付ベースのタイマー > 午前8時〜9時」に設定します。

## メール通知の例

**件名（3日前の場合）:**

```text
株式会社サンプル様への請求予定日まであと3日
```

**件名（当日の場合）:**

```text
株式会社サンプル様への請求予定日当日です
```

**本文:**

```text
取引先名: 株式会社サンプル
受注日: 2026年3月1日
注文番号: ORD-2026-001

請求予定日: 2026年4月16日
請求番号: INV-2026-042

品名: コンサルティング（4月分）
単価(税抜): 100,000円
数量: 1

小計(税抜): 100,000円
合計(税込): 110,000円

請求予定表を見る: https://docs.google.com/spreadsheets/d/xxxxx/edit
```

## 関連記事

- [Google Apps Script（GAS）で予定通知メールを自動送信する方法【サンプルコード付き】](https://www.sugiokasystem.co.jp/blog/gas-auto-email-notification)
