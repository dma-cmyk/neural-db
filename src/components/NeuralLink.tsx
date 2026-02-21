import React, { useState, useEffect } from 'react';
import { Fingerprint, Clipboard, ShieldAlert, Key, Zap, Check, X, ShieldCheck, Download, Camera, Plus, ChevronLeft, Edit3 } from 'lucide-react';
import { generateMnemonic, authenticateBiometric, isBiometricAvailable, registerBiometric, deriveVaultId } from '../lib/encryption';
import { generateUniqueName } from '../lib/naming';

interface UserProfile {
  vaultId: string;
  name: string;
  lastActive: string;
}

interface NeuralLinkProps {
  onUnlock: (mnemonic: string) => void;
  isInitialSetup: boolean;
  profiles: UserProfile[];
}

/**
 * 認証・暗号鍵管理を行うSFチックなUIコンポーネント
 */
export const NeuralLink: React.FC<NeuralLinkProps> = ({ onUnlock, isInitialSetup, profiles }) => {
  const [mode, setMode] = useState<'home' | 'auth_selection' | 'mnemonic' | 'biometric' | 'profile_list'>(
    profiles.length > 0 ? 'profile_list' : 'home'
  );
  const [mnemonic, setMnemonic] = useState('');
  const [profileName, setProfileName] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [error, setError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(() => {
    if (profiles.length === 1) return profiles[0];
    return null;
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // セットアップ時または新規登録時のシード生成
  useEffect(() => {
    if ((isInitialSetup || isRegistering) && !generatedMnemonic) {
      setGeneratedMnemonic(generateMnemonic());
    }
  }, [isInitialSetup, isRegistering, generatedMnemonic]);


  // モードが生体認証になったら即座に開始
  useEffect(() => {
    if (mode === 'biometric' && !isVerifying) {
      handleBiometricAuth();
    }
  }, [mode]);

  const handleBiometricAuth = async () => {
    if (isVerifying) return; // 二重呼び出し防止
    setIsVerifying(true);
    setError('');

    try {
      // 選択済みのプロファイルがあればそのIDのみ、なければ全VaultのIDを渡す
      const vaultIds = selectedProfile ? [selectedProfile.vaultId] : profiles.map(p => p.vaultId);
      const { mnemonic: recoveredMnemonic, vaultId } = await authenticateBiometric(vaultIds);
      
      // プロファイルが見つかった場合は選択状態を更新
      const matchedProfile = profiles.find(p => p.vaultId === vaultId);
      if (matchedProfile) setSelectedProfile(matchedProfile);
      
      onUnlock(recoveredMnemonic);
    } catch (err: any) {
      console.error('Biometric auth failed:', err);
      setError(err.message || '認証に失敗しました');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleMnemonicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mnemonic.trim().split(/\s+/).length !== 12) {
      setError('12単語を入力してください');
      return;
    }
    onUnlock(mnemonic.trim());
  };

  /**
   * セットアップ完了処理
   */
  const handleSetupComplete = async () => {
    if (!generatedMnemonic) return;
    
    setIsVerifying(true);
    setError('');
    
    try {
      const vaultId = await deriveVaultId(generatedMnemonic);
      const finalName = profileName.trim() || generateUniqueName(profiles.map(p => p.name));
      
      // プロファイル作成
      const newProfile: UserProfile = {
        vaultId,
        name: finalName,
        lastActive: new Date().toISOString()
      };
      
      const updatedProfiles = [...profiles, newProfile];
      localStorage.setItem('neural_db_profiles', JSON.stringify(updatedProfiles));
      
      // 成功したら即座にアンロック（生体認証登録は後で行うことも可能）
      onUnlock(generatedMnemonic);
    } catch (err: any) {
      console.error('Setup failed:', err);
      setError(err.message || '初期化に失敗しました');
    } finally {
      setIsVerifying(false);
    }
  };

  const renderHome = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
      <div className="text-center mb-8">
        <div className="inline-block p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-4 relative group">
          <ShieldAlert className="w-12 h-12 text-cyan-400 group-hover:scale-110 transition-transform" />
          <div className="absolute inset-0 border border-cyan-400 rounded-full animate-ping opacity-20"></div>
        </div>
        <h2 className="text-xl font-mono text-cyan-100 tracking-[0.2em] font-bold uppercase">
          Neural_Link
        </h2>
        <p className="text-[0.6rem] text-cyan-700 tracking-widest mt-2 uppercase">
          認証プロトコル起動中
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => {
            setIsRegistering(true);
            setMode('mnemonic');
          }}
          className="group relative flex items-center justify-between p-5 bg-zinc-900 border border-cyan-900/50 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all overflow-hidden"
        >
          <div className="flex items-center gap-4 z-10">
            <Plus className="w-5 h-5 text-fuchsia-500" />
            <div className="text-left">
              <div className="text-[0.7rem] font-bold text-cyan-100 uppercase tracking-widest">新規リンク初期化</div>
              <div className="text-[0.55rem] text-zinc-600">新しい識別子 / Vaultを作成</div>
            </div>
          </div>
          <Zap className="w-4 h-4 text-cyan-900 group-hover:text-fuchsia-400 transition-colors" />
        </button>

        <button
          onClick={() => {
            setIsRegistering(false);
            if (profiles.length > 0) {
              setMode('profile_list');
            } else {
              setMode('mnemonic');
            }
          }}
          className="group relative flex items-center justify-between p-5 bg-zinc-900 border border-cyan-900/50 hover:border-cyan-400 hover:bg-cyan-500/5 transition-all overflow-hidden"
        >
          <div className="flex items-center gap-4 z-10">
            <Key className="w-5 h-5 text-cyan-500" />
            <div className="text-left">
              <div className="text-[0.7rem] font-bold text-cyan-100 uppercase tracking-widest">既存リンクへアクセス</div>
              <div className="text-[0.55rem] text-zinc-600">あなたの隔離領域へログイン</div>
            </div>
          </div>
          <Zap className="w-4 h-4 text-cyan-900 group-hover:text-cyan-400 transition-colors" />
        </button>
      </div>
    </div>
  );

  const renderProfileList = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 mb-4 cursor-pointer hover:text-cyan-300 transition-colors text-cyan-700" onClick={() => setMode('home')}>
        <ChevronLeft className="w-4 h-4" />
        <span className="text-[0.6rem] font-bold tracking-widest uppercase">戻る</span>
      </div>
      
      <div className="text-center mb-6">
        <h3 className="text-xs font-mono text-cyan-100 tracking-widest uppercase">最近のセッション</h3>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {profiles.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()).map(profile => (
          <button
            key={profile.vaultId}
            onClick={() => {
              setSelectedProfile(profile);
              setMode('mnemonic');
            }}
            className="w-full group relative flex items-center justify-between p-4 bg-zinc-900 border border-cyan-900/40 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all text-left"
          >
            <div className="flex flex-col">
              <span className="text-sm font-bold text-cyan-100 group-hover:text-fuchsia-300 transition-colors">{profile.name}</span>
              <span className="text-[0.55rem] text-zinc-600 font-mono">ID: {profile.vaultId.slice(0, 8)}...</span>
            </div>
            <div className="text-right">
              <div className="text-[0.6rem] text-cyan-800 font-mono">{new Date(profile.lastActive).toLocaleDateString()}</div>
            </div>
          </button>
        ))}
      </div>
      
      <div className="pt-4 space-y-3">
        <button
          onClick={() => {
            setSelectedProfile(null);
            setMode('biometric');
          }}
          className="w-full py-3 bg-cyan-600/10 border border-cyan-500/30 text-cyan-400 text-[0.6rem] font-bold tracking-[0.2em] hover:bg-cyan-600/20 transition-all uppercase flex items-center justify-center gap-2"
        >
          <Fingerprint className="w-3 h-3 text-cyan-500" /> 生体認証で自動認識
        </button>
        <button
          onClick={() => {
            setSelectedProfile(null);
            setMode('mnemonic');
          }}
          className="w-full py-2 text-zinc-600 hover:text-cyan-500 text-[0.55rem] font-bold tracking-[0.2em] uppercase transition-colors"
        >
          直接キーフレーズを入力してログイン
        </button>
      </div>
    </div>
  );

  const renderMnemonic = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 mb-6 cursor-pointer hover:text-cyan-300 transition-colors text-cyan-700" 
           onClick={() => {
             const prevMode = isRegistering ? 'home' : (profiles.length > 0 ? 'profile_list' : 'home');
             setIsRegistering(false);
             setGeneratedMnemonic('');
             setMode(prevMode);
           }}>
        <ChevronLeft className="w-4 h-4" />
        <span className="text-[0.6rem] font-bold tracking-widest uppercase">戻る</span>
      </div>

      <div className="text-center mb-4">
        <h2 className="text-lg font-mono text-cyan-100 tracking-[0.1em] font-bold uppercase">
          {isRegistering ? 'Initialization' : 'Access Key'}
        </h2>
        <p className="text-[0.55rem] text-cyan-700 tracking-widest mt-1 uppercase">
          {isRegistering ? '新しいシードフレーズの生成' : 'キーフレーズの入力'}
        </p>
      </div>

      {isRegistering ? (
        <div className="space-y-6">
          <div className="p-3 bg-cyan-900/10 border border-cyan-800/40 rounded">
            <label className="text-[0.6rem] text-cyan-600 uppercase tracking-widest block mb-2 font-bold">Protocol: Identity / 識別名</label>
            <input 
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="名称を入力（空欄で自動生成）"
              className="w-full bg-black/40 border border-cyan-900/50 rounded p-2 text-xs text-cyan-100 placeholder:text-cyan-900 focus:outline-none focus:border-cyan-500 transition-all font-mono"
            />
          </div>

          <div className="p-4 bg-zinc-900 border border-fuchsia-500/30 rounded-lg relative group">
            <div className="grid grid-cols-3 gap-2">
              {generatedMnemonic.split(' ').map((word, i) => (
                <div key={i} className="text-[0.65rem] font-mono text-fuchsia-100 flex gap-2">
                  <span className="text-fuchsia-900 w-4">{i + 1}.</span>
                  <span>{word}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedMnemonic);
              }}
              className="absolute top-2 right-2 p-1.5 text-fuchsia-500 hover:text-fuchsia-300 transition-colors"
              title="コピー"
            >
              <Clipboard className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-red-950/20 border border-red-900/40 rounded flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[0.6rem] text-red-400 leading-relaxed font-bold uppercase tracking-wider">
              重要: この12単語はデータのマスターキーです。必ずオフラインで書き留めてください。
            </p>
          </div>

          <button
            onClick={handleSetupComplete}
            className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] flex items-center justify-center gap-3"
          >
            <Check className="w-5 h-5" /> メモしました。利用を開始する
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <form onSubmit={handleMnemonicSubmit} className="space-y-4">
            <div className="relative">
              <textarea
                className="w-full bg-zinc-900 border border-cyan-900/50 p-4 text-xs font-mono text-cyan-100 focus:border-cyan-400 outline-none h-24 placeholder-cyan-900 transition-all"
                placeholder="12単語のフレーズをスペース区切りで入力..."
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
              />
              <Key className="absolute bottom-3 right-3 w-4 h-4 text-cyan-900" />
            </div>

            {error && <p className="text-red-500 text-[0.55rem] font-bold animate-pulse uppercase">ERROR: {error}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              ボルトを解除
            </button>
          </form>

          {profiles.length > 0 && (
            <div className="pt-4 border-t border-cyan-900/30">
              <button
                onClick={() => setMode('biometric')}
                className="w-full py-3 border border-cyan-900/50 text-cyan-600 font-bold tracking-[0.2em] uppercase transition-all hover:bg-cyan-900/10 flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-4 h-4" /> 生体認証で簡単ログイン
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderBiometric = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-center py-10">
      <div className="flex items-center gap-4 mb-6 cursor-pointer hover:text-cyan-300 transition-colors text-cyan-700 text-left" onClick={() => setMode('profile_list')}>
        <ChevronLeft className="w-4 h-4" />
        <span className="text-[0.6rem] font-bold tracking-widest uppercase">戻る</span>
      </div>

      <div className="relative inline-block mb-10">
        <Fingerprint className="w-20 h-20 text-cyan-500 animate-pulse" />
        <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full animate-[ping_3s_linear_infinite] scale-125"></div>
      </div>

      <div className="space-y-4">
        {selectedProfile && (
          <div className="mb-4 animate-in fade-in duration-500">
            <span className="text-[0.6rem] text-cyan-600 uppercase tracking-widest block mb-1">Last Active User</span>
            <div className="text-sm font-bold text-cyan-100">{selectedProfile.name}</div>
          </div>
        )}
        
        <h3 className="text-sm font-mono text-cyan-100 uppercase tracking-widest">生体認証の応答を待機中...</h3>
        <p className="text-[0.6rem] text-cyan-700 max-w-xs mx-auto leading-relaxed">
          デバイスのセンサーに触れてください。登録済みのユーザーとして自動的にログインします。
        </p>
        
        {error && (
          <p className="text-red-500 text-[0.6rem] font-bold animate-pulse uppercase mt-2">
            Error: {error}
          </p>
        )}
        
        <button 
          onClick={handleBiometricAuth}
          className="mt-6 w-full py-4 bg-cyan-600/20 border border-cyan-500 text-cyan-400 text-xs font-black tracking-[0.3em] hover:bg-cyan-500 hover:text-cyan-950 transition-all uppercase shadow-[0_4px_20px_rgba(6,182,212,0.15)]"
        >
          認証を開始
        </button>
        
        <div className="pt-6 flex justify-center gap-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`w-1 h-3 ${i % 2 === 0 ? 'bg-cyan-500' : 'bg-cyan-900'} animate-pulse`} style={{ animationDelay: `${i * 0.2}s` }}></div>
          ))}
        </div>
        
        <p className="text-[0.5rem] text-cyan-950 font-mono mt-8">PROTOCOL_ID: WEBAUTHN_MULTI_SCAN_V2</p>

        <div className="mt-8 border-t border-cyan-900/30 pt-4 flex justify-between items-center">
          <button 
            onClick={() => setMode('profile_list')}
            className="text-[0.6rem] text-cyan-600 hover:text-cyan-400 transition-colors uppercase tracking-widest flex items-center gap-1"
          >
            <Camera className="w-3 h-3" /> プロファイル選択
          </button>
          <button 
            onClick={() => setMode('home')}
            className="text-[0.6rem] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xl">
      <div className="w-full max-w-md bg-zinc-950 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[80px]"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500/5 blur-[80px]"></div>
        
        {/* 枠の装飾 */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500"></div>

        <div className="p-8 relative">
          {mode === 'home' && renderHome()}
          {mode === 'mnemonic' && renderMnemonic()}
          {mode === 'biometric' && renderBiometric()}
          {mode === 'profile_list' && renderProfileList()}
        </div>
      </div>
    </div>
  );
};
