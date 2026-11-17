# CLAUDE.md
 ## システム概要

  ### アプリの目的
  プログラミング初学者が実装前に問題構造を自ら言語化・整理する思考過程を支援する対話型学習支援システム。

  生成AIは解答やコードを一切提示せず、問題の「入力」「出力」「処理手順」について段階的に問い返すことで、学習者が自力で問題構造を整理できるよう促す。

  ### 対象ユーザー
  - プログラミング入門段階の大学生
  - if文・for文などの基本構文は理解している
  - 問題文からコードへの変換手順が思いつかない段階の学習者

  ### やらないこと（設計上の制約）
  - コードの生成・提示
  - 解答の直接提示
  - 特定の解法への誘導

 ## 技術スタック
 
  - **フレームワーク**: Next.js (App Router) + TypeScript
  - **API**: OpenAI API (`openai`)
  - **スタイリング**: Tailwind CSS
  - **状態管理**: React useState（セッション内のみ、永続化なし）
  - **DB**: なし（プロトタイプのためローカル動作のみ）
　
  ## プロジェクト構成

  src/
  ├── app/
  │   ├── page.tsx          # メイン画面（対話UI）
  │   └── api/
  │       └── chat/
  │           └── route.ts  # Claude APIとの通信
  ├── components/
  │   ├── ChatWindow.tsx    # 対話表示エリア
  │   └── InputForm.tsx     # 学習者の入力フォーム
  └── lib/
      ├── prompt.ts         # Phase 0〜5のプロンプト定義
      └── types.ts          # 型定義

  ## 環境変数

  OPENAI_API_KEY=your_api_key_here`.env.local`に記載し、Gitにはコミットしない。

  ## コーディング規約

  ### 基本方針
  - 型定義は省略せず、`any`は使わない
  - 作業は必ずmainブランチ以外で行う

  ### TypeScript
  - `strict: true` を維持する
  - 型は`types.ts`に集約する
  - `interface`よりも`type`を優先する

  ### 命名規則
  - コンポーネント: PascalCase（例: `ChatWindow.tsx`）
  - 関数・変数: camelCase（例: `sendMessage`）
  - 定数: UPPER_SNAKE_CASE（例: `MAX_RETRY_COUNT`）
  - CSSクラス: Tailwindのユーティリティクラスを使用

  ### コンポーネント
  - 1ファイル1コンポーネントを原則とする
  - Propsの型は明示的に定義する

  ```typescript
  type ChatWindowProps = {
    messages: Message[]
    onSend: (text: string) => void
  }
 
 ### APIルート
  - Claude APIの呼び出しは必ずsrc/app/api/以下で行う
  - APIキーをクライアントサイドに露出させない

 ### コメント

  - コメント、コミットメッセージは日本語で書く

 ### エラーハンドリング

  - API通信のエラーは必ずcatchしユーザーに通知する
  - console.errorはデバッグ用途のみ

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
