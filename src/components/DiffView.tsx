import React from 'react';
import { Minus, Plus, ArrowRight } from 'lucide-react';

interface DiffViewProps {
  oldText: string;
  newText: string;
}

/**
 * 簡易的な行ベースの差分表示コンポーネント
 */
export const DiffView: React.FC<DiffViewProps> = ({ oldText, newText }) => {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // 単純な比較ロジック（実際にはLCSなどのアルゴリズムが望ましいが、視認性重視の簡易版）
  // 変更前と変更後を並べて表示する
  return (
    <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden h-full">
      <div className="flex-1 flex flex-col min-w-0 border border-red-900/30 bg-red-950/5">
        <div className="bg-red-900/20 px-3 py-1 border-b border-red-900/30 flex items-center gap-2">
          <Minus className="w-3 h-3 text-red-500" />
          <span className="text-[0.6rem] font-bold text-red-500 tracking-widest uppercase">Original_State</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-zinc-500 whitespace-pre-wrap leading-relaxed custom-scrollbar">
          {oldText || <span className="italic opacity-30">(空)</span>}
        </div>
      </div>

      <div className="hidden md:flex items-center justify-center">
        <ArrowRight className="w-5 h-5 text-cyan-800" />
      </div>

      <div className="flex-1 flex flex-col min-w-0 border border-emerald-900/30 bg-emerald-950/5">
        <div className="bg-emerald-900/20 px-3 py-1 border-b border-emerald-900/30 flex items-center gap-2">
          <Plus className="w-3 h-3 text-emerald-500" />
          <span className="text-[0.6rem] font-bold text-emerald-500 tracking-widest uppercase">Proposed_Update</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-emerald-50 transition-all duration-500 whitespace-pre-wrap leading-relaxed custom-scrollbar">
          {newText || <span className="italic opacity-30">(空)</span>}
        </div>
      </div>
    </div>
  );
};
