# 日本牛個体識別番号検索API サービス仕様書・設計書

## 1. 要件定義書

### 1.1 目的
日本の牛の個体識別番号から、その牛の履歴情報（出生、種別、異動履歴など）を取得し、JSON形式で提供するWebサービスを構築する。

### 1.2 ターゲットユーザー
- 牛の履歴情報をプログラムから自動取得したい開発者
- 個体識別番号から素早く情報を確認したいユーザー

### 1.3 機能要件
- **個体識別番号検索機能**: 10桁の個体識別番号を入力として受け取り、家畜改良センター（NLBC）のサイトをスクレイピングして情報を取得する。
- **JSONレスポンス**: 取得した情報を構造化されたJSON形式で返す。
- **バリデーション**: 入力された番号が正しい形式（9〜10桁の数字）であることを確認する。
- **エラーハンドリング**: 該当なし、ネットワークエラー、NLBC側のメンテナンス等のエラーを適切に返す。

### 1.4 非機能要件
- **プラットフォーム**: Supabase Edge Functions (Deno/TypeScript)
- **レスポンス速度**: NLBCのサイトの応答速度に依存するが、可能な限り効率的にパースを行う。
- **保守性**: TypeScriptによる型定義を行い、コードの品質を維持する。

---

## 2. 基本設計書

### 2.1 システム構成
- **Client**: APIを呼び出すアプリケーション
- **API Server**: Supabase Edge Functions (TypeScript)
- **External System**: 家畜改良センター (NLBC) 個体識別情報検索サービス

### 2.2 APIエンドポイント
- **URL**: `/search`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "id": "1234567890"
  }
  ```
- **Response Body (Success)**:
  ```json
  {
    "status": "success",
    "data": {
      "cattleInfo": {
        "individualId": "1234567890",
        "birthDate": "2023-01-01",
        "sex": "雌",
        "motherId": "0987654321",
        "breed": "黒毛和種",
        "importDate": null,
        "importCountry": null
      },
      "history": [
        {
          "event": "出生",
          "date": "2023-01-01",
          "prefecture": "北海道",
          "city": "帯広市",
          "name": "〇〇牧場"
        }
      ]
    }
  }
  ```

### 2.3 データモデル
- `CattleInfo`: 牛の基本情報
- `HistoryItem`: 異動履歴の1項目

---

## 3. 詳細設計書

### 3.1 処理フロー
1. **リクエスト受信**: POSTリクエストから `id` を取得。
2. **バリデーション**:
   - 数字のみかチェック。
   - 9桁の場合は先頭に `0` を付与して10桁にする。
   - 10桁でない場合はエラー。
3. **NLBCアクセス (Step 1: 同意)**:
   - `https://www.id.nlbc.go.jp/CattleSearch/search/agreement` にアクセス。
   - 同意ボタン（`method:goSearch.x`）をシミュレートしてPOST。
   - セッション（Cookie）を維持。
4. **NLBCアクセス (Step 2: 検索)**:
   - 検索ページで `txtIDNO` に個体識別番号をセット。
   - 検索ボタン（`method:doSearch.x`）をシミュレートしてPOST。
5. **パース**:
   - レスポンスHTMLから `table` 要素を抽出。
   - 1つ目のテーブルから牛の基本情報を抽出。
   - 2つ目のテーブルから異動履歴を抽出。
6. **レスポンス返却**: JSON形式でクライアントに返す。

### 3.2 使用ライブラリ
- `deno_dom`: HTMLのパースに使用。
- `fetch`: HTTPリクエストに使用（Cookieの管理が必要）。

### 3.3 エラーコード
- `INVALID_ID`: 個体識別番号の形式が不正。
- `NOT_FOUND`: 該当する牛が見つからない。
- `EXTERNAL_ERROR`: NLBCサイトへのアクセス失敗。
