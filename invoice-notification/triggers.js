/**
 * triggers.js — トリガー設定用関数
 *
 * ■ GAS エディタから実行する場合（メニュー / 手動実行）
 *   setupTrigger()  — トリガー設定（完了ダイアログ表示）
 *   deleteTrigger() — トリガー削除（完了ダイアログ表示）
 *
 * ■ clasp run で実行する場合（ヘッドレス）
 *   setupTriggerHeadless()  — トリガー設定（console.log + return）
 *   deleteTriggerHeadless() — トリガー削除（console.log + return）
 *
 * SpreadsheetApp.getUi() はヘッドレス実行で使えないため、
 * clasp run から呼ぶ場合は Headless 版を使用してください。
 */

/**
 * トリガー定義
 * setupTrigger / setupTriggerHeadless はこの定義に基づいてトリガーを作成する。
 */
var TRIGGER_CONFIG = {
  functionName: 'sendInvoiceNotifications',
  label: '請求予定日メール通知',
  type: 'daily',
  hour: 8
};

// ---------------------------------------------------------------------------
// コア処理（UI 非依存）
// ---------------------------------------------------------------------------

/**
 * TRIGGER_CONFIG に基づいてトリガーを作成する
 * 既存の同名トリガーがあれば先に削除してから再作成する。
 * @return {Object} 作成したトリガー情報
 */
function setupTriggerCore_() {
  deleteTriggerCore_();

  ScriptApp.newTrigger(TRIGGER_CONFIG.functionName)
    .timeBased()
    .everyDays(1)
    .atHour(TRIGGER_CONFIG.hour)
    .create();

  var description = '毎日 ' + TRIGGER_CONFIG.hour + '時';
  Logger.log(TRIGGER_CONFIG.functionName + ' を設定しました: ' + description);

  return {
    handlerFunction: TRIGGER_CONFIG.functionName,
    label: TRIGGER_CONFIG.label,
    schedule: description
  };
}

/**
 * TRIGGER_CONFIG.functionName に一致するトリガーのみ削除する
 * @return {number} 削除した件数
 */
function deleteTriggerCore_() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === TRIGGER_CONFIG.functionName) {
      ScriptApp.deleteTrigger(trigger);
      count++;
    }
  });
  Logger.log(TRIGGER_CONFIG.functionName + ': ' + count + '件削除');
  return count;
}

// ---------------------------------------------------------------------------
// GAS エディタ / メニュー用（UI あり）
// ---------------------------------------------------------------------------

/**
 * 日次トリガーを設定する（GAS エディタから手動実行）
 * 完了後にダイアログで結果を表示します。
 */
function setupTrigger() {
  var result = setupTriggerCore_();
  SpreadsheetApp.getUi().alert(
    'トリガー設定完了',
    result.handlerFunction + ' を' + result.schedule + 'に実行するトリガーを設定しました。',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * トリガーを削除する（GAS エディタから手動実行）
 * 完了後にダイアログで結果を表示します。
 */
function deleteTrigger() {
  var count = deleteTriggerCore_();
  SpreadsheetApp.getUi().alert(
    'トリガー削除完了',
    count + '件のトリガーを削除しました。',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ---------------------------------------------------------------------------
// clasp run 用（ヘッドレス）
// ---------------------------------------------------------------------------

/**
 * 日次トリガーを設定する（clasp run 用）
 * 使い方: clasp run setupTriggerHeadless
 * @return {Object} 設定結果
 */
function setupTriggerHeadless() {
  var result = setupTriggerCore_();
  console.log(result.handlerFunction + ': ' + result.schedule + ' で設定しました。');
  return result;
}

/**
 * トリガーを削除する（clasp run 用）
 * 使い方: clasp run deleteTriggerHeadless
 * @return {Object} 削除結果
 */
function deleteTriggerHeadless() {
  var count = deleteTriggerCore_();
  console.log(TRIGGER_CONFIG.functionName + ': ' + count + '件削除しました。');
  return { handlerFunction: TRIGGER_CONFIG.functionName, deleted: count };
}
