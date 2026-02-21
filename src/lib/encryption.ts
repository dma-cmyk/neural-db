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
  // 文字列のトリムと、連続する空白の正規化
  const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');

  if (!bip39.validateMnemonic(normalizedMnemonic)) {
    throw new Error('無効なシードフレーズです');
  }

  // シードフレーズからシード（バイナリ）を生成
  const seed = await bip39.mnemonicToSeed(normalizedMnemonic);
  
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
 * シードフレーズから一意の Vault ID を派生させます（SHA-256）。
 * これにより、ストレージをユーザーごとに分離できます。
 */
export const deriveVaultId = async (mnemonic: string): Promise<string> => {
  const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedMnemonic);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16); // 最初の16文字を使用
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

/**
 * 生体認証（WebAuthn）を登録します。
 * 現状のブラウザ環境では、mnemonicを暗号化してlocalStorageに保存し、
 * 生体認証の成功を持ってその値を「取り出せる」ようにするラッパーとして機能します。
 */
export const registerBiometric = async (mnemonic: string, vaultId: string, displayName?: string): Promise<void> => {
  if (!window.PublicKeyCredential) {
    throw new Error('このブラウザは生体認証をサポートしていません');
  }

  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const userID = window.crypto.getRandomValues(new Uint8Array(16));

  const creationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "Neural DB",
      id: window.location.hostname || "localhost",
    },
    user: {
      id: userID,
      name: displayName || `user-${vaultId}`,
      displayName: displayName || `Neural User (${vaultId.slice(0, 4)})`,
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "required",
      requireResidentKey: true,
    },
    timeout: 60000,
    attestation: "none",
  };

  const credential = await navigator.credentials.create({
    publicKey: creationOptions,
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('認証資格情報の作成に失敗しました');
  }

  // 資格情報IDを保存
  localStorage.setItem(`biometric_cred_${vaultId}`, bufferToBase64(credential.rawId));
  
  // MnemonicをVault IDと紐づけて（簡易的に）保存
  // ※より高度なセキュリティが必要な場合は、ここで独自に暗号化を行う
  localStorage.setItem(`biometric_data_${vaultId}`, mnemonic);
};

/**
 * 生体認証を実行し、保存されているシードフレーズを返します。
 * vaultIds が渡された場合、それらすべてを照合対象（allowCredentials）にします。
 */
export const authenticateBiometric = async (vaultIds?: string[]): Promise<{ mnemonic: string, vaultId: string }> => {
  if (!vaultIds || vaultIds.length === 0) {
    // 完全にID指定なし（Discoverable Credentials）での取得を試みる
    return await authenticateDiscoverable();
  }

  const allowCredentials = vaultIds.map(id => {
    const credIdBase64 = localStorage.getItem(`biometric_cred_${id}`);
    if (!credIdBase64) return null;
    return {
      id: base64ToBuffer(credIdBase64),
      type: 'public-key' as const,
    };
  }).filter((c): c is { id: ArrayBuffer, type: 'public-key' } => c !== null);

  if (allowCredentials.length === 0) {
    throw new Error('生体認証可能なユーザーが見つかりません');
  }

  const challenge = window.crypto.getRandomValues(new Uint8Array(32));

  const assertionOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials,
    userVerification: "required",
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: assertionOptions,
  }) as PublicKeyCredential;

  if (!assertion) {
    throw new Error('生体認証に失敗しました');
  }

  // 認証された Credential ID から、対応する vaultId を特定する
  const authenticatedBase64 = bufferToBase64(assertion.rawId);
  const matchedVaultId = vaultIds.find(id => localStorage.getItem(`biometric_cred_${id}`) === authenticatedBase64);

  if (!matchedVaultId) {
    throw new Error('認証に成功しましたが、対応するVaultが見つかりません');
  }

  const mnemonic = localStorage.getItem(`biometric_data_${matchedVaultId}`);
  if (!mnemonic) throw new Error('シードフレーズの復元に失敗しました');

  return { mnemonic, vaultId: matchedVaultId };
};

/**
 * ID指定なしで生体認証（Discoverable Credentials）を実行します。
 */
const authenticateDiscoverable = async (): Promise<{ mnemonic: string, vaultId: string }> => {
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  
  const assertionOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    userVerification: "required",
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: assertionOptions,
  }) as PublicKeyCredential;

  if (!assertion) throw new Error('認証に失敗しました');

  const authenticatedBase64 = bufferToBase64(assertion.rawId);
  
  // localStorage 内を全検索して一致する vaultId を探す
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('biometric_cred_')) {
      if (localStorage.getItem(key) === authenticatedBase64) {
        const vaultId = key.replace('biometric_cred_', '');
        const mnemonic = localStorage.getItem(`biometric_data_${vaultId}`);
        if (mnemonic) return { mnemonic, vaultId };
      }
    }
  }

  throw new Error('未知の認証情報です');
};

/**
 * 生体認証が利用可能かチェックします。
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) return false;
  return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
};
