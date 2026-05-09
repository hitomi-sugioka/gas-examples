# invoice-notification

## Overview

スプレッドシートの請求予定日が近づくと、自動で通知メールを送信する Google Apps Script（GAS）のサンプルコードです。  
スプレッドシートで請求管理を行っている場合の通知自動化に利用できます。

## Features

- 請求予定日の **7日前・3日前・1日前・当日** にメール通知（`config.js` で変更可能）
- 同じ請求予定日の取引先を **1通のメールにグループ化**し、同じ取引先の明細を **1セクションにまとめて請求合計を表示**
- スプレッドシートのヘッダー名ベースでカラムを取得（列の並び替えに強い）
- 複数の送信先・CC に対応

## File Structure

| ファイル | 役割 |
| --- | --- |
| `config.js` | スプレッドシートID・メール送信先・通知日数・`TRIGGER_CONFIGS` などの設定値 |
| `utils.js` | 日付計算・金額フォーマットなどの汎用ユーティリティ |
| `main.js` | メイン処理（データ取得 → 判定 → メール送信） |
| `menu.js` | カスタムメニュー（スプレッドシート上の操作 UI） |
| `triggers.js` | トリガー管理（設定・一覧・削除） |
| `appsscript.json` | GAS マニフェスト（タイムゾーン: Asia/Tokyo） |

## Prerequisites

[ルートの README](../README.md#development-environment) に従って、以下の準備を行ってください。

- Node.js・clasp のインストール
- Apps Script API の有効化
- [GCP プロジェクトの設定](../README.md#google-cloud-setup)（API 有効化・GAS との紐づけ・実行可能 API デプロイ）— プロジェクトごとに必要
  - 本サンプルで必要な API: **Apps Script API**, **Google Sheets API**

## Setup

### 1. Import Sample Data

新規スプレッドシートを作成し、`sample-data.csv` をインポートします。

「ファイル」>「インポート」>「アップロード」から `sample-data.csv` を選択してください。

### 2. Create GAS Project

対象のスプレッドシートを開き、「拡張機能」>「Apps Script」で GAS プロジェクトを作成します。

### 3. Configure clasp

GAS エディタの **設定**（歯車アイコン）から Script ID を取得し、`.clasp.json` を作成します。  
key/ の取得手順はルート README の [OAuth クライアント ID の作成](../README.md#creating-oauth-client-id-for-clasp-run) を参照してください。

```bash
# .clasp.json を作成し、scriptId を実際の値に書き換え
cp .clasp.json.example .clasp.json
# → "scriptId": "YOUR_SCRIPT_ID_HERE" を書き換え

# 依存関係をインストール
npm install

# clasp にログイン（未ログインの場合）
clasp login

# clasp run を使う場合は追加で OAuth 認証が必要
cp ../key/<ダウンロードしたファイル名>.json creds.json
clasp login --creds creds.json

# ログイン確認（ブラウザで GAS エディタが開けば OK）
npm run open   # = clasp open-script
```

> `clasp clone-script` は GAS からファイルをダウンロードするコマンドのため、既にローカルにソースがある本サンプルでは使いません。
> **注意**: `.claspignore` が正しく機能するには Git リポジトリである必要があります。GitHub からダウンロード（ZIP）した場合は `git init` を実行してください。

### 4. Edit config.js

`config.js` を開いて以下の値を設定します。

- `SPREADSHEET_ID` — 対象スプレッドシートの ID
- `SHEET_NAME` — シート名
- `MAIN_RECIPIENTS` / `CC_RECIPIENTS` — メール送信先
- `COLUMNS` — スプレッドシートのヘッダー名に合わせて修正

### 5. Deploy

```bash
# リポジトリルートから
../deploy.sh .

# または
npm run push   # clasp push のみ
```

> 初回 push 時に「Manifest file has been updated. Do you want to push and overwrite?」と表示されます。Yes を選択してください。

初回 push 後、`npm run pull`（= `clasp pull`）で GAS 側のマニフェストをローカルに同期します。  
これにより、以降の push で上書き確認が表示されなくなり、API デプロイのバージョンを毎回更新し直す必要もなくなります。

```bash
npm run pull
```

> `clasp pull` は GAS 側の全ファイルをダウンロードしてローカルを上書きします。ローカルに未 push の変更がある場合は、先にコミットしてから実行してください。

### 6. Authorize Permissions

初回の push 後、GAS エディタで `sendInvoiceNotifications` を手動実行してください。「承認が必要です」ダイアログが表示されます。

1. **権限を確認** をクリック
2. Google アカウントを選択
3. 「アクセスできる情報を選択してください」で **すべて選択** にチェック
4. **続行** をクリック

承認後、スクリプトが実行され、通知対象があればメールが送信されます。

> この承認は初回のみ必要です。`appsscript.json` のスコープを変更して再 push した場合は、再度承認が必要になります。

## Usage

### Run Notifications

`clasp run` を使うと、ローカルから直接メール通知を実行できます（事前に [実行可能 API のデプロイ](../README.md#deploying-as-executable-api) が必要）。

```bash
clasp run sendInvoiceNotifications
```

カスタムメニューから手動実行する場合は、後述の [Custom Menu](#custom-menu) を参照してください。

### Trigger Setup

以下のいずれかの方法で、`TRIGGER_CONFIGS`（`config.js`）に定義されたトリガーを一括設定します。  
デフォルトでは毎日 8時 / 毎週月曜 15時 に `sendInvoiceNotifications` を実行します。

#### Option A: Spreadsheet Custom Menu

スプレッドシートを開き、「**通知管理**」メニュー →「**トリガーを設定**」を選択します。  
確認ダイアログで「はい」を選ぶとトリガーが一括設定されます。

#### Option B: clasp run

`clasp run` を使うには事前準備が必要です:

- 実行可能 API のデプロイ（[手順](../README.md#deploying-as-executable-api)）
- OAuth クライアント ID の認証情報（[取得手順](../README.md#creating-oauth-client-id-for-clasp-run)）

```bash
# creds.json で認証（ステップ3 でコピー済み）
clasp login --creds creds.json

# 設定内容を確認（ドライラン）
clasp run setupTriggerHeadless

# 確認後、実際にトリガーを設定
clasp run setupTriggerHeadless --params '[true]'
```

トリガーを削除したい場合は「**通知管理**」メニュー →「**トリガーを削除**」、または `clasp run deleteTriggerHeadless`（確認） → `clasp run deleteTriggerHeadless --params '[true]'`（実行）で削除してください。

> `*Headless` 関数は `clasp run` 専用です。GAS エディタから直接実行した場合、引数を渡せないため確認モード（ドライラン）で停止します。実行ログに確認結果と操作方法の案内が表示されます。
>
> **注意**: トリガーの追加・変更・削除はすべてカスタムメニューまたは `clasp run` から行ってください。GAS エディタのトリガー管理画面から直接操作すると、コードで管理しているトリガーと競合し、通知の重複や削除漏れの原因になります。
>
> `setupTrigger` / `deleteTrigger` は `TRIGGER_CONFIGS` の `functionName` に一致するトリガーだけを操作します。GAS エディタから手動追加されたトリガーは、関数名が `TRIGGER_CONFIGS` と同じなら削除・再作成の対象になりますが、異なる関数名のトリガーは一覧（`showTriggerStatus`）に表示されるだけで、設定・削除の対象にはなりません。

### Custom Menu

スプレッドシートを開くと「**通知管理**」メニューが自動で追加されます。

| メニュー項目 | 用途 |
| --- | --- |
| 今すぐ通知を送信 | 手動でメール通知を実行し、結果をダイアログで確認 |
| トリガー一覧を確認 | 設定済みトリガーのラベル・スケジュール・種別を一覧表示 |
| トリガーを設定 | `TRIGGER_CONFIGS` に定義されたトリガーを一括設定（確認ダイアログあり） |
| トリガーを削除 | 管理対象トリガーを一括削除（確認ダイアログあり） |

> メニューが表示されない場合はスプレッドシートを再読み込みしてください。

## Rounding Mode

請求合計は **税率ごとに税抜合計を集計し、消費税額に対して端数処理** する方式です（インボイス制度準拠）。

```text
請求合計(税抜) = 税率ごとの税抜合計の合算
※内部的には小数が発生する可能性に備え、防御的に端数処理を適用する場合があります（通常は no-op）

消費税(税率%)  = 端数処理（税率ごとの税抜合計 × 税率）
請求合計(税込) = 請求合計(税抜) + 消費税の合計
```

デフォルトは **切り捨て（floor）** です。

### Code (`utils.js`'s `roundAmount()`)

| モード | 関数 |
| --- | --- |
| 切り捨て（デフォルト） | `Math.floor(amount)` |
| 切り上げ | `Math.ceil(amount)` |
| 四捨五入 | `Math.round(amount)` |

### CSV / Spreadsheet (`sample-data.csv`)

小計(税抜)は精度保持のため丸めません（`=E2*F2`）。表示上の丸めはスプレッドシートの書式設定で行ってください。

## Email Notification Example

同じ請求予定日の取引先は1通のメールにまとめて送信されます。  
同じ取引先に複数の明細がある場合は1つのセクションにまとめます。  
各取引先セクションの末尾に区切り線と請求合計を表示します。

**件名:**

```text
【請求予定通知】2026年4月16日予定分（2件）
```

**本文:**

```text
■ 株式会社サンプル（INV-2026-043）
  受注日: 2026年3月1日
  注文番号: ORD-2026-001
  品名: 製品A
  単価(税抜): 100,000円 × 1
  小計(税抜): 100,000円
  税率: 10%

  - - - - - - - - - - - - - - -

  受注日: 2026年3月1日
  注文番号: ORD-2026-001
  品名: 製品B
  単価(税抜): 50,000円 × 2
  小計(税抜): 100,000円
  税率: 10%

  ─────────────────
  請求合計(税抜): 200,000円
  消費税(10%): 20,000円
  請求合計(税込): 220,000円

──────────────────────────────

■ 株式会社デザイン（INV-2026-044）
  受注日: 2026年3月21日
  注文番号: ORD-2026-004
  品名: ロゴデザイン
  単価(税抜): 50,000円 × 1
  小計(税抜): 50,000円
  税率: 10%

  ─────────────────
  請求合計(税抜): 50,000円
  消費税(10%): 5,000円
  請求合計(税込): 55,000円

══════════════════════════════
対象: 2件（3明細）

請求予定表を見る: https://docs.google.com/spreadsheets/d/xxxxx/edit
```

## Related Articles

- [GAS × スプレッドシートで期限通知メールを自動送信【コード付き】](https://www.sugiokasystem.co.jp/blog/gas-auto-email-notification)
