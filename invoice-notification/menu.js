/**
 * menu.js — カスタムメニュー（「通知管理」メニューの登録と手動実行）
 */

/**
 * スプレッドシートを開いたときに「通知管理」メニューを追加する（Simple Trigger）
 * メニューから通知のテスト送信やトリガーの設定・削除を実行できる。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('通知管理')
    .addItem('今すぐ通知を送信', 'runManualNotification')
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
