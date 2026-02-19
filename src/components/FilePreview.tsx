import React from 'react';
import { FileText, Image as ImageIcon, FileCode, File as FileIcon, ExternalLink, Download } from 'lucide-react';

interface FilePreviewProps {
  fileData: string | null;
  fileName: string | null;
  fileType: string | null;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ fileData, fileName, fileType }) => {
  if (!fileData || !fileName || !fileType) return null;
  const isImage = fileType.startsWith('image/');
  const isText = fileType.startsWith('text/') || fileType === 'application/json' || fileType === 'application/javascript';
  const isPdf = fileType === 'application/pdf';

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = isText && !fileData.startsWith('data:') 
      ? `data:${fileType};base64,${btoa(unescape(encodeURIComponent(fileData)))}` 
      : fileData.startsWith('data:') ? fileData : `data:${fileType};base64,${fileData}`;
    link.download = fileName;
    link.click();
  };

  const renderIcon = () => {
    if (isImage) return <ImageIcon className="w-8 h-8 text-cyan-400" />;
    if (isText) return <FileCode className="w-8 h-8 text-fuchsia-400" />;
    if (isPdf) return <FileText className="w-8 h-8 text-red-400" />;
    return <FileIcon className="w-8 h-8 text-zinc-400" />;
  };

  return (
    <div className="mt-4 border border-zinc-800 bg-zinc-950/50 overflow-hidden group/preview">
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center gap-3 min-w-0">
          {renderIcon()}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-cyan-200 truncate">{fileName}</span>
            <span className="text-[0.6rem] text-zinc-500 uppercase tracking-tighter">{fileType}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleDownload}
            className="p-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 transition-all"
            title="ダウンロード"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="relative max-h-48 overflow-hidden bg-zinc-950 flex items-center justify-center p-4">
        {isImage ? (
          <img src={fileData.startsWith('data:') ? fileData : `data:${fileType};base64,${fileData}`} alt={fileName} className="max-w-full max-h-40 object-contain shadow-lg" />
        ) : isText ? (
          <pre className="text-[0.65rem] text-cyan-900/70 font-mono w-full overflow-hidden whitespace-pre">
            {fileData.length > 500 ? fileData.substring(0, 500) + '...' : fileData}
          </pre>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-[0.65rem] text-zinc-600 tracking-widest italic">[ プレビュー非対応形式 ]</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-zinc-950 to-transparent"></div>
      </div>
    </div>
  );
};
