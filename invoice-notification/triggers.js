/**
 * triggers.js — トリガー設定用関数
 *
 * ■ GAS エディタから実行する場合（メニュー / 手動実行）
 *   showTriggerStatus() — トリガー一覧表示
 *   setupTrigger()      — トリガー設定（完了ダイアログ表示）
 *   deleteTrigger()     — トリガー削除（確認ダイアログ表示）
 *
 * ■ clasp run で実行する場合（ヘッドレス）
 *   showTriggerStatusHeadless() — トリガー一覧表示（return）
 *   setupTriggerHeadless()      — トリガー設定（確認 → --params '[true]' で実行）
 *   deleteTriggerHeadless()     — トリガー削除（確認 → --params '[true]' で実行）
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
  },
  {
    functionName: 'sendInvoiceNotifications',
    label: '請求予定日メール通知（週次）',
    type: 'weekly',
    hour: 15,
    weekDay: ScriptApp.WeekDay.MONDAY
  }
];

/**
 * トリガーのスケジュールを日本語で返す
 * @param {Object} config - TRIGGER_CONFIGS の要素
 * @return {string} 例: '毎日 8時' / '毎週月曜 15時'
 */
function formatSchedule_(config) {
  if (config.type === 'weekly') {
    var dayLabels = {};
    dayLabels[ScriptApp.WeekDay.MONDAY] = '月';
    dayLabels[ScriptApp.WeekDay.TUESDAY] = '火';
    dayLabels[ScriptApp.WeekDay.WEDNESDAY] = '水';
    dayLabels[ScriptApp.WeekDay.THURSDAY] = '木';
    dayLabels[ScriptApp.WeekDay.FRIDAY] = '金';
    dayLabels[ScriptApp.WeekDay.SATURDAY] = '土';
    dayLabels[ScriptApp.WeekDay.SUNDAY] = '日';
    var dayLabel = dayLabels[config.weekDay] || '?';
    return '毎週' + dayLabel + '曜 ' + config.hour + '時';
  }
  return '毎日 ' + config.hour + '時';
}

// ---------------------------------------------------------------------------
// コア処理（UI 非依存）
// ---------------------------------------------------------------------------

/**
 * 指定された config に基づいてトリガーを作成する（作成のみ）
 * 呼び出し側で事前に deleteTriggerCore_ による削除を行ってください。
 * @param {Object} config - TRIGGER_CONFIGS の要素
 * @return {Object} 作成したトリガー情報
 */
function setupTriggerCore_(config) {
  var builder = ScriptApp.newTrigger(config.functionName).timeBased();
  if (config.type === 'weekly') {
    builder.everyWeeks(1).onWeekDay(config.weekDay);
  } else {
    builder.everyDays(1);
  }
  builder.atHour(config.hour).create();

  var description = formatSchedule_(config);
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
 * TRIGGER_CONFIGS から functionName に一致する config を検索する
 * @param {string} functionName - ハンドラ関数名
 * @return {Object|null} マッチした config、見つからなければ null
 */
function findTriggerConfig_(functionName) {
  for (var i = 0; i < TRIGGER_CONFIGS.length; i++) {
    if (TRIGGER_CONFIGS[i].functionName === functionName) {
      return TRIGGER_CONFIGS[i];
    }
  }
  return null;
}

/**
 * TRIGGER_CONFIGS を functionName でグルーピングしたプールを作成し、
 * match() を呼ぶたびに未消費の config を1つずつ返すマッチャーを生成する。
 * 同一 functionName で複数トリガーがある場合に、定義順でペアリングする。
 * @return {Object} match(functionName) メソッドを持つオブジェクト
 */
function buildConfigMatcher_() {
  var pool = {};
  TRIGGER_CONFIGS.forEach(function(config) {
    if (!pool[config.functionName]) {
      pool[config.functionName] = [];
    }
    pool[config.functionName].push(config);
  });
  var consumed = {};
  return {
    match: function(functionName) {
      var configs = pool[functionName];
      if (!configs) return null;
      var idx = consumed[functionName] || 0;
      if (idx >= configs.length) return null;
      consumed[functionName] = idx + 1;
      return configs[idx];
    }
  };
}

/**
 * 設定済みトリガーの一覧をダイアログで表示する
 * TRIGGER_CONFIGS にマッチするトリガーにはラベル・スケジュールを補完する。
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

  var matcher = buildConfigMatcher_();
  var lines = triggers.map(function(trigger, i) {
    var handler = trigger.getHandlerFunction();
    var eventType = trigger.getEventType().toString();
    var typeLabel = getEventTypeLabel_(eventType);
    var config = matcher.match(handler);

    if (config) {
      return (i + 1) + '. ' + config.label + '\n'
        + '   関数: ' + handler + '\n'
        + '   スケジュール: ' + formatSchedule_(config) + '\n'
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

/**
 * 全トリガーを設定する（GAS エディタから手動実行）
 * 確認ダイアログに全件を番号付きで表示し、承認後に一括作成する。
 */
function setupTrigger() {
  var ui = SpreadsheetApp.getUi();
  var lines = TRIGGER_CONFIGS.map(function(config, i) {
    return (i + 1) + '. ' + config.label
      + '（関数: ' + config.functionName + ' / ' + formatSchedule_(config) + '）';
  });
  var message = '以下のトリガーを設定します。\n\n' + lines.join('\n');

  var response = ui.alert('トリガー設定の確認', message, ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) {
    return;
  }

  // 既存トリガーを一括削除してから作成（同一functionNameの複数トリガー対応）
  TRIGGER_CONFIGS.forEach(function(config) {
    deleteTriggerCore_(config);
  });

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

  // 削除対象のトリガーを収集（実トリガーと config をペアリング）
  var triggers = ScriptApp.getProjectTriggers();
  var matcher = buildConfigMatcher_();
  var targets = [];
  triggers.forEach(function(trigger) {
    var config = matcher.match(trigger.getHandlerFunction());
    if (config) {
      targets.push(config);
    }
  });

  if (targets.length === 0) {
    ui.alert('トリガー削除', '削除対象のトリガーはありません。', ui.ButtonSet.OK);
    return;
  }

  var lines = targets.map(function(config, i) {
    return (i + 1) + '. ' + config.label
      + '（関数: ' + config.functionName + ' / ' + formatSchedule_(config) + '）';
  });
  var message = '以下のトリガーを削除します。\n\n' + lines.join('\n');

  var response = ui.alert('トリガー削除の確認', message, ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) {
    return;
  }

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
 * 設定済みトリガーの一覧を返す（clasp run 用）
 * 使い方: clasp run showTriggerStatusHeadless
 * @return {Object} トリガー一覧または未設定メッセージ
 */
function showTriggerStatusHeadless() {
  var triggers = ScriptApp.getProjectTriggers();

  if (triggers.length === 0) {
    return { count: 0, message: 'トリガーは設定されていません' };
  }

  var matcher = buildConfigMatcher_();
  var list = triggers.map(function(trigger) {
    var handler = trigger.getHandlerFunction();
    var eventType = trigger.getEventType().toString();
    var typeLabel = getEventTypeLabel_(eventType);
    var config = matcher.match(handler);

    if (config) {
      return {
        label: config.label,
        handlerFunction: handler,
        schedule: formatSchedule_(config),
        type: typeLabel
      };
    }

    return {
      handlerFunction: handler,
      type: typeLabel
    };
  });

  return { count: triggers.length, triggers: list };
}

/**
 * 設定済みトリガーの一覧を文字列配列で返す（確認表示用）
 * clasp run の出力でネストされたオブジェクトが [Object] になるのを防ぐ。
 * @return {string[]} トリガー情報の文字列配列（未設定時は空配列）
 */
function formatTriggerStatusLines_() {
  var triggers = ScriptApp.getProjectTriggers();
  if (triggers.length === 0) return [];

  var matcher = buildConfigMatcher_();
  return triggers.map(function(trigger, i) {
    var handler = trigger.getHandlerFunction();
    var eventType = trigger.getEventType().toString();
    var typeLabel = getEventTypeLabel_(eventType);
    var config = matcher.match(handler);

    if (config) {
      return (i + 1) + '. ' + config.label
        + '（関数: ' + handler + ' / ' + formatSchedule_(config) + ' / ' + typeLabel + '）';
    }
    return (i + 1) + '. ' + handler + '（' + typeLabel + '）';
  });
}

/**
 * 全トリガーを設定する（clasp run 用）
 * 使い方:
 *   clasp run setupTriggerHeadless                  — 設定内容の確認のみ
 *   clasp run setupTriggerHeadless --params '[true]' — 実際に設定
 * @param {boolean} [confirm=false] true を渡すと実際に設定を実行する
 * @return {Object} 確認結果または設定結果
 */
function setupTriggerHeadless(confirm) {
  // 確認モード（デフォルト）: 現在の状態 + 設定予定を表示するのみ
  if (!confirm) {
    var currentLines = formatTriggerStatusLines_();
    var planned = TRIGGER_CONFIGS.map(function(config, i) {
      return (i + 1) + '. ' + config.label
        + '（関数: ' + config.functionName + ' / ' + formatSchedule_(config) + '）';
    });
    return {
      confirm: false,
      message: '設定内容を確認してください（既存の同名トリガーは再作成されます）',
      currentTriggers: currentLines,
      planned: planned,
      next: "clasp run setupTriggerHeadless --params '[true]'"
    };
  }

  // 既存トリガーを一括削除してから作成（同一functionNameの複数トリガー対応）
  TRIGGER_CONFIGS.forEach(function(config) {
    deleteTriggerCore_(config);
  });

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
 * 使い方:
 *   clasp run deleteTriggerHeadless                  — 削除対象の確認のみ
 *   clasp run deleteTriggerHeadless --params '[true]' — 実際に削除
 * @param {boolean} [confirm=false] true を渡すと実際に削除を実行する
 * @return {Object} 確認結果または削除結果
 */
function deleteTriggerHeadless(confirm) {
  // 削除対象を収集（実トリガーと config をペアリング）
  var allTriggers = ScriptApp.getProjectTriggers();
  var matcher = buildConfigMatcher_();
  var targets = [];
  allTriggers.forEach(function(trigger) {
    var config = matcher.match(trigger.getHandlerFunction());
    if (config) {
      targets.push(config);
    }
  });

  if (targets.length === 0) {
    console.log('削除対象のトリガーはありません。');
    return { deleted: 0, message: '削除対象のトリガーはありません' };
  }

  // 確認モード（デフォルト）: 現在の状態 + 削除対象を表示するのみ
  if (!confirm) {
    var currentLines = formatTriggerStatusLines_();
    var targetList = targets.map(function(config, i) {
      return (i + 1) + '. ' + config.label
        + '（関数: ' + config.functionName + ' / ' + formatSchedule_(config) + '）';
    });
    return {
      confirm: false,
      message: '削除対象を確認してください',
      currentTriggers: currentLines,
      targets: targetList,
      next: "clasp run deleteTriggerHeadless --params '[true]'"
    };
  }

  // 削除実行
  var results = TRIGGER_CONFIGS.map(function(config) {
    var count = deleteTriggerCore_(config);
    console.log(config.label + '（' + config.functionName + '）: ' + count + '件削除しました。');
    return { handlerFunction: config.functionName, label: config.label, deleted: count };
  });

  var totalCount = results.reduce(function(sum, r) { return sum + r.deleted; }, 0);
  console.log('合計 ' + totalCount + '件のトリガーを削除しました。');
  return results;
}
