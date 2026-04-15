/**
 * triggers.js — トリガー管理
 *
 * config.js の TRIGGER_CONFIGS に定義されたトリガーを一元管理する。
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
  var trigger = builder.atHour(config.hour).create();
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
    type: config.type,
    hour: config.hour
  };
  if (config.weekDay !== undefined) {
    snapshot.weekDay = config.weekDay;
  }
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

  return { count: triggers.length, triggers: list };
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
