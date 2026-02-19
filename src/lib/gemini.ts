/**
 * Gemini APIを使用してテキストのエンベディングを取得します。
 */
export const getEmbedding = async (text: string, apiKeyToUse: string, retryCount = 0): Promise<number[]> => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  try {
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
  } catch (error) {
    if (retryCount < 5) {
      await new Promise(resolve => setTimeout(resolve, delays[retryCount]));
      return getEmbedding(text, apiKeyToUse, retryCount + 1);
    }
    throw error;
  }
};

/**
 * Gemini APIを使用してファイルを要約します。
 */
export const summarizeFile = async (
  fileData: string, // Base64 strings for binary, text for plain text
  mimeType: string,
  apiKeyToUse: string
): Promise<string> => {
  try {
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKeyToUse}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Summarization failed:', error);
    throw error;
  }
};

/**
 * Gemini APIを使用してテキストからタイトルを生成します。
 */
export const generateTitle = async (text: string, apiKeyToUse: string): Promise<string> => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKeyToUse}`, {
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
    return data.candidates[0].content.parts[0].text.trim().replace(/^「|」$/g, '');
  } catch (error) {
    console.error('Title generation failed:', error);
    return "無題のメモ";
  }
};
