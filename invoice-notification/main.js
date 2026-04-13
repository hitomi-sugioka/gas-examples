/**
 * main.js — 請求予定日メール通知のメイン処理
 *
 * CONFIG（設定）と utils（ユーティリティ）を使い、
 * スプレッドシートの請求予定日データをもとに通知メールを送信します。
 *
 * GAS のトリガーで毎朝実行する想定です。
 */

function sendInvoiceNotifications() {
  // スプレッドシートからデータを取得
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    .getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error(`シート "${CONFIG.SHEET_NAME}" が見つかりません。SHEET_NAME を確認してください。`);
  }
  const data = sheet.getDataRange().getValues();

  // ヘッダー行からカラムインデックスを構築
  const headers = data[0];
  const col = buildColumnIndices(headers, CONFIG.COLUMNS);

  const today = new Date();
  const emailsToSend = [];

  // 各行を走査して通知対象を判定
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // 請求予定日を取得（無効な日付はスキップ）
    const invoiceDate = new Date(row[col.INVOICE_DATE]);
    if (isNaN(invoiceDate.getTime())) continue;

    // 今日から請求予定日までの日数差を計算
    const daysDiff = dateDiffInDays(today, invoiceDate);

    // 通知対象日でなければスキップ
    if (!CONFIG.NOTIFICATION_DAYS.includes(daysDiff)) continue;

    // メール件名を作成
    const customerName = row[col.CUSTOMER_NAME];
    const subject = daysDiff === 0
      ? `${customerName}様への請求予定日当日です`
      : `${customerName}様への請求予定日まであと${daysDiff}日`;

    // 受注日のフォーマット（無効な日付は「未設定」と表示）
    const orderDate = new Date(row[col.ORDER_DATE]);
    const orderDateStr = isNaN(orderDate.getTime()) ? '未設定' : formatDateJP(orderDate);

    // メール本文を作成
    const body = `取引先名: ${customerName}
受注日: ${orderDateStr}
注文番号: ${row[col.ORDER_NUMBER]}

請求予定日: ${formatDateJP(invoiceDate)}
請求番号: ${row[col.INVOICE_NUMBER]}

品名: ${row[col.ITEM_NAME]}
単価(税抜): ${formatJPY(row[col.UNIT_PRICE])}
数量: ${row[col.QUANTITY]}

小計(税抜): ${formatJPY(row[col.PRICE])}
合計(税込): ${formatJPY(row[col.TOTAL_AMOUNT])}

請求予定表を見る: ${CONFIG.SPREADSHEET_URL}`;

    emailsToSend.push({ subject, body });
  }

  // メールを送信
  const to = CONFIG.MAIN_RECIPIENTS.join(', ');
  const cc = CONFIG.CC_RECIPIENTS.join(', ');

  emailsToSend.forEach(email => {
    MailApp.sendEmail({
      to,
      cc,
      subject: email.subject,
      body: email.body,
      name: CONFIG.SENDER_NAME,
    });
  });
}
