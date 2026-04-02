'use client';

import { useState, useMemo, useCallback } from 'react';
import { Message } from '@/types/chat';

interface SaveConversationModalProps {
  messages: Message[];
  defaultTitle: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function SaveConversationModal({
  messages,
  defaultTitle,
  onClose,
  onSaved,
}: SaveConversationModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  // 使用 Set 存储选中的楼层编号（1-based）
  const [selectedFloors, setSelectedFloors] = useState<Set<number>>(new Set());
  // 范围选择的起止楼层
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(messages.length);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const maxFloor = messages.length;

  // 切换单条消息的选中状态
  const toggleFloor = useCallback((floor: number) => {
    setSelectedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floor)) {
        next.delete(floor);
      } else {
        next.add(floor);
      }
      return next;
    });
  }, []);

  // 添加范围到选中集合
  const addRange = useCallback(() => {
    const start = Math.max(1, Math.min(rangeStart, rangeEnd));
    const end = Math.min(maxFloor, Math.max(rangeStart, rangeEnd));
    setSelectedFloors(prev => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        next.add(i);
      }
      return next;
    });
  }, [rangeStart, rangeEnd, maxFloor]);

  // 清空选择
  const clearSelection = useCallback(() => {
    setSelectedFloors(new Set());
  }, []);

  // 全选
  const selectAll = useCallback(() => {
    const all = new Set<number>();
    for (let i = 1; i <= maxFloor; i++) {
      all.add(i);
    }
    setSelectedFloors(all);
  }, [maxFloor]);

  // 排序后的已选楼层列表
  const sortedSelectedFloors = useMemo(() => {
    return Array.from(selectedFloors).sort((a, b) => a - b);
  }, [selectedFloors]);

  // 格式化已选楼层显示（合并连续范围）
  const formattedSelection = useMemo(() => {
    if (sortedSelectedFloors.length === 0) return '';
    
    const ranges: string[] = [];
    let start = sortedSelectedFloors[0];
    let end = start;
    
    for (let i = 1; i < sortedSelectedFloors.length; i++) {
      if (sortedSelectedFloors[i] === end + 1) {
        end = sortedSelectedFloors[i];
      } else {
        ranges.push(start === end ? `${start}F` : `${start}-${end}F`);
        start = sortedSelectedFloors[i];
        end = start;
      }
    }
    ranges.push(start === end ? `${start}F` : `${start}-${end}F`);
    
    return ranges.join(', ');
  }, [sortedSelectedFloors]);

  // 选中数量
  const selectedCount = selectedFloors.size;

  // 是否可以保存
  const canSave = selectedCount > 0;

  const handleSave = async () => {
    if (!canSave) {
      setError('请至少选择一条消息');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 获取选中的消息（按楼层顺序）
      const selectedMessages = sortedSelectedFloors.map(floor => messages[floor - 1]);

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || '未命名对话',
          messages: selectedMessages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            model: m.model,  // 保存模型信息
          })),
          // 记录选中的楼层信息
          selectedFloors: sortedSelectedFloors,
        }),
      });

      const data = await response.json() as { success: boolean; error?: string };

      if (data.success) {
        onSaved();
        onClose();
      } else {
        setError(data.error || '保存失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-black/95 border border-primary rounded-sm w-full max-w-lg max-h-[90vh] flex flex-col relative overflow-hidden shadow-[0_0_30px_rgba(255,215,0,0.15)]">
         {/* HUD Corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>

        {/* 头部 */}
        <div className="p-4 border-b border-primary/30 flex items-center justify-between flex-shrink-0 bg-primary/5">
          <h3 className="text-lg font-bold font-orbitron tracking-widest text-primary">SAVE_TO_CLOUD</h3>
          <button
            onClick={onClose}
            className="p-1 text-primary/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 - 可滚动区域 */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 font-mono">
          {/* 标题输入 */}
          <div>
            <label className="block text-xs font-bold text-primary/70 mb-1 font-orbitron tracking-wider">SESSION_TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入对话标题..."
              className="poi-input w-full"
            />
          </div>

          {/* 范围选择 */}
          <div>
            <label className="block text-xs font-bold text-primary/70 mb-2 font-orbitron tracking-wider">
              RANGE_SELECT (TOTAL: {maxFloor})
            </label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-primary/50 mb-1 uppercase tracking-wider">START_INDEX</label>
                <input
                  type="number"
                  min={1}
                  max={maxFloor}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Math.max(1, Math.min(maxFloor, parseInt(e.target.value) || 1)))}
                  className="poi-input w-full"
                />
              </div>
              <span className="text-primary/30 pb-2">—</span>
              <div className="flex-1">
                <label className="block text-[10px] text-primary/50 mb-1 uppercase tracking-wider">END_INDEX</label>
                <input
                  type="number"
                  min={1}
                  max={maxFloor}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Math.max(1, Math.min(maxFloor, parseInt(e.target.value) || maxFloor)))}
                  className="poi-input w-full"
                />
              </div>
              <button
                onClick={addRange}
                className="poi-btn text-xs h-[38px]"
              >
                ADD_RANGE
              </button>
            </div>
          </div>

          {/* 快捷操作 */}
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="poi-btn text-xs py-1 px-3"
            >
              SELECT_ALL
            </button>
            <button
              onClick={clearSelection}
              className="poi-btn text-xs py-1 px-3 border-primary/30 text-primary/50"
            >
              CLEAR_ALL
            </button>
          </div>

          {/* 单条勾选列表 */}
          <div>
            <label className="block text-xs font-bold text-primary/70 mb-2 font-orbitron tracking-wider">
              MANUAL_SELECTION
            </label>
            <div className="bg-black/40 border border-primary/20 rounded-sm p-2 max-h-48 overflow-y-auto custom-scrollbar">
              {messages.map((msg, i) => {
                const floor = i + 1;
                const isSelected = selectedFloors.has(floor);
                return (
                  <label
                    key={floor}
                    className={`flex items-start gap-2 p-2 mb-1 cursor-pointer border border-transparent hover:border-primary/30 transition-all ${
                      isSelected ? 'bg-primary/10 border-primary/30' : 'hover:bg-primary/5'
                    }`}
                  >
                    <div className={`w-3 h-3 mt-1 border flex items-center justify-center transition-colors ${
                      isSelected ? 'border-primary bg-primary' : 'border-primary/50 bg-transparent'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 bg-black"></div>}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFloor(floor)}
                      className="hidden"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-primary/50">{String(floor).padStart(2, '0')}</span>
                        <span className={`font-bold uppercase ${msg.role === 'user' ? 'text-primary' : 'text-secondary'}`}>
                          [{msg.role === 'user' ? 'USER' : 'SYSTEM'}]
                        </span>
                      </div>
                      <div className="text-gray-400 text-xs truncate mt-0.5 font-mono opacity-70">
                        {msg.content.slice(0, 60)}{msg.content.length > 60 ? '...' : ''}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 已选楼层显示 */}
          <div>
            <label className="block text-xs font-bold text-primary/70 mb-1 font-orbitron tracking-wider">
              SELECTION_SUMMARY ({selectedCount})
            </label>
            <div className="bg-black/40 border border-primary/20 rounded-sm p-3 min-h-[2.5rem]">
              {selectedCount > 0 ? (
                <div className="text-xs text-primary break-words font-mono tracking-wider">
                  {formattedSelection}
                </div>
              ) : (
                <div className="text-xs text-primary/30 font-mono">
                  暂未选择任何消息
                </div>
              )}
            </div>
            {/* 多版本提示 */}
            {messages.some(m => (m.totalVersions || 1) > 1) && selectedCount > 0 && (
              <div className="text-[10px] text-primary/50 mt-2 font-mono border-l-2 border-primary pl-2">
                ⚠️ 注意：检测到多版本消息，云端仅存储当前可见版本。
              </div>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono">
              ❌ 错误: {error}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-primary/30 flex gap-3 flex-shrink-0 bg-primary/5">
          <button
            onClick={onClose}
            className="flex-1 poi-btn border-primary/30 text-primary/50"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="flex-1 poi-btn"
          >
            {saving ? 'UPLOADING...' : `CONFIRM_UPLOAD${selectedCount > 0 ? ` [${selectedCount}]` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}