import * as bip39 from 'bip39';

/**
 * 256ビット（32バイト）のランダムな鍵を生成し、
 * それを元に12単語のシードフレーズを作成します。
 */
export const generateMnemonic = (): string => {
  return bip39.generateMnemonic(); // デフォルトで128bit entropy -> 12 words
};

/**
 * シードフレーズからCryptoKeyを派生させます。
 */
export const deriveKeyFromMnemonic = async (mnemonic: string): Promise<CryptoKey> => {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('無効なシードフレーズです');
  }

  // シードフレーズからシード（バイナリ）を生成
  const seed = await bip39.mnemonicToSeed(mnemonic);
  
  // シードの最初の32バイトをAES鍵の素材として使用
  const keyMaterial = seed.slice(0, 32);

  return window.crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * データを暗号化します。
 * 返り値は base64(iv + ciphertext) です。
 */
export const encryptData = async (data: string, key: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
};

/**
 * 暗号化されたデータを復号します。
 */
export const decryptData = async (base64Data: string, key: CryptoKey): Promise<string> => {
  const binaryString = atob(base64Data);
  const combined = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    combined[i] = binaryString.charCodeAt(i);
  }

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
};

/**
 * ヘルパー：バイナリからBase64へ（デバッグ/保存用）
 */
export const bufferToBase64 = (buf: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
};

/**
 * ヘルパー：Base64からバイナリへ
 */
export const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};
