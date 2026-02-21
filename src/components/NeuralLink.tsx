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
    profiles.length === 1 ? 'biometric' : (profiles.length > 1 ? 'profile_list' : 'home')
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


  // モードが生体認証になったら即座に開始（単一ユーザーまたは選択済みの場合のみ）
  useEffect(() => {
    if (mode === 'biometric' && !isVerifying) {
      if (profiles.length === 1 || selectedProfile) {
        handleBiometricAuth();
      }
    }
  }, [mode, selectedProfile]);

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

  const handleSetupComplete = async () => {
    if (!generatedMnemonic) return;
    setIsVerifying(true);
    setError('');
    try {
      const vaultId = await deriveVaultId(generatedMnemonic);
      const finalName = profileName.trim() || generateUniqueName(profiles.map(p => p.name));
      
      const isBio = await isBiometricAvailable();
      if (isBio) {
        await registerBiometric(generatedMnemonic, vaultId, finalName);
      }
      
      // プロファイル情報を作成
      const newProfile: UserProfile = {
        vaultId,
        name: finalName,
        lastActive: new Date().toISOString()
      };
      
      // 親コンポーネントの状態更新は onUnlock 内で行われることが期待されるが、
      // profiles の永続化のために localStorage を更新
      const updatedProfiles = [...profiles, newProfile];
      localStorage.setItem('neural_db_profiles', JSON.stringify(updatedProfiles));
      
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
          onClick={() => setMode('auth_selection')}
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
      <div className="flex items-center gap-4 mb-4 cursor-pointer hover:text-cyan-300 transition-colors text-cyan-700" onClick={() => setMode('auth_selection')}>
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
              setMode('biometric');
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
      
      <button
        onClick={() => {
          setSelectedProfile(null);
          setMode('biometric');
        }}
        className="w-full mt-4 py-3 bg-cyan-600/10 border border-cyan-500/30 text-cyan-400 text-[0.6rem] font-bold tracking-[0.2em] hover:bg-cyan-600/20 transition-all uppercase flex items-center justify-center gap-2"
      >
        <Fingerprint className="w-3 h-3 text-cyan-500" /> 自動認識 / 一括スキャン
      </button>
    </div>
  );

  const renderAuthSelection = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 mb-2 cursor-pointer hover:text-cyan-300 transition-colors text-cyan-700" onClick={() => setMode('home')}>
        <ChevronLeft className="w-4 h-4" />
        <span className="text-[0.6rem] font-bold tracking-widest uppercase">戻る</span>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-lg font-mono text-cyan-100 tracking-[0.1em] font-bold uppercase">Authorization</h2>
        <p className="text-[0.55rem] text-cyan-700 tracking-widest mt-1 uppercase">認証方法を選択</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => setMode('biometric')}
          className="group relative flex items-center justify-between p-4 bg-zinc-900 border border-cyan-900/50 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all overflow-hidden"
        >
          <div className="flex items-center gap-4 z-10">
            <Fingerprint className="w-5 h-5 text-cyan-500 group-hover:text-cyan-300" />
            <div className="text-left">
              <div className="text-[0.7rem] font-bold text-cyan-100 uppercase tracking-tighter">生体認証スキャン</div>
              <div className="text-[0.55rem] text-cyan-700">指紋 / 顔認証でログイン</div>
            </div>
          </div>
          <Zap className="w-4 h-4 text-cyan-900 group-hover:text-cyan-400 transition-colors" />
        </button>

        <button
          onClick={() => {
            setIsRegistering(false);
            setMode('mnemonic');
          }}
          className="group relative flex items-center justify-between p-4 bg-zinc-900 border border-cyan-900/50 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all overflow-hidden"
        >
          <div className="flex items-center gap-4 z-10">
            <Key className="w-5 h-5 text-cyan-500 group-hover:text-cyan-300" />
            <div className="text-left">
              <div className="text-[0.7rem] font-bold text-cyan-100 uppercase tracking-tighter">シードフレーズ</div>
              <div className="text-[0.55rem] text-cyan-700">12単語のリカバリーキー</div>
            </div>
          </div>
          <Zap className="w-4 h-4 text-cyan-900 group-hover:text-cyan-400 transition-colors" />
        </button>

        {profiles.length > 0 && (
          <button
            onClick={() => setMode('profile_list')}
            className="w-full mt-4 py-2 text-[0.6rem] text-zinc-600 hover:text-cyan-500 transition-colors uppercase tracking-[0.2em] flex items-center justify-center gap-2"
          >
            <Camera className="w-3 h-3" /> 最近のIDを表示
          </button>
        )}
      </div>
    </div>
  );

  const renderMnemonic = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 mb-6 cursor-pointer hover:text-cyan-300 transition-colors text-cyan-700" 
           onClick={() => {
             const prevMode = isRegistering ? 'home' : 'auth_selection';
             setIsRegistering(false);
             setGeneratedMnemonic('');
             setMode(prevMode);
           }}>
        <ChevronLeft className="w-4 h-4" />
        <span className="text-[0.6rem] font-bold tracking-widest uppercase">戻る</span>
      </div>

      {isRegistering ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="p-3 bg-cyan-900/10 border border-cyan-800/40 rounded">
              <label className="text-[0.6rem] text-cyan-600 uppercase tracking-widest block mb-2 font-bold">Protocol: Identity / 識別名</label>
              <input 
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="名称を入力（空欄で自動生成）"
                className="w-full bg-black/40 border border-cyan-900/50 rounded p-2 text-xs text-cyan-100 placeholder:text-cyan-900 focus:outline-none focus:border-cyan-500 transition-all font-mono"
              />
              <p className="mt-1.5 text-[0.5rem] text-cyan-800 italic">※識別名は後で変更可能です。空欄時はランダム生成されます。</p>
            </div>
          </div>

          <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-sm">
            <p className="text-[0.65rem] text-cyan-400 font-bold mb-4 uppercase tracking-[0.2em]">新規シードフレーズ生成</p>
            <div className="grid grid-cols-3 gap-2">
              {generatedMnemonic.split(' ').map((word: string, i: number) => (
                <div key={i} className="bg-zinc-900/80 border border-cyan-900/50 p-2 text-center text-[0.7rem] font-mono text-cyan-100 relative group">
                  <span className="absolute top-0 left-1 text-[0.4rem] text-cyan-900">{i + 1}</span>
                  {word}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedMnemonic);
                  alert('クリップボードにコピーしました。安全な場所に保存してください。');
                }}
                className="w-full py-2 bg-zinc-900 border border-cyan-700 text-cyan-400 text-[0.6rem] font-bold tracking-widest hover:bg-cyan-500/10 flex items-center justify-center gap-2"
              >
                <Clipboard className="w-3 h-3" /> クリップボードへコピー
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-red-950/20 border border-red-900/50">
            <div className="flex gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-[0.65rem] text-red-400 font-bold uppercase mb-1 underline">CRITICAL_WARNING</p>
                <p className="text-[0.55rem] text-red-700 leading-relaxed">
                  この12単語は金庫の鍵そのものです。紛失するとデータを二度と復元できません。紙に書くか、安全なパスワードマネージャーに保存してください。
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSetupComplete}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-cyan-950 text-xs font-black tracking-[0.3em] transition-all uppercase shadow-[0_4px_20px_rgba(6,182,212,0.3)]"
          >
            フレーズを安全に保存しました
          </button>
        </div>
      ) : (
        <form onSubmit={handleMnemonicSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[0.6rem] text-cyan-700 uppercase font-bold tracking-widest">リカバリー単語を入力 (12単語)</label>
            <textarea
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              placeholder="apple banana cherry..."
              className="w-full h-32 bg-zinc-900/80 border border-cyan-900/50 text-cyan-100 p-4 font-mono text-sm focus:border-cyan-400 outline-none transition-all placeholder:text-cyan-950"
            />
          </div>
          {error && <p className="text-red-500 text-[0.6rem] font-bold animate-pulse uppercase">Error: {error}</p>}
          <button
            type="submit"
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-cyan-950 text-xs font-black tracking-[0.3em] transition-all uppercase shadow-[0_4px_20px_rgba(6,182,212,0.3)]"
          >
            Vaultを復号
          </button>
        </form>
      )}
    </div>
  );

  const renderBiometric = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-center py-10">
      <div className="flex items-center gap-4 mb-6 cursor-pointer hover:text-cyan-300 transition-colors text-cyan-700 text-left" onClick={() => setMode('auth_selection')}>
        <X className="w-4 h-4" />
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
          {mode === 'auth_selection' && renderAuthSelection()}
          {mode === 'mnemonic' && renderMnemonic()}
          {mode === 'biometric' && renderBiometric()}
          {mode === 'profile_list' && renderProfileList()}
        </div>
      </div>
    </div>
  );
};
