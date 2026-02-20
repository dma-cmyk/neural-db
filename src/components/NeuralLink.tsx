import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, QrCode, Clipboard, ShieldAlert, Key, Zap, Check, X, ShieldCheck, Download, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { generateMnemonic } from '../lib/encryption';

interface NeuralLinkProps {
  onUnlock: (mnemonic: string) => void;
  isInitialSetup: boolean;
}

/**
 * 認証・暗号鍵管理を行うSFチックなUIコンポーネント
 */
export const NeuralLink: React.FC<NeuralLinkProps> = ({ onUnlock, isInitialSetup }) => {
  const [mode, setMode] = useState<'selection' | 'mnemonic' | 'qr_scan' | 'qr_display' | 'biometric'>('selection');
  const [mnemonic, setMnemonic] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);

  // セットアップ時のシード生成
  useEffect(() => {
    if (isInitialSetup && !generatedMnemonic) {
      setGeneratedMnemonic(generateMnemonic());
    }
  }, [isInitialSetup, generatedMnemonic]);

  // QRスキャナーの初期化
  useEffect(() => {
    if (mode === 'qr_scan') {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render((result) => {
        setScanResult(result);
        scanner.clear();
        onUnlock(result);
      }, (err) => {
        // Ignore parsing errors
      });

      return () => {
        scanner.clear().catch(e => console.error(e));
      };
    }
  }, [mode, onUnlock]);

  const handleMnemonicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mnemonic.trim().split(/\s+/).length !== 12) {
      setError('12単語を入力してください');
      return;
    }
    onUnlock(mnemonic.trim());
  };

  const handleSetupComplete = () => {
    onUnlock(generatedMnemonic);
  };

  const renderSelection = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-block p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-4 relative">
          <ShieldAlert className="w-12 h-12 text-cyan-400 group-hover:scale-110 transition-transform" />
          <div className="absolute inset-0 border border-cyan-400 rounded-full animate-ping opacity-20"></div>
        </div>
        <h2 className="text-xl font-mono text-cyan-100 tracking-[0.2em] font-bold uppercase">
          {isInitialSetup ? 'Security_Initializer' : 'Access_Required'}
        </h2>
        <p className="text-[0.6rem] text-cyan-700 tracking-widest mt-2 uppercase">
          Neural_Link_Authorization_Protocol
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* 生体認証ボタン (WebAuthn) - 実装予定 */}
        <button
          onClick={() => setMode('biometric')}
          className="group relative flex items-center justify-between p-4 bg-zinc-900 border border-cyan-900/50 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all overflow-hidden"
        >
          <div className="flex items-center gap-4 z-10">
            <Fingerprint className="w-5 h-5 text-cyan-500 group-hover:text-cyan-300" />
            <div className="text-left">
              <div className="text-[0.7rem] font-bold text-cyan-100 uppercase tracking-tighter">Biometric_Scan</div>
              <div className="text-[0.55rem] text-cyan-700">Fingerprint / FaceID</div>
            </div>
          </div>
          <Zap className="w-4 h-4 text-cyan-900 group-hover:text-cyan-400 transition-colors" />
          <div className="absolute bottom-0 left-0 h-[1px] bg-cyan-500 w-0 group-hover:w-full transition-all duration-700"></div>
        </button>

        {/* QRスキャンボタン */}
        <button
          onClick={() => setMode(isInitialSetup ? 'qr_display' : 'qr_scan')}
          className="group relative flex items-center justify-between p-4 bg-zinc-900 border border-cyan-900/50 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all overflow-hidden"
        >
          <div className="flex items-center gap-4 z-10">
            <QrCode className="w-5 h-5 text-cyan-500 group-hover:text-cyan-300" />
            <div className="text-left">
              <div className="text-[0.7rem] font-bold text-cyan-100 uppercase tracking-tighter">
                {isInitialSetup ? 'Digital_Key_Unit' : 'Key_Scanner'}
              </div>
              <div className="text-[0.55rem] text-cyan-700">{isInitialSetup ? 'GENERATE_QR_ACCESS_TOKEN' : 'SCAN_NEURAL_TOKEN_QR'}</div>
            </div>
          </div>
          <Zap className="w-4 h-4 text-cyan-900 group-hover:text-cyan-400 transition-colors" />
          <div className="absolute bottom-0 left-0 h-[1px] bg-cyan-500 w-0 group-hover:w-full transition-all duration-700"></div>
        </button>

        {/* シードフレーズボタン */}
        <button
          onClick={() => setMode('mnemonic')}
          className="group relative flex items-center justify-between p-4 bg-zinc-900 border border-cyan-900/50 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all overflow-hidden"
        >
          <div className="flex items-center gap-4 z-10">
            <Key className="w-5 h-5 text-cyan-500 group-hover:text-cyan-300" />
            <div className="text-left">
              <div className="text-[0.7rem] font-bold text-cyan-100 uppercase tracking-tighter">Mnemonic_Phrase</div>
              <div className="text-[0.55rem] text-cyan-700">12_WORD_RECOVERY_KEY</div>
            </div>
          </div>
          <Zap className="w-4 h-4 text-cyan-900 group-hover:text-cyan-400 transition-colors" />
          <div className="absolute bottom-0 left-0 h-[1px] bg-cyan-500 w-0 group-hover:w-full transition-all duration-700"></div>
        </button>
      </div>
    </div>
  );

  const renderMnemonic = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 mb-6 cursor-pointer hover:text-cyan-300 transition-colors text-cyan-700" onClick={() => setMode('selection')}>
        <X className="w-4 h-4" />
        <span className="text-[0.6rem] font-bold tracking-widest uppercase">Go_Back</span>
      </div>

      {isInitialSetup ? (
        <div className="space-y-6">
          <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-sm">
            <p className="text-[0.65rem] text-cyan-400 font-bold mb-4 uppercase tracking-[0.2em]">Generate_New_Seed_Phrase</p>
            <div className="grid grid-cols-3 gap-2">
              {generatedMnemonic.split(' ').map((word, i) => (
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
                <Clipboard className="w-3 h-3" /> COPY_TO_NEURAL_LINK
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
            I_HAVE_SECURED_MY_PHRASE
          </button>
        </div>
      ) : (
        <form onSubmit={handleMnemonicSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[0.6rem] text-cyan-700 uppercase font-bold tracking-widest">Input_Recovery_Words (12_Words)</label>
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
            DECRYPT_VAULT
          </button>
        </form>
      )}
    </div>
  );

  const renderQrDisplay = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-center">
      <div className="flex items-center gap-4 mb-6 cursor-pointer hover:text-cyan-300 transition-colors text-cyan-700 text-left" onClick={() => setMode('selection')}>
        <X className="w-4 h-4" />
        <span className="text-[0.6rem] font-bold tracking-widest uppercase">Go_Back</span>
      </div>

      <div className="bg-white p-6 inline-block rounded-sm mb-4 relative">
        <QRCodeSVG value={generatedMnemonic} size={200} level="M" />
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500 -m-1"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500 -m-1"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500 -m-1"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500 -m-1"></div>
      </div>

      <div className="max-w-xs mx-auto space-y-4">
        <p className="text-[0.65rem] text-cyan-400 font-bold uppercase tracking-[0.15em]">Digital_Auth_Key_Generated</p>
        <p className="text-[0.55rem] text-cyan-800 leading-relaxed italic">
          このQRコードは、他デバイスへの「Neural_Link」接続に使用します。外部に公開しないでください。
        </p>
        
        <button
          onClick={handleSetupComplete}
          className="w-full py-3 bg-cyan-900/40 border border-cyan-400 text-cyan-400 text-[0.65rem] font-bold tracking-[0.2em] hover:bg-cyan-400 hover:text-cyan-950 transition-all uppercase"
        >
          CONFIRM_KEY_RETENTION
        </button>
      </div>
    </div>
  );

  const renderQrScan = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 mb-6 cursor-pointer hover:text-cyan-300 transition-colors text-cyan-700" onClick={() => setMode('selection')}>
        <X className="w-4 h-4" />
        <span className="text-[0.6rem] font-bold tracking-widest uppercase">Go_Back</span>
      </div>

      <div className="relative border border-cyan-500/30 bg-zinc-950 overflow-hidden group">
        <div id="qr-reader" className="w-full"></div>
        {/* 装飾用オーバーレイ */}
        <div className="absolute inset-0 pointer-events-none border-2 border-cyan-500/20 m-4"></div>
        <div className="absolute top-0 left-0 h-1 w-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] animate-scan opacity-40"></div>
      </div>

      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-cyan-500 animate-pulse">
          <Camera className="w-4 h-4" />
          <span className="text-[0.6rem] font-bold tracking-widest uppercase">Awaiting_Neural_Key_Scan...</span>
        </div>
        <p className="text-[0.55rem] text-cyan-900 italic">Position the QR code within the sensor range.</p>
      </div>
    </div>
  );

  const renderBiometric = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-center py-10">
      <div className="flex items-center gap-4 mb-6 cursor-pointer hover:text-cyan-300 transition-colors text-cyan-700 text-left" onClick={() => setMode('selection')}>
        <X className="w-4 h-4" />
        <span className="text-[0.6rem] font-bold tracking-widest uppercase">Go_Back</span>
      </div>

      <div className="relative inline-block mb-10">
        <Fingerprint className="w-20 h-20 text-cyan-500 animate-pulse" />
        <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full animate-[ping_3s_linear_infinite] scale-125"></div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-mono text-cyan-100 uppercase tracking-widest">Waiting_for_Biometric_Response</h3>
        <p className="text-[0.6rem] text-cyan-700 max-w-xs mx-auto leading-relaxed">
          デバイスのセンサーに指を置くか、顔認証を行ってください。
        </p>
        
        <div className="flex justify-center gap-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`w-1 h-3 ${i % 2 === 0 ? 'bg-cyan-500' : 'bg-cyan-900'} animate-pulse`} style={{ animationDelay: `${i * 0.2}s` }}></div>
          ))}
        </div>
        
        <p className="text-[0.5rem] text-cyan-950 font-mono mt-8">PROTOCOL_ID: WEBAUTHN_L2_ENCRYPT_WRAP</p>
      </div>
      
      {/* 実際の実装ではここで window.crypto.subtle の WebAuthn 呼び出しを行う */}
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
          {mode === 'selection' && renderSelection()}
          {mode === 'mnemonic' && renderMnemonic()}
          {mode === 'qr_display' && renderQrDisplay()}
          {mode === 'qr_scan' && renderQrScan()}
          {mode === 'biometric' && renderBiometric()}
        </div>
      </div>
    </div>
  );
};
