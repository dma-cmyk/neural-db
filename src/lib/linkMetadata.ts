/**
 * URLを検知し、メタデータ（タイトル、説明文等）を取得するためのユーティリティ
 */

export interface LinkMetadata {
  url: string;
  title: string | null;
  description: string | null;
  status: 'loading' | 'success' | 'failed';
}

const CORS_PROXY = 'https://api.allorigins.win/get?url=';

/**
 * テキストからURLを抽出します
 */
export const extractUrls = (text: string): string[] => {
  // markdownの [text](url) 形式からURLを抽出、または生のURLを抽出
  // 末尾の閉じカッコやカンマを巻き込まないように調整
  const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/g;
  const matches = text.match(urlRegex);
  if (!matches) return [];

  return Array.from(new Set(matches.map(url => {
    // 末尾の記号（ markdownの ) や末尾の . , ! ? など）を削除
    return url.replace(/[),.!?;:>]+$/, '');
  })));
};

/**
 * 指定されたURLのメタデータを取得します
 */
export const fetchLinkMetadata = async (url: string): Promise<LinkMetadata> => {
  try {
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) throw new Error('Proxy error');
    
    const data = await response.json();
    const html = data.contents;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const title = doc.querySelector('title')?.innerText || 
                  doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                  null;
                  
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                        doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                        null;
                        
    return {
      url,
      title: title ? title.trim() : null,
      description: description ? description.trim() : null,
      status: 'success'
    };
  } catch (error) {
    console.error(`Failed to fetch metadata for ${url}:`, error);
    return {
      url,
      title: null,
      description: null,
      status: 'failed'
    };
  }
};
