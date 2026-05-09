# trigger-manager

## Overview

トリガーの設定・一覧・削除をコードで一元管理する Google Apps Script（GAS）のサンプルコードです。  
`config.js` の `TRIGGER_CONFIGS` でトリガーを定義し、カスタムメニューまたは `clasp run` から操作できます。

`main.js` にはダミー関数を配置しています。実際のプロジェクトでは、ここに業務ロジックを実装してください。

## Features

- `config.js` の `TRIGGER_CONFIGS` でトリガー定義を一元管理
- スプレッドシートのカスタムメニューから設定・一覧・削除が可能
- `clasp run` 経由でも設定・一覧・削除が可能（Headless 関数）
- 時間主導型（5種類）とイベント型（4種類）の両方をサポート

## Supported Trigger Types

### Time-Driven (ClockTriggerBuilder)

| タイプ | type 値 | GAS メソッド | 用途 |
| --- | --- | --- | --- |
| 分ごと | `minutes` | `everyMinutes(n)` | n分ごと（1, 5, 10, 15, 30） |
| 時間ごと | `hourly` | `everyHours(n)` | n時間ごと |
| 日ごと | `daily` | `everyDays(1)` | 毎日 |
| 週ごと | `weekly` | `everyWeeks(1).onWeekDay()` | 毎週特定曜日 |
| 月ごと | `monthly` | `onMonthDay(day)` | 毎月n日 |

### Event-Based (SpreadsheetTriggerBuilder)

| タイプ | type 値 | GAS メソッド | 用途 |
| --- | --- | --- | --- |
| 表示時 | `onOpen` | `.forSpreadsheet(ss).onOpen()` | スプレッドシート表示時 |
| 編集時 | `onEdit` | `.forSpreadsheet(ss).onEdit()` | セル編集時 |
| 変更時 | `onChange` | `.forSpreadsheet(ss).onChange()` | 構造変更時（行挿入・列削除等） |
| フォーム送信時 | `onFormSubmit` | `.forSpreadsheet(ss).onFormSubmit()` | フォーム送信時 |

> **シンプルトリガーとの違い**: `menu.js` の `onOpen()` はシンプルトリガー（自動実行、権限制限あり）です。ここで設定するのはインストーラブルトリガーで、外部サービスの呼び出しなどより広い権限で実行できます。関数名の衝突を避けるため、`myOnOpenTask` のように別名を使用してください。

## File Structure

| ファイル | 役割 |
| --- | --- |
| `config.js` | トリガー定義（`TRIGGER_CONFIGS`）・スプレッドシートIDなどの設定値 |
| `main.js` | メイン処理（差し替え前提のダミー関数） |
| `menu.js` | カスタムメニュー（スプレッドシート上の操作 UI） |
| `triggers.js` | トリガー管理（設定・一覧・削除のコア処理 + UI版 + Headless版） |
| `appsscript.json` | GAS マニフェスト（タイムゾーン: Asia/Tokyo） |

## Prerequisites

[ルートの README](../README.md#development-environment) に従って、以下の準備を行ってください。

- Node.js・clasp のインストール
- Apps Script API の有効化
- [GCP プロジェクトの設定](../README.md#google-cloud-setup)（API 有効化・GAS との紐づけ・実行可能 API デプロイ）— プロジェクトごとに必要
  - 本サンプルで必要な API: **Apps Script API**, **Google Sheets API**

## Setup

### 1. Create GAS Project

新規スプレッドシートを作成し、「拡張機能」>「Apps Script」で GAS プロジェクトを作成します。

### 2. Configure clasp

GAS エディタの **設定**（歯車アイコン）から Script ID を取得し、`.clasp.json` を作成します。  
key/ の取得手順はルート README の [OAuth クライアント ID の作成](../README.md#creating-oauth-client-id-for-clasp-run) を参照してください。

```bash
# .clasp.json を作成し、scriptId を実際の値に書き換え
cp .clasp.json.example .clasp.json
# → "scriptId": "YOUR_SCRIPT_ID_HERE" を書き換え

# clasp にログイン（未ログインの場合）
clasp login

# clasp run を使う場合は追加で OAuth 認証が必要
cp ../key/<ダウンロードしたファイル名>.json creds.json
clasp login --creds creds.json

# ログイン確認（ブラウザで GAS エディタが開けば OK）
clasp open

# 依存関係をインストール
npm install
```

> `clasp clone` は GAS からファイルをダウンロードするコマンドのため、既にローカルにソースがある本サンプルでは使いません。
> **注意**: `.claspignore` が正しく機能するには Git リポジトリである必要があります。GitHub からダウンロード（ZIP）した場合は `git init` を実行してください。

### 3. Deploy

```bash
# リポジトリルートから
../deploy.sh .

# または
npm run push   # clasp push のみ
```

> 初回 push 時に「Manifest file has been updated. Do you want to push and overwrite?」と表示されます。Yes を選択してください。

初回 push 後、`clasp pull` で GAS 側のマニフェストをローカルに同期します。

```bash
clasp pull
```

> `clasp pull` は GAS 側の全ファイルをダウンロードしてローカルを上書きします。ローカルに未 push の変更がある場合は、先にコミットしてから実行してください。

### 4. Authorize Permissions

初回の push 後、GAS エディタで `myDailyTask` を手動実行してください。「承認が必要です」ダイアログが表示されます。

1. **権限を確認** をクリック
2. Google アカウントを選択
3. 「アクセスできる情報を選択してください」で **すべて選択** にチェック
4. **続行** をクリック

> この承認は初回のみ必要です。`appsscript.json` のスコープを変更して再 push した場合は、再度承認が必要になります。

## Usage

### Trigger Setup

以下のいずれかの方法で、`TRIGGER_CONFIGS`（`config.js`）に定義されたトリガーを一括設定します。デフォルトでは時間主導型5種 + イベント型2種 = 計7件のトリガーを設定します。

#### Option A: Spreadsheet Custom Menu

スプレッドシートを開き、「**トリガー管理**」メニュー →「**トリガーを設定**」を選択します。確認ダイアログで「はい」を選ぶとトリガーが一括設定されます。

#### Option B: clasp run

`clasp run` を使うには事前準備が必要です:

- 実行可能 API のデプロイ（[手順](../README.md#deploying-as-executable-api)）
- OAuth クライアント ID の認証情報（[取得手順](../README.md#creating-oauth-client-id-for-clasp-run)）

```bash
# creds.json で認証（ステップ2 でコピー済み）
clasp login --creds creds.json

# 設定内容を確認（ドライラン）
clasp run setupTriggerHeadless

# 確認後、実際にトリガーを設定
clasp run setupTriggerHeadless --params '[true]'
```

トリガーを削除したい場合は「**トリガー管理**」メニュー →「**トリガーを削除**」、または `clasp run deleteTriggerHeadless`（確認） → `clasp run deleteTriggerHeadless --params '[true]'`（実行）で削除してください。

> `*Headless` 関数は `clasp run` 専用です。GAS エディタから直接実行した場合、引数を渡せないため確認モード（ドライラン）で停止します。実行ログに確認結果と操作方法の案内が表示されます。
>
> **注意**: トリガーの追加・変更・削除はすべてカスタムメニューまたは `clasp run` から行ってください。GAS エディタのトリガー管理画面から直接操作すると、コードで管理しているトリガーと競合し、重複や削除漏れの原因になります。詳しくは [Limitations](#limitations) を参照してください。

### Custom Menu

スプレッドシートを開くと「**トリガー管理**」メニューが自動で追加されます。

| メニュー項目 | 用途 |
| --- | --- |
| トリガー一覧を確認 | 設定済みトリガーのラベル・スケジュール・種別を一覧表示 |
| トリガーを設定 | `TRIGGER_CONFIGS` に定義されたトリガーを一括設定（確認ダイアログあり） |
| トリガーを削除 | 管理対象トリガーを一括削除（確認ダイアログあり） |

> メニューが表示されない場合はスプレッドシートを再読み込みしてください。

## Configuration

### Editing TRIGGER_CONFIGS

`config.js` の `TRIGGER_CONFIGS` を編集して、トリガー設定の追加・変更・削除ができます。

#### Per-Minute (`minutes`)

```javascript
{
  functionName: 'myFrequentTask',
  label: '高頻度タスク（5分ごと）',
  type: 'minutes',
  minutes: 5       // 1, 5, 10, 15, 30 のいずれか
}
```

#### Hourly (`hourly`)

```javascript
{
  functionName: 'myHourlyTask',
  label: '毎時タスク',
  type: 'hourly',
  hours: 1,        // 省略時 1
  minute: 30       // 省略可（nearMinute: ±15分の揺れあり）
}
```

#### Daily (`daily`)

```javascript
{
  functionName: 'myDailyTask',
  label: 'デイリータスク',
  type: 'daily',
  hour: 9,         // 実行時刻（0〜23）
  minute: 0        // 省略可（nearMinute）
}
```

#### Weekly (`weekly`)

```javascript
{
  functionName: 'myWeeklyTask',
  label: 'ウィークリータスク',
  type: 'weekly',
  hour: 10,
  weekDay: ScriptApp.WeekDay.MONDAY  // MONDAY〜SUNDAY
}
```

#### Monthly (`monthly`)

```javascript
{
  functionName: 'myMonthlyTask',
  label: 'マンスリータスク',
  type: 'monthly',
  hour: 9,
  monthDay: 1      // 実行日（1〜31）
}
```

#### On Open (`onOpen`)

```javascript
{
  functionName: 'myOnOpenTask',
  label: 'スプレッドシート表示時タスク',
  type: 'onOpen'
}
```

#### On Edit (`onEdit`)

```javascript
{
  functionName: 'myOnEditTask',
  label: 'セル編集時タスク',
  type: 'onEdit'
}
```

#### On Change (`onChange`)

```javascript
{
  functionName: 'myOnChangeTask',
  label: 'スプレッドシート変更時タスク',
  type: 'onChange'
}
```

#### On Form Submit (`onFormSubmit`)

```javascript
{
  functionName: 'myOnFormSubmitTask',
  label: 'フォーム送信時タスク',
  type: 'onFormSubmit'
  // ※ フォームが連携されているスプレッドシートでのみ動作します
}
```

#### Targeting External Spreadsheet

```javascript
{
  functionName: 'myOnEditTask',
  label: '別シートの編集監視',
  type: 'onEdit',
  spreadsheetId: 'スプレッドシートID'  // 省略時はバインド先スプレッドシート
}
```

#### Common Options

| プロパティ | 説明 | 対象タイプ |
| --- | --- | --- |
| `hour` | 実行時刻（0〜23）。`atHour()` に対応 | daily, weekly, monthly |
| `minute` | 分指定（0〜59）。`nearMinute()` に対応。±15分の揺れあり | 時間主導型（minutes 以外） |
| `timezone` | タイムゾーン。`inTimezone()` に対応。省略時はスクリプトのタイムゾーン | 時間主導型 |
| `spreadsheetId` | 対象スプレッドシートID。省略時はバインド先 | イベント型 |

変更後は `clasp push` → カスタムメニューの「**トリガーを設定**」（または `clasp run setupTriggerHeadless --params '[true]'`）でトリガーを再設定してください。

### Replacing main.js

`main.js` のダミー関数を実際の業務ロジックに書き換えてください。

```javascript
/** デイリータスク（毎日実行） */
function myDailyTask() {
  // ここに毎日実行したい処理を実装
  var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  // ...
}
```

関数名を変更する場合は、`config.js` の `TRIGGER_CONFIGS` の `functionName` も合わせて変更してください。

## Event Objects

イベント型トリガーで呼び出される関数には、イベントオブジェクト `e` が渡されます。

| type | 主要プロパティ | 説明 |
| --- | --- | --- |
| `onOpen` | `e.source` | 開かれたスプレッドシート |
| `onEdit` | `e.range`, `e.value`, `e.oldValue` | 編集されたセル範囲・編集後の値・編集前の値 |
| `onChange` | `e.changeType` | 変更種別（`EDIT`, `INSERT_ROW`, `INSERT_COLUMN`, `REMOVE_ROW`, `REMOVE_COLUMN`, `INSERT_GRID`, `REMOVE_GRID`, `FORMAT`, `OTHER`） |
| `onFormSubmit` | `e.values`, `e.namedValues`, `e.range` | フォーム回答の値・名前付き値・書き込み先セル範囲 |

> 詳細は [Event Objects - Google Apps Script](https://developers.google.com/apps-script/guides/triggers/events) を参照してください。

## Limitations

`setupTrigger` / `deleteTrigger` は **`TRIGGER_CONFIGS` の `functionName` に一致するトリガーだけ**を操作します。
GAS エディタのトリガー管理画面から手動追加されたトリガーとの関係は以下のとおりです。

| 手動追加したトリガーの関数名 | `showTriggerStatus` | `setupTrigger` | `deleteTrigger` |
| --- | --- | --- | --- |
| `TRIGGER_CONFIGS` と**同じ** | 一覧に表示される | 削除して再作成される | 削除される |
| `TRIGGER_CONFIGS` と**異なる** | 一覧に表示される | 影響なし（残る） | 影響なし（残る） |

- トリガーの追加・変更・削除はすべて**カスタムメニューまたは `clasp run`** から行ってください
- GAS エディタから手動でトリガーを追加すると、同じ関数名のトリガーが重複し、通知やタスクが二重実行される原因になります
- 手動追加したトリガーを `deleteTrigger` で削除するには、該当の `functionName` が `TRIGGER_CONFIGS` に定義されている必要があります

## Related Articles

- [GAS のトリガーをスクリプトで一元管理する方法【コード付き】](https://www.sugiokasystem.co.jp/blog/gas-trigger-code-management)
