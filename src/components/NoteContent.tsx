import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkEmoji from 'remark-emoji';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { ExternalLink } from 'lucide-react';

interface NoteContentProps {
  text: string;
  showLineNumbers?: boolean;
}

/**
 * 
 * GitHubスタイルのマークダウンをサイバーパンクなテーマで美しくレンダリングします。
 */
export const NoteContent: React.FC<NoteContentProps> = ({ text }) => {
  return (
    <div className="markdown-body prose prose-invert prose-sm max-w-none 
                    text-zinc-200 leading-relaxed mt-1 mb-4 font-sans
                    prose-headings:text-cyan-300 prose-headings:font-bold prose-headings:tracking-wider prose-headings:pb-1 prose-headings:mt-8 prose-headings:mb-4
                    prose-h1:text-xl prose-h1:border-b-2 prose-h1:border-cyan-500/30 prose-h1:pb-2
                    prose-h2:text-lg prose-h2:border-b prose-h2:border-cyan-900/50
                    prose-h3:text-base
                    prose-p:mb-4 prose-p:leading-relaxed
                    prose-a:text-fuchsia-400 prose-a:no-underline hover:prose-a:text-fuchsia-300 hover:prose-a:underline
                    prose-strong:text-cyan-200 prose-strong:font-bold
                    prose-em:text-zinc-400
                    prose-code:text-fuchsia-300 prose-code:bg-fuchsia-950/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-cyan-900/50 prose-pre:rounded-none prose-pre:p-0 prose-pre:shadow-2xl
                    prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4
                    prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4
                    prose-li:mb-1
                    prose-hr:border-cyan-900/50 prose-hr:my-8
                    prose-table:border-collapse prose-table:w-full prose-table:mb-4 prose-table:text-[0.75rem]
                    prose-th:border prose-th:border-zinc-800 prose-th:p-2 prose-th:bg-zinc-900/80 prose-th:text-cyan-300
                    prose-td:border prose-td:border-zinc-800 prose-td:p-2 prose-td:text-zinc-300
                    prose-blockquote:border-l-4 prose-blockquote:border-cyan-500/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-zinc-400 prose-blockquote:bg-zinc-900/30 prose-blockquote:py-1 prose-blockquote:rounded-r-sm"
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkEmoji]}
        rehypePlugins={[rehypeRaw, [rehypeHighlight, { ignoreMissing: true }]]}
        components={{
          // カスタムコンポーネントでリンクを制御
          a: ({ ...props }) => (
            <a 
              {...props} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-4 decoration-fuchsia-500/30 transition-all group/link font-medium"
            >
              <span>{props.children}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-40 group-hover/link:opacity-100 transition-opacity" />
            </a>
          ),
          // コードブロックの装飾
          pre: ({ ...props }) => (
            <div className="relative group my-6 first:mt-0 last:mb-0">
              <div className="absolute top-0 right-0 px-3 py-1 bg-cyan-950/80 text-[0.6rem] text-cyan-400 font-mono border-l border-b border-cyan-500/30 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity uppercase backdrop-blur-sm z-10">Code_Storage</div>
              <pre {...props} className="bg-zinc-950 border border-cyan-900/40 overflow-x-auto p-4 custom-scrollbar shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
            </div>
          ),
          // チェックボックスのスタイリング
          input: ({ checked, type }) => {
            if (type === 'checkbox') {
              return (
                <input 
                  type="checkbox" 
                  checked={checked} 
                  readOnly 
                  className="w-3.5 h-3.5 mr-2 rounded-sm bg-zinc-900 border-cyan-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 disabled:opacity-100"
                />
              );
            }
            return null;
          }
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
