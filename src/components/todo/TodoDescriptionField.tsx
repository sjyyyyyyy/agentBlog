'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface TodoDescriptionFieldProps {
  description: string | null;
  todoId: number;
  isCompleted: boolean;
  onUpdate: (newDescription: string) => Promise<void>;
  maxCollapsedHeight?: number; // 折叠时的最大高度（像素）
}

export default function TodoDescriptionField({
  description,
  todoId,
  isCompleted,
  onUpdate,
  maxCollapsedHeight = 120
}: TodoDescriptionFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(description || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 检测内容是否超过折叠高度
  useEffect(() => {
    if (contentRef.current && !isEditing) {
      const height = contentRef.current.scrollHeight;
      setNeedsExpand(height > maxCollapsedHeight);
    }
  }, [description, isEditing, maxCollapsedHeight]);

  // 编辑模式下自动聚焦
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editValue.length, editValue.length);
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue.trim() === (description || '').trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(editValue.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(description || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter 或 Cmd+Enter 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Esc 取消
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!description && !isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-xs text-primary/40 hover:text-primary/60 transition-colors font-mono mt-1 flex items-center gap-1"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        添加描述
      </button>
    );
  }

  if (isEditing) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="支持 Markdown 格式：
# 标题
**粗体** _斜体_ `代码`
- 列表
> 引用
| 表格 | 支持 |
[链接](url)
- [ ] 任务列表"
          className="w-full bg-black/60 rounded-sm p-3 text-sm border border-primary/30 text-primary outline-none focus:border-primary/60 transition-colors resize-none font-mono"
          rows={6}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-primary/40 font-mono">
            提示: Ctrl+Enter 保存 | Esc 取消
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="poi-btn text-xs border-primary/30 text-primary/50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="poi-btn text-xs disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 group/desc relative">
      {/* Markdown 内容容器 */}
      <div
        className={`relative transition-all duration-300 ${
          !isExpanded && needsExpand ? 'overflow-hidden' : ''
        }`}
        style={{
          maxHeight: !isExpanded && needsExpand ? `${maxCollapsedHeight}px` : 'none'
        }}
      >
        {/* 渐变遮罩 - 折叠状态下显示 */}
        {!isExpanded && needsExpand && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none"></div>
        )}
        
        <div
          ref={contentRef}
          className={`prose prose-sm max-w-none prose-invert 
            ${isCompleted ? 'text-gray-600' : 'text-gray-300'}
            
            /* 标题样式 */
            prose-headings:text-primary prose-headings:font-orbitron prose-headings:tracking-wider
            prose-h1:text-xl prose-h1:mt-10 prose-h1:mb-5 prose-h1:pb-3 prose-h1:border-b prose-h1:border-primary/30
            prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
            prose-h4:text-sm prose-h4:mt-5 prose-h4:mb-2.5
            
            /* 段落和文本 */
            prose-p:my-5 [&_p]:leading-[2.5]
            prose-strong:text-primary prose-strong:font-bold
            prose-em:text-primary/80 prose-em:italic
            
            /* 链接 */
            prose-a:text-secondary prose-a:underline prose-a:decoration-secondary/30 
            hover:prose-a:text-secondary/80 hover:prose-a:decoration-secondary/60
            prose-a:transition-colors
            
            /* 列表 */
            prose-ul:my-5 prose-ul:space-y-3
            prose-ol:my-5 prose-ol:space-y-3
            [&_li]:my-2 [&_li]:leading-[2]
            prose-li:marker:text-primary/60
            
            /* 代码 */
            prose-code:text-secondary prose-code:bg-black/50 
            prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded 
            prose-code:text-xs prose-code:font-mono
            prose-code:border prose-code:border-primary/20
            prose-code:before:content-[''] prose-code:after:content-['']
            
            /* 代码块 */
            prose-pre:bg-black/80 prose-pre:border prose-pre:border-primary/20
            prose-pre:p-4 prose-pre:my-4 prose-pre:rounded-sm
            prose-pre:overflow-x-auto
            
            /* 引用块 */
            prose-blockquote:border-l-4 prose-blockquote:border-primary/40
            prose-blockquote:pl-4 prose-blockquote:py-4 prose-blockquote:my-6
            prose-blockquote:italic prose-blockquote:text-gray-400
            prose-blockquote:bg-primary/5
            
            /* 表格 */
            prose-table:my-6 prose-table:border-collapse
            prose-table:w-full prose-table:text-sm
            prose-thead:border-b-2 prose-thead:border-primary/40
            prose-thead:bg-primary/10
            prose-th:px-3 prose-th:py-2 prose-th:text-left 
            prose-th:font-bold prose-th:text-primary prose-th:font-mono
            prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-primary/20
            prose-tr:hover:bg-primary/5 prose-tr:transition-colors
            
            /* 分隔线 */
            prose-hr:my-10 prose-hr:border-primary/30
            
            /* 图片 */
            prose-img:rounded-sm prose-img:border prose-img:border-primary/20
            prose-img:my-6
            
            /* 任务列表 */
            [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0
            [&_.task-list-item]:flex [&_.task-list-item]:items-start [&_.task-list-item]:gap-2
            [&_.task-list-item]:my-3
            [&_.task-list-item>input[type=checkbox]]:mt-1 [&_.task-list-item>input[type=checkbox]]:cursor-pointer
            
          `}
        >
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // 自定义表格渲染以确保样式正确
              table: ({node, ...props}) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full border border-primary/20 rounded-sm" {...props} />
                </div>
              ),
              // 自定义代码块
              code: ({node, inline, className, children, ...props}) => {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                const isCodeBlock = match || codeString.includes('\n');

                // 行内代码
                if (inline || !isCodeBlock) {
                  return <code className={className} {...props}>{children}</code>;
                }

                // 代码块
                return (
                  <div className="relative my-4 overflow-hidden rounded-sm">
                    {/* 语言标签 */}
                    {match && (
                      <div className="absolute top-0 left-0 px-2 py-1 text-xs text-primary/60 bg-black/80 rounded-tl z-10 font-mono">
                        {match[1]}
                      </div>
                    )}
                    {/* 复制按钮 - 一直显示 */}
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(codeString);
                      }}
                      className="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-black/80 hover:bg-primary/20 border border-primary/30 rounded transition-colors text-primary/70 hover:text-primary"
                    >
                      复制
                    </button>
                    {/* 代码高亮 */}
                    <div className="overflow-x-auto">
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match?.[1] || 'text'}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: '0.25rem',
                          paddingTop: match ? '2rem' : '1rem',
                          fontSize: '0.85rem',
                          background: 'rgba(0, 0, 0, 0.9)',
                        }}
                        wrapLongLines={false}
                        showLineNumbers={false}
                        codeTagProps={{
                          style: {
                            background: 'transparent',
                            lineHeight: '1.5'
                          }
                        }}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                );
              }
            }}
          >
            {description || ''}
          </ReactMarkdown>
        </div>
      </div>

      {/* 展开/折叠按钮 */}
      {needsExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="mt-1 text-xs text-primary/50 hover:text-primary transition-colors font-mono flex items-center gap-1"
        >
          {isExpanded ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              收起
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              展开全部
            </>
          )}
        </button>
      )}

      {/* 编辑按钮 - 固定在右上角 */}
      {!isCompleted && description && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="absolute -top-1 -right-1 p-1.5 text-primary/50 hover:text-primary bg-black/90 hover:bg-primary/10 border border-primary/30 rounded-sm transition-all"
          title="编辑描述"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
    </div>
  );
}