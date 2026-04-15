/**
 * config.js — 設定の一元管理
 *
 * トリガーの定義やスプレッドシート接続情報など、
 * 環境やプロジェクトに依存する設定値をこのファイルに集約します。
 * 設定変更時はこのファイルだけを修正すれば OK です。
 */

var CONFIG = {
  // ─── スプレッドシート ───
  SPREADSHEET_ID: 'スプレッドシートID',
  SHEET_NAME: 'ログ',
};

/**
 * トリガー定義（配列）
 * setupTrigger / setupTriggerHeadless はこの定義に基づいてトリガーを作成する。
 * 複数トリガーを管理したい場合はオブジェクトを追加してください。
 *
 * ■ 共通プロパティ:
 *   functionName — トリガーで呼び出す関数名（main.js で定義）
 *   label        — 管理画面やログに表示するラベル
 *   type         — 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly'
 *                   | 'onOpen' | 'onEdit' | 'onChange' | 'onFormSubmit'
 *
 * ■ タイプ別プロパティ:
 *   ── 時間主導型 ──
 *   minutes  — minutes: 実行間隔（1, 5, 10, 15, 30）
 *   hourly   — hours: 実行間隔（省略時 1）
 *   daily    — （追加プロパティなし）
 *   weekly   — weekDay: ScriptApp.WeekDay.MONDAY など
 *   monthly  — monthDay: 実行日（1〜31）
 *   ── イベント型（スプレッドシート） ──
 *   onOpen      — スプレッドシート表示時
 *   onEdit      — セル編集時
 *   onChange    — スプレッドシート変更時（行挿入・列削除等）
 *   onFormSubmit — フォーム送信時
 *
 * ■ 共通オプション（省略可）:
 *   hour     — 実行時刻（0〜23）。daily / weekly / monthly で有効
 *   minute   — 分指定（nearMinute）。±15分の揺れあり
 *   timezone — タイムゾーン（inTimezone）。省略時はスクリプトのタイムゾーン
 *   spreadsheetId — イベント型で対象スプレッドシートを指定（省略時はバインド先）
 */
var TRIGGER_CONFIGS = [
  // --- 分ごと ---
  {
    functionName: 'myFrequentTask',
    label: '高頻度タスク（5分ごと）',
    type: 'minutes',
    minutes: 5
  },
  // --- 時間ごと ---
  {
    functionName: 'myHourlyTask',
    label: '毎時タスク',
    type: 'hourly',
    hours: 1,
    minute: 30
  },
  // --- 日ごと ---
  {
    functionName: 'myDailyTask',
    label: 'デイリータスク',
    type: 'daily',
    hour: 9,
    minute: 0
  },
  // --- 週ごと ---
  {
    functionName: 'myWeeklyTask',
    label: 'ウィークリータスク',
    type: 'weekly',
    hour: 10,
    weekDay: ScriptApp.WeekDay.MONDAY
  },
  // --- 月ごと ---
  {
    functionName: 'myMonthlyTask',
    label: 'マンスリータスク',
    type: 'monthly',
    hour: 9,
    monthDay: 1
  },
  // --- イベント型（スプレッドシート） ---
  {
    functionName: 'myOnOpenTask',
    label: 'スプレッドシート表示時タスク',
    type: 'onOpen'
  },
  {
    functionName: 'myOnEditTask',
    label: 'セル編集時タスク',
    type: 'onEdit'
  }
  // --- 以下はコメントを外して追加できます ---
  // {
  //   functionName: 'myOnChangeTask',
  //   label: 'スプレッドシート変更時タスク',
  //   type: 'onChange'
  // },
  // {
  //   functionName: 'myOnFormSubmitTask',
  //   label: 'フォーム送信時タスク',
  //   type: 'onFormSubmit'
  //   // ※ フォームが連携されているスプレッドシートでのみ動作します
  // }
];
