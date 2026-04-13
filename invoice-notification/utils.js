/**
 * utils.js — ユーティリティ関数
 *
 * 日付計算・金額フォーマットなど、ビジネスロジックに依存しない
 * 汎用的なヘルパー関数をまとめています。
 * 他の GAS プロジェクトでもそのまま再利用できます。
 */

/**
 * 2つの日付間の差を日数で計算する
 *
 * @param {Date} a - 開始日
 * @param {Date} b - 終了日
 * @returns {number} 日数差（b - a）
 */
function dateDiffInDays(a, b) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

/**
 * 数値を日本円形式にフォーマットする
 *
 * @param {number|string} amount - 金額
 * @returns {string} 例: "1,234円"
 */
function formatJPY(amount) {
  return `${Number(amount).toLocaleString('ja-JP')}円`;
}

/**
 * Date オブジェクトを「yyyy年m月d日」形式にフォーマットする
 *
 * @param {Date} date - 日付
 * @returns {string} 例: "2026年4月13日"
 */
function formatDateJP(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('ja-JP', options);
}

/**
 * ヘッダー行とカラム名マッピングからインデックスを構築する
 *
 * @param {string[]} headers - シートのヘッダー行（1行目）
 * @param {Object<string, string>} columnMap - { キー名: ヘッダー名 } の対応表
 * @returns {Object<string, number>} { キー名: カラムインデックス } の対応表
 */
function buildColumnIndices(headers, columnMap) {
  const indices = {};
  for (const [key, headerName] of Object.entries(columnMap)) {
    indices[key] = headers.indexOf(headerName);
  }
  return indices;
}
