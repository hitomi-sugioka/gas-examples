/**
 * menu.js — カスタムメニュー（「トリガー管理」メニューの登録）
 */

/**
 * スプレッドシートを開いたときに「トリガー管理」メニューを追加する（Simple Trigger）
 * メニューからトリガーの一覧確認・設定・削除を実行できる。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('トリガー管理')
    .addItem('トリガー一覧を確認', 'showTriggerStatus')
    .addItem('トリガーを設定', 'setupTrigger')
    .addItem('トリガーを削除', 'deleteTrigger')
    .addToUi();
}
