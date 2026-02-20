import React from 'react';
import { ExternalLink, Unlink } from 'lucide-react';
import { LinkMetadata } from '../lib/linkMetadata';

interface LinkPreviewProps {
  links: LinkMetadata[];
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ links }) => {
  if (!links || links.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col bg-zinc-950/40 border border-cyan-900/40 hover:border-cyan-400/50 transition-all p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ExternalLink className="w-3 h-3 text-cyan-500" />
                <span className="text-[0.6rem] text-cyan-600 font-mono truncate uppercase tracking-widest">
                  {new URL(link.url).hostname}
                </span>
              </div>
              
              {link.status === 'failed' ? (
                <div className="flex items-center gap-2 text-zinc-600 italic text-[0.7rem]">
                  <Unlink className="w-3 h-3" />
                  <span>情報を取得できませんでした</span>
                </div>
              ) : (
                <>
                  <h4 className="text-[0.75rem] font-bold text-cyan-100 group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1 leading-tight">
                    {link.title || 'タイトルなし'}
                  </h4>
                  {link.description && (
                    <p className="text-[0.65rem] text-cyan-700 line-clamp-2 leading-relaxed">
                      {link.description}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};
