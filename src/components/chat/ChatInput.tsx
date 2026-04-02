'use client';

import { useState, useRef, useEffect } from 'react';

interface Quote {
  content: string;
  floor?: number;
  source?: string;
}

interface ChatInputProps {
  onSend: (content: string, quote?: Quote) => void;
  disabled?: boolean;
  quote?: Quote | null;
  onClearQuote?: () => void;
}

export default function ChatInput({ onSend, disabled, quote, onClearQuote }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const canSend = input.trim() && !disabled;

  const handleSubmit = () => {
    if (!canSend) return;
    
    onSend(input.trim(), quote || undefined);
    setInput('');
    onClearQuote?.();
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t-2 border-primary/50 bg-black/95 backdrop-blur-xl relative z-20 pb-2">
      {quote && (
        <div className="px-4 pt-3">
          <div className="bg-primary/5 border border-primary/30 p-3 flex items-start gap-2 rounded-sm">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-primary mb-1 font-mono">
                引用 {quote.floor ? `${quote.floor}F` : ''} {quote.source === 'cloud' ? '(云端)' : ''}
              </div>
              <div className="text-sm text-muted line-clamp-2 font-mono">
                {quote.content}
              </div>
            </div>
                        <button
              onClick={onClearQuote}
              className="p-1 text-muted hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
                        placeholder={disabled ? '系统繁忙...' : '> 输入指令...'}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent border-b border-primary/30 text-primary p-2 resize-none focus:outline-none focus:border-primary focus:shadow-[0_1px_10px_rgba(255,215,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed placeholder-primary/30 font-mono rounded-none caret-primary transition-all duration-300 min-h-[3rem] leading-relaxed"
          />
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className="p-3 border border-primary text-primary bg-primary/10 hover:bg-primary/30 hover:shadow-glow-primary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-sm mb-1"
          >
            {disabled ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </span>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 12h15" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
