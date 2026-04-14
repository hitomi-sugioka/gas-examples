/**
 * main.js — 請求予定日メール通知のメイン処理
 *
 * CONFIG（設定）と utils（ユーティリティ）を使い、
 * スプレッドシートの請求予定日データをもとに通知メールを送信します。
 *
 * GAS のトリガーで毎朝実行する想定です。
 *
 * パイプライン: データ取得 → グループ化 → メール生成 → 送信
 */

// ============================================================
// ヘルパー関数（_ サフィックス = GAS エディタの関数一覧に非表示）
// ============================================================

/**
 * スプレッドシートからデータを取得する
 * @return {{ rows: Array[], col: Object } | null} データがない場合は null
 */
function getSheetData_() {
  var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    .getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error('シート "' + CONFIG.SHEET_NAME + '" が見つかりません。SHEET_NAME を確認してください。');
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  var headers = data[0];
  var col = buildColumnIndices(headers, CONFIG.COLUMNS);
  var rows = data.slice(1);

  return { rows: rows, col: col };
}

/**
 * 通知対象の行を残り日数でグループ化する
 * @param {Array[]} rows - データ行（ヘッダーなし）
 * @param {Object} col - カラムインデックス
 * @param {Date} today - 基準日
 * @return {Object<number, Array[]>} { daysDiff: [row, row, ...], ... }
 */
function groupByDaysDiff_(rows, col, today) {
  var groups = {};

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var invoiceDate = new Date(row[col.INVOICE_DATE]);
    if (isNaN(invoiceDate.getTime())) continue;

    var daysDiff = dateDiffInDays(today, invoiceDate);
    if (!CONFIG.NOTIFICATION_DAYS.includes(daysDiff)) continue;

    if (!groups[daysDiff]) {
      groups[daysDiff] = [];
    }
    groups[daysDiff].push(row);
  }

  return groups;
}

/**
 * 同じ請求予定日の行を取引先名でグループ化する（出現順を維持）
 * @param {Array[]} rows - 同じ請求予定日のデータ行
 * @param {Object} col - カラムインデックス
 * @return {{ name: string, rows: Array[] }[]}
 */
function groupByCustomer_(rows, col) {
  var seen = {};
  var groups = [];

  for (var i = 0; i < rows.length; i++) {
    var name = rows[i][col.CUSTOMER_NAME];
    if (seen[name] === undefined) {
      seen[name] = groups.length;
      groups.push({ name: name, rows: [] });
    }
    groups[seen[name]].rows.push(rows[i]);
  }

  return groups;
}

/**
 * 1明細行のテキストを組み立てる
 * @param {Array} row - データ行
 * @param {Object} col - カラムインデックス
 * @return {string}
 */
function buildDetailText_(row, col) {
  var orderDate = new Date(row[col.ORDER_DATE]);
  var orderDateStr = isNaN(orderDate.getTime()) ? '未設定' : formatDateJP(orderDate);

  return '  受注日: ' + orderDateStr + '\n'
    + '  注文番号: ' + row[col.ORDER_NUMBER] + '\n'
    + '  品名: ' + row[col.ITEM_NAME] + '\n'
    + '  単価(税抜): ' + formatJPY(row[col.UNIT_PRICE]) + ' × ' + row[col.QUANTITY] + '\n'
    + '  小計(税抜): ' + formatJPY(row[col.PRICE]) + '\n'
    + '  税率: ' + (row[col.TAX] * 100) + '%';
}

/**
 * 1グループ（同じ daysDiff）分のメール件名・本文を組み立てる
 *
 * 同じ取引先名の明細を1つのセクション（■）にまとめ、
 * 取引先ごとの請求合計を表示する。
 *
 * @param {Array[]} groupRows - 同じ請求予定日のデータ行
 * @param {Object} col - カラムインデックス
 * @return {{ subject: string, body: string }}
 */
function buildGroupedEmailContent_(groupRows, col) {
  var invoiceDate = new Date(groupRows[0][col.INVOICE_DATE]);
  var invoiceDateStr = formatDateJP(invoiceDate);
  var customerGroups = groupByCustomer_(groupRows, col);
  var customerCount = customerGroups.length;
  var totalDetailCount = groupRows.length;

  var subject = '【請求予定通知】' + invoiceDateStr + '予定分（' + customerCount + '件）';

  // 取引先ごとのセクションを組み立て
  var sections = [];

  for (var i = 0; i < customerGroups.length; i++) {
    var group = customerGroups[i];
    var customerRows = group.rows;

    // ■ ヘッダー: 取引先名 + 請求番号（空なら省略）
    var invoiceNumber = customerRows[0][col.INVOICE_NUMBER];
    var header = '■ ' + group.name;
    if (invoiceNumber) {
      header += '（' + invoiceNumber + '）';
    }

    // 明細テキストを組み立て・税率ごとに税抜合計を集計
    var details = [];
    var taxGroups = {};
    for (var j = 0; j < customerRows.length; j++) {
      details.push(buildDetailText_(customerRows[j], col));
      var taxRate = Number(customerRows[j][col.TAX]);
      var price = Number(customerRows[j][col.PRICE]);
      taxGroups[taxRate] = (taxGroups[taxRate] || 0) + price;
    }

    // 税率ごとに消費税額を端数処理してから合算
    var sortedRates = Object.keys(taxGroups).sort(function(a, b) { return Number(a) - Number(b); });
    var subtotalExTax = 0;
    var totalTax = 0;
    var taxLines = [];
    for (var k = 0; k < sortedRates.length; k++) {
      var rate = sortedRates[k];
      var subtotal = taxGroups[rate];
      var tax = roundAmount(subtotal * Number(rate));
      subtotalExTax += subtotal;
      totalTax += tax;
      taxLines.push('  消費税(' + (Number(rate) * 100) + '%): ' + formatJPY(tax));
    }
    subtotalExTax = roundAmount(subtotalExTax);
    var customerTotal = subtotalExTax + totalTax;

    var detailSeparator = '\n\n  - - - - - - - - - - - - - - -\n\n';
    var section = header + '\n' + details.join(detailSeparator)
      + '\n\n  ─────────────────'
      + '\n  請求合計(税抜): ' + formatJPY(subtotalExTax)
      + '\n' + taxLines.join('\n')
      + '\n  請求合計(税込): ' + formatJPY(customerTotal);

    sections.push(section);
  }

  var separator = '\n\n──────────────────────────────\n\n';
  var summary = '対象: ' + customerCount + '件（' + totalDetailCount + '明細）';
  var body = sections.join(separator) + '\n'
    + '\n'
    + '══════════════════════════════\n'
    + summary + '\n'
    + '\n'
    + '請求予定表を見る: ' + CONFIG.SPREADSHEET_URL;

  return { subject: subject, body: body };
}

// ============================================================
// エントリポイント
// ============================================================

/**
 * 請求予定日の通知メールを送信する（トリガーから実行）
 *
 * パイプライン: データ取得 → グループ化 → メール生成 → 送信
 */
function sendInvoiceNotifications() {
  // データを取得
  var sheetData = getSheetData_();
  if (!sheetData) {
    var msg = '通知対象のデータがありません';
    Logger.log(msg);
    return msg;
  }

  var rows = sheetData.rows;
  var col = sheetData.col;
  var today = new Date();

  // 通知対象の行を残り日数でグループ化
  var groups = groupByDaysDiff_(rows, col, today);
  var daysDiffKeys = Object.keys(groups);
  if (daysDiffKeys.length === 0) {
    var msg = '本日の通知対象はありません';
    Logger.log(msg);
    return msg;
  }

  // グループごとにメールを生成・送信
  var to = CONFIG.MAIN_RECIPIENTS.join(', ');
  var cc = CONFIG.CC_RECIPIENTS.join(', ');
  var totalRows = 0;

  for (var i = 0; i < daysDiffKeys.length; i++) {
    var daysDiff = Number(daysDiffKeys[i]);
    var groupRows = groups[daysDiff];
    var email = buildGroupedEmailContent_(groupRows, col);

    MailApp.sendEmail({
      to: to,
      cc: cc,
      subject: email.subject,
      body: email.body,
      name: CONFIG.SENDER_NAME
    });

    totalRows += groupRows.length;
  }

  var msg = '請求予定通知: ' + daysDiffKeys.length + '通（' + totalRows + '件）送信しました';
  Logger.log(msg);
  return msg;
}
