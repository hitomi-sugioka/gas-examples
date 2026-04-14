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
 * トリガー定義（配列）
 * setupTrigger / setupTriggerHeadless はこの定義に基づいてトリガーを作成する。
 * 複数トリガーを管理したい場合はオブジェクトを追加してください。
 */
var TRIGGER_CONFIGS = [
  {
    functionName: 'sendInvoiceNotifications',
    label: '請求予定日メール通知',
    type: 'daily',
    hour: 8
  }
];

// ---------------------------------------------------------------------------
// コア処理（UI 非依存）
// ---------------------------------------------------------------------------

/**
 * 指定された config に基づいてトリガーを作成する
 * 既存の同名トリガーがあれば先に削除してから再作成する。
 * @param {Object} config - TRIGGER_CONFIGS の要素
 * @return {Object} 作成したトリガー情報
 */
function setupTriggerCore_(config) {
  deleteTriggerCore_(config);

  ScriptApp.newTrigger(config.functionName)
    .timeBased()
    .everyDays(1)
    .atHour(config.hour)
    .create();

  var description = '毎日 ' + config.hour + '時';
  Logger.log(config.functionName + ' を設定しました: ' + description);

  return {
    handlerFunction: config.functionName,
    label: config.label,
    schedule: description
  };
}

/**
 * 指定された config.functionName に一致するトリガーのみ削除する
 * @param {Object} config - TRIGGER_CONFIGS の要素
 * @return {number} 削除した件数
 */
function deleteTriggerCore_(config) {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === config.functionName) {
      ScriptApp.deleteTrigger(trigger);
      count++;
    }
  });
  Logger.log(config.functionName + ': ' + count + '件削除');
  return count;
}

// ---------------------------------------------------------------------------
// GAS エディタ / メニュー用（UI あり）
// ---------------------------------------------------------------------------

/**
 * 全トリガーを設定する（GAS エディタから手動実行）
 * 確認ダイアログに全件を番号付きで表示し、承認後に一括作成する。
 */
function setupTrigger() {
  var ui = SpreadsheetApp.getUi();
  var lines = TRIGGER_CONFIGS.map(function(config, i) {
    return (i + 1) + '. ' + config.label
      + '（関数: ' + config.functionName + ' / 毎日 ' + config.hour + '時）';
  });
  var message = '以下のトリガーを設定します。\n\n' + lines.join('\n');

  var response = ui.alert('トリガー設定の確認', message, ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) {
    return;
  }

  var results = TRIGGER_CONFIGS.map(function(config) {
    return setupTriggerCore_(config);
  });

  var summary = results.map(function(r) {
    return r.label + '（' + r.schedule + '）';
  }).join('\n');
  ui.alert('トリガー設定完了', summary + '\n\nトリガーを設定しました。', ui.ButtonSet.OK);
}

/**
 * 全管理トリガーを削除する（GAS エディタから手動実行）
 * 完了後にダイアログで結果を表示します。
 */
function deleteTrigger() {
  var ui = SpreadsheetApp.getUi();
  var totalCount = 0;
  TRIGGER_CONFIGS.forEach(function(config) {
    totalCount += deleteTriggerCore_(config);
  });
  ui.alert('トリガー削除完了', totalCount + '件のトリガーを削除しました。', ui.ButtonSet.OK);
}

// ---------------------------------------------------------------------------
// clasp run 用（ヘッドレス）
// ---------------------------------------------------------------------------

/**
 * 全トリガーを設定する（clasp run 用）
 * 使い方: clasp run setupTriggerHeadless
 * @return {Array<Object>} 設定結果の配列
 */
function setupTriggerHeadless() {
  var results = TRIGGER_CONFIGS.map(function(config) {
    return setupTriggerCore_(config);
  });
  results.forEach(function(r) {
    console.log(r.handlerFunction + ': ' + r.schedule + ' で設定しました。');
  });
  return results;
}

/**
 * 全管理トリガーを削除する（clasp run 用）
 * 使い方: clasp run deleteTriggerHeadless
 * @return {Array<Object>} 削除結果の配列
 */
function deleteTriggerHeadless() {
  var results = TRIGGER_CONFIGS.map(function(config) {
    var count = deleteTriggerCore_(config);
    console.log(config.functionName + ': ' + count + '件削除しました。');
    return { handlerFunction: config.functionName, deleted: count };
  });
  return results;
}
