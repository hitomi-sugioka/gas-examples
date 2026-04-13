# gas-examples

Google Apps Script (GAS) サンプルコード集です。

## サンプル一覧

| ディレクトリ | 内容 |
|---|---|
| [invoice-notification](./invoice-notification/) | スプレッドシートの請求予定日が近づくと自動で通知メールを送信 |

## 開発環境

各サンプルは [clasp](https://github.com/google/clasp) を使ってローカルで編集し、GAS プロジェクトに反映するワークフローを前提としています。

動作確認環境:

- WSL2 (Ubuntu)
- Node.js v20 以上
- npm

### Node.js のインストール（WSL2）

WSL2 上では [nvm](https://github.com/nvm-sh/nvm) 経由で Node.js を導入するのが簡単です。

```bash
# nvm をインストール
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# シェルを再読み込み
source ~/.bashrc

# Node.js をインストール
nvm install 20

# バージョン確認
node -v  # v20.x.x
npm -v
```

### clasp のセットアップ

```bash
# clasp をグローバルインストール（未導入の場合）
npm install -g @google/clasp

# clasp にログイン（WSL2 でも標準の localhost リダイレクトで動作します）
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

```text
main@abc1234 2026-04-13 10:30 コミットメッセージ
```

Apps Script のバージョン管理画面からどのコミットに対応するかを特定でき、運用時のトラブルシューティングに役立ちます。
