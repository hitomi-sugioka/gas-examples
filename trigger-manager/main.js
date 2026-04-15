/**
 * main.js — メイン処理（差し替え前提のサンプル）
 *
 * これらの関数はトリガーから定期実行されます。
 * 実際のプロジェクトでは、ここに業務ロジックを実装してください。
 */

/** 高頻度タスク（5分ごと） */
function myFrequentTask() {
  Logger.log('高頻度タスクを実行しました: ' + new Date().toLocaleString('ja-JP'));
  // TODO: ここに高頻度で実行したい処理を実装
}

/** 毎時タスク（1時間ごと） */
function myHourlyTask() {
  Logger.log('毎時タスクを実行しました: ' + new Date().toLocaleString('ja-JP'));
  // TODO: ここに毎時実行したい処理を実装
}

/** デイリータスク（毎日実行） */
function myDailyTask() {
  Logger.log('デイリータスクを実行しました: ' + new Date().toLocaleString('ja-JP'));
  // TODO: ここに毎日実行したい処理を実装
}

/** ウィークリータスク（毎週実行） */
function myWeeklyTask() {
  Logger.log('ウィークリータスクを実行しました: ' + new Date().toLocaleString('ja-JP'));
  // TODO: ここに毎週実行したい処理を実装
}

/** マンスリータスク（毎月実行） */
function myMonthlyTask() {
  Logger.log('マンスリータスクを実行しました: ' + new Date().toLocaleString('ja-JP'));
  // TODO: ここに毎月実行したい処理を実装
}

// ---------------------------------------------------------------------------
// イベント型（スプレッドシート）— インストーラブルトリガー
// ---------------------------------------------------------------------------

/**
 * スプレッドシート表示時タスク（インストーラブルトリガー）
 * シンプルトリガーの onOpen() とは別に動作し、より広い権限で実行できます。
 * @param {Object} e - イベントオブジェクト
 * @param {Spreadsheet} e.source - スプレッドシート
 */
function myOnOpenTask(e) {
  Logger.log('スプレッドシートが開かれました: ' + new Date().toLocaleString('ja-JP'));
  // TODO: ここにスプレッドシート表示時の処理を実装
}

/**
 * セル編集時タスク（インストーラブルトリガー）
 * @param {Object} e - イベントオブジェクト
 * @param {Range} e.range - 編集されたセル範囲
 * @param {*} e.value - 編集後の値
 * @param {*} e.oldValue - 編集前の値
 */
function myOnEditTask(e) {
  if (!e || !e.range) {
    Logger.log('myOnEditTask: イベントオブジェクトがありません（トリガー経由で実行してください）');
    return;
  }
  Logger.log('セルが編集されました: ' + e.range.getA1Notation());
  // TODO: ここにセル編集時の処理を実装
}
