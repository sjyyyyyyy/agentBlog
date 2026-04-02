'use client';

import { useState, memo } from 'react';
import { Message } from '@/types/chat';
import MarkdownRenderer from './MarkdownRenderer';
import DecodingText from '@/components/ui/DecodingText';

interface MessageItemProps {
  message: Message;
  floor: number;
  userName?: string;   // 用户显示名称
  aiName?: string;     // AI 显示名称
  onQuote?: (content: string, floor: number) => void;
  onRegenerate?: (message: Message) => void;
  onSwitchVersion?: (message: Message, index: number) => void;
  onDelete?: (messageId: string) => void;
}

const MessageItem = memo(function MessageItem({ message, floor, userName = 'USER', aiName = 'AI', onQuote, onRegenerate, onSwitchVersion, onDelete }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);  // 删除确认状态
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuote = () => {
    onQuote?.(message.content, floor);
  };

    const handleRegenerate = () => {
    onRegenerate?.(message);
  };

  const handlePrevVersion = () => {
    if (onSwitchVersion && message.versionIndex !== undefined && message.versionIndex > 0) {
      onSwitchVersion(message, message.versionIndex - 1);
    }
  };

    const handleNextVersion = () => {
    if (onSwitchVersion && message.versionIndex !== undefined && message.totalVersions && message.versionIndex < message.totalVersions - 1) {
      onSwitchVersion(message, message.versionIndex + 1);
    }
  };

  // 处理删除（二次确认）
  const handleDeleteClick = () => {
    setConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    onDelete?.(message.id);
    setConfirmDelete(false);
  };

  const handleCancelDelete = () => {
    setConfirmDelete(false);
  };

    return (
      <div
        className={`flex gap-2 sm:gap-4 p-2 sm:p-4 group relative mb-2 transition-all duration-300 max-w-full overflow-hidden ${
          isUser 
            ? 'flex-row-reverse bg-transparent' 
            : 'bg-black/20 border-l-2 border-primary/50 hover:border-primary hover:bg-black/40'
        }`}
      >
        {/* 楼层号 */}
        <div className={`flex-shrink-0 w-6 sm:w-8 text-xs text-muted font-mono pt-1 opacity-50 ${isUser ? 'text-right' : 'text-left'}`}>
          {floor}F
        </div>

        {/* 头像 */}
        <div
          className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 border border-current rounded-sm flex items-center justify-center text-xs font-bold font-mono shadow-[0_0_5px_rgba(0,0,0,0.2)] ${
            isUser ? 'text-primary border-primary bg-primary/10 shadow-glow-primary' : 'text-secondary border-secondary bg-secondary/10 shadow-glow-secondary'
          }`}
        >
          {isUser ? userName.charAt(0).toUpperCase() : aiName.charAt(0).toUpperCase()}
        </div>

        {/* 消息内容区域 */}
        <div className={`flex-1 min-w-0 overflow-hidden ${isUser ? 'text-right' : 'text-left'}`}>
                              {/* 用户名和时间 */}
          <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse mb-2' : 'mb-1'}`}>
                        <span className="text-sm text-primary/80 font-mono tracking-wide">
              {isUser ? userName : aiName}
            </span>
            <span className="text-xs text-muted font-mono">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
                      {/* AI 消息显示模型名称（时间下方） */}
            {!isUser && message.model && (
              <div className="mb-1 text-[9px] text-secondary/40 font-mono truncate max-w-[150px] sm:max-w-[250px]" title={message.model}>
                {message.model}
              </div>
            )}
          
          {/* 消息内容 */}
          <div className={`text-foreground/90 font-sans tracking-wide leading-relaxed break-words ${isUser ? 'bg-primary/10 border border-primary/20 p-3 rounded-sm inline-block text-left max-w-full' : ''}`}>
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : message.isError ? (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-200 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-medium">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                请求失败
              </div>
              <div className="text-sm opacity-90">{message.content}</div>
              {onRegenerate && (
                <button
                  onClick={handleRegenerate}
                  className="self-start mt-1 px-3 py-1 bg-red-800/50 hover:bg-red-800 rounded text-xs transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重试
                </button>
              )}
            </div>
          ) : (
            <>
                            {message.content ? (
                <>
                                    <MarkdownRenderer content={message.content} />
                  {message.isStreaming && (
                    <span className="inline-flex items-center">
                      <DecodingText text="" />
                      <span className="text-primary animate-pulse ml-1">█</span>
                    </span>
                  )}
                                </>
              ) : (
                message.isStreaming && <DecodingText minLen={15} maxLen={35} className="text-primary/50 bg-transparent" />
              )}
            </>
          )}
        </div>

                                                                                                                                {/* 统一的操作工具栏 - 放在消息下方 */}
        {!message.isStreaming && (
          <div className="mt-2">
            {/* 操作按钮组 - 桌面端 hover 显示，手机端直接显示 */}
            <div className={`flex items-center gap-1 flex-wrap transition-opacity ${isUser ? 'justify-end' : ''} md:opacity-0 md:group-hover:opacity-100 opacity-100`}>
            {/* 版本切换 - 仅AI消息且有多个版本时显示 */}
            {!isUser && message.totalVersions && message.totalVersions > 1 && (
              <div className="flex items-center gap-0.5 mr-2 text-xs text-muted font-mono border border-primary/20 rounded-sm bg-black/40 px-1">
                <button
                  onClick={handlePrevVersion}
                  disabled={message.versionIndex === 0}
                  className="p-1 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                  title="上一个版本"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="min-w-[2.5rem] text-center text-[10px]">
                  {message.versionIndex !== undefined ? message.versionIndex + 1 : 1}/{message.totalVersions}
                </span>
                <button
                  onClick={handleNextVersion}
                  disabled={message.versionIndex === (message.totalVersions || 1) - 1}
                  className="p-1 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                  title="下一个版本"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* 复制按钮 */}
            <button
              onClick={handleCopy}
              className="p-1 text-muted hover:text-primary transition-colors flex items-center gap-1 text-xs font-mono"
              title={copied ? '已复制' : '复制'}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400 hidden sm:inline">已复制</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">复制</span>
                </>
              )}
            </button>

            {/* 引用按钮 */}
            {onQuote && (
              <button
                onClick={handleQuote}
                className="p-1 text-muted hover:text-secondary transition-colors flex items-center gap-1 text-xs font-mono"
                title="引用"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span className="hidden sm:inline">引用</span>
              </button>
            )}

            {/* 重新生成按钮 - 仅AI消息 */}
            {!isUser && onRegenerate && (
              <button
                onClick={handleRegenerate}
                className="p-1 text-muted hover:text-secondary transition-colors flex items-center gap-1 text-xs font-mono"
                title="重新生成"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">重新生成</span>
              </button>
            )}

                        {/* 删除按钮 */}
            {onDelete && (
              !confirmDelete ? (
                <button
                  onClick={handleDeleteClick}
                  className="p-1 text-muted hover:text-destructive transition-colors flex items-center gap-1 text-xs font-mono"
                  title="删除此消息"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">删除</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-red-900/20 border border-red-700/50 rounded px-2 py-1">
                  <span className="text-xs text-red-300 font-mono mr-1">确认删除?</span>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-2 py-0.5 bg-red-700/50 hover:bg-red-700 text-red-100 text-xs rounded transition-colors font-mono"
                  >
                    确认
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    className="px-2 py-0.5 bg-gray-700/50 hover:bg-gray-700 text-gray-200 text-xs rounded transition-colors font-mono"
                  >
                    取消
                  </button>
                </div>
              )
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageItem;
