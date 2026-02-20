import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NoteContentProps {
  text: string;
  showLineNumbers?: boolean;
}

/**
 * メモの内容をマークダウン形式で表示するコンポーネントです。
 */
export const NoteContent: React.FC<NoteContentProps> = ({ text }) => {
  return (
    <div className="prose prose-invert prose-xs max-w-none 
                    text-cyan-50 leading-relaxed mt-2 mb-4 font-sans
                    prose-headings:text-cyan-300 prose-headings:font-bold prose-headings:tracking-wider prose-headings:border-b prose-headings:border-cyan-900/50 prose-headings:pb-1 prose-headings:mt-6 prose-headings:mb-4
                    prose-p:mb-4 prose-p:leading-relaxed
                    prose-a:text-fuchsia-400 prose-a:no-underline hover:prose-a:text-fuchsia-300 hover:prose-a:underline
                    prose-strong:text-cyan-200 prose-strong:font-bold
                    prose-code:text-fuchsia-300 prose-code:bg-fuchsia-950/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-black prose-pre:border prose-pre:border-cyan-900/50 prose-pre:rounded-none prose-pre:p-4 prose-pre:font-mono prose-pre:overflow-x-auto
                    prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4
                    prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4
                    prose-li:mb-1
                    prose-hr:border-cyan-900/50 prose-hr:my-8
                    prose-table:border-collapse prose-table:w-full prose-table:mb-4
                    prose-th:border prose-th:border-cyan-900/50 prose-th:p-2 prose-th:bg-cyan-950/20 prose-th:text-cyan-300
                    prose-td:border prose-td:border-cyan-900/50 prose-td:p-2 prose-td:text-cyan-100
                    prose-blockquote:border-l-4 prose-blockquote:border-cyan-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-cyan-100/70"
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // カスタムコンポーネントでリンクを制御
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-2 decoration-fuchsia-500/30 transition-colors" />
          ),
          // コードブロックの装飾
          pre: ({ ...props }) => (
            <div className="relative group my-4">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-cyan-900/30 text-[0.5rem] text-cyan-500 font-mono border-l border-b border-cyan-500/30 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity uppercase">Source_Code</div>
              <pre {...props} className="bg-black border border-cyan-900/50 overflow-x-auto p-4 custom-scrollbar" />
            </div>
          )
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
