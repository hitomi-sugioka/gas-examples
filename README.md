# gas-examples

Google Apps Script (GAS) サンプルコード集です。

## サンプル一覧

| ディレクトリ | 内容 |
|---|---|
| [invoice-notification](./invoice-notification/) | スプレッドシートの請求予定日が近づくと自動で通知メールを送信 |

## 開発環境

各サンプルは [clasp](https://github.com/google/clasp) を使ってローカルで編集し、GAS プロジェクトに反映するワークフローを前提としています。

### セットアップ

```bash
# clasp をグローバルインストール（未導入の場合）
npm install -g @google/clasp

# clasp にログイン
clasp login

# サンプルディレクトリに移動して依存関係をインストール
cd invoice-notification
npm install
```

### デプロイ

ルートの `deploy.sh` を使うと、Git のコミット情報を自動でデプロイ説明に付与できます。

```bash
./deploy.sh invoice-notification
```

デプロイ説明の形式:

```
main@abc1234 2026-04-13 10:30 コミットメッセージ
```

Apps Script のバージョン管理画面からどのコミットに対応するかを特定でき、運用時のトラブルシューティングに役立ちます。
