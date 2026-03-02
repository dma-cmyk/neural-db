import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, Plus, Loader2, Trash2, X, BrainCircuit, Info, Key, Download, Upload, 
  Edit2, Terminal, Maximize2, Minimize2, Zap, RefreshCw, Menu, LogOut, Fingerprint,
  File as FileIcon, Paperclip, ChevronDown, Check, Settings, ExternalLink, Unlink, 
  Tag as TagIcon, ShieldCheck 
} from 'lucide-react';
import { calculateCosineSimilarity } from './lib/utils';
import { getEmbedding, summarizeFile, generateTitle, batchGetEmbeddings, generateTags, editNoteWithAI, getAvailableModels, GeminiModel } from './lib/gemini';
import { NoteContent } from './components/NoteContent';
import { FilePreview } from './components/FilePreview';
import { TagCloud } from './components/TagCloud';
import { LinkPreview } from './components/LinkPreview';
import { DiffView } from './components/DiffView';
import { extractUrls, fetchLinkMetadata, LinkMetadata } from './lib/linkMetadata';
import { NeuralLink } from './components/NeuralLink';
import { deriveKeyFromMnemonic, encryptData, decryptData, deriveVaultId, registerBiometric, isBiometricAvailable } from './lib/encryption';
import { generateUniqueName } from './lib/naming';

const defaultApiKey = ""; // 実行環境から自動的に提供されます

interface Note {
  id: string;
  title: string;
  text: string;
  summary: string | null;
  vector: number[] | null;
  fileData: string | null;
  fileName: string | null;
  fileType: string | null;
  links?: LinkMetadata[];
  tags?: string[];
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

interface UserProfile {
  vaultId: string;
  name: string;
  lastActive: string;
}

const INITIAL_MODELS: GeminiModel[] = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', description: '次世代高速モデル' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', description: '次世代最上位モデル', isPaid: true },
];

// --- メインコンポーネント ---

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVector, setSearchVector] = useState<number[] | null>(null);
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>(INITIAL_MODELS);
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3-flash-preview');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [error, setError] = useState('');
  
  // マネジメント用のUI状態
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyValue, setNewApiKeyValue] = useState('');
  const [editingApiKeyId, setEditingApiKeyId] = useState<string | null>(null);
  const [editingApiKeyName, setEditingApiKeyName] = useState('');
  
  // ファイルアップロード状態
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  
  // UI状態
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagCloudOpen, setIsTagCloudOpen] = useState(false);
  const [isEditingProfileName, setIsEditingProfileName] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  
  // エディタ拡張状態
  const [editorMode, setEditorMode] = useState<'write' | 'preview' | 'diff'>('write');
  const [originalTextForDiff, setOriginalTextForDiff] = useState('');
  
  // セキュリティ状態
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [masterMnemonic, setMasterMnemonic] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(() => {
    return localStorage.getItem('neural_db_encrypted') === 'true';
  });
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [editingProfileName, setEditingProfileName] = useState('');
  
  const inputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);

  // メモの初期化・保存
  useEffect(() => {
    // メモのロード
    const savedNotes = localStorage.getItem('neural_db_notes');
    const encryptedFlag = localStorage.getItem('neural_db_encrypted') === 'true';
    
    if (savedNotes) {
      if (!encryptedFlag) {
        // 暗号化されていないデータがある場合は、そのままロード（後で設定可能）
        try {
          setNotes(JSON.parse(savedNotes));
          setIsLocked(false);
        } catch (e) {
          console.error('Failed to load notes:', e);
        }
      } else {
        // 暗号化されている場合は、認証（masterKeyのセット）を待つ
        setIsLocked(true);
      }
    } else {
      // メモがない＝新規ユーザー。暗号化セットアップを推奨するためロック画面（セットアップ）を表示
      if (localStorage.getItem('neural_db_encrypted')) {
        // 過去に暗号化設定だけしたことがある場合はロック
        setIsLocked(true);
      } else {
        // 完全に初めて
        setIsLocked(true);
      }
    }

    // プロファイルのロード
    const savedProfiles = localStorage.getItem('neural_db_profiles');
    if (savedProfiles) {
      setProfiles(JSON.parse(savedProfiles));
    }
  }, []);

  // 認証成功時の処理
  useEffect(() => {
    if (masterKey && isEncrypted && vaultId) {
      const vaultKey = `neural_db_vault_${vaultId}`;
      const savedNotes = localStorage.getItem(vaultKey);
      
      if (savedNotes) {
        decryptData(savedNotes, masterKey)
          .then(decrypted => {
            setNotes(JSON.parse(decrypted));
            setIsLocked(false);
            
            // プロファイル一覧を更新
            setProfiles(prev => {
              const saved = localStorage.getItem('neural_db_profiles');
              const currentProfiles = saved ? JSON.parse(saved) : prev;
              const existing = currentProfiles.find((p: any) => p.vaultId === vaultId);
              
              let updated;
              if (existing) {
                // すでに名前がある場合は、最終アクティブ日時だけ更新（名前は既存を優先）
                updated = currentProfiles.map((p: any) => p.vaultId === vaultId ? { ...p, lastActive: new Date().toISOString() } : p);
              } else {
                // 初めてのログインなら名前を生成
                const newName = generateUniqueName(currentProfiles.map((p: any) => p.name));
                updated = [...currentProfiles, { vaultId, name: newName, lastActive: new Date().toISOString() }];
              }
              
              localStorage.setItem('neural_db_profiles', JSON.stringify(updated));
              return updated;
            });

            // APIキーのロード（ユーザー別）
            const apiKeysKey = `neural_db_api_keys_${vaultId}`;
            const savedKeys = localStorage.getItem(apiKeysKey);
            if (savedKeys) {
              const parsed = JSON.parse(savedKeys);
              setApiKeys(parsed);
              if (parsed.length > 0) setSelectedApiKeyId(parsed[0].id);
            } else {
              setApiKeys([]);
              setSelectedApiKeyId(null);
            }
          })
          .catch(err => {
            console.error('復号に失敗しました:', err);
            setError('認証に失敗しました。キーが正しくない可能性があります。');
            setMasterKey(null);
            setVaultId(null);
            setMasterMnemonic(null);
            setApiKeys([]);
          });
      } else {
        // 新規ユーザーまたは新しいVault：保存されたメモがない場合は空のリストをセットして解除
        setNotes([]);
        setApiKeys([]);
        setSelectedApiKeyId(null);
        setIsLocked(false);
      }
    }
  }, [masterKey, isEncrypted, vaultId]);

  useEffect(() => {
    if (isLocked || !vaultId) return; // ロック中またはVault未指定時は保存しない
    const apiKeysKey = `neural_db_api_keys_${vaultId}`;
    localStorage.setItem(apiKeysKey, JSON.stringify(apiKeys));
  }, [apiKeys, vaultId, isLocked]);

  useEffect(() => {
    if (isLocked) return; // ロック中は上書き保存しない

    const saveNotes = async () => {
      const notesJson = JSON.stringify(notes);
      if (isEncrypted && masterKey && vaultId) {
        const encrypted = await encryptData(notesJson, masterKey);
        const vaultKey = `neural_db_vault_${vaultId}`;
        localStorage.setItem(vaultKey, encrypted);
        localStorage.setItem('neural_db_encrypted', 'true');
      } else if (!isEncrypted) {
        localStorage.setItem('neural_db_notes', notesJson);
        localStorage.setItem('neural_db_encrypted', 'false');
      }
    };
    
    saveNotes();
  }, [notes, isEncrypted, masterKey, isLocked, vaultId]);

  const activeApiKey = useMemo(() => {
    const selected = apiKeys.find(ak => ak.id === selectedApiKeyId);
    return selected ? selected.key : defaultApiKey;
  }, [apiKeys, selectedApiKeyId]);

  // APIキー変更時にモデルリストを更新
  useEffect(() => {
    const fetchModels = async () => {
      if (!activeApiKey) {
        setAvailableModels(INITIAL_MODELS);
        return;
      }

      setIsLoadingModels(true);
      try {
        const models = await getAvailableModels(activeApiKey);
        if (models.length > 0) {
          setAvailableModels(models);
          // 現在選択されているモデルが新しいリストにない場合は、最初のモデルを選択
          if (!models.find(m => m.id === selectedModelId)) {
            setSelectedModelId(models[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
        // エラー時は初期リストを維持
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [activeApiKey]);

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

  const handleUpdateApiKeyName = (id: string) => {
    if (!editingApiKeyName.trim()) return;
    setApiKeys(prev => prev.map(ak => ak.id === id ? { ...ak, name: editingApiKeyName.trim() } : ak));
    setEditingApiKeyId(null);
    setEditingApiKeyName('');
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const allTags = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach(note => {
      (note.tags || []).forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [notes]);

  const handleCloseInput = () => {
    setNewNoteTitle('');
    setNewNoteText('');
    setPendingFile(null);
    setEditingNoteId(null);
    setIsInputExpanded(false);
    setIsFocusMode(false);
    setEditorMode('write');
    setOriginalTextForDiff('');
  };

  const handleToggleFocus = () => {
    if (!isFocusMode) {
      setEditorMode('write');
      setOriginalTextForDiff('');
    }
    setIsFocusMode(prev => !prev);
  };

  // メモの保存・更新
  const handleSaveNote = async () => {
    if (!newNoteText.trim() && !pendingFile) {
      handleCloseInput();
      return;
    }
    

    setIsAdding(true);
    setError('');
    try {
      let vectorToUse = null;
      let finalSummary = "";
      let linkMetadataResults: LinkMetadata[] = [];
      
      // URLの検知とメタデータの取得
      const urls = extractUrls(newNoteText);
      if (urls.length > 0) {
        linkMetadataResults = await Promise.all(urls.map(url => fetchLinkMetadata(url)));
      }
      
      // APIキーがある場合のみAI処理を実行
      if (activeApiKey) {
        if (pendingFile) {
          setIsProcessingFile(true);
          try {
            // ファイルの要約を取得
            finalSummary = await summarizeFile(pendingFile.data, pendingFile.type, activeApiKey, selectedModelId);
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
            } else {
              // 既存ノートのテキストが変更された場合、または新規テキストノートの場合
              vectorToUse = await getEmbedding(newNoteText, activeApiKey);
            }
          } else {
            // 新規テキストノートの場合
            vectorToUse = await getEmbedding(newNoteText, activeApiKey);
          }
        }
      }

      let finalTitle = newNoteTitle.trim();
      
      if (!finalTitle) {
        if (activeApiKey) {
          setIsGeneratingTitle(true);
          try {
            finalTitle = await generateTitle(pendingFile ? finalSummary : newNoteText, activeApiKey, selectedModelId);
          } finally {
            setIsGeneratingTitle(false);
          }
        } else {
          finalTitle = pendingFile ? pendingFile.name : (newNoteText.slice(0, 10) || "無題のメモ");
        }
      }

      // タグ生成
      let finalTags: string[] | undefined = (editingNoteId && !activeApiKey) ? notes.find(n => n.id === editingNoteId)?.tags : undefined;
      if (activeApiKey) {
        try {
          finalTags = await generateTags(pendingFile ? finalSummary : newNoteText, activeApiKey, selectedModelId);
          
          // タグを含めた最終的なベクトルを生成（既に取得済みでも上書きして精度を上げる）
          const linkContext = linkMetadataResults
            .filter(l => l.status === 'success' && l.title)
            .map(l => l.title)
            .join('\n');
          const tagContext = finalTags.join(', ');
          const textToEmbed = [finalTitle, pendingFile ? finalSummary : newNoteText, linkContext, tagContext].filter(Boolean).join('\n');
          vectorToUse = await getEmbedding(textToEmbed, activeApiKey);
        } catch (e) {
          console.error('Tag generation/vectorization failed', e);
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
        links: linkMetadataResults.length > 0 ? linkMetadataResults : (editingNoteId ? notes.find(n => n.id === editingNoteId)?.links : undefined),
        tags: finalTags,
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

  // 単体ベクトル化（後出しベクトル化・要約）
  const handleVectorizeNote = async (id: string) => {
    if (!activeApiKey) return;
    const note = notes.find(n => n.id === id);
    if (!note) return;

    setIsAdding(true);
    try {
      let currentText = note.text;
      let currentSummary = note.summary;
      let currentLinks = note.links || [];
      
      // 画像やファイルがあり、まだ要約されていない場合は先に要約を実行
      if (note.fileData && !note.summary) {
        currentSummary = await summarizeFile(note.fileData, note.fileType || '', activeApiKey, selectedModelId);
        currentText = currentSummary; // ファイルの場合は要約を本文とする
      }

      // Linkメタデータが未取得の場合は取得
      if (currentLinks.length === 0) {
        const urls = extractUrls(currentText);
        if (urls.length > 0) {
          currentLinks = await Promise.all(urls.map(url => fetchLinkMetadata(url)));
        }
      }

      const linkContext = currentLinks
        .filter(l => l.status === 'success' && l.title)
        .map(l => l.title)
        .join('\n');

      // タグの生成
      const currentTags = await generateTags(currentText, activeApiKey, selectedModelId);
      const tagContext = currentTags.join(', ');

      const textToEmbed = [
        note.title,
        currentText,
        linkContext,
        tagContext
      ].filter(Boolean).join('\n');

      const vector = await getEmbedding(textToEmbed, activeApiKey);
      setNotes(prev => prev.map(n => n.id === id ? { ...n, vector, text: currentText, summary: currentSummary, links: currentLinks, tags: currentTags } : n));
    } catch (err) {
      console.error('Vectorization failed:', err);
      setError('AI処理（再解析）に失敗しました。APIキーやモデル設定を確認してください。');
    } finally {
      setIsAdding(false);
    }
  };

  // 一括ベクトル化 (Batch Processing)
  const handleVectorizeAll = async () => {
    if (!activeApiKey) return;
    const unvectorized = notes.filter(n => !n.vector);
    if (unvectorized.length === 0) return;

    setIsAdding(true);
    let successCount = 0;
    let failCount = 0;
    
    try {
      // 1. ファイル要約が必要なものを並列処理（Promise.all）
      const updatedNotesMap = new Map<string, Partial<Note>>();
      
      const summaryPromises = unvectorized.map(async (note) => {
        let currentText = note.text;
        let currentSummary = note.summary;
        let currentLinks = note.links || [];

        // 1.1 ファイル要約
        if (note.fileData && !note.summary) {
          try {
            currentSummary = await summarizeFile(note.fileData, note.fileType || '', activeApiKey, selectedModelId);
            currentText = currentSummary;
            updatedNotesMap.set(note.id, { summary: currentSummary, text: currentSummary });
          } catch (e) {
            console.error(`Failed to summarize: ${note.id}`, e);
            failCount++;
            return null;
          }
        }

        // 1.2 URLメタデータ取得
        if (currentLinks.length === 0) {
          const urls = extractUrls(currentText);
          if (urls.length > 0) {
            currentLinks = await Promise.all(urls.map(url => fetchLinkMetadata(url)));
            const existing = updatedNotesMap.get(note.id) || {};
            updatedNotesMap.set(note.id, { ...existing, links: currentLinks });
          }
        }

        // 1.3 AIタグ生成
        let currentTags: string[] = [];
        try {
          currentTags = await generateTags(currentText, activeApiKey, selectedModelId);
          const existing = updatedNotesMap.get(note.id) || {};
          updatedNotesMap.set(note.id, { ...existing, tags: currentTags });
        } catch (e) {
          console.error(`Failed to generate tags for: ${note.id}`, e);
        }

        return { id: note.id, text: currentText, title: note.title, links: currentLinks, tags: currentTags };
      });

      const processedItems = (await Promise.all(summaryPromises)).filter(item => item !== null);

      if (processedItems.length === 0) {
        if (failCount > 0) setError(`処理に失敗しました。詳細を確認してください。`);
        return;
      }

      // 2. Batch Embedding APIで一括ベクトル化
      const textsToEmbed = processedItems.map(item => {
        if (!item) return '';
        const linkContext = item.links
          .filter(l => l.status === 'success' && l.title)
          .map(l => l.title)
          .join('\n');
        const tagContext = (item.tags || []).join(', ');
        return [item.title, item.text, linkContext, tagContext].filter(Boolean).join('\n');
      });
      const embeddings = await batchGetEmbeddings(textsToEmbed, activeApiKey);

      // 3. stateを一括更新
      setNotes(prev => {
        let newNotes = [...prev];
        processedItems.forEach((item, index) => {
          if (!item) return;
          const vector = embeddings[index];
          const extra = updatedNotesMap.get(item.id) || {};
          newNotes = newNotes.map(n => n.id === item.id ? { ...n, ...extra, vector } : n);
          successCount++;
        });
        return newNotes;
      });

      if (failCount === 0) {
        setError(`${successCount}件のメモを同期しました。`);
      } else {
        setError(`${successCount}件成功、${failCount}件失敗しました。ネットワーク状況を確認してください。`);
      }
    } catch (err: any) {
      console.error('Batch sync failed:', err);
      setError('同期に致命的なエラーが発生しました: ' + err.message);
    } finally {
      setIsAdding(false);
    }
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

  const processFile = (file: File) => {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
        }
      }
    }
  };

  // 検索処理
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchVector(null);
      return;
    }

    // APIキーがない場合はベクトル生成をスキップして簡易検索（displayedNotes側で処理）
    if (!activeApiKey) {
      setSearchVector(null);
      return;
    }

    setIsSearching(true);
    setError('');
    try {
      const vector = await getEmbedding(searchQuery, activeApiKey);
      setSearchVector(vector);
    } catch (err) {
      console.error('Semantic search failed, falling back to local search.');
      setSearchVector(null);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleAiEdit = async (instruction: string) => {
    if (!instruction.trim()) return;
    const apiKeyToUse = apiKeys.find(ak => ak.id === selectedApiKeyId)?.key || defaultApiKey;
    if (!apiKeyToUse && !isEncrypted) {
      setError('AI機能を使用するにはAPIキーの設定が必要です');
      return;
    }

    setIsAiEditing(true);
    try {
      const result = await editNoteWithAI(newNoteText, instruction, apiKeyToUse);
      if (isFocusMode) {
        // 全画面モード時は差分表示へ
        setOriginalTextForDiff(newNoteText);
        setNewNoteText(result); // resultを入れるが、確定前
        setEditorMode('diff');
      } else {
        setNewNoteText(result);
      }
      setAiInstruction('');
    } catch (err: any) {
      setError('AI編集に失敗しました: ' + err.message);
    } finally {
      setIsAiEditing(false);
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

  const handleUnlock = async (mnemonic: string) => {
    setError('');
    try {
      const key = await deriveKeyFromMnemonic(mnemonic);
      const id = await deriveVaultId(mnemonic);
      setMasterKey(key);
      setVaultId(id);
      setMasterMnemonic(mnemonic);
      if (!isEncrypted) {
        setIsEncrypted(true);
        localStorage.setItem('neural_db_encrypted', 'true');
      }
    } catch (e) {
      console.error(e);
      alert('無効なキーです');
    }
  };

  const handleLogout = () => {
    setMasterKey(null);
    setVaultId(null);
    setMasterMnemonic(null);
    setNotes([]);
    setApiKeys([]);
    setSelectedApiKeyId(null);
    setIsLocked(true);
    setError('');
  };

  const handleDeleteVault = () => {
    if (!vaultId) return;
    
    const confirm1 = window.confirm('⚠ 警告: このユーザーの全データを永久に削除しますか？\nこの操作は取り消せません。');
    if (!confirm1) return;
    
    const confirm2 = window.prompt('完全に削除するには "DELETE" と入力してください:');
    if (confirm2 !== 'DELETE') return;

    const vaultKey = `neural_db_vault_${vaultId}`;
    const apiKeysKey = `neural_db_api_keys_${vaultId}`;
    localStorage.removeItem(vaultKey);
    localStorage.removeItem(apiKeysKey);
    
    // プロファイルを削除
    setProfiles(prev => {
      const updated = prev.filter(p => p.vaultId !== vaultId);
      localStorage.setItem('neural_db_profiles', JSON.stringify(updated));
      return updated;
    });

    // 状態リセット
    setMasterKey(null);
    setVaultId(null);
    setNotes([]);
    setApiKeys([]);
    setSelectedApiKeyId(null);
    setIsLocked(true);
    setError('ユーザーデータが完全に消去されました。');
  };

  const handleRenameProfile = () => {
    if (!vaultId || !editingProfileName.trim()) return;
    
    setProfiles(prev => {
      const updated = prev.map(p => p.vaultId === vaultId ? { ...p, name: editingProfileName.trim() } : p);
      localStorage.setItem('neural_db_profiles', JSON.stringify(updated));
      return updated;
    });
    alert('プロファイル名を変更しました。');
  };

  const currentProfile = profiles.find(p => p.vaultId === vaultId);
  useEffect(() => {
    if (currentProfile) setEditingProfileName(currentProfile.name);
  }, [currentProfile, isApiKeyModalOpen]);

  const handleToggleEncryption = () => {
    if (!masterKey && isEncrypted) return;
    setIsEncrypted(!isEncrypted);
  };

  const handleRegisterBiometric = async () => {
    if (!masterMnemonic || !vaultId) {
      setError('生体認証を登録するには、まずシードフレーズでログインしてください。');
      return;
    }

    try {
      // 最新のプロファイル情報を反映させる
      const saved = localStorage.getItem('neural_db_profiles');
      const latestProfiles = saved ? JSON.parse(saved) : profiles;
      if (saved) setProfiles(latestProfiles);

      const currentName = latestProfiles.find((p: any) => p.vaultId === vaultId)?.name;
      await registerBiometric(masterMnemonic, vaultId, currentName);
      alert('生体認証を登録しました。');
      
      // 状態をさらに更新
      setProfiles(prev => {
        const updated = prev.map(p => p.vaultId === vaultId ? { ...p, hasBiometric: true } : p);
        localStorage.setItem('neural_db_profiles', JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      console.error('Biometric registration failed:', err);
      setError('生体認証の登録に失敗しました: ' + err.message);
    }
  };

  const handleImportNotes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result;
      if (typeof result !== 'string') return;
      try {
        const importedData = JSON.parse(result);
        if (Array.isArray(importedData) && importedData.every((n: any) => n.id && n.text)) {
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

  // ベクトル類似度検索 + キーワードフィルタリング + タグフィルタリング
  const filteredNotes = useMemo(() => {
    let result = [...notes];
    
    // 1. タグフィルタリング
    if (selectedTags.length > 0) {
      result = result.filter(n => 
        selectedTags.every(t => (n.tags || []).includes(t))
      );
    }

    // 2. 検索フィルタリング
    const query = searchQuery.toLowerCase().trim();
    
    // ベクトル検索時
    if (searchVector) {
      return result
        .map(note => ({ ...note, score: note.vector ? calculateCosineSimilarity(searchVector, note.vector) : 0 }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    
    // キーワード検索時（または検索なし）
    if (query) {
      return result
        .filter(note => 
          note.title.toLowerCase().includes(query) || 
          note.text.toLowerCase().includes(query) ||
          (note.summary && note.summary.toLowerCase().includes(query))
        )
        .map(n => ({ ...n, score: null as number | null }));
    }

    return result.map(n => ({ ...n, score: null as number | null }));
  }, [notes, searchVector, searchQuery, selectedTags]);

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
    <div className="min-h-screen bg-zinc-950 text-cyan-50 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 認証・ロック画面 */}
      {isLocked && (
        <NeuralLink 
          onUnlock={handleUnlock} 
          isInitialSetup={!isEncrypted && notes.length === 0} 
          profiles={profiles}
        />
      )}
      
      {/* ーーー ヘッダー ーーー */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-cyan-500/30 px-4 py-2 shadow-[0_4px_20px_rgba(6,182,212,0.15)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-max">
            <div className="bg-zinc-900 border border-fuchsia-500 p-1.5 shadow-[0_0_10px_rgba(217,70,239,0.3)]">
              <Terminal className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 leading-none">
                NEURAL_DB
              </h1>
              <div className="flex items-center gap-1 mt-0.5">
                {isEditingProfileName ? (
                  <input 
                    type="text" 
                    className="bg-black border border-cyan-500 py-0.5 px-1 text-[0.55rem] text-cyan-400 outline-none w-20 font-bold uppercase"
                    value={editingProfileName}
                    onChange={(e) => setEditingProfileName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameProfile();
                        setIsEditingProfileName(false);
                      }
                      if (e.key === 'Escape') setIsEditingProfileName(false);
                    }}
                    onBlur={() => setIsEditingProfileName(false)}
                  />
                ) : (
                  <div 
                    className="group flex items-center gap-1 cursor-pointer"
                    onClick={() => setIsEditingProfileName(true)}
                  >
                    <span className="text-[0.55rem] text-cyan-600 tracking-[0.2em] font-bold uppercase truncate max-w-[80px]">
                      {currentProfile?.name || 'GUEST'}
                    </span>
                    <Edit2 className="w-2 h-2 text-cyan-900 group-hover:text-cyan-400 transition-colors" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-3xl px-2">
            <div className="relative flex items-center w-full bg-zinc-900/50 border border-cyan-900/40 focus-within:border-cyan-400/60 focus-within:bg-zinc-900 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all">
              <button onClick={handleSearch} disabled={isSearching} className="p-2.5 text-cyan-600 hover:text-cyan-300">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-fuchsia-500" /> : <Search className="w-4 h-4" />}
              </button>
              <input
                type="text"
                className="w-full bg-transparent border-none focus:ring-0 py-2.5 pr-4 text-sm placeholder-cyan-900/60 outline-none text-cyan-100 font-mono"
                placeholder="検索 > 意味・文脈スキャン..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchVector(null); }} className="p-2.5 text-fuchsia-500 hover:text-fuchsia-300">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeApiKey && notes.some(n => !n.vector) && (
              <button 
                onClick={handleVectorizeAll}
                disabled={isAdding}
                className="p-2.5 bg-fuchsia-950/20 border border-fuchsia-900/30 text-fuchsia-500 hover:border-fuchsia-500 hover:text-fuchsia-400 transition-all rounded-sm hidden sm:block"
                title="未同期のメモを一括同期"
              >
                <RefreshCw className={`w-4 h-4 ${isAdding ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            <button
              onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}
              className={`
                p-2.5 transition-all border rounded-sm flex items-center gap-2
                ${isControlPanelOpen 
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                  : 'bg-zinc-900 border-cyan-900/50 text-cyan-500 hover:border-cyan-700 hover:text-cyan-400'
                }
              `}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] hidden xl:block">システム</span>
            </button>
          </div>
        </div>

        {/* --- コントロールパネル (統合メニュー) --- */}
        {isControlPanelOpen && (
          <div className="absolute top-full left-0 right-0 bg-zinc-950/95 backdrop-blur-xl border-b border-cyan-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-4 duration-200">
            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* セクション 1: AI エンジン */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-cyan-400">
                  <BrainCircuit className="w-4 h-4" />
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest">AIエンジン</span>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[0.55rem] text-zinc-500 font-bold uppercase tracking-wider">モデル</span>
                    <div className="flex items-center gap-2 bg-black/50 border border-cyan-900/50 p-2 focus-within:border-cyan-500 transition-all">
                      <select 
                        className="bg-transparent border-none text-[0.65rem] focus:ring-0 p-0 outline-none text-cyan-100 flex-1 appearance-none cursor-pointer font-bold disabled:opacity-50"
                        value={selectedModelId}
                        onChange={(e) => setSelectedModelId(e.target.value)}
                        disabled={isLoadingModels}
                      >
                        {isLoadingModels ? (
                          <option className="bg-zinc-900">読み込み中...</option>
                        ) : (
                          availableModels.map(model => (
                            <option key={model.id} value={model.id} className="bg-zinc-900" title={model.description}>
                              {model.name} {model.isPaid ? '★' : ''}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="w-3 h-3 text-cyan-600" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[0.55rem] text-zinc-500 font-bold uppercase tracking-wider">APIキー</span>
                    <div className="flex items-center gap-2 bg-black/50 border border-fuchsia-900/50 p-2 focus-within:border-fuchsia-500 transition-all">
                      <select 
                        className="bg-transparent border-none text-[0.65rem] focus:ring-0 p-0 outline-none text-fuchsia-100 flex-1 appearance-none cursor-pointer font-bold"
                        value={selectedApiKeyId || ''}
                        onChange={(e) => setSelectedApiKeyId(e.target.value)}
                      >
                        <option value="" disabled className="bg-zinc-900 text-zinc-600">未選択</option>
                        {apiKeys.map(ak => (
                          <option key={ak.id} value={ak.id} className="bg-zinc-900">{ak.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-fuchsia-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* セクション 2: インテリジェンス */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-cyan-400">
                  <TagIcon className="w-4 h-4" />
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest">インテリジェンス</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => { setIsTagCloudOpen(!isTagCloudOpen); setIsControlPanelOpen(false); }}
                    className={`
                      w-full flex items-center justify-between p-3 border transition-all text-[0.65rem] font-bold uppercase tracking-widest
                      ${isTagCloudOpen 
                        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300' 
                        : 'bg-black/50 border-zinc-800 text-zinc-500 hover:border-cyan-900/50 hover:text-cyan-400'
                      }
                    `}
                  >
                    <span>タグクラウド検索</span>
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={handleVectorizeAll}
                    disabled={isAdding || notes.filter(n => !n.vector).length === 0}
                    className="w-full flex items-center justify-between p-3 bg-black/50 border border-zinc-800 text-fuchsia-500 hover:border-fuchsia-900/50 hover:text-fuchsia-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-[0.65rem] font-bold uppercase tracking-widest"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`w-3.5 h-3.5 ${isAdding ? 'animate-spin' : ''}`} />
                      <span>全てのメモを同期</span>
                    </div>
                    <span className="bg-fuchsia-900/20 px-1.5 py-0.5 rounded-full text-[0.5rem]">{notes.filter(n => !n.vector).length}</span>
                  </button>
                </div>
              </div>

              {/* セクション 3: システム管理 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Terminal className="w-4 h-4" />
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest">システム管理</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleExport} className="p-3 bg-black/50 border border-zinc-800 text-zinc-500 hover:border-cyan-900/50 hover:text-cyan-400 transition-all text-[0.6rem] font-bold uppercase tracking-tighter flex items-center justify-center gap-2">
                    <Download className="w-3.5 h-3.5" /> エクスポート
                  </button>
                  <label className="p-3 bg-black/50 border border-zinc-800 text-zinc-500 hover:border-cyan-900/50 hover:text-cyan-400 transition-all text-[0.6rem] font-bold uppercase tracking-tighter flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> インポート
                    <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportNotes} />
                  </label>
                  <button onClick={() => setIsApiKeyModalOpen(true)} className="col-span-2 p-3 bg-black/50 border border-zinc-800 text-zinc-500 hover:border-fuchsia-900/50 hover:text-fuchsia-400 transition-all text-[0.65rem] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                    <Key className="w-3.5 h-3.5" /> マスターAPIキー設定
                  </button>
                </div>
              </div>

              {/* セクション 4: セキュリティ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-500">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest">セキュリティ</span>
                </div>
                <div className="space-y-2">
                  {masterKey && (
                    <button
                      onClick={handleLogout}
                      className="w-full p-3 bg-red-950/10 border border-red-900/30 text-red-700 hover:bg-red-950/20 hover:border-red-900/50 transition-all text-[0.65rem] font-bold uppercase tracking-widest flex items-center gap-3"
                    >
                      <LogOut className="w-4 h-4" />
                      ログアウト (Vaultを閉じる)
                    </button>
                  )}
                  {masterKey && (
                    <button
                      onClick={handleDeleteVault}
                      className="w-full p-3 bg-red-950/5 border border-transparent text-red-950/40 hover:text-red-900 hover:bg-red-950/10 transition-all text-[0.55rem] font-bold uppercase tracking-widest flex items-center gap-3"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      この装置のデータを全削除
                    </button>
                  )}
                </div>
                <div className="pt-2 border-t border-zinc-900">
                   <p className="text-[0.5rem] text-zinc-700 font-mono tracking-tighter leading-relaxed">
                    NEURAL_DB // ENCRYPTED_VAULT:{vaultId?.slice(0, 16)}...
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-zinc-900/50 px-6 py-2 border-t border-cyan-500/10 flex justify-center">
              <button 
                onClick={() => setIsControlPanelOpen(false)}
                className="text-[0.55rem] font-bold text-cyan-900 hover:text-cyan-500 transition-all tracking-[0.5em] py-1"
              >
                / パネルを閉じる /
              </button>
            </div>
          </div>
        )}
      </header>

      {/* APIキー管理モーダル */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-fuchsia-500 shadow-[0_0_30px_rgba(217,70,239,0.2)] w-full max-w-md overflow-hidden">
            <div className="bg-fuchsia-600 px-4 py-2 flex items-center justify-between">
               <h3 className="text-white text-xs font-bold tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4" /> システム設定ターミナル
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

              {/* プロファイル設定 */}
              <div className="space-y-4 mb-8 pt-4 border-t border-fuchsia-900/30">
                <div className="flex flex-col gap-1">
                  <span className="text-[0.6rem] text-fuchsia-500 tracking-widest mb-1">Identity / 自己識別</span>
                  <div className="flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="プロファイル名..." 
                      className="bg-black border border-fuchsia-900/50 p-2 text-xs text-cyan-400 outline-none focus:border-fuchsia-500 flex-1 font-mono"
                      value={editingProfileName}
                      onChange={(e) => setEditingProfileName(e.target.value)}
                    />
                    <button 
                      onClick={handleRenameProfile}
                      className="bg-cyan-900/40 text-cyan-400 px-4 py-2 text-[0.6rem] font-bold border border-cyan-500/50 hover:bg-cyan-500 hover:text-cyan-950 transition-all uppercase tracking-widest"
                    >
                      変更
                    </button>
                  </div>
                  <p className="text-[0.5rem] text-zinc-600 italic mt-1 font-mono uppercase">Vault_ID: {vaultId}</p>
                </div>
              </div>

              {/* 生体認証セクション */}
              <div className="space-y-4 mb-8 pt-4 border-t border-fuchsia-900/30">
                <div className="flex flex-col gap-1">
                  <span className="text-[0.6rem] text-fuchsia-500 tracking-widest mb-1">セキュリティ設定</span>
                  <div className="flex items-center justify-between p-3 bg-black/50 border border-fuchsia-900/20 text-left">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="w-5 h-5 text-cyan-500" />
                      <div className="flex flex-col">
                        <span className="text-xs text-cyan-100 font-bold">生体認証 (WebAuthn)</span>
                        <span className="text-[0.55rem] text-zinc-600">このデバイスでログインを簡略化</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleRegisterBiometric}
                      className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-500 text-cyan-400 text-[0.6rem] font-bold hover:bg-cyan-500 hover:text-cyan-950 transition-all uppercase tracking-widest"
                    >
                      登録
                    </button>
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
                      <div className="flex flex-col flex-1 mr-2">
                        {editingApiKeyId === ak.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              className="bg-black border border-fuchsia-500 p-1 text-xs text-cyan-400 outline-none w-full"
                              value={editingApiKeyName}
                              onChange={(e) => setEditingApiKeyName(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateApiKeyName(ak.id);
                                if (e.key === 'Escape') setEditingApiKeyId(null);
                              }}
                            />
                            <button 
                              onClick={() => handleUpdateApiKeyName(ak.id)}
                              className="p-1 text-emerald-500 hover:text-emerald-300"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingApiKeyId(null)}
                              className="p-1 text-zinc-500 hover:text-zinc-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-cyan-300 font-bold">{ak.name}</span>
                              <button 
                                onClick={() => {
                                  setEditingApiKeyId(ak.id);
                                  setEditingApiKeyName(ak.name);
                                }}
                                className="p-1 text-zinc-600 hover:text-cyan-400 transition-colors"
                                title="名前を変更"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-[0.5rem] text-zinc-600">••••••••{ak.key.slice(-4)}</span>
                          </>
                        )}
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
                [ 閉じる ]
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
                onPaste={handlePaste}
              />
              <textarea
                autoFocus={!editingNoteId}
                className="w-full px-4 pb-4 bg-transparent resize-none outline-none min-h-[120px] max-h-[500px] overflow-y-auto text-cyan-50 placeholder-cyan-800/70 custom-scrollbar"
                placeholder="データ内容を入力..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onPaste={handlePaste}
              />
              
              <div className="flex items-center justify-between p-3 bg-zinc-950 border-t border-cyan-900">
                <div className="flex items-center gap-2 text-xs text-fuchsia-400 opacity-80">
                  <BrainCircuit className="w-4 h-4" />
                  <span className="tracking-widest">
                    {!activeApiKey ? 'ローカルモード継続中 (保存のみ可能)' :
                     isProcessingFile ? 'Geminiが解析中...' : 
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

        <TagCloud 
          tags={allTags} 
          selectedTags={selectedTags} 
          onToggleTag={handleToggleTag} 
          isOpen={isTagCloudOpen}
          onClose={() => setIsTagCloudOpen(false)}
        />

        {filteredNotes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 border border-cyan-900/50 rounded-none flex items-center justify-center mx-auto mb-6 relative overflow-hidden bg-zinc-900/50">
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 to-transparent"></div>
              <Terminal className="w-10 h-10 text-cyan-800" />
            </div>
            <p className="text-cyan-700 tracking-widest text-sm">データがありません</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-red-900/50 bg-red-950/10">
            <p className="text-red-500/70 tracking-widest text-sm">一致するレコードがありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <div 
                key={note.id}
                onClick={() => handleEditNote(note)}
                className={`break-inside-avoid relative group bg-zinc-900 border transition-all duration-300 ${
                  note.score !== null && note.score > 0.6 
                    ? 'border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.15)] bg-gradient-to-b from-fuchsia-950/20 to-transparent' 
                    : 'border-cyan-900/60 hover:border-cyan-500/80 hover:shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                }`}
              >
                {/* セキュリティ設定 */}
            <div className="p-4 bg-zinc-950 border border-cyan-900/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${isEncrypted ? 'text-cyan-400' : 'text-zinc-700'}`} />
                  <span className="text-[0.65rem] font-bold text-cyan-100 uppercase tracking-widest">ニューラル暗号化</span>
                </div>
                <button
                  onClick={handleToggleEncryption}
                  className={`
                    w-10 h-5 rounded-full relative transition-all duration-300
                    ${isEncrypted ? 'bg-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-zinc-800'}
                  `}
                >
                  <div className={`
                    absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all duration-300
                    ${isEncrypted ? 'translate-x-5' : 'translate-x-0'}
                  `} />
                </button>
              </div>
              <p className="text-[0.55rem] text-cyan-800 leading-tight">
                メモデータを軍用グレードの256bit AESで暗号化します。キーを紛失すると復旧できません。
              </p>
              {isEncrypted && !masterKey && (
                <div className="p-2 bg-amber-950/20 border border-amber-900/50 text-amber-500 text-[0.55rem] font-bold animate-pulse">
                  保存には認証が必要です
                </div>
              )}
            </div>
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
                  
                  <div className="max-h-64 overflow-hidden relative group/content">
                    <NoteContent text={note.text} />
                    {(note.text.split('\n').length > 10 || note.text.length > 500) && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none transition-opacity duration-300 group-hover/content:opacity-40"></div>
                    )}
                  </div>

                  {note.fileData && (
                    <FilePreview 
                      fileData={note.fileData} 
                      fileName={note.fileName} 
                      fileType={note.fileType} 
                    />
                  )}

                  {note.links && note.links.length > 0 && (
                    <LinkPreview links={note.links} />
                  )}

                  {note.tags && note.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {note.tags.map(tag => (
                        <button
                          key={tag}
                          onClick={(e) => { e.stopPropagation(); handleToggleTag(tag); }}
                          className={`
                            px-1.5 py-0.5 text-[0.6rem] font-mono border transition-all
                            ${selectedTags.includes(tag) 
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                              : 'bg-zinc-950/40 border-cyan-900/40 text-cyan-700 hover:border-cyan-600 hover:text-cyan-400'
                            }
                          `}
                        >
                          # {tag}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-5 pt-3 border-t border-zinc-800 flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.65rem] text-cyan-700 tracking-widest">
                          {new Date(note.createdAt).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' }).replace(/\//g, '.')}
                        </span>
                        {!note.vector && (
                          <div className="flex items-center gap-1 text-[0.55rem] text-fuchsia-500/80 bg-fuchsia-950/20 px-1 border border-fuchsia-900/40 font-bold animate-pulse">
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>未同期</span>
                          </div>
                        )}
                      </div>
                      {note.updatedAt && note.updatedAt !== note.createdAt && (
                        <span className="text-[0.6rem] text-fuchsia-600/70 tracking-widest leading-none">更新済</span>
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
                        {!note.vector && activeApiKey && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleVectorizeNote(note.id); }}
                            className="p-1.5 text-fuchsia-400 hover:text-fuchsia-200 hover:bg-fuchsia-900/40 transition-all outline-none"
                            title="このメモをベクトル化する"
                          >
                            <BrainCircuit className="w-3.5 h-3.5" />
                          </button>
                        )}
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
                <span className="text-[0.6rem] text-cyan-600 tracking-[0.3em] font-bold uppercase">集中モード起動中</span>
                <span className="text-xs text-fuchsia-400 font-mono italic">
                  {isProcessingFile ? 'System: ファイル解析中...' : 
                   isGeneratingTitle ? 'System: タイトル生成中...' : 'System: 入力待機中...'}
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
              placeholder="タイトルを入力..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              onPaste={handlePaste}
            />
            
            <div className="flex items-center gap-1 mb-6 border-b border-cyan-900/40">
              <button 
                onClick={() => setEditorMode('write')}
                className={`px-4 py-2 text-[0.65rem] font-bold tracking-widest uppercase transition-all ${editorMode === 'write' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-950/20' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                [ Edit ]
              </button>
              <button 
                onClick={() => setEditorMode('preview')}
                className={`px-4 py-2 text-[0.65rem] font-bold tracking-widest uppercase transition-all ${editorMode === 'preview' ? 'text-fuchsia-400 border-b-2 border-fuchsia-500 bg-fuchsia-950/20' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                [ Preview ]
              </button>
              {originalTextForDiff && (
                <button 
                  onClick={() => setEditorMode('diff')}
                  className={`px-4 py-2 text-[0.65rem] font-bold tracking-widest uppercase transition-all ${editorMode === 'diff' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-950/20' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  [ Diff_Scan ]
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-0 overflow-hidden border-l border-cyan-510/10">
              {editorMode === 'write' && (
                <div className="flex-1 flex gap-0 overflow-hidden">
                  <div 
                    className="w-12 flex-shrink-0 flex flex-col items-end pr-3 pt-1 text-cyan-800 font-mono text-lg leading-relaxed select-none overflow-hidden bg-zinc-950/30"
                    id="focus-line-numbers"
                  >
                    {newNoteText.split('\n').map((_, i) => (
                      <div key={i}>{String(i + 1).padStart(2, '0')}</div>
                    ))}
                  </div>
                  <textarea
                    autoFocus
                    className="flex-1 h-full bg-transparent resize-none outline-none text-lg leading-relaxed text-cyan-100 placeholder-zinc-800 font-mono custom-scrollbar pl-4 border-l border-cyan-900/30"
                    placeholder="ここに壮大な思考を記録してください..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onPaste={handlePaste}
                    onScroll={(e) => {
                      const el = document.getElementById('focus-line-numbers');
                      if (el) el.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
                    }}
                  />
                </div>
              )}

              {editorMode === 'preview' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                  <NoteContent text={newNoteText} />
                </div>
              )}

              {editorMode === 'diff' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <DiffView oldText={originalTextForDiff} newText={newNoteText} />
                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-cyan-900/30">
                    <button 
                      onClick={() => {
                        setNewNoteText(originalTextForDiff);
                        setOriginalTextForDiff('');
                        setEditorMode('write');
                      }}
                      className="px-4 py-2 text-[0.6rem] font-bold text-red-500 hover:bg-red-950/30 border border-red-900/50 uppercase tracking-widest"
                    >
                      変更を破棄
                    </button>
                    <button 
                      onClick={() => {
                        setOriginalTextForDiff('');
                        setEditorMode('write');
                      }}
                      className="px-6 py-2 text-[0.6rem] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500 hover:bg-emerald-500 hover:text-emerald-950 transition-all uppercase tracking-widest"
                    >
                      変更を適用
                    </button>
                  </div>
                </div>
              )}
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
            
            <div className="flex-1 flex items-center justify-center gap-4 px-6">
              <div className="relative flex-1 max-w-xl group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <BrainCircuit className={`w-4 h-4 ${isAiEditing ? 'text-fuchsia-500 animate-pulse' : 'text-cyan-700'}`} />
                </div>
                <input 
                  type="text"
                  placeholder={isAiEditing ? "AI 🧠 プロトコル実行中..." : "AIへの指示 (例: 要約して、箇条書きに、英語にして...)"}
                  className="w-full bg-black/50 border border-cyan-900 focus:border-fuchsia-500 p-2 pl-10 text-xs text-cyan-100 outline-none transition-all"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiEdit(aiInstruction)}
                  disabled={isAiEditing}
                />
                <button 
                  onClick={() => handleAiEdit(aiInstruction)}
                  disabled={isAiEditing || !aiInstruction.trim()}
                  className="absolute right-1 top-1 bottom-1 px-3 bg-fuchsia-900/30 text-fuchsia-500 hover:bg-fuchsia-500 hover:text-white transition-all text-[0.6rem] font-bold uppercase disabled:opacity-30"
                >
                  実行
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 px-6 py-3 bg-zinc-950 text-cyan-600 hover:text-cyan-300 transition-all border border-cyan-900 cursor-pointer text-xs font-bold tracking-widest uppercase">
                <Paperclip className="w-4 h-4" />
                <span>添付</span>
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
              
              <button 
                onClick={handleSaveNote}
                disabled={isAdding || (!newNoteText.trim() && !pendingFile)}
                className="px-10 py-3 bg-cyan-950/50 text-cyan-300 border border-cyan-400 hover:bg-cyan-900 hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] disabled:opacity-30 transition-all text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-3"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存実行'}
              </button>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
