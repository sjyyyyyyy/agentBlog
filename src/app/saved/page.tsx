'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { generateId, DEFAULT_CHAT_CONFIG } from '@/lib/storage';
import ArchivePreviewModal from '@/components/chat/ArchivePreviewModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import MarkdownRenderer from '@/components/chat/MarkdownRenderer';
import { ChatSession, Message } from '@/types/chat';

interface SavedConversation {
  id: number;
  title: string;
  message_count: number;
  start_floor: number;
  end_floor: number;
  created_at: number;
  tags?: string;
  config?: any;
}

interface SavedMessage {
  floor: number;
  role: string;
  content: string;
  timestamp: number;
  model?: string;  // 模型名称（可选，旧消息可能没有）
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface DocSuggestion {
  recommendations: string[];
}

// 目录树节点接口 - 匹配 API 返回的树形结构
interface DocTreeNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DocTreeNode[];
}

// 文档结构接口 - 匹配 API 实际返回的数据结构
interface DocStructure {
  repo: string;
  branch: string;
  root: string;
  tree: DocTreeNode[];
}

export default function SavedPage() {
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

    // 归档弹窗状态 - Step 1: 前置弹窗（楼层选择 + 总结）
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  // Step 2: 分区选择弹窗
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archivingConv, setArchivingConv] = useState<SavedConversation | null>(null);
  // 从 Step 1 传递到 Step 2 的总结内容
  const [archiveContent, setArchiveContent] = useState<string>('');
  // 用于 Step 1 的消息列表
  const [archiveMessages, setArchiveMessages] = useState<SavedMessage[]>([]);
  
    // 筛选状态
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // 提取所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    conversations.forEach((conv) => {
      if (conv.tags) {
        conv.tags.split(',').forEach((tag) => {
          const trimmed = tag.trim();
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [conversations]);

  // 筛选后的对话列表
  const filteredConversations = useMemo(() => {
    let result = conversations;
    
    // 标签筛选
    if (selectedTag) {
      result = result.filter((conv) => {
        if (!conv.tags) return false;
        return conv.tags.split(',').some((tag) => tag.trim() === selectedTag);
      });
    }
    
    // 关键字搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      result = result.filter((conv) => {
        return (
          conv.title.toLowerCase().includes(keyword) ||
          (conv.tags && conv.tags.toLowerCase().includes(keyword))
        );
      });
    }
    
    return result;
  }, [conversations, selectedTag, searchKeyword]);

  // 加载对话列表
    const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json() as ApiResponse<SavedConversation[]>;
      
      if (data.success) {
        setConversations(data.data || []);
      }
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

    // 加载对话详情
  const loadMessages = async (id: number) => {
    setLoadingMessages(true);
    setSelectedId(id);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json() as { success: boolean; data?: { messages?: SavedMessage[], id: number, title: string, config?: any, createdAt: number, updatedAt: number } };
      if (data.success && data.data) {
        setMessages(data.data.messages || []);
        // 存储完整的对话数据，以便“加载到主对话”功能使用
        sessionStorage.setItem('temp_cloud_conversation_data', JSON.stringify(data.data));
      } else {
        alert('加载消息失败: ' + (data.message || data.error));
      }
    } catch (error) {
      console.error('加载消息失败:', error);
      alert('加载消息出错');
    } finally {
      setLoadingMessages(false);
    }
  };

    // 确认删除对话
  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${deleteId}`, { method: 'DELETE' });
      const data = await res.json() as ApiResponse<void>;
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== deleteId));
        if (selectedId === deleteId) {
          setSelectedId(null);
          setMessages([]);
        }
        setDeleteId(null);
      }
    } catch (error) {
      console.error('删除失败:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // 开始编辑
  const startEdit = (conv: SavedConversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setEditTags(conv.tags || '');
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const res = await fetch(`/api/conversations/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          tags: editTags.trim(),
        }),
      });
      const data = await res.json() as ApiResponse<void>;
      if (data.success) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === editingId
              ? { ...c, title: editTitle.trim(), tags: editTags.trim() }
              : c
          )
        );
        setEditingId(null);
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  // 复制消息
  const copyMessage = async (content: string) => {
    await navigator.clipboard.writeText(content);
    alert('已复制到剪贴板');
  };

    // 引用消息
  const quoteMessage = (content: string) => {
    const quote = {
      content,
      source: 'cloud',
      timestamp: Date.now(),
    };
    sessionStorage.setItem('pending_quote', JSON.stringify(quote));
    window.location.href = '/';
  };

  // 将整个对话加载到主对话界面
  const loadConversationToMainChat = async () => {
    if (!selectedId) return;

    const storedData = sessionStorage.getItem('temp_cloud_conversation_data');
    if (!storedData) {
      alert('未能获取对话数据，请重新选择对话。');
      return;
    }

    try {
      const cloudData = JSON.parse(storedData) as { messages: SavedMessage[], id: number, title: string, config?: any, createdAt: number, updatedAt: number };
      
            // 转换消息格式，生成本地 ID
      const messagesForLocalChat: Message[] = cloudData.messages.map(sm => ({
        id: generateId(),
        role: sm.role as Message['role'], // 类型断言
        content: sm.content,
        timestamp: sm.timestamp * 1000, // 转换秒为毫秒
        model: (sm as any).model,  // 保留模型信息（如果有）
        // 其他分支字段在 ChatContainer 的 ensureTreeStructure 中会自动初始化
      }));

      const newChatSession: ChatSession = {
        id: generateId(), // 为新的本地会话生成一个新 ID
        title: cloudData.title,
        messages: messagesForLocalChat,
        config: cloudData.config ? { ...DEFAULT_CHAT_CONFIG, ...cloudData.config } : DEFAULT_CHAT_CONFIG,
        createdAt: cloudData.createdAt * 1000,
        updatedAt: cloudData.updatedAt * 1000,
        // messageMap 和 rootIds 会在 ChatContainer 中被 ensureTreeStructure 构建
      };

      sessionStorage.setItem('pending_loaded_chat_session', JSON.stringify(newChatSession));
      sessionStorage.removeItem('temp_cloud_conversation_data'); // 清理临时数据
      window.location.href = '/'; // 跳转到主对话页面

    } catch (error) {
      console.error('加载云端对话到主界面失败:', error);
      alert('加载云端对话出错');
    }
  };

  // 格式化时间
    const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

    // 处理归档点击 - 打开 Step 1 前置弹窗
  const handleArchiveClick = async (conv: SavedConversation) => {
    setArchivingConv(conv);
    // 加载对话消息用于楼层选择
    try {
      const res = await fetch(`/api/conversations/${conv.id}`);
      const data = await res.json() as { success: boolean; data?: { messages?: SavedMessage[] } };
      if (data.success && data.data?.messages) {
        setArchiveMessages(data.data.messages);
        setIsPreviewModalOpen(true);
      } else {
        alert('加载对话消息失败');
      }
    } catch (error) {
      console.error('加载消息失败:', error);
      alert('加载消息出错');
    }
  };

  // Step 1 完成后，进入 Step 2
  const handlePreviewConfirm = (content: string) => {
    setArchiveContent(content);
    setIsPreviewModalOpen(false);
    setIsArchiveModalOpen(true);
  };

  // Step 1 关闭
  const handlePreviewClose = () => {
    setIsPreviewModalOpen(false);
    setArchivingConv(null);
    setArchiveMessages([]);
  };

  // 清除所有筛选
  const clearFilters = () => {
    setSelectedTag(null);
    setSearchKeyword('');
  };

  return (
    <div className="h-full w-full bg-background text-foreground font-mono flex flex-col overflow-hidden">
            {/* 顶部导航 */}
      <div className="border-b border-primary/30 px-4 py-3 bg-black/80 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold font-orbitron tracking-widest text-primary">CLOUD.ARCHIVES</h1>
        <Link
  href="/"
  className="poi-btn"
>
  ← 返回对话
</Link>

        </div>
      </div>

            <div className="flex-1 flex flex-col min-h-0 w-full p-2 md:p-4 lg:p-6 lg:max-w-6xl lg:mx-auto overflow-hidden box-border">
        {/* 搜索和筛选栏 */}
        <div className="flex-shrink-0 mb-2 md:mb-4 bg-black/40 rounded-sm p-2 md:p-4 border border-primary/20 overflow-hidden">
          {/* 移动端筛选头部 */}
          <div className="flex items-center justify-between lg:hidden mb-2">
            <span className="text-sm text-primary/70 font-mono">FILTER & SEARCH</span>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="poi-btn text-xs py-1 px-2"
            >
              {showFilters ? 'COLLAPSE' : 'EXPAND'}
            </button>
          </div>

          <div className={`${showFilters ? 'block' : 'hidden'} lg:block space-y-3`}>
          {/* 关键字搜索 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="🔍 搜索标题或标签..."
                className="poi-input w-full pl-10"
              />
              <svg
                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {(selectedTag || searchKeyword) && (
                            <button
                onClick={clearFilters}
                className="poi-btn text-xs"
              >
                清除筛选
              </button>
            )}
          </div>

          {/* 标签筛选 */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-400">🏷️ 标签：</span>
              <button
                onClick={() => setSelectedTag(null)}
                                className={`px-3 py-1 rounded-sm text-xs border transition-colors font-mono uppercase tracking-wider ${
                  selectedTag === null
                    ? 'bg-primary text-black border-primary font-bold'
                    : 'bg-primary/5 border-primary/30 text-primary/70 hover:text-primary hover:border-primary'
                }`}
              >
                全部
              </button>
              {allTags.map((tag) => {
                const count = conversations.filter((c) =>
                  c.tags?.split(',').some((t) => t.trim() === tag)
                ).length;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                        className={`px-3 py-1 rounded-sm text-xs border transition-colors font-mono uppercase tracking-wider ${
                      selectedTag === tag
                        ? 'bg-primary text-black border-primary font-bold'
                        : 'bg-primary/5 border-primary/30 text-primary/70 hover:text-primary hover:border-primary'
                    }`}
                  >
                    {tag} ({count})
                  </button>
                );
              })}
            </div>
          )}

                    {/* 筛选结果提示 */}
          {(selectedTag || searchKeyword) && (
            <div className="text-sm text-gray-400">
              找到 {filteredConversations.length} 个对话
              {selectedTag && <span className="ml-2">标签: {selectedTag}</span>}
              {searchKeyword && <span className="ml-2">关键字: {searchKeyword}</span>}
            </div>
          )}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-3 gap-4">
                    {/* 左侧：对话列表 */}
          <div className="lg:col-span-1 flex flex-col min-h-0 h-[40%] lg:h-full min-w-0">
            <div className="bg-black/40 rounded-sm border border-primary/20 flex flex-col h-full">
              <div className="p-3 border-b border-primary/20 bg-primary/5">
                <h2 className="font-semibold">
                  对话列表 ({filteredConversations.length}/{conversations.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">加载中...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-3xl mb-2">📭</div>
                  <div>还没有保存的对话</div>
                  <div className="text-sm mt-2">在对话页点击保存按钮可以保存对话</div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-3xl mb-2">🔍</div>
                  <div>没有匹配的对话</div>
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    清除筛选条件
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                                            className={`p-3 border-b border-primary/10 cursor-pointer transition-all duration-300 relative group ${
                        selectedId === conv.id
                          ? 'bg-primary/10 border-l-2 border-l-primary'
                          : 'hover:bg-primary/5 border-l-2 border-l-transparent hover:border-l-primary/50'
                      }`}
                      onClick={() => loadMessages(conv.id)}
                    >
                      {editingId === conv.id ? (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="标题"
                            className="w-full bg-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={editTags}
                            onChange={(e) => setEditTags(e.target.value)}
                            placeholder="标签（逗号分隔，如：工作,学习,AI）"
                            className="w-full bg-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div className="font-medium truncate flex-1">
                                                            <span className="text-xs text-primary/40 mr-2 font-mono">CASE.{String(conv.id).padStart(3, '0')}</span>
                              {conv.title}
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(conv);
                                }}
                                className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                                title="编辑"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                                                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveClick(conv);
                                }}
                                className="p-1 text-gray-500 hover:text-green-400 transition-colors"
                                title="归档到文档"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                              </button>
                                                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(conv.id);
                                }}
                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                title="删除"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {conv.message_count} 条消息 · {conv.start_floor}F-{conv.end_floor}F
                          </div>
                          {conv.tags && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {conv.tags.split(',').map((tag, i) => (
                                <span
                                  key={i}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTag(tag.trim());
                                  }}
                                                                    className={`px-1.5 py-0.5 rounded-sm border text-[10px] cursor-pointer transition-colors font-mono uppercase ${
                                    selectedTag === tag.trim()
                                      ? 'bg-primary text-black border-primary'
                                      : 'bg-transparent border-primary/30 text-primary/70 hover:border-primary'
                                  }`}
                                >
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            {formatTime(conv.created_at)}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

                    {/* 右侧：消息详情 */}
          <div className="lg:col-span-2 flex flex-col min-h-0 h-[60%] lg:h-full min-w-0">
            <div className="bg-black/60 rounded-sm border border-primary/20 flex flex-col relative overflow-hidden h-full">
              {/* Scanline decoration for detail view */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20"></div>
              
              <div className="p-3 border-b border-primary/20 bg-primary/5 flex items-center justify-between relative z-10">
                <h2 className="font-semibold">
                  {selectedId ? '消息详情' : '选择一个对话查看详情'}
                </h2>
                <div className="flex items-center gap-2">
                  {messages.length > 0 && (
                    <span className="text-sm text-gray-500">{messages.length} 条消息</span>
                  )}
                  {selectedId && messages.length > 0 && (
                    <button
                      onClick={loadConversationToMainChat}
                      className="poi-btn text-xs"
                      title="加载整个对话到主界面"
                    >
                      加载到主对话
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingMessages ? (
                  <div className="p-8 text-center text-gray-500">加载中...</div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-2">👈</div>
                    <div>点击左侧对话查看消息</div>
                  </div>
                ) : (
                  <div>
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                                                className={`p-2 md:p-4 border-b border-primary/10 group ${
                          msg.role === 'user' ? 'bg-primary/5' : 'bg-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {/* 头像+楼层容器 */}
                          <div className="flex-shrink-0 flex flex-col items-center">
                            {/* 头像 */}
                            <div
                              className={`w-6 h-6 rounded-sm border flex items-center justify-center text-[10px] font-bold font-mono ${
                              msg.role === 'user'
                                  ? 'bg-primary/20 border-primary text-primary'
                                  : 'bg-secondary/20 border-secondary text-secondary'
                              }`}
                            >
                              {msg.role === 'user' ? 'U' : 'AI'}
                            </div>
                            {/* 楼层显示在头像下方 */}
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                              {msg.floor}F
                            </div>
                          </div>

                                                                              <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-400 mb-1">
                              <span>{msg.role === 'user' ? '你' : 'AI 助手'}</span>
                              {/* AI 消息显示模型名称 */}
                              {msg.role !== 'user' && msg.model && (
                                <span className="ml-2 text-[9px] text-secondary/40" title={msg.model}>
                                  · {msg.model}
                                </span>
                              )}
                            </div>
                            <div className="text-gray-100 text-sm">
                              <MarkdownRenderer content={msg.content} />
                            </div>
                          </div>
                          {/* 操作按钮 */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() => copyMessage(msg.content)}
                              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
                              title="复制"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => quoteMessage(msg.content)}
                              className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                              title="引用到对话"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
            </div>

            {/* Step 1: 前置弹窗 - 楼层选择 + 总结生成 */}
      {isPreviewModalOpen && archivingConv && (
        <ArchivePreviewModal
          messages={archiveMessages}
          conversationTitle={archivingConv.title}
          onConfirm={handlePreviewConfirm}
          onClose={handlePreviewClose}
        />
      )}

      {/* Step 2: 分区选择弹窗 */}
      {isArchiveModalOpen && archivingConv && (
        <ArchiveModal
          conversation={archivingConv}
          archiveContent={archiveContent}
          onClose={() => {
            setIsArchiveModalOpen(false);
            setArchivingConv(null);
            setArchiveContent('');
          }}
                />
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="DELETE ARCHIVE"
        message="警告：确定要永久删除此对话存档吗？此操作不可撤销。"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        confirmText="DELETE"
        cancelText="CANCEL"
        type="danger"
        loading={isDeleting}
      />
    </div>
  );
}

// 归档弹窗组件 - Step 2: 分区选择
function ArchiveModal({ 
  conversation, 
  archiveContent,
  onClose 
}: { 
  conversation: SavedConversation;
  archiveContent: string; // 从 Step 1 传入的总结内容
  onClose: () => void 
}) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [directories, setDirectories] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [isNewPath, setIsNewPath] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [writeMode, setWriteMode] = useState<'append' | 'new'>('append');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // 当切换到"新建分区"时，自动将写入方式设为"创建新文档"
  useEffect(() => {
    if (isNewPath) {
      setWriteMode('new');
    }
  }, [isNewPath]);

    const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 使用总结后的 Markdown 内容进行分区推荐
      const [suggestRes, structRes] = await Promise.all([
        fetch('/api/docs/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            conversationId: conversation.id,
            content: archiveContent // 传入总结后的内容用于推荐
          }),
        }),
        fetch('/api/docs/structure')
      ]);

      const suggestData = await suggestRes.json() as ApiResponse<DocSuggestion>;
      const structData = await structRes.json() as ApiResponse<DocStructure>;

            if (suggestData.success && suggestData.data?.recommendations) {
        setSuggestions(suggestData.data.recommendations);
        if (suggestData.data.recommendations.length > 0) {
          setSelectedPath(suggestData.data.recommendations[0]);
        }
      } else {
        setSuggestions([]);
      }

      // 从树形结构中提取所有目录路径
      if (structData.success && structData.data?.tree) {
        const extractDirectories = (nodes: DocTreeNode[], result: string[] = []): string[] => {
          for (const node of nodes) {
            if (node.type === 'directory') {
              result.push(node.path);
              if (node.children && node.children.length > 0) {
                extractDirectories(node.children, result);
              }
            }
          }
          return result;
        };
        const dirs = extractDirectories(structData.data.tree);
        setDirectories(dirs);
      } else {
        setDirectories([]);
      }
    } catch (err) {
      setError('获取推荐分区失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [conversation.id]);

  const handleSync = async () => {
    const finalPath = isNewPath ? newPath.trim() : selectedPath;
    if (!finalPath) {
      setToast({ type: 'error', msg: '请选择或输入归档路径' });
      return;
    }

    setSyncing(true);
    try {
            const res = await fetch('/api/docs/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          path: finalPath,
          mode: writeMode,
          content: archiveContent // 使用总结后的 Markdown 内容
        }),
      });
      const data = await res.json() as ApiResponse<void>;
      if (data.success) {
        setToast({ type: 'success', msg: '归档成功' });
        setTimeout(onClose, 1500);
      } else {
        setToast({ type: 'error', msg: data.error || '归档失败' });
      }
    } catch (err) {
      setToast({ type: 'error', msg: '网络请求失败' });
    } finally {
      setSyncing(false);
    }
  };

  return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 lg:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-black/95 border border-primary rounded-sm shadow-[0_0_30px_rgba(255,215,0,0.15)] w-full h-full lg:h-auto lg:max-w-md overflow-hidden relative flex flex-col">
         {/* HUD Corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
                <div className="p-4 border-b border-primary/30 flex justify-between items-center bg-primary/5">
          <h3 className="text-lg font-bold font-orbitron tracking-widest text-primary flex items-center gap-2">
            <span>📦 归档到文档</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-10 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">正在获取推荐分区...</p>
            </div>
          ) : error ? (
            <div className="py-6 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button onClick={fetchData} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">重试</button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">归档分区</label>
                <div className="flex gap-2 mb-2">
                  <button 
                    onClick={() => setIsNewPath(false)} 
                    className={`flex-1 py-2 text-sm rounded-sm border transition-all font-mono uppercase tracking-wider ${!isNewPath ? 'bg-primary/20 border-primary text-primary' : 'bg-transparent border-primary/30 text-primary/50 hover:border-primary'}`}
                  >
                    选择已有
                  </button>
                  <button 
                    onClick={() => setIsNewPath(true)} 
                    className={`flex-1 py-2 text-sm rounded-sm border transition-all font-mono uppercase tracking-wider ${isNewPath ? 'bg-primary/20 border-primary text-primary' : 'bg-transparent border-primary/30 text-primary/50 hover:border-primary'}`}
                  >
                    新建分区
                  </button>
                </div>

                {!isNewPath ? (
                  <div className="space-y-2">
                    <select 
                      value={selectedPath}
                      onChange={(e) => setSelectedPath(e.target.value)}
                      className="poi-input w-full"
                    >
                      <option value="" disabled>选择一个分区...</option>
                      {suggestions.length > 0 && (
                        <optgroup label="推荐分区">
                          {suggestions.map(p => <option key={p} value={p}>{p}</option>)}
                        </optgroup>
                      )}
                                            <optgroup label="所有分区">
                        {(directories || []).map(p => <option key={p} value={p}>{p}</option>)}
                      </optgroup>
                    </select>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    placeholder="输入新路径，如：Learning/Next.js"
                                          className="poi-input w-full"
                  />
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">写入方式</label>
                <div className="flex gap-4">
                  {/* 追加到末尾 - 新建分区时禁用 */}
                  <label 
                    className={`flex items-center gap-2 ${
                      isNewPath 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'cursor-pointer group'
                    }`}
                    title={isNewPath ? '新建分区时不可选择追加模式' : ''}
                  >
                    <input 
                      type="radio" 
                      checked={writeMode === 'append'} 
                      onChange={() => !isNewPath && setWriteMode('append')}
                      disabled={isNewPath}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className={`text-sm transition-colors ${
                      isNewPath 
                        ? 'text-gray-500' 
                        : 'text-gray-300 group-hover:text-white'
                    }`}>追加到末尾</span>
                  </label>
                  {/* 创建新文档 - 始终可选 */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      checked={writeMode === 'new'} 
                      onChange={() => setWriteMode('new')}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">创建新文档</span>
                  </label>
                </div>
                {/* 新建分区时显示提示信息 */}
                {isNewPath && (
                  <p className="text-xs text-gray-500">新建分区时只能创建新文档</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-black/40 border-t border-primary/30 flex flex-col gap-3">
          {toast && (
            <div className={`text-sm py-2 px-3 rounded-lg text-center animate-in slide-in-from-bottom-2 duration-300 ${
              toast.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {toast.msg}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 poi-btn border-primary/50 text-primary/70"
            >
              取消
            </button>
            <button
              onClick={handleSync}
              disabled={loading || syncing}
              className="flex-1 poi-btn flex items-center justify-center gap-2"
            >
              {syncing ? (
                <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> 归档中...</>
              ) : (
                '确认归档'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
