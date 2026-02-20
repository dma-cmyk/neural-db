import React, { useMemo } from 'react';
import { Tag, X } from 'lucide-react';

interface TagCloudProps {
  tags: { name: string; count: number }[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * サイバーパンクなデザインのグラフィカル・タグクラウドコンポーネント。
 * 使用数に応じてタグの大きさが変わります。
 */
export const TagCloud: React.FC<TagCloudProps> = ({ tags, selectedTags, onToggleTag, isOpen, onClose }) => {
  const { min, max } = useMemo(() => {
    if (tags.length === 0) return { min: 0, max: 0 };
    const counts = tags.map(t => t.count);
    return { min: Math.min(...counts), max: Math.max(...counts) };
  }, [tags]);

  const getFontSize = (count: number) => {
    if (max === min) return '0.75rem';
    const normalized = (count - min) / (max - min);
    // 0.7rem ~ 1.5rem の範囲でサイズを調整
    return `${0.7 + normalized * 0.8}rem`;
  };

  return (
    <div className={`
      fixed inset-x-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden
      ${isOpen ? 'top-16 opacity-100 translate-y-0' : 'top-16 opacity-0 -translate-y-full pointer-events-none'}
    `}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-zinc-950/95 border-b border-x border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative group">
          {/* 装飾用ライン */}
          <div className="absolute top-0 left-0 w-20 h-[2px] bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-500"></div>
          
          {/* SFスキャンライン効果 */}
          {isOpen && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
              <div className="w-full h-[1px] bg-cyan-400 shadow-[0_0_10px_#06b6d4] absolute animate-[scan_3s_linear_infinite]"></div>
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
            </div>
          )}
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-6 border-b border-cyan-900/30 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-cyan-500 animate-pulse"></div>
                <div className="flex flex-col">
                  <span className="text-[0.6rem] text-cyan-600 font-bold tracking-[0.3em] uppercase">System_Tag_Repository</span>
                  <span className="text-xs text-cyan-400 font-mono tracking-tighter">DATA_VISUALIZATION_V2.0.4</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-cyan-500/10 text-cyan-700 hover:text-cyan-400 transition-colors border border-transparent hover:border-cyan-900/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 min-h-[100px]">
              {tags.length === 0 ? (
                <span className="text-cyan-900 font-mono text-sm animate-pulse tracking-widest">
                  {"[ NO_TAG_DATA_FOUND ]"}
                </span>
              ) : (
                tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.name);
                  const fontSize = getFontSize(tag.count);
                  
                  return (
                    <button
                      key={tag.name}
                      onClick={() => onToggleTag(tag.name)}
                      style={{ fontSize }}
                      className={`
                        font-mono transition-all duration-300 relative group/tag
                        ${isSelected 
                          ? 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)] scale-110' 
                          : 'text-cyan-800 hover:text-cyan-400 hover:scale-105'
                        }
                      `}
                    >
                      <span className={`mr-1 ${isSelected ? 'opacity-100' : 'opacity-20 group-hover/tag:opacity-100'}`}>#</span>
                      {tag.name}
                      <span className={`
                        ml-1 text-[0.6rem] transition-opacity
                        ${isSelected ? 'text-fuchsia-600 opacity-100' : 'text-cyan-900 opacity-40 group-hover/tag:opacity-80'}
                      `}>
                        [{tag.count}]
                      </span>
                      {isSelected && (
                        <div className="absolute -bottom-1 left-0 w-full h-[1px] bg-fuchsia-500/50"></div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-cyan-900/30 pt-4">
              <div className="flex items-center gap-4">
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => selectedTags.forEach(t => onToggleTag(t))}
                    className="text-[0.65rem] font-mono text-fuchsia-500 hover:text-fuchsia-300 transition-colors flex items-center gap-1 group/clear"
                  >
                    <span className="opacity-0 group-hover/clear:opacity-100 transition-opacity">{">"}</span>
                    RESET_FILTERS_({selectedTags.length})
                  </button>
                )}
              </div>
              <span className="text-[0.55rem] text-cyan-900 font-mono italic">
                SCANNING_ALL_MEMO_CLUSTERS... OK
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 背景のブラインド効果 */}
      <div 
        className="absolute inset-0 -z-10 bg-zinc-950/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
    </div>
  );
};
