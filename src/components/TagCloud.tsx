import React from 'react';
import { Tag } from 'lucide-react';

interface TagCloudProps {
  tags: { name: string; count: number }[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

/**
 * AIによって生成されたタグを表示し、フィルタリングを行うためのコンポーネントです。
 */
export const TagCloud: React.FC<TagCloudProps> = ({ tags, selectedTags, onToggleTag }) => {
  if (tags.length === 0) return null;

  return (
    <div className="mb-8 p-4 bg-zinc-900/50 border border-cyan-900/40 rounded-sm">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-3.5 h-3.5 text-cyan-600" />
        <span className="text-[0.65rem] text-cyan-700 tracking-[0.2em] font-bold uppercase">Semantic_Tags</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag.name);
          return (
            <button
              key={tag.name}
              onClick={() => onToggleTag(tag.name)}
              className={`
                px-2.5 py-1 text-[0.7rem] font-mono transition-all border
                ${isSelected 
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                  : 'bg-zinc-950/40 border-cyan-900/50 text-cyan-800 hover:border-cyan-700 hover:text-cyan-500'
                }
              `}
            >
              {tag.name}
              <span className={`ml-1.5 opacity-40 ${isSelected ? 'text-cyan-400' : 'text-cyan-900'}`}>
                ({tag.count})
              </span>
            </button>
          );
        })}
        
        {selectedTags.length > 0 && (
          <button
            onClick={() => selectedTags.forEach(t => onToggleTag(t))}
            className="px-2.5 py-1 text-[0.7rem] font-mono text-fuchsia-600 hover:text-fuchsia-400 border border-transparent hover:border-fuchsia-900/50 transition-all uppercase tracking-tighter"
          >
            [ Clear_Filters ]
          </button>
        )}
      </div>
    </div>
  );
};
