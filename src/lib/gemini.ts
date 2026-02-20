/**
 * Gemini APIを使用してテキストのエンベディングを取得します。
 * エンベディングモデルは gemini-embedding-001 に固定します。
 */
const DELAYS = [1000, 2000, 4000, 8000, 16000];

/**
 * 指数バックオフを用いたリトライ実行ヘルパー
 */
const withRetry = async <T>(fn: () => Promise<T>, retryCount = 0): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retryCount < 5 && (error.message.includes('429') || error.message.includes('500') || error.message.includes('503'))) {
      await new Promise(resolve => setTimeout(resolve, DELAYS[retryCount]));
      return withRetry(fn, retryCount + 1);
    }
    throw error;
  }
};

/**
 * Gemini APIを使用してテキストのエンベディングを取得します。
 */
export const getEmbedding = async (text: string, apiKeyToUse: string): Promise<number[]> => {
  return withRetry(async () => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKeyToUse}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] }
      })
    });
    
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    const data = await response.json();
    if (!data.embedding || !data.embedding.values) throw new Error('エンベディングの取得に失敗しました');
    
    return data.embedding.values;
  });
};

/**
 * Gemini APIを使用して複数のテキストのエンベディングを一括取得します (Batch API)。
 */
export const batchGetEmbeddings = async (texts: string[], apiKeyToUse: string): Promise<number[][]> => {
  if (texts.length === 0) return [];
  
  return withRetry(async () => {
    const requests = texts.map(text => ({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] }
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKeyToUse}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });
    
    if (!response.ok) throw new Error(`Batch API Error: ${response.status}`);
    
    const data = await response.json();
    if (!data.embeddings) throw new Error('一括エンベディングの取得に失敗しました');
    
    return data.embeddings.map((e: any) => e.values);
  });
};

/**
 * Gemini APIを使用してファイルを要約します。
 */
export const summarizeFile = async (
  fileData: string, // Base64 strings for binary, text for plain text
  mimeType: string,
  apiKeyToUse: string,
  modelId: string = 'gemini-2.5-flash-lite'
): Promise<string> => {
  return withRetry(async () => {
    const isText = mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript';
    
    const body = isText 
      ? {
          contents: [{
            parts: [
              { text: "以下のファイルを要約してください。重要な情報を箇条書きで抽出してください。\n\n" },
              { text: fileData }
            ]
          }]
        }
      : {
          contents: [{
            parts: [
              { text: "このファイルを要約してください。" },
              { inline_data: { mime_type: mimeType, data: fileData } }
            ]
          }]
        };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKeyToUse}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('要約の生成に失敗しました（コンテンツが空です）');
    }
    return data.candidates[0].content.parts[0].text;
  });
};

/**
 * Gemini APIを使用してテキストからタイトルを生成します。
 */
export const generateTitle = async (
  text: string, 
  apiKeyToUse: string,
  modelId: string = 'gemini-2.5-flash-lite'
): Promise<string> => {
  return withRetry(async () => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKeyToUse}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `以下の内容にふさわしい短く、カッコいい、日本語のタイトルを1つだけ生成してください。記号などは不要です。最大10文字程度でお願いします。:\n\n${text}` }]
        }]
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('タイトルの生成に失敗しました');
    }
    return data.candidates[0].content.parts[0].text.trim().replace(/^「|」$/g, '');
  });
};

/**
 * Gemini APIを使用してテキストからタグ（キーワード）を生成します。
 */
export const generateTags = async (
  text: string,
  apiKeyToUse: string,
  modelId: string = 'gemini-2.5-flash-lite'
): Promise<string[]> => {
  return withRetry(async () => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKeyToUse}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `以下の内容から重要かつ汎用的なキーワードを3個から5個抽出してください。
結果はカンマ区切りの文字列だけで返してください（例: AI, 宇宙, 技術）。
他の説明や文章は一切不要です:\n\n${text}` }]
        }]
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('タグの生成に失敗しました');
    }
    
    return resultText.split(/[,、|]/)
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0 && t.length < 15)
      .slice(0, 5);
  });
};

/**
 * Gemini APIを使用してユーザーの指示に従ってテキストを編集します。
 */
export const editNoteWithAI = async (
  text: string,
  instruction: string,
  apiKeyToUse: string,
  modelId: string = 'gemini-2.0-flash-lite'
): Promise<string> => {
  return withRetry(async () => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKeyToUse}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `あなたは高度なテキストエディタAIです。
以下の「対象テキスト」を、ユーザーの「指示」に従って編集してください。
出力は編集後のテキストのみを返し、解説や挨拶などは一切含めないでください。
マークダウン形式は維持、または指示があれば適切に適用してください。

対象テキスト:
${text}

ユーザーの指示:
${instruction}` }]
        }]
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('編集に失敗しました');
    }
    return data.candidates[0].content.parts[0].text.trim();
  });
};
