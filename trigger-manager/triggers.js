/**
 * triggers.js — トリガー管理（設定・一覧・削除）
 *
 * config.js の TRIGGER_CONFIGS に定義されたトリガーを一元管理する。
 * GAS エディタ / カスタムメニューから使う UI 版と、
 * clasp run から使うヘッドレス版の両方を提供する。
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
 * トリガーのスケジュールを日本語で返す
 * @param {Object} config - TRIGGER_CONFIGS の要素
 * @return {string} 例: '5分ごと' / '毎日 9時' / '毎週月曜 10時' / '毎月1日 9時'
 */
function formatSchedule_(config) {
  var minuteSuffix = (config.minute !== undefined) ? '（' + config.minute + '分頃）' : '';
  var hourSuffix = (config.hour !== undefined) ? ' ' + config.hour + '時' : '';

  switch (config.type) {
    case 'minutes':
      return config.minutes + '分ごと';
    case 'hourly':
      return (config.hours || 1) + '時間ごと' + minuteSuffix;
    case 'daily':
      return '毎日' + hourSuffix;
    case 'weekly':
      var dayLabels = {};
      dayLabels[ScriptApp.WeekDay.MONDAY] = '月';
      dayLabels[ScriptApp.WeekDay.TUESDAY] = '火';
      dayLabels[ScriptApp.WeekDay.WEDNESDAY] = '水';
      dayLabels[ScriptApp.WeekDay.THURSDAY] = '木';
      dayLabels[ScriptApp.WeekDay.FRIDAY] = '金';
      dayLabels[ScriptApp.WeekDay.SATURDAY] = '土';
      dayLabels[ScriptApp.WeekDay.SUNDAY] = '日';
      var dayLabel = dayLabels[config.weekDay] || '?';
      return '毎週' + dayLabel + '曜' + hourSuffix;
    case 'monthly':
      return '毎月' + config.monthDay + '日' + hourSuffix;
    case 'onOpen':
      return 'スプレッドシート表示時';
    case 'onEdit':
      return 'セル編集時';
    case 'onChange':
      return 'スプレッドシート変更時';
    case 'onFormSubmit':
      return 'フォーム送信時';
    default:
      return config.type;
  }
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
  var eventTypes = ['onOpen', 'onEdit', 'onChange', 'onFormSubmit'];
  var trigger;
  var builder;

  if (eventTypes.indexOf(config.type) !== -1) {
    // イベント型（スプレッドシート）
    var ss;
    if (config.spreadsheetId) {
      ss = SpreadsheetApp.openById(config.spreadsheetId);
    } else {
      ss = SpreadsheetApp.getActive();
      if (!ss) {
        throw new Error(
          config.functionName + ': イベント型トリガーを clasp run から設定する場合は '
          + 'config に spreadsheetId を指定してください。'
        );
      }
    }
    builder = ScriptApp.newTrigger(config.functionName).forSpreadsheet(ss);

    switch (config.type) {
      case 'onOpen':      builder.onOpen(); break;
      case 'onEdit':      builder.onEdit(); break;
      case 'onChange':     builder.onChange(); break;
      case 'onFormSubmit': builder.onFormSubmit(); break;
    }
    trigger = builder.create();
  } else {
    // 時間主導型
    builder = ScriptApp.newTrigger(config.functionName).timeBased();

    switch (config.type) {
      case 'minutes':
        builder.everyMinutes(config.minutes);
        break;
      case 'hourly':
        builder.everyHours(config.hours || 1);
        break;
      case 'daily':
        builder.everyDays(1);
        break;
      case 'weekly':
        builder.everyWeeks(1).onWeekDay(config.weekDay);
        break;
      case 'monthly':
        builder.onMonthDay(config.monthDay);
        break;
    }

    if (config.hour !== undefined) {
      builder.atHour(config.hour);
    }
    if (config.minute !== undefined) {
      builder.nearMinute(config.minute);
    }
    if (config.timezone) {
      builder.inTimezone(config.timezone);
    }

    trigger = builder.create();
  }
  saveStoredConfig_(trigger.getUniqueId(), config);

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
      deleteStoredConfig_(trigger.getUniqueId());
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
 * トリガー作成時の設定値を ScriptProperties に保存する
 * @param {string} triggerId - trigger.getUniqueId()
 * @param {Object} config - TRIGGER_CONFIGS の要素
 */
function saveStoredConfig_(triggerId, config) {
  var snapshot = {
    label: config.label,
    functionName: config.functionName,
    type: config.type
  };
  if (config.hour !== undefined) { snapshot.hour = config.hour; }
  if (config.minute !== undefined) { snapshot.minute = config.minute; }
  if (config.minutes !== undefined) { snapshot.minutes = config.minutes; }
  if (config.hours !== undefined) { snapshot.hours = config.hours; }
  if (config.weekDay !== undefined) { snapshot.weekDay = config.weekDay; }
  if (config.monthDay !== undefined) { snapshot.monthDay = config.monthDay; }
  if (config.timezone) { snapshot.timezone = config.timezone; }
  if (config.spreadsheetId) { snapshot.spreadsheetId = config.spreadsheetId; }
  var props = PropertiesService.getScriptProperties();
  props.setProperty('trigger_' + triggerId, JSON.stringify(snapshot));
}

/**
 * ScriptProperties から保存済み設定値を取得する
 * @param {string} triggerId - trigger.getUniqueId()
 * @return {Object|null}
 */
function getStoredConfig_(triggerId) {
  var props = PropertiesService.getScriptProperties();
  var json = props.getProperty('trigger_' + triggerId);
  if (!json) return null;
  return JSON.parse(json);
}

/**
 * ScriptProperties から保存済み設定値を削除する
 * @param {string} triggerId - trigger.getUniqueId()
 */
function deleteStoredConfig_(triggerId) {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('trigger_' + triggerId);
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
 * トリガーに対応する設定値を解決する
 * 1. ScriptProperties の保存値（実際の設定値）を優先
 * 2. なければ TRIGGER_CONFIGS から functionName で検索（後方互換）
 * @param {Object} trigger - ScriptApp.getProjectTriggers() の要素
 * @return {Object|null}
 */
function resolveConfigForTrigger_(trigger) {
  var stored = getStoredConfig_(trigger.getUniqueId());
  if (stored) return stored;
  return findTriggerConfig_(trigger.getHandlerFunction());
}

/**
 * トリガー配列を TRIGGER_CONFIGS の定義順にソートする
 * TRIGGER_CONFIGS にマッチしないトリガーは末尾に配置する。
 * @param {Object[]} triggers - ScriptApp.getProjectTriggers() の結果
 * @return {Object[]} ソート済みの新しい配列
 */
function sortTriggersByConfig_(triggers) {
  return triggers.slice().sort(function(a, b) {
    var configA = resolveConfigForTrigger_(a);
    var configB = resolveConfigForTrigger_(b);
    var indexA = configA ? findConfigIndex_(configA) : TRIGGER_CONFIGS.length;
    var indexB = configB ? findConfigIndex_(configB) : TRIGGER_CONFIGS.length;
    return indexA - indexB;
  });
}

/**
 * config が TRIGGER_CONFIGS の何番目に対応するかを返す
 * label + functionName + type で一致判定する。
 * @param {Object} config - resolveConfigForTrigger_ の戻り値
 * @return {number} インデックス（見つからなければ TRIGGER_CONFIGS.length）
 */
function findConfigIndex_(config) {
  for (var i = 0; i < TRIGGER_CONFIGS.length; i++) {
    var c = TRIGGER_CONFIGS[i];
    if (c.functionName === config.functionName
        && c.type === config.type
        && c.label === config.label) {
      return i;
    }
  }
  return TRIGGER_CONFIGS.length;
}

/**
 * 設定済みトリガーの一覧をダイアログで表示する
 * TRIGGER_CONFIGS にマッチするトリガーにはラベル・スケジュールを補完する。
 */
function showTriggerStatus() {
  var triggers = sortTriggersByConfig_(ScriptApp.getProjectTriggers());

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
    var config = resolveConfigForTrigger_(trigger);

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
  var triggers = sortTriggersByConfig_(ScriptApp.getProjectTriggers());
  var targets = [];
  triggers.forEach(function(trigger) {
    var config = resolveConfigForTrigger_(trigger);
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
  var triggers = sortTriggersByConfig_(ScriptApp.getProjectTriggers());

  if (triggers.length === 0) {
    console.log('トリガーは設定されていません。');
    return { count: 0, message: 'トリガーは設定されていません' };
  }

  var list = triggers.map(function(trigger) {
    var handler = trigger.getHandlerFunction();
    var eventType = trigger.getEventType().toString();
    var typeLabel = getEventTypeLabel_(eventType);
    var config = resolveConfigForTrigger_(trigger);

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

  var result = { count: triggers.length, triggers: list };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * 設定済みトリガーの一覧を文字列配列で返す（確認表示用）
 * clasp run の出力でネストされたオブジェクトが [Object] になるのを防ぐ。
 * @return {string[]} トリガー情報の文字列配列（未設定時は空配列）
 */
function formatTriggerStatusLines_() {
  var triggers = sortTriggersByConfig_(ScriptApp.getProjectTriggers());
  if (triggers.length === 0) return [];

  return triggers.map(function(trigger, i) {
    var handler = trigger.getHandlerFunction();
    var eventType = trigger.getEventType().toString();
    var typeLabel = getEventTypeLabel_(eventType);
    var config = resolveConfigForTrigger_(trigger);

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
    var result = {
      confirm: false,
      message: '設定内容を確認してください（既存の同名トリガーは再作成されます）',
      currentTriggers: currentLines,
      planned: planned,
      next: "clasp run setupTriggerHeadless --params '[true]'"
    };
    console.log('【確認モード】設定予定のトリガー:');
    planned.forEach(function(line) { console.log('  ' + line); });
    console.log('');
    console.log('実行するには以下のいずれかを使用してください:');
    console.log('  - clasp run setupTriggerHeadless --params \'[true]\'');
    console.log('  - スプレッドシートの「トリガー管理」メニュー →「トリガーを設定」');
    return result;
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
  var allTriggers = sortTriggersByConfig_(ScriptApp.getProjectTriggers());
  var targets = [];
  allTriggers.forEach(function(trigger) {
    var config = resolveConfigForTrigger_(trigger);
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
    var result = {
      confirm: false,
      message: '削除対象を確認してください',
      currentTriggers: currentLines,
      targets: targetList,
      next: "clasp run deleteTriggerHeadless --params '[true]'"
    };
    console.log('【確認モード】削除対象のトリガー:');
    targetList.forEach(function(line) { console.log('  ' + line); });
    console.log('');
    console.log('実行するには以下のいずれかを使用してください:');
    console.log('  - clasp run deleteTriggerHeadless --params \'[true]\'');
    console.log('  - スプレッドシートの「トリガー管理」メニュー →「トリガーを削除」');
    return result;
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
