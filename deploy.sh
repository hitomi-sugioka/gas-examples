#!/bin/bash
#
# deploy.sh - Git情報付きで clasp push + deploy を実行する
#
# 使い方（リポジトリルートから実行）:
#   ./deploy.sh invoice-notification
#
# 各プロジェクト内から実行する場合:
#   ../deploy.sh .
#
# デプロイ説明の形式:
#   main@abc1234 2026-04-13 10:30 コミットメッセージ
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 引数チェック
if [ -z "$1" ]; then
  echo "使い方: ./deploy.sh <プロジェクトディレクトリ>"
  echo "例:     ./deploy.sh invoice-notification"
  exit 1
fi

# 対象ディレクトリの解決
TARGET_DIR="$(cd "$1" 2>/dev/null && pwd)" || {
  echo "エラー: ディレクトリ '$1' が見つかりません"
  exit 1
}

# .clasp.json の存在チェック
if [ ! -f "$TARGET_DIR/.clasp.json" ]; then
  echo "エラー: $TARGET_DIR/.clasp.json が見つかりません"
  exit 1
fi

# Git情報の取得（リポジトリルートから）
cd "$SCRIPT_DIR"
HASH=$(git rev-parse --short HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
DATE=$(date +"%Y-%m-%d %H:%M")
MSG=$(git log -1 --pretty=%s | cut -c1-60)

DESC="${BRANCH}@${HASH} ${DATE} ${MSG}"

PROJECT_NAME=$(basename "$TARGET_DIR")

echo "==============================="
echo "  プロジェクト: $PROJECT_NAME"
echo "  デプロイ説明: $DESC"
echo "==============================="

# 対象ディレクトリで実行
cd "$TARGET_DIR"

# push
echo ""
echo ">>> clasp push"
npx clasp push

# deploy
echo ""
echo ">>> clasp deploy"
npx clasp deploy -d "$DESC"

echo ""
echo "デプロイ完了: $PROJECT_NAME"
echo "  $DESC"
