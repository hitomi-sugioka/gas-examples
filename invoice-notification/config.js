/**
 * config.js — 設定の一元管理
 *
 * スプレッドシート接続情報・メール送信先・通知タイミングなど、
 * 環境やプロジェクトに依存する設定値をこのファイルに集約します。
 * 設定変更時はこのファイルだけを修正すれば OK です。
 */

const CONFIG = {
  // ─── スプレッドシート ───
  SPREADSHEET_ID: 'スプレッドシートID',
  SHEET_NAME: 'シート名',
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/スプレッドシートID/edit',

  // ─── メール ───
  SENDER_NAME: 'Your Sender Name',
  MAIN_RECIPIENTS: ['YOUR_MAIN_EMAIL1', 'YOUR_MAIN_EMAIL2'],
  CC_RECIPIENTS: ['YOUR_CC_EMAIL1', 'YOUR_CC_EMAIL2'], // CC不要なら空配列 [] に

  // ─── 通知タイミング（請求予定日までの残り日数） ───
  NOTIFICATION_DAYS: [7, 3, 1, 0],

  // ─── カラム名マッピング（スプレッドシートのヘッダー名） ───
  COLUMNS: {
    CUSTOMER_NAME: '取引先名',
    ORDER_DATE: '受注日',
    ORDER_NUMBER: '注文番号',
    ITEM_NAME: '品名',
    UNIT_PRICE: '単価(税抜)',
    QUANTITY: '数量',
    PRICE: '小計(税抜)',
    TAX: '税率',
    INVOICE_DATE: '請求予定日',
    INVOICE_NUMBER: '請求番号',
  },
};
