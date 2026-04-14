# gas-examples

Google Apps Script（GAS）のサンプルコードをまとめたリポジトリです。

## このリポジトリについて

本リポジトリは、技術検証・参考用途として公開しています。
ご利用の環境や用途に応じて、内容を調整のうえご活用ください。

なお、本リポジトリはサンプルコードの公開を目的としており、
Issue・Pull Request 等による改善提案やサポート対応は行っておりません。

## サンプル一覧

各サンプルはディレクトリごとに独立しています。

| ディレクトリ | 内容 |
| --- | --- |
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

### Google Cloud の設定

#### Apps Script API の有効化

clasp を使うには Google アカウントで Apps Script API を有効にする必要があります。

1. [Apps Script 設定](https://script.google.com/home/usersettings) を開く
2. 「Google Apps Script API」を **オン** にする

#### GCP プロジェクトの API 有効化

`clasp run` やスプレッドシート連携の機能を使う場合、GCP プロジェクトで以下の API を有効にしてください。

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. 対象のプロジェクトを選択（または新規作成）
3. **API とサービス** → **有効な API とサービス** で以下を有効化:
   - Apps Script API（必須）
   - 必要に応じて以下も有効化:
     - Google Sheets API — スプレッドシート連携
     - Google Drive API — ドライブ操作
     - Gmail API — メール送信の高度な制御

#### OAuth 同意画面の設定

GAS プロジェクトと GCP プロジェクトを紐づけるには、先に OAuth 同意画面の設定が必要です。

1. [Google Cloud Console](https://console.cloud.google.com/) で対象のプロジェクトを開く
2. **API とサービス** → **OAuth 同意画面** → **OAuth の概要** を開く
3. 「Google Auth Platform はまだ構成されていません」の下の **開始** をクリック
4. 対象を選択:
   - Google Workspace ユーザー → **内部**（組織内のみ、推奨）
   - 個人 Google アカウント → **外部**（「内部」は選択不可）
5. アプリ名・ユーザーサポートメール・デベロッパー連絡先を入力して保存

> テスト段階ではスコープやテストユーザーの追加は不要です。

#### GAS プロジェクトと GCP プロジェクトの紐づけ

GAS プロジェクト側からも GCP プロジェクトを関連付ける必要があります。

1. GAS エディタを開く（スプレッドシートの「拡張機能」→「Apps Script」）
2. 左メニューの **設定**（歯車アイコン）を開く
3. 「Google Cloud Platform（GCP）プロジェクト」セクションの **プロジェクトを変更** をクリック
4. GCP のプロジェクト番号を入力して **プロジェクトを設定** をクリック

> GCP プロジェクト番号は [Google Cloud Console](https://console.cloud.google.com/) のダッシュボードで確認できます。

#### 実行可能 API としてデプロイ

`clasp run` を使用するには、事前に GAS エディタで実行可能 API としてデプロイしておく必要があります。なお、実行されるコードはデプロイされたバージョンではなく、`clasp push` によって反映された最新のスクリプト（HEAD）です。

1. GAS エディタで **デプロイ** → **新しいデプロイ** を開く
2. 種類の選択で **実行可能 API** を選択
3. 「アクセスできるユーザー」を設定 — **「自分のみ」では `clasp run` が動作しません**。Google Workspace の場合は「組織内の全員」、個人アカウントの場合は「全員」を選択してください
   > **セキュリティ補足**: 「全員」に設定しても、実際に実行できるのは OAuth 認証情報を持つユーザーのみです。未認証のリクエストは実行できないため、個人利用であれば問題ありません。完全に閉じた環境で実行したい場合は、`clasp run` ではなく GAS エディタからの手動実行をおすすめします。詳細は [Google サービスの承認（Apps Script ドキュメント）](https://developers.google.com/apps-script/guides/services/authorization?hl=ja) を参照してください。
4. **デプロイ** をクリック

> `clasp run` は dev mode で動作するため、通常の `clasp push` 後に再デプロイは不要です。ただし、`appsscript.json` のスコープを変更した場合は再デプロイが必要です。「デプロイ」→「デプロイを管理」→ 実行可能 API の編集（鉛筆アイコン）→ バージョンを「新しいバージョン」に変更 →「デプロイ」を実行してください。
>
> **ヒント**: 初回 push 後に `clasp pull` で `appsscript.json` をローカルに同期しておくと、以降の push でマニフェストの差分がなくなるため、API デプロイのバージョンを毎回更新し直す必要がなくなります。

#### OAuth クライアント ID の作成（clasp run 用）

`clasp run` を使う場合、OAuth クライアント ID の認証情報が必要です。一度作成すればリポジトリ内の全サンプルで共用できます。

1. [Google Cloud Console](https://console.cloud.google.com/) → **API とサービス** → **認証情報**
2. **認証情報を作成** → **OAuth クライアント ID**
3. アプリケーションの種類: **デスクトップ アプリ**
4. 作成後、JSON をダウンロードしてリポジトリルートの `key/` ディレクトリに配置

各サンプルディレクトリで使用する際は、`key/` のファイルを `creds.json` としてコピーしてください。

```bash
cp ../key/<ダウンロードしたファイル名>.json creds.json
clasp login --creds creds.json
```

> **セキュリティ注意**: `key/` および `creds.json` には OAuth クライアントシークレットが含まれます。
>
> - Git にコミットしない（`.gitignore` に追加済み）
> - GAS にアップロードしない（`.claspignore` に追加済み）
> - 共有フォルダやパブリックな場所に置かない
> - 不要になったら GCP コンソールの「認証情報」から削除する

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

## Author

[杉岡システム株式会社](https://www.sugiokasystem.co.jp)
[公式ブログ](https://www.sugiokasystem.co.jp/blog)の記事に関連するサンプルコードを公開しています。

[Sugioka System Co., Ltd.](https://www.sugiokasystem.co.jp)
Sample code repository for articles on our [official blog](https://www.sugiokasystem.co.jp/blog).

※本リポジトリは執筆担当者のGitHubアカウントにて公開しています。
