/**
 * menu.js — カスタムメニュー
 *
 * スプレッドシートを開くと「請求通知」メニューが自動的に追加される。
 * メニューから通知のテスト送信やトリガーの設定・削除を実行できる。
 *
 * ■ 関数一覧
 *   onOpen()                — 「請求通知」メニューを登録（Simple Trigger）
 *   runManualNotification() — 手動でメール通知を実行（完了ダイアログ表示）
 *   showTriggerStatus()     — 設定済みトリガーの一覧を表示
 */

/**
 * スプレッドシートを開いたときに「請求通知」メニューを追加する
 * Simple Trigger として GAS が自動的に呼び出す。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('請求通知')
    .addItem('今すぐ通知を送信（テスト）', 'runManualNotification')
    .addSeparator()
    .addItem('トリガー一覧を確認', 'showTriggerStatus')
    .addItem('トリガーを設定', 'setupTrigger')
    .addItem('トリガーを削除', 'deleteTrigger')
    .addToUi();
}

/**
 * メニューから手動でメール通知を実行する
 * sendInvoiceNotifications() を呼び出し、結果をダイアログで表示する。
 */
function runManualNotification() {
  var log = sendInvoiceNotifications();
  SpreadsheetApp.getUi().alert(
    '送信完了',
    log,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * イベント種別を日本語ラベルに変換する
 * @param {string} eventType - ScriptApp.EventType の文字列表現
 * @return {string} 日本語ラベル
 */
function getEventTypeLabel_(eventType) {
  var labels = {
    'CLOCK': '時間主導型',
    'ON_OPEN': 'スプレッドシート起動時',
    'ON_EDIT': 'スプレッドシート編集時',
    'ON_FORM_SUBMIT': 'フォーム送信時',
    'ON_CHANGE': 'スプレッドシート変更時'
  };
  return labels[eventType] || eventType;
}

/**
 * 設定済みトリガーの一覧をダイアログで表示する
 * TRIGGER_CONFIG にマッチするトリガーにはラベル・スケジュールを補完する。
 */
function showTriggerStatus() {
  var triggers = ScriptApp.getProjectTriggers();

  if (triggers.length === 0) {
    SpreadsheetApp.getUi().alert(
      'トリガー一覧',
      'トリガーは設定されていません。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  var lines = triggers.map(function(trigger, i) {
    var handler = trigger.getHandlerFunction();
    var eventType = trigger.getEventType().toString();
    var typeLabel = getEventTypeLabel_(eventType);

    if (handler === TRIGGER_CONFIG.functionName) {
      return (i + 1) + '. ' + TRIGGER_CONFIG.label + '\n'
        + '   関数: ' + handler + '\n'
        + '   スケジュール: 毎日 ' + TRIGGER_CONFIG.hour + '時\n'
        + '   種別: ' + typeLabel;
    }

    return (i + 1) + '. ' + handler + '\n'
      + '   種別: ' + typeLabel;
  });

  SpreadsheetApp.getUi().alert(
    'トリガー一覧（' + triggers.length + '件）',
    lines.join('\n\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
