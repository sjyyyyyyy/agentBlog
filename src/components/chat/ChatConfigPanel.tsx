'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChatConfig, DEFAULT_CHAT_CONFIG } from '@/types/chat';

interface ChatConfigPanelProps {
  variant?: 'drawer' | 'static';
  config: ChatConfig;
  onChange: (config: ChatConfig) => void;
    onClose?: () => void;
}

export default function ChatConfigPanel({ config, onChange, onClose, variant = 'drawer' }: ChatConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<ChatConfig>(config);

  // 当外部 config 变化时，更新 localConfig
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // 更新本地配置状态
  const updateLocalConfig = useCallback((key: keyof ChatConfig, value: unknown) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // 确认修改
  const handleConfirm = useCallback(() => {
    onChange(localConfig);
    onClose();
  }, [localConfig, onChange, onClose]);

  // 取消修改
  const handleCancel = useCallback(() => {
    onClose(); // 直接关闭，不触发 onChange
  }, [onClose]);

    // 重置为默认值
  const handleReset = useCallback(() => {
    setLocalConfig(DEFAULT_CHAT_CONFIG);
  }, []);

  const Content = (
    <div className={`w-full ${variant === 'drawer' ? 'max-w-md' : ''} bg-black/95 ${variant === 'drawer' ? 'border-l' : 'border-l'} border-primary h-full overflow-y-auto shadow-[-10px_0_30px_rgba(255,215,0,0.1)] flex flex-col`}>
        {/* 头部 */}
        <div className="sticky top-0 bg-black/95 border-b border-primary/30 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold font-orbitron tracking-widest text-primary">系统配置</h2>
          {variant === 'drawer' && onClose && (
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-1.5 text-primary/50 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
          {/* 对话名称 */}
                    <div>
            <label className="block text-xs font-bold text-primary/70 mb-2 font-orbitron tracking-wider">
              会话名称
            </label>
            <input
              type="text"
              value={localConfig.name}
              onChange={(e) => updateLocalConfig('name', e.target.value)}
              placeholder="默认名称：新对话"
              className="poi-input w-full"
            />
          </div>

          {/* System Prompt */}
                    <div>
            <label className="block text-xs font-bold text-primary/70 mb-2 font-orbitron tracking-wider">
              系统提示词 (System Prompt)
            </label>
            <textarea
              value={localConfig.systemPrompt}
              onChange={(e) => updateLocalConfig('systemPrompt', e.target.value)}
              placeholder="定义 AI 的角色、语气和行为方式..."
              rows={6}
              className="poi-input w-full resize-none"
            />
            <p className="mt-1 text-[10px] text-primary/40 font-mono tracking-wide">
              定义 AI 的角色设定与行为参数
            </p>
          </div>

                    {/* 温度 */}
                    <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-primary/70 font-orbitron tracking-wider">
                随机性 (Temperature)
              </label>
              <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-sm border border-primary/30">
                {localConfig.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={localConfig.temperature}
              onChange={(e) => updateLocalConfig('temperature', parseFloat(e.target.value))}
              className="w-full accent-primary h-1 bg-gray-800 appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-primary/40 font-mono mt-1">
              <span>严谨 (0)</span>
              <span>平衡 (1)</span>
              <span>创意 (2)</span>
            </div>
          </div>

          {/* Top P */}
                    <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-primary/70 font-orbitron tracking-wider">
                核采样 (Top P)
              </label>
              <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-sm border border-primary/30">
                {localConfig.topP.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={localConfig.topP}
              onChange={(e) => updateLocalConfig('topP', parseFloat(e.target.value))}
              className="w-full accent-primary h-1 bg-gray-800 appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-primary/40 font-mono mt-1">
              <span>专注 (0)</span>
              <span>发散 (1)</span>
            </div>
          </div>

          {/* 最大输出 Token */}
                    <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-primary/70 font-orbitron tracking-wider">
                最大输出长度 (Max Tokens)
              </label>
              <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-sm border border-primary/30">
                {localConfig.maxTokens === null ? '不限制' : localConfig.maxTokens}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="8192"
                step="256"
                value={localConfig.maxTokens || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  updateLocalConfig('maxTokens', isNaN(val) || val === 0 ? null : val);
                }}
                className="flex-1 accent-primary h-1 bg-gray-800 appearance-none cursor-pointer"
              />
            </div>
            <p className="mt-1 text-[10px] text-primary/40 font-mono tracking-wide">
              0 表示不限制，由模型决定最大输出长度
            </p>
          </div>

                              {/* 上下文消息数量 */}
                    <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-primary/70 font-orbitron tracking-wider">
                上下文限制 (记忆长度)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={localConfig.contextLength === null ? 0 : localConfig.contextLength}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    updateLocalConfig('contextLength', isNaN(val) || val === 0 ? null : val);
                  }}
                  className="w-16 bg-black border border-primary/30 text-primary text-xs font-mono text-center focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-primary/50 font-mono">{localConfig.contextLength === null ? '(全部)' : '条消息'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="500"
                step="1"
                value={localConfig.contextLength || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  updateLocalConfig('contextLength', val === 0 ? null : val);
                }}
                className="flex-1 accent-primary h-1 bg-gray-800 appearance-none cursor-pointer"
              />
            </div>
            <p className="mt-1 text-[10px] text-primary/40 font-mono tracking-wide">
              限制发送给 AI 的历史消息数量 (记忆长度)。0 表示不限制。
            </p>
          </div>

                    {/* 开关选项 */}
          <div className="space-y-6 border-t border-primary/10 pt-6">
            {/* 流式输出 */}
                        <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-primary/70 font-orbitron tracking-wider">
                  流式输出 (Streaming)
                </label>
                <p className="text-[10px] text-primary/40 font-mono tracking-wide">像打字机一样逐字显示回复</p>
              </div>
              <button
                onClick={() => updateLocalConfig('streaming', !localConfig.streaming)}
                className={`relative w-10 h-5 border transition-all duration-300 ${
                  localConfig.streaming ? 'bg-primary/20 border-primary' : 'bg-transparent border-primary/30'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3.5 h-3.5 transition-all duration-300 ${
                    localConfig.streaming ? 'left-[22px] bg-primary shadow-[0_0_10px_rgba(255,215,0,0.5)]' : 'left-0.5 bg-primary/30'
                  }`}
                />
              </button>
            </div>

            {/* 记忆开关 */}
                        <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-primary/70 font-orbitron tracking-wider">
                  记忆持久化
                </label>
                <p className="text-[10px] text-primary/40 font-mono tracking-wide">自动保存对话状态</p>
              </div>
              <button
                onClick={() => updateLocalConfig('enableMemory', !localConfig.enableMemory)}
                className={`relative w-10 h-5 border transition-all duration-300 ${
                  localConfig.enableMemory ? 'bg-primary/20 border-primary' : 'bg-transparent border-primary/30'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3.5 h-3.5 transition-all duration-300 ${
                    localConfig.enableMemory ? 'left-[22px] bg-primary shadow-[0_0_10px_rgba(255,215,0,0.5)]' : 'left-0.5 bg-primary/30'
                  }`}
                />
              </button>
            </div>
          </div>

                    {/* 预设快捷按钮 */}
                    <div>
            <label className="block text-xs font-bold text-primary/70 mb-2 font-orbitron tracking-wider">
              快速预设
            </label>
            <div className="grid grid-cols-2 gap-2">
                            <button
                onClick={() => {
                  updateLocalConfig('temperature', 0.3);
                  updateLocalConfig('topP', 0.9);
                }}
                className="poi-btn text-xs py-2 opacity-80 hover:opacity-100"
              >
                🎯 严谨模式
              </button>
                            <button
                onClick={() => {
                  updateLocalConfig('temperature', 0.7);
                  updateLocalConfig('topP', 1);
                }}
                className="poi-btn text-xs py-2 opacity-80 hover:opacity-100"
              >
                ⚖️ 平衡模式
              </button>
                            <button
                onClick={() => {
                  updateLocalConfig('temperature', 1.2);
                  updateLocalConfig('topP', 0.95);
                }}
                className="poi-btn text-xs py-2 opacity-80 hover:opacity-100"
              >
                ✨ 创意模式
              </button>
                            <button
                onClick={() => {
                  updateLocalConfig('temperature', 0.2);
                  updateLocalConfig('topP', 0.8);
                }}
                className="poi-btn text-xs py-2 opacity-80 hover:opacity-100"
              >
                💻 编程模式
              </button>
            </div>
          </div>
        </div>

        {/* 底部操作按钮 */}
                <div className="sticky bottom-0 bg-black/95 border-t border-primary/30 px-6 py-4 flex justify-end gap-3 z-10">
          <button
            onClick={handleReset}
            className="poi-btn border-primary/30 text-primary/50 text-xs"
          >
            重置
          </button>
          {variant === 'drawer' && onClose && (
            <button
              onClick={handleCancel}
              className="poi-btn border-primary/50 text-primary/70 text-xs"
            >
              取消
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="poi-btn text-xs font-bold shadow-[0_0_15px_rgba(255,215,0,0.3)]"
          >
            确认修改
          </button>
        </div>
      </div>
  );

  if (variant === 'static') {
    return Content;
  }

    return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-end backdrop-blur-sm">
      {/* 点击背景关闭 */}
      <div className="flex-1" onClick={onClose} />
      {Content}
    </div>
  );
}
