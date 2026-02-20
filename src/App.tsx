import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Loader2, Trash2, X, BrainCircuit, Info, Key, Download, Upload, Edit2, Terminal, Maximize2, Minimize2 } from 'lucide-react';
import { calculateCosineSimilarity } from './lib/utils';
import { getEmbedding, summarizeFile, generateTitle } from './lib/gemini';
import { NoteContent } from './components/NoteContent';
import { FilePreview } from './components/FilePreview';
import { File as FileIcon, Paperclip, ChevronDown, Check, Settings } from 'lucide-react';

const defaultApiKey = ""; // 実行環境から自動的に提供されます

interface Note {
  id: string;
  title: string;
  text: string;
  summary: string | null;
  vector: number[];
  fileData: string | null;
  fileName: string | null;
  fileType: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PendingFile {
  name: string;
  type: string;
  data: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
}

// --- メインコンポーネント ---

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVector, setSearchVector] = useState<number[] | null>(null);
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [error, setError] = useState('');
  
  // マネジメント用のUI状態
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyValue, setNewApiKeyValue] = useState('');
  
  // ファイルアップロード状態
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  
  // UI状態
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  const inputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);

  // APIキーとメモの初期化・保存
  useEffect(() => {
    // APIキーのロード
    const savedKeys = localStorage.getItem('neural_db_api_keys');
    if (savedKeys) {
      const parsed = JSON.parse(savedKeys);
      setApiKeys(parsed);
      if (parsed.length > 0) setSelectedApiKeyId(parsed[0].id);
    }

    // メモのロード
    const savedNotes = localStorage.getItem('neural_db_notes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error('Failed to load notes:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('neural_db_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('neural_db_notes', JSON.stringify(notes));
  }, [notes]);

  const activeApiKey = useMemo(() => {
    const selected = apiKeys.find(ak => ak.id === selectedApiKeyId);
    return selected ? selected.key : defaultApiKey;
  }, [apiKeys, selectedApiKeyId]);

  const handleAddApiKey = () => {
    if (!newApiKeyName.trim() || !newApiKeyValue.trim()) return;
    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: newApiKeyName.trim(),
      key: newApiKeyValue.trim()
    };
    setApiKeys(prev => [...prev, newKey]);
    setSelectedApiKeyId(newKey.id);
    setNewApiKeyName('');
    setNewApiKeyValue('');
  };

  const handleDeleteApiKey = (id: string) => {
    setApiKeys(prev => prev.filter(ak => ak.id !== id));
    if (selectedApiKeyId === id) setSelectedApiKeyId(null);
  };

  // メモの保存・更新
  const handleSaveNote = async () => {
    if (!newNoteText.trim() && !pendingFile) {
      handleCloseInput();
      return;
    }
    
    if (!activeApiKey) {
      setError('認証エラー: APIキーが設定されていません。');
      return;
    }

    setIsAdding(true);
    setError('');
    try {
      let vectorToUse = null;
      let finalSummary = "";
      
      if (pendingFile) {
        setIsProcessingFile(true);
        try {
          // ファイルの要約を取得
          finalSummary = await summarizeFile(pendingFile.data, pendingFile.type, activeApiKey);
          // 要約をベクトル化
          vectorToUse = await getEmbedding(finalSummary, activeApiKey);
        } finally {
          setIsProcessingFile(false);
        }
      } else {
        if (editingNoteId) {
          const existingNote = notes.find(n => n.id === editingNoteId);
          if (existingNote && existingNote.text === newNoteText) {
            vectorToUse = existingNote.vector;
          }
        }

        if (!vectorToUse) {
          const textToEmbed = newNoteTitle ? `${newNoteTitle}\n${newNoteText}` : newNoteText;
          vectorToUse = await getEmbedding(textToEmbed, activeApiKey);
        }
      }
      
      let finalTitle = newNoteTitle.trim();
      
      if (!finalTitle) {
        setIsGeneratingTitle(true);
        try {
          finalTitle = await generateTitle(pendingFile ? finalSummary : newNoteText, activeApiKey);
        } finally {
          setIsGeneratingTitle(false);
        }
      }
      
      const noteData: Note = {
        id: editingNoteId || crypto.randomUUID(),
        title: finalTitle,
        text: pendingFile ? finalSummary : newNoteText,
        summary: pendingFile ? finalSummary : null,
        vector: vectorToUse,
        fileData: pendingFile ? pendingFile.data : (editingNoteId ? notes.find(n => n.id === editingNoteId)?.fileData ?? null : null),
        fileName: pendingFile ? pendingFile.name : (editingNoteId ? notes.find(n => n.id === editingNoteId)?.fileName ?? null : null),
        fileType: pendingFile ? pendingFile.type : (editingNoteId ? notes.find(n => n.id === editingNoteId)?.fileType ?? null : null),
        createdAt: editingNoteId ? notes.find(n => n.id === editingNoteId)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      if (editingNoteId) {
        setNotes(prev => prev.map(n => n.id === editingNoteId ? noteData : n));
      } else {
        setNotes(prev => [noteData, ...prev]);
      }
      
      handleCloseInput();
    } catch (err: any) {
      setError('システムエラー: 処理中に異常が発生しました。' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCloseInput = () => {
    setNewNoteTitle('');
    setNewNoteText('');
    setPendingFile(null);
    setEditingNoteId(null);
    setIsInputExpanded(false);
    setIsFocusMode(false);
  };

  const handleToggleFocus = () => {
    setIsFocusMode(prev => !prev);
  };

  const handleEditNote = (note: Note) => {
    setNewNoteTitle(note.title || '');
    setNewNoteText(note.text);
    setEditingNoteId(note.id);
    setIsInputExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteNote = (id: string) => {
    if (window.confirm('警告: このデータを完全に消去しますか？')) {
      setNotes(prev => prev.filter(note => note.id !== id));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isText = file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/javascript';
    
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result;
      if (!result) return;

      const data = isText ? (result as string) : (result as string).split(',')[1];
      setPendingFile({
        name: file.name,
        type: file.type,
        data: data
      });
      setIsInputExpanded(true);
      if (!newNoteTitle) setNewNoteTitle(file.name);
    };

    if (isText) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  // 検索処理
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchVector(null);
      return;
    }
    if (!activeApiKey) {
      setError('認証エラー: APIキーが設定されていません。');
      return;
    }

    setIsSearching(true);
    setError('');
    try {
      const vector = await getEmbedding(searchQuery, activeApiKey);
      setSearchVector(vector);
    } catch (err) {
      setError('システムエラー: 検索クエリの解析に失敗しました。');
      setSearchVector(null);
    } finally {
      setIsSearching(false);
    }
  };

  // インポート / エクスポート
  const handleExport = () => {
    if (notes.length === 0) return;

    const defaultFilename = `sys_dump_${new Date().toISOString().slice(0, 10)}`;
    const userFilename = window.prompt('保存するファイル名を入力してください:', defaultFilename);
    
    if (userFilename === null) return; // キャンセル時

    const finalFilename = userFilename.endsWith('.json') ? userFilename : `${userFilename}.json`;

    const dataStr = JSON.stringify(notes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result;
      if (typeof result !== 'string') return;
      try {
        const importedData = JSON.parse(result);
        if (Array.isArray(importedData) && importedData.every((n: any) => n.id && n.text && n.vector)) {
          setNotes(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newNotes = importedData.filter((n: any) => !existingIds.has(n.id));
            return [...newNotes, ...prev];
          });
          setError('');
        } else {
          setError('エラー: 不正なデータ構造です。');
        }
      } catch (err) {
        setError('エラー: ファイルの解析に失敗しました。');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayedNotes = useMemo(() => {
    if (!searchVector) return notes.map(n => ({ ...n, score: null as number | null }));
    return notes
      .map(note => ({ ...note, score: calculateCosineSimilarity(searchVector, note.vector) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [notes, searchVector]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        if (!newNoteText.trim() && !newNoteTitle.trim()) {
          handleCloseInput();
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [newNoteText, newNoteTitle]);

  return (
    <div className="min-h-screen bg-zinc-950 text-cyan-400 font-mono selection:bg-fuchsia-500 selection:text-white">
      
      {/* ーーー ヘッダー ーーー */}
      <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md border-b border-cyan-500/30 px-4 py-3 flex items-center justify-between gap-4 shadow-[0_4px_20px_rgba(6,182,212,0.15)]">
        <div className="flex items-center gap-3 min-w-max">
          <div className="bg-zinc-900 border border-fuchsia-500 p-1.5 shadow-[0_0_10px_rgba(217,70,239,0.3)]">
            <Terminal className="w-6 h-6 text-fuchsia-400" />
          </div>
          <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 hidden md:block">
            NEURAL_DB_v1.0
          </h1>
        </div>

        {/* 検索バー */}
        <div className="flex-1 max-w-2xl">
          <div className="relative flex items-center w-full bg-zinc-900 border border-cyan-900/50 focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
            <button onClick={handleSearch} disabled={isSearching} className="p-3 text-cyan-600 hover:text-cyan-300">
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin text-fuchsia-500" /> : <Search className="w-5 h-5" />}
            </button>
            <input
              type="text"
              className="w-full bg-transparent border-none focus:ring-0 py-3 pr-4 text-sm placeholder-cyan-800 outline-none text-cyan-100"
              placeholder="検索クエリ > 意味・文脈でスキャン..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchVector(null); }} className="p-3 text-fuchsia-500 hover:text-fuchsia-300">
                <X className="w-5 h-5" />
              </button>
            )}
            {/* スキャンライン装飾 */}
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
          </div>
        </div>
        
        {/* 管理メニュー & APIキー */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1 border-r border-cyan-900/50 pr-3 mr-1">
            <button onClick={handleExport} title="データ出力" className="p-2 text-cyan-600 hover:text-cyan-300 hover:bg-cyan-950/50 transition-colors">
              <Download className="w-5 h-5" />
            </button>
            <label title="データ読込" className="p-2 text-cyan-600 hover:text-cyan-300 hover:bg-cyan-950/50 transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
            </label>
          </div>

          <div className="relative flex items-center gap-2">
            <div className="flex items-center gap-2 bg-zinc-900 px-3 py-2 border border-fuchsia-900/50 focus-within:border-fuchsia-500 transition-all min-w-[140px]">
              <Key className="w-4 h-4 text-fuchsia-500" />
              <select 
                className="bg-transparent border-none text-xs focus:ring-0 p-0 outline-none text-fuchsia-100 flex-1 appearance-none cursor-pointer"
                value={selectedApiKeyId || ''}
                onChange={(e) => setSelectedApiKeyId(e.target.value)}
              >
                <option value="" disabled className="bg-zinc-900">APIキーを選択...</option>
                {apiKeys.map(ak => (
                  <option key={ak.id} value={ak.id} className="bg-zinc-900">{ak.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-fuchsia-500 ml-1 pointer-events-none" />
            </div>
            
            <button 
              onClick={() => setIsApiKeyModalOpen(true)}
              className="p-2 bg-zinc-900 border border-fuchsia-900/50 text-fuchsia-500 hover:text-fuchsia-300 hover:border-fuchsia-500 transition-all"
              title="APIキー管理"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* APIキー管理モーダル */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-fuchsia-500 shadow-[0_0_30px_rgba(217,70,239,0.2)] w-full max-w-md overflow-hidden">
            <div className="bg-fuchsia-600 px-4 py-2 flex items-center justify-between">
              <h3 className="text-white text-xs font-bold tracking-widest flex items-center gap-2">
                <Key className="w-4 h-4" /> API_KEY_MANAGER
              </h3>
              <button onClick={() => setIsApiKeyModalOpen(false)} className="text-white hover:text-fuchsia-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4 mb-8">
                <div className="flex flex-col gap-1">
                  <span className="text-[0.6rem] text-fuchsia-500 tracking-widest mb-1">新規登録</span>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="text" 
                      placeholder="識別名 (例: Personal, Work)" 
                      className="bg-black border border-fuchsia-900/50 p-2 text-xs text-cyan-400 outline-none focus:border-fuchsia-500"
                      value={newApiKeyName}
                      onChange={(e) => setNewApiKeyName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        placeholder="Gemini API Key..." 
                        className="bg-black border border-fuchsia-900/50 p-2 text-xs text-cyan-400 outline-none focus:border-fuchsia-500 flex-1"
                        value={newApiKeyValue}
                        onChange={(e) => setNewApiKeyValue(e.target.value)}
                      />
                      <button 
                        onClick={handleAddApiKey}
                        className="bg-fuchsia-600 text-white px-4 py-2 text-xs font-bold hover:bg-fuchsia-500 transition-colors"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                <span className="text-[0.6rem] text-fuchsia-500 tracking-widest block mb-2">登録済みリスト</span>
                {apiKeys.length === 0 ? (
                  <p className="text-[0.65rem] text-zinc-600 italic">登録されたキーがありません</p>
                ) : (
                  apiKeys.map(ak => (
                    <div key={ak.id} className="flex items-center justify-between p-2 bg-black/50 border border-zinc-800">
                      <div className="flex flex-col">
                        <span className="text-xs text-cyan-300 font-bold">{ak.name}</span>
                        <span className="text-[0.5rem] text-zinc-600">••••••••{ak.key.slice(-4)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {selectedApiKeyId === ak.id && <Check className="w-4 h-4 text-fuchsia-500 mr-2" />}
                        <button 
                          onClick={() => handleDeleteApiKey(ak.id)}
                          className="p-1.5 text-red-500 hover:bg-red-950/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="bg-zinc-950 px-6 py-4 border-t border-fuchsia-900/30 flex justify-end">
              <button 
                onClick={() => setIsApiKeyModalOpen(false)}
                className="text-[0.65rem] font-bold text-fuchsia-400 hover:text-fuchsia-300 tracking-widest"
              >
                [ CLOSE ]
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="p-4 md:p-8 max-w-7xl mx-auto min-h-[calc(100vh-80px)]">
        
        {error && (
          <div className="max-w-2xl mx-auto mb-6 bg-red-950/40 border border-red-500 text-red-400 px-4 py-3 shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center gap-3">
            <Terminal className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm tracking-wide">{error}</p>
          </div>
        )}

        {/* ーーー メモ入力エリア ーーー */}
        <div 
          ref={inputRef}
          className={`max-w-2xl mx-auto mb-10 bg-zinc-900 border border-cyan-900 overflow-hidden transition-all duration-300 ${isInputExpanded ? 'shadow-[0_0_20px_rgba(6,182,212,0.15)] border-cyan-500' : 'hover:border-cyan-700 cursor-text'}`}
          onClick={() => !isInputExpanded && setIsInputExpanded(true)}
        >
          {isInputExpanded ? (
            <div className="flex flex-col animate-in fade-in duration-200">
              <div className="bg-zinc-950 border-b border-cyan-900/50 px-4 py-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-fuchsia-500 animate-pulse"></div>
                  <span className="text-[0.65rem] text-cyan-600 tracking-widest">入力ターミナル稼働中</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleToggleFocus(); }}
                  className="p-1 text-cyan-700 hover:text-cyan-400 transition-colors"
                  title="全画面表示"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                className="w-full px-4 pt-4 pb-2 text-lg font-bold tracking-wide bg-transparent border-none outline-none text-cyan-100 placeholder-cyan-800"
                placeholder="タイトル..."
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
              />
              <textarea
                autoFocus={!editingNoteId}
                className="w-full px-4 pb-4 bg-transparent resize-none outline-none min-h-[120px] max-h-[500px] overflow-y-auto text-cyan-50 placeholder-cyan-800/70 custom-scrollbar"
                placeholder="データ内容を入力..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
              />
              
              <div className="flex items-center justify-between p-3 bg-zinc-950 border-t border-cyan-900">
                <div className="flex items-center gap-2 text-xs text-fuchsia-400 opacity-80">
                  <BrainCircuit className="w-4 h-4" />
                  <span className="tracking-widest">
                    {isProcessingFile ? 'Geminiが解析中...' : 
                     isGeneratingTitle ? 'AIタイトル生成中...' :
                     editingNoteId ? '更新時にベクトル化を実行...' : 
                     pendingFile ? '要約後にベクトル化を実行...' : '保存時にベクトル化を実行...'}
                  </span>
                </div>
                <div className="flex gap-3">
                  <label className="p-2 text-cyan-600 hover:text-cyan-300 hover:bg-cyan-950/50 transition-colors cursor-pointer border border-cyan-900/50">
                    <Paperclip className="w-4 h-4" />
                    <input type="file" className="hidden" ref={resourceInputRef} onChange={handleFileUpload} />
                  </label>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCloseInput(); }} 
                    className="px-4 py-1.5 text-xs font-bold tracking-wider text-cyan-600 hover:text-cyan-300 hover:bg-cyan-900/30 border border-transparent hover:border-cyan-800 transition-all"
                  >
                    中止
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSaveNote(); }}
                    disabled={isAdding || (!newNoteText.trim() && !pendingFile)}
                    className="px-6 py-1.5 text-xs font-bold tracking-widest bg-cyan-950/50 text-cyan-300 border border-cyan-500 hover:bg-cyan-900 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:border-cyan-900 disabled:shadow-none flex items-center gap-2 transition-all"
                  >
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin text-fuchsia-500" /> : editingNoteId ? '上書き保存' : '保存'}
                  </button>
                </div>
              </div>
              {pendingFile && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 p-2 bg-fuchsia-950/20 border border-fuchsia-900/50 text-[0.65rem] text-fuchsia-400">
                    <FileIcon className="w-3.5 h-3.5" />
                    <span>アップロード待機: {pendingFile.name} ({pendingFile.type})</span>
                    <button onClick={() => setPendingFile(null)} className="ml-auto hover:text-pink-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 flex items-center justify-between text-cyan-700 font-bold tracking-widest">
              <span>入力待機中...</span>
              <Plus className="w-5 h-5 text-fuchsia-500" />
            </div>
          )}
        </div>

        {/* ーーー メモ一覧 ーーー */}
        {searchVector && (
          <div className="flex items-center justify-between mb-6 px-2 border-b border-fuchsia-900/50 pb-2">
            <h2 className="text-sm font-bold text-fuchsia-400 tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-fuchsia-500 rounded-full animate-ping"></span>
              スキャン結果
            </h2>
            <button onClick={() => { setSearchQuery(''); setSearchVector(null); }} className="text-xs text-cyan-600 hover:text-cyan-300 tracking-widest">
              [ スキャン解除 ]
            </button>
          </div>
        )}

        {notes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 border border-cyan-900/50 rounded-none flex items-center justify-center mx-auto mb-6 relative overflow-hidden bg-zinc-900/50">
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 to-transparent"></div>
              <Terminal className="w-10 h-10 text-cyan-800" />
            </div>
            <p className="text-cyan-700 tracking-widest text-sm">データがありません</p>
          </div>
        ) : displayedNotes.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-red-900/50 bg-red-950/10">
            <p className="text-red-500/70 tracking-widest text-sm">一致するレコードがありません</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-5">
            {displayedNotes.map((note) => (
              <div 
                key={note.id} 
                className={`break-inside-avoid relative group bg-zinc-900 border transition-all duration-300 ${
                  note.score !== null && note.score > 0.6 
                    ? 'border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.15)] bg-gradient-to-b from-fuchsia-950/20 to-transparent' 
                    : 'border-cyan-900/60 hover:border-cyan-500/80 hover:shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                }`}
              >
                {/* 装飾用コーナーアクセント */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400"></div>

                <div className="p-4">
                  {note.title && (
                    <h3 className="font-bold text-cyan-300 mb-2 text-base tracking-wide border-b border-cyan-900/50 pb-1">
                      {note.title}
                    </h3>
                  )}
                  
                  <NoteContent text={note.text} />

                  {note.fileData && (
                    <FilePreview 
                      fileData={note.fileData} 
                      fileName={note.fileName} 
                      fileType={note.fileType} 
                    />
                  )}
                  
                  <div className="mt-5 pt-3 border-t border-zinc-800 flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.65rem] text-cyan-700 tracking-widest">
                        {new Date(note.createdAt).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' }).replace(/\//g, '.')}
                      </span>
                      {note.updatedAt && note.updatedAt !== note.createdAt && (
                        <span className="text-[0.6rem] text-fuchsia-600/70 tracking-widest">更新済</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {note.score !== null && (
                        <div className={`px-2 py-0.5 text-[0.65rem] font-bold tracking-widest border ${
                          note.score > 0.7 ? 'bg-lime-950/50 text-lime-400 border-lime-500/50 shadow-[0_0_5px_rgba(163,230,53,0.3)]' :
                          note.score > 0.5 ? 'bg-amber-950/50 text-amber-400 border-amber-500/50' :
                          'bg-zinc-950 text-cyan-700 border-cyan-900'
                        }`}>
                          一致率:{(note.score * 100).toFixed(1)}%
                        </div>
                      )}
                      
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { handleEditNote(note); handleToggleFocus(); }}
                          className="p-1.5 text-fuchsia-600 hover:text-fuchsia-400 hover:bg-fuchsia-950/40 transition-all outline-none"
                          title="全画面で表示・編集"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditNote(note)}
                          className="p-1.5 text-cyan-600 hover:text-cyan-300 hover:bg-cyan-900/40 transition-all outline-none"
                          title="編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 text-red-600 hover:text-red-400 hover:bg-red-950/40 transition-all outline-none"
                          title="消去"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ーーー 集中モード (Focus Mode) モーダル ーーー */}
      {isFocusMode && (
        <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <header className="px-6 py-4 border-b border-cyan-500/30 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <BrainCircuit className="w-6 h-6 text-fuchsia-500" />
              <div className="flex flex-col">
                <span className="text-[0.6rem] text-cyan-600 tracking-[0.3em] font-bold uppercase">Focus Mode Active</span>
                <span className="text-xs text-fuchsia-400 font-mono italic">
                  {isProcessingFile ? 'System: Analyzing file...' : 
                   isGeneratingTitle ? 'System: Generating title...' : 'System: Waiting for input...'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleToggleFocus}
                className="p-2 text-cyan-600 hover:text-cyan-400 transition-all border border-cyan-900/50 hover:border-cyan-500"
                title="縮小"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              <button 
                onClick={handleCloseInput}
                className="p-2 text-red-600 hover:text-red-400 transition-all border border-red-900/50 hover:border-red-500"
                title="閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-6 md:p-12 overflow-hidden">
            <input
              type="text"
              className="w-full bg-transparent border-none outline-none text-3xl md:text-5xl font-bold tracking-tight text-cyan-50 placeholder-cyan-900 mb-8"
              placeholder="タイトルを思考中..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
            />
            
            <div className="flex-1 relative border-l border-cyan-500/20 pl-6 ml-1">
              <textarea
                autoFocus
                className="w-full h-full bg-transparent resize-none outline-none text-lg leading-relaxed text-cyan-100 placeholder-zinc-800 font-mono custom-scrollbar"
                placeholder="ここに壮大な思考を記録してください..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
              />
            </div>

            {pendingFile && (
              <div className="mt-8 p-4 bg-zinc-900/80 border border-fuchsia-500/30 flex items-center gap-4">
                <FileIcon className="w-6 h-6 text-fuchsia-500" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-fuchsia-300 font-bold truncate">{pendingFile.name}</p>
                  <p className="text-[0.6rem] text-zinc-500 uppercase tracking-widest">{pendingFile.type}</p>
                </div>
                <button onClick={() => setPendingFile(null)} className="p-2 text-zinc-500 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <footer className="p-6 border-t border-cyan-900/50 bg-zinc-900/30 flex items-center justify-between">
            <div className="flex items-center gap-6 text-[0.65rem] text-cyan-800 tracking-widest font-bold">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                 NEURALLINK_ESTABLISHED
               </div>
               <div className="hidden sm:block">CHARS: {newNoteText.length}</div>
            </div>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 px-6 py-3 bg-zinc-950 text-cyan-600 hover:text-cyan-300 transition-all border border-cyan-900 cursor-pointer text-xs font-bold tracking-widest uppercase">
                <Paperclip className="w-4 h-4" />
                <span>Attach</span>
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
              
              <button 
                onClick={handleSaveNote}
                disabled={isAdding || (!newNoteText.trim() && !pendingFile)}
                className="px-10 py-3 bg-cyan-950/50 text-cyan-300 border border-cyan-400 hover:bg-cyan-900 hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] disabled:opacity-30 transition-all text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-3"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Execute_Save'}
              </button>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
