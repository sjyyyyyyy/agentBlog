'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Message } from '@/types/chat';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  userName?: string;   // 用户显示名称
  aiName?: string;     // AI 显示名称
  onQuote?: (content: string, floor: number) => void;
  onRegenerate?: (message: Message) => void;
  onSwitchVersion?: (message: Message, index: number) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export default function MessageList({ messages, userName, aiName, onQuote, onRegenerate, onSwitchVersion, onDeleteMessage }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);

  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const currentCount = messages.length;
    
    if (currentCount > prevCount) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    
    prevMessageCountRef.current = currentCount;
  }, [messages.length]);

    if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted font-mono">
        <div className="text-center">
          <div className="text-4xl mb-4">💬</div>
          <div>开始新对话吧</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      {messages.map((message, index) => (
                                        <MessageItem
          key={`${message.siblingId || 'root'}-${index}`}
          message={message}
          floor={index + 1}
          userName={userName}
          aiName={aiName}
          onQuote={onQuote}
          onRegenerate={onRegenerate}
          onSwitchVersion={onSwitchVersion}
          onDelete={onDeleteMessage}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
