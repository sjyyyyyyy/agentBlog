'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Message } from '@/types/chat';
import MarkdownRenderer from './MarkdownRenderer';

/**
 * 归档预览弹窗 - Step 1
 * 用于：多选对话楼层 → 生成总结 → Markdown 预览/编辑
 */

// 保存的消息格式（从云端加载）
interface SavedMessage {
  floor: number;
  role: string;
  content: string;
  timestamp: number;
}

interface ArchivePreviewModalProps {
  messages: SavedMessage[];
  conversationTitle: string;
  onClose: () => void;
  onConfirm: (markdownContent: string) => void;
}

// 默认总结 prompt 模板（与 lib/doc-sync-config.ts 保持一致）
const DEFAULT_SUMMARY_PROMPT = `请根据以下对话内容，生成一份结构化的 Markdown 总结文档。

要求格式如下：
# 标题

## ✅ 核心结论
- …

## 🧠 关键概念
- …

## 📌 适用场景
- …

## ⚠️ 常见误区
- …

## ✅ 示例（可选）

对话内容：
{{content}}

请直接输出 Markdown 格式的总结，不要包含其他解释性文字。`;

export default function ArchivePreviewModal({
  messages,
  conversationTitle,
  onClose,
  onConfirm,
}: ArchivePreviewModalProps) {
  // 左侧选择状态
  const [selectedFloors, setSelectedFloors] = useState<Set<number>>(new Set());
  const [isSelectionConfirmed, setIsSelectionConfirmed] = useState(false);
  
  // 右侧总结状态
  const [summaryContent, setSummaryContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  
  // 从设置中读取的自定义 prompt
  const [customPrompt, setCustomPrompt] = useState<string | null>(null);
  

  


  // 加载用户配置的归档 prompt
  useEffect(() => {
    const loadPrompt = async () => {
      try {
        const res = await fetch('/api/settings/doc-sync');
        if (res.ok) {
          const data = await res.json();
          // 只有当 summarizePrompt 存在且不为空字符串时才使用
          if (data.summarizePrompt && data.summarizePrompt.trim()) {
            setCustomPrompt(data.summarizePrompt);
          } else {
            setCustomPrompt(null);
          }
        }
      } catch (error) {
        console.error('加载归档 prompt 配置失败:', error);
      }
    };
    loadPrompt();
  }, []);

  const maxFloor = messages.length;

  // 切换单条消息的选中状态
  // 注意：D1 数据库返回的 floor 可能是字符串，需要确保类型一致
  const toggleFloor = useCallback((floor: number | string) => {
    if (isSelectionConfirmed) return; // 确认后不能修改
    const floorNum = Number(floor); // 统一转为数字类型
    setSelectedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floorNum)) {
        next.delete(floorNum);
      } else {
        next.add(floorNum);
      }
      return next;
    });
  }, [isSelectionConfirmed]);

  // 全选 - 使用实际的消息楼层号，而不是假设从 1 开始连续
  const selectAll = useCallback(() => {
    if (isSelectionConfirmed) return;
    const all = new Set<number>();
    messages.forEach(msg => {
      all.add(Number(msg.floor)); // 确保转为数字
    });
    setSelectedFloors(all);
  }, [messages, isSelectionConfirmed]);

  // 清空选择
  const clearSelection = useCallback(() => {
    if (isSelectionConfirmed) return;
    setSelectedFloors(new Set());
  }, [isSelectionConfirmed]);

  // 排序后的已选楼层列表
  const sortedSelectedFloors = useMemo(() => {
    return Array.from(selectedFloors).sort((a, b) => a - b);
  }, [selectedFloors]);

  // 选中的消息
  // 注意：确保 floor 字段的类型匹配（D1 可能返回字符串类型）
  const selectedMessages = useMemo(() => {
    return sortedSelectedFloors
      .map(floor => messages.find(m => Number(m.floor) === floor))
      .filter((msg): msg is SavedMessage => msg !== undefined);
  }, [sortedSelectedFloors, messages]);

  // 重置右侧状态（用户重新选择时）
  const resetRightPanel = useCallback(() => {
    setSummaryContent('');
    setIsGenerating(false);
    setGenerateError(null);
    setIsEditing(false);
    setEditContent('');
  }, []);

  // 返回左侧重新选择
  const handleBackToSelection = useCallback(() => {
    setIsSelectionConfirmed(false);
    resetRightPanel();
  }, [resetRightPanel]);

  // 确认左侧选择并生成总结
  const handleConfirmSelection = useCallback(async () => {
    if (selectedFloors.size === 0) return;
    
    setIsSelectionConfirmed(true);
    setIsGenerating(true);
    setGenerateError(null);
    
    // 在函数内部直接计算排序后的楼层，避免闭包陷阱
    const currentSelectedFloors = Array.from(selectedFloors).sort((a, b) => a - b);
    
    try {
      // 构建对话内容（确保类型匹配，D1 返回的 floor 可能是字符串）
      const contentParts = currentSelectedFloors.map(floor => {
        const msg = messages.find(m => Number(m.floor) === floor);
        if (!msg) return '';
        const roleLabel = msg.role === 'user' ? '用户' : 'AI';
        return `【${floor}F - ${roleLabel}】\n${msg.content}`;
      }).filter(Boolean);
      
      const conversationContent = contentParts.join('\n\n---\n\n');
      
      // 获取总结 prompt（优先使用用户配置，否则使用默认值）
      const promptTemplate = customPrompt || DEFAULT_SUMMARY_PROMPT;
      
      // 构建最终的 prompt（如果模板包含 {{content}} 则替换，否则自动追加）
      let prompt: string;
      if (promptTemplate.includes('{{content}}')) {
        prompt = promptTemplate.replace('{{content}}', conversationContent);
      } else {
        prompt = `${promptTemplate}\n\n---\n\n以下是需要总结的对话内容：\n\n${conversationContent}`;
      }
      
      // 调用 AI 生成总结
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { id: 'system', role: 'system', content: '你是一个专业的文档总结助手。', timestamp: 0 },
            { id: 'user', role: 'user', content: prompt, timestamp: Date.now() },
          ],
          config: {
            streaming: false, // 改为非流式，确保数据完整性
            temperature: 0.3,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const resData = await response.json();
      
      if (!resData.success) {
        throw new Error(resData.error || '生成失败');
      }

      // 提取内容 (非流式响应结构: { success: true, data: { choices: [...] } })
      const content = resData.data?.choices?.[0]?.message?.content || '';
      
      if (!content.trim()) {
        throw new Error('AI 未返回任何内容');
      }

      setSummaryContent(content);

    } catch (error) {
      console.error('生成总结失败:', error);
      setGenerateError(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedFloors, messages, customPrompt]);

  // 重新生成
  const handleRegenerate = useCallback(() => {
    resetRightPanel();
    // 延迟一帧后重新生成，确保状态已重置
    setTimeout(() => {
      handleConfirmSelection();
    }, 0);
  }, [resetRightPanel, handleConfirmSelection]);

  // 进入编辑模式
  const handleStartEdit = useCallback(() => {
    setEditContent(summaryContent);
    setIsEditing(true);
  }, [summaryContent]);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    setSummaryContent(editContent);
    setIsEditing(false);
  }, [editContent]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent('');
  }, []);

  // 进入归档（Step 2）
  const handleProceedToArchive = useCallback(() => {
    onConfirm(summaryContent);
  }, [summaryContent, onConfirm]);

  // 是否可以进入归档
  const canProceed = isSelectionConfirmed && summaryContent.trim() && !isGenerating && !isEditing;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-black/95 border border-primary rounded-sm shadow-[0_0_30px_rgba(255,215,0,0.15)] w-full lg:max-w-5xl h-full lg:h-[85vh] flex flex-col relative overflow-hidden">
        {/* HUD Corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary pointer-events-none"></div>
        {/* 头部 */}
        <div className="p-4 border-b border-primary/30 flex items-center justify-between flex-shrink-0 bg-primary/5">
          <h3 className="text-lg font-bold font-orbitron tracking-widest text-primary">ARCHIVE.PREVIEW // {conversationTitle}</h3>
          <button
            onClick={onClose}
            className="p-1 text-primary/50 hover:text-primary rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 主体 - 左右两栏 */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* 左侧：对话楼层选择区 */}
          <div className="w-full lg:w-1/2 border-r-0 lg:border-r border-b lg:border-b-0 border-primary/20 flex flex-col bg-black/40 h-1/2 lg:h-auto">
            {/* 左侧头部 */}
            <div className="p-3 border-b border-primary/20 flex items-center justify-between bg-primary/5">
              <div className="text-xs text-primary/70 font-mono">
                SELECTION: {selectedFloors.size}/{maxFloor}
              </div>
              <div className="flex items-center gap-2">
                {!isSelectionConfirmed ? (
                  <>
                    <button
                      onClick={selectAll}
                      className="poi-btn text-[10px] px-2 py-1"
                    >
                      全选
                    </button>
                    <button
                      onClick={clearSelection}
                      className="poi-btn text-[10px] px-2 py-1"
                    >
                      清空
                    </button>
                    <button
                      onClick={handleConfirmSelection}
                      disabled={selectedFloors.size === 0}
                      className="poi-btn text-[10px] px-2 py-1"
                    >
                      确认选择
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleBackToSelection}
                    className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  >
                    ← 重新选择
                  </button>
                )}
              </div>
            </div>

            {/* 左侧消息列表 */}
            <div className="flex-1 overflow-y-auto p-2">

              {messages.map((msg) => {
                    const floor = Number(msg.floor); // 确保转为数字类型
                    const isSelected = selectedFloors.has(floor);
                return (
                  <label
                    key={floor}
                    data-floor={floor}
                    data-content-length={msg?.content?.length ?? 0}
                    className={`flex items-start gap-2 p-2 rounded-sm cursor-pointer mb-1 transition-all duration-200 border ${
                      isSelected ? 'bg-primary/20 border-primary' : 'hover:bg-primary/5 border-transparent hover:border-primary/30'
                    } ${isSelectionConfirmed ? 'cursor-not-allowed opacity-50 grayscale' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFloor(floor)}
                      disabled={isSelectionConfirmed}
                      className="mt-1 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-primary/50 font-mono text-xs">{String(floor).padStart(3, '0')}</span>
                        <span className={`font-mono text-xs font-bold ${msg.role === 'user' ? 'text-primary' : 'text-secondary'}`}>
                          [{msg.role === 'user' ? 'USER' : 'AI'}]
                        </span>
                      </div>
                      <div className="text-gray-400 text-xs mt-1 line-clamp-2">
                        {msg.content.slice(0, 100)}{msg.content.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 右侧：总结内容区 */}
          <div className="w-full lg:w-1/2 flex flex-col bg-black/60 relative h-1/2 lg:h-auto">
             {/* CRT Lines for preview */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-10"></div>
            {/* 右侧头部 */}
            <div className="p-3 border-b border-primary/20 flex items-center justify-between bg-primary/5 relative z-10">
              <div className="text-xs text-primary/70 font-mono">
                {isGenerating ? 'PROCESSING_DATA...' : 
                 isEditing ? 'EDIT_MODE_ACTIVE' : 
                 summaryContent ? 'PREVIEW_MODE' : 'WAITING_INPUT...'}
              </div>
              <div className="flex items-center gap-2">
                {summaryContent && !isGenerating && (
                  <>
                    {!isEditing ? (
                      <>
                        <button
                          onClick={handleRegenerate}
                          className="poi-btn text-[10px] px-2 py-1"
                        >
                          🔄 重新生成
                        </button>
                        <button
                          onClick={handleStartEdit}
                          className="poi-btn text-[10px] px-2 py-1"
                        >
                          ✏️ 编辑
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleCancelEdit}
                          className="poi-btn text-[10px] px-2 py-1"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="poi-btn text-[10px] px-2 py-1"
                        >
                          💾 保存
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 右侧内容区 */}
            <div className="flex-1 overflow-y-auto p-4">
              {!isSelectionConfirmed ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-3">👈</div>
                    <div>请先在左侧选择要归档的楼层</div>
                    <div className="text-sm mt-1">然后点击「确认选择」生成总结</div>
                  </div>
                </div>
              ) : isGenerating ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-primary">
                     <span className="animate-pulse font-mono">PROCESSING_DATA...</span>
                  </div>
                  {summaryContent && (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <MarkdownRenderer content={summaryContent} />
                    </div>
                  )}
                </div>
              ) : generateError ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-red-400 mb-3">❌ {generateError}</div>
                    <button
                      onClick={handleRegenerate}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                    >
                      重新生成
                    </button>
                  </div>
                </div>
              ) : isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full bg-black/80 border border-primary/30 rounded-sm p-3 text-primary text-sm font-mono resize-none focus:outline-none focus:border-primary focus:shadow-glow-primary"
                  placeholder="编辑 Markdown 内容..."
                />
              ) : summaryContent ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <MarkdownRenderer content={summaryContent} />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-primary/30 flex justify-between items-center flex-shrink-0 bg-black/90">
          <div className="text-xs text-primary/50 font-mono">
            {isSelectionConfirmed && selectedFloors.size > 0 && (
              <span>SELECTED_COUNT: {selectedFloors.size}</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="poi-btn border-primary/50 text-primary/70"
            >
              CANCEL
            </button>
            <button
              onClick={handleProceedToArchive}
              disabled={!canProceed}
              className="poi-btn flex items-center gap-2"
            >
              PROCEED_ARCHIVE &gt;&gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}