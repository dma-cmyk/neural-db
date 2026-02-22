# NEURAL_DB v1.0 🧠🚀

**NEURAL_DB** は、Gemini AI を活用したセマンティック・ノートアプリです。テキストメモだけでなく、PDFや画像などのファイルをAIが要約し、その「意味」で検索することができます。プライバシーとセキュリティを最優先し、ローカルファーストで動作します。

[🚀 Live Demo](https://dma-cmyk.github.io/neural-db/)

![Main UI](https://raw.githubusercontent.com/antigravity-ai/assets/main/neural_db_mockup.png) *(※プレースホルダー画像)*

## ✨ 主な機能

- **マルチファイル・サマリー**: PDF、画像、テキストファイルを Gemini API が自動要約。
- **セマンティック検索**: `gemini-embedding-001` モデルを使用した高性能な意味ベースの検索。
- **AIアシスト**: 
  - **自動タイトル & タグ**: 内容からAIが最適なタイトルと3〜5個のタグを提案。
  - **AIスマート編集**: 指示を送るだけでAIがメモをリライト。差分表示（Diff）機能付き。
- **高度なセキュリティ**:
  - **Mnemonic-First**: 12単語のシードフレーズによる秘密鍵管理。
  - **エンドツーエンド暗号化**: AES-256によるローカルデータの堅牢な保護。
  - **生体認証ログイン**: 再ログイン時に TouchID や FaceID を利用可能。
  - **マルチVault**: シードフレーズごとに独立したデータ領域を保持。
- **リッチなUI/UX**: 
  - **ダーク・サイバーパンク UI**: コードエディタのような洗練されたデザイン。
  - **Focus Mode**: 執筆に集中できる全画面エディタ。
  - **Neural Link**: URLから自動的にメタデータを取得し、リッチなプレビューを表示。
  - **Tag Cloud**: タグによる視覚的なフィルタリング。
- **Progressive Web App (PWA)**: デスクトップやスマホにアプリとしてインストール可能。
- **エクスポート/インポート**: すべてのデータを JSON 形式でバックアップ・復元。

## 🛠 テックスタック

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS
- **Cryptography**: Web Crypto API (AES-GCM, PBKDF2), bip39
- **AI/ML**: Google Gemini API
  - **Embeddings**: `gemini-embedding-001`
  - **Processing**: `gemini-2.5-flash-lite`, `gemini-2.0-flash-lite` etc.
- **Icons**: Lucide React
- **PWA**: vite-plugin-pwa

## 🚀 はじめかた

### 1. クローン
```bash
git clone https://github.com/dma-cmyk/neural-db.git
cd neural-db
```

### 2. インストール
```bash
npm install
```

### 3. 起動
```bash
npm run dev
```

### 4. ビルド & デプロイ
```bash
npm run build   # ビルド
npm run deploy  # GitHub Pagesへのデプロイ
```

## 📝 使い方
1. **初期設定**: 12単語のシードフレーズを生成または入力して Vault を作成します。
2. **APIキーの設定**: 画面右上の設定（⚙️）から Gemini API キーを登録してください。
3. **メモの追加**: 入力エリアにテキストを打つか、クリップアイコンからファイルをアップロード（またはペースト）。
4. **検索**: 最上部のスキャンバーに「曖昧な記憶」や「関連する概念」を入力して検索。
5. **AI編集**: エディタで「AI」ボタンを押し、指示（例：「箇条書きにして」）を入力。

## 📄 ライセンス
MIT License

---
Developed by Antigravity AI
