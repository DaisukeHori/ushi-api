# 🐄 日本牛個体識別番号検索 API (ushi-api)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)

日本の家畜改良センター（NLBC）が提供する「牛の個体識別情報検索サービス」をラップし、個体識別番号から牛の履歴情報をJSON形式で取得できるAPIサービスです。

既存のR言語による実装をベースに、モダンなTypeScript環境で再構築されました。

## ✨ 特徴

- **JSONレスポンス**: スクレイピングしたHTMLを構造化されたJSON形式で返却します。
- **セッション管理**: 同意ページから検索ページまでの複雑なセッションとCSRFトークンを自動で処理します。
- **バリデーション**: 9〜10桁の個体識別番号を適切にバリデーションし、必要に応じて0埋めを行います。
- **マルチプラットフォーム**: Supabase Edge Functions (Deno) と Node.js (Express) の両方で動作します。

## 🛠 技術スタック

- **Language**: TypeScript
- **Runtime**: Deno (Supabase Edge Functions) / Node.js
- **Libraries**:
  - `cheerio`: HTMLパース
  - `axios`: HTTPクライアント (Node.js)
  - `express`: ローカルサーバー (Node.js)

## 🚀 クイックスタート (ローカル環境)

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ローカルサーバーの起動

```bash
npm start
```

サーバーが `http://localhost:3000` で起動します。

### 3. APIのテスト

別のターミナルから `curl` でリクエストを送信します。

```bash
curl -X POST -H "Content-Type: application/json" -d '{"id": "1400786426"}' http://localhost:3000/search
```

## 📖 API 仕様

### 個体識別番号検索

- **URL**: `/search`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### リクエストボディ

| パラメータ | 型 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | `string` | ✅ | 10桁（または9桁）の個体識別番号 |

#### レスポンス (成功時)

```json
{
  "status": "success",
  "data": {
    "cattleInfo": {
      "individualId": "1400786426",
      "birthDate": "2023.01.08",
      "sex": "メス",
      "motherId": "1354357024",
      "breed": "黒毛和種",
      "importDate": null,
      "importCountry": null
    },
    "history": [
      {
        "event": "出生",
        "date": "2023.01.08",
        "prefecture": "秋田県",
        "city": "横手市",
        "name": "（農）ビクトリーファーム　夏美沢農場"
      },
      ...
    ]
  }
}
```

## ☁️ デプロイ (Supabase Edge Functions)

Supabase CLIを使用して、以下のコマンドでデプロイできます。

```bash
supabase functions deploy cattle-search --no-verify-jwt
```

## 📂 ディレクトリ構造

- `supabase/functions/cattle-search/index.ts`: Supabase Edge Functions 用のメインロジック
- `local_server.js`: Node.js/Express を使用したローカル開発用サーバー
- `test_node.js`: CLIから動作確認するためのスクリプト
- `docs/design.md`: 要件定義・基本設計書

## ⚖️ ライセンス

MIT License

## ⚠️ 免責事項

本ツールは家畜改良センター（NLBC）の公開情報を取得するものですが、NLBCの利用規約を遵守して使用してください。過度なリクエスト送信は控え、自己責任で利用してください。
