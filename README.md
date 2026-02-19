# NEURAL_DB v1.0 🧠🚀

**NEURAL_DB** は、Gemini AI を活用したセマンティック・ノートアプリです。テキストメモだけでなく、PDFや画像などのファイルをAIが要約し、その「意味」で検索することができます。

[🚀 Live Demo](https://dma-cmyk.github.io/neural-db/)

![Main UI](https://raw.githubusercontent.com/antigravity-ai/assets/main/neural_db_mockup.png) *(※プレースホルダー画像)*

## ✨ 主な機能

- **マルチファイル・サマリー**: PDF、画像、テキストファイルを Gemini (2.5-flash-lite) が自動要約。
- **セマンティック検索**: `text-embedding-004` モデルを使用した高性能な意味ベースの検索。単なるキーワード一致を超えた検索体験。
- **AI自動タイトル**: 内容からAIが最適なタイトルを提案。
- **APIキー・マネージャー**: 複数の Gemini API キーを保存・管理可能 (localStorage に安全に保持)。
- **ダーク・サイバーパンク UI**: コードエディタのような洗練されたデザイン。
- **エクスポート/インポート**: すべてのデータを JSON 形式でバックアップ・復元。

## 🛠 テックスタック

- **Frontend**: React (Hooks), Vite, TypeScript
- **Styling**: Tailwind CSS
- **AI/ML**: Google Gemini API (2.5-flash-lite, text-embedding-004)
- **Icons**: Lucide React

## 🚀 はじめかた

### 1. クローン
```bash
git clone https://github.com/YOUR_USERNAME/neural-db.git
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

### 4. APIキーの設定
ブラウザでアプリを開き、画面右上の設定（⚙️）から Gemini API キーを登録してください。

## 📝 使い方
1. **メモの追加**: 入力エリアにテキストを打つか、クリップアイコンからファイルをアップロード。
2. **要約の確認**: ファイルはAIが要約し、ベクトル化されます。
3. **検索**: 最上部のスキャンバーに「曖昧な記憶」や「やりたいこと」を入力して検索。
4. **エクスポート**: ダウンロードアイコンからバックアップを作成。

## 📄 ライセンス
MIT License

---
Developed by Antigravity AI
