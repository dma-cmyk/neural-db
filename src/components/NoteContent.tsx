import React from 'react';

interface NoteContentProps {
  text: string;
}

/**
 * メモの内容を行番号付きで表示するコンポーネントです。
 */
export const NoteContent: React.FC<NoteContentProps> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="text-sm leading-relaxed mt-2 mb-4 font-mono">
      {lines.map((line, index) => (
        <div key={index} className="flex group/line">
          <span className="text-cyan-800 w-8 flex-shrink-0 text-right pr-3 select-none text-[0.65rem] pt-[0.25rem] opacity-50 group-hover/line:opacity-100 group-hover/line:text-cyan-400 transition-colors">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="whitespace-pre-wrap break-words break-all flex-1 text-cyan-50">
            {line === '' ? '\u00A0' : line.split(/(https?:\/\/[^\s$.?#].[^\s]*)/g).map((part, i) => {
              if (part.match(/https?:\/\/[^\s$.?#].[^\s]*/)) {
                return (
                  <a 
                    key={i} 
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-2 decoration-fuchsia-500/30 transition-colors"
                  >
                    {part}
                  </a>
                );
              }
              return part;
            })}
          </span>
        </div>
      ))}
    </div>
  );
};
