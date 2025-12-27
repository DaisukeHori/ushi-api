# 日本牛個体識別番号検索API (Supabase Edge Functions)

このプロジェクトは、日本の牛の個体識別番号から履歴情報を取得するAPIサービスです。
既存のR言語による実装を分析し、TypeScript (Deno) で再実装しました。

## 構成

- `docs/design.md`: 要件定義・設計書
- `supabase/functions/cattle-search/index.ts`: API本体 (Supabase Edge Function)
- `test_node.js`: ローカル検証用Node.jsスクリプト

## 使い方

### ローカルでの検証 (Node.js)

1. 依存関係のインストール:
   ```bash
   npm install axios cheerio
   ```

2. スクリプトの実行:
   ```bash
   node test_node.js [個体識別番号]
   ```
   例: `node test_node.js 1083079037`

### Supabase Edge Functions へのデプロイ

1. Supabase CLIがインストールされていることを確認してください。
2. プロジェクトを初期化 (済):
   ```bash
   supabase init
   ```
3. デプロイ:
   ```bash
   supabase functions deploy cattle-search
   ```

### APIの使用方法

- **Endpoint**: `POST /functions/v1/cattle-search`
- **Body**:
  ```json
  {
    "id": "1083079037"
  }
  ```

## 実装のポイント

- **セッション維持**: NLBCサイトの仕様に合わせ、同意ページから検索ページまでのセッション（Cookie）とCSRFトークンを適切に管理しています。
- **バリデーション**: 入力されたIDが9桁または10桁の数字であることを確認し、必要に応じて0埋めを行います。
- **パース処理**: `cheerio` を使用してHTMLから牛の基本情報と異動履歴を正確に抽出します。
