'use client';

import { useState, useEffect } from 'react';
import { ChatListItem, getChatList, deleteChatFromList } from '@/lib/storage';

interface ChatSidebarProps {
  variant?: 'drawer' | 'static';
  currentChatId: string;
  onSelectChat: (chatId: string) => void;
  onNewChat: (skipSave?: boolean) => void;
    onClose?: () => void;
}

export default function ChatSidebar({
    currentChatId,
  onSelectChat,
  onNewChat,
  onClose,
  variant = 'drawer',
}: ChatSidebarProps) {
  const [chatList, setChatList] = useState<ChatListItem[]>([]);

  useEffect(() => {
    setChatList(getChatList());
  }, []);

  const handleDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个对话吗？')) return;
    
    deleteChatFromList(chatId);
    setChatList(getChatList());
    
    if (chatId === currentChatId) {
      onNewChat(true);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    
    return date.toLocaleDateString();
  };

      if (variant === 'static') {
    return (
      <div className="w-80 bg-black/95 border-r border-primary/30 h-full flex flex-col backdrop-blur-xl">
        <div className="p-4 border-b border-primary/30 flex items-center justify-between">
          <h2 className="text-lg font-orbitron tracking-widest text-primary">对话存档</h2>
        </div>

        <div className="p-3">
          <button
            onClick={() => onNewChat()}
            className="w-full py-2.5 px-4 border border-primary text-primary bg-primary/5 hover:bg-primary/20 hover:shadow-glow-primary flex items-center justify-center gap-2 transition-all duration-300 font-mono uppercase tracking-wider rounded-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chatList.length === 0 ? (
                        <div className="text-center text-muted py-8 font-mono">
              <div className="text-3xl mb-2">空</div>
              <div>暂无数据</div>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {chatList.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`p-3 border cursor-pointer transition-all duration-300 group rounded-sm ${
                    chat.id === currentChatId
                      ? 'bg-primary/10 border-primary text-primary shadow-glow-primary'
                      : 'border-transparent hover:border-primary/30 hover:bg-primary/5 text-muted hover:text-primary/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium font-mono break-words">{chat.title}</div>
                      <div className="text-xs opacity-70 mt-1 flex items-center gap-2 font-mono">
                        <span>{chat.messageCount} 条消息</span>
                        <span>·</span>
                        <span>{formatTime(chat.updatedAt)}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDelete(e, chat.id)}
                      className="p-1 text-muted hover:text-destructive transition-opacity"
                      title="删除对话"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-primary/30 text-sm text-primary/50 text-center font-mono">
          共 {chatList.length} 个对话
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="w-80 max-w-[80vw] bg-black/95 border-r border-primary/30 h-full flex flex-col backdrop-blur-xl">
        <div className="p-4 border-b border-primary/30 flex items-center justify-between">
          <h2 className="text-lg font-orbitron tracking-widest text-primary">对话存档</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full py-2.5 px-4 border border-primary text-primary bg-primary/5 hover:bg-primary/20 hover:shadow-glow-primary flex items-center justify-center gap-2 transition-all duration-300 font-mono uppercase tracking-wider rounded-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
                    {chatList.length === 0 ? (
                        <div className="text-center text-muted py-8 font-mono">
              <div className="text-3xl mb-2">空</div>
              <div>暂无数据</div>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {chatList.map((chat) => (
                <div
                  key={chat.id}
                                    onClick={() => {
                    onSelectChat(chat.id);
                    onClose();
                  }}
                                                      className={`p-3 border cursor-pointer transition-all duration-300 group rounded-sm ${
                    chat.id === currentChatId
                      ? 'bg-primary/10 border-primary text-primary shadow-glow-primary'
                      : 'border-transparent hover:border-primary/30 hover:bg-primary/5 text-muted hover:text-primary/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                                            <div className="font-medium font-mono break-words">{chat.title}</div>
                      <div className="text-xs opacity-70 mt-1 flex items-center gap-2 font-mono">
                        <span>{chat.messageCount} 条消息</span>
                        <span>·</span>
                        <span>{formatTime(chat.updatedAt)}</span>
                      </div>
                    </div>
                    
                                        <button
                      onClick={(e) => handleDelete(e, chat.id)}
                      className="p-1 text-muted hover:text-destructive transition-opacity"
                      title="删除对话"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-primary/30 text-sm text-primary/50 text-center font-mono">
          共 {chatList.length} 个对话
        </div>
      </div>

            {/* 点击背景关闭 */}
      <div className="flex-1 bg-black/80 backdrop-blur-sm" onClick={onClose} />
    </div>
  );
}
