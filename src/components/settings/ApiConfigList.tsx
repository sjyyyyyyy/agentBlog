'use client';

import { useState } from 'react';
import { ApiConfig } from '@/app/settings/page';

interface ModelInfo {
  id: string;
  name: string;
  capabilities: {
    vision: boolean;
    streaming: boolean;
    functionCalling: boolean;
  };
}

interface ApiConfigListProps {
  configs: ApiConfig[];
  onEdit: (config: ApiConfig) => void;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

export default function ApiConfigList({
  configs,
  onEdit,
  onDelete,
  onRefresh,
}: ApiConfigListProps) {
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, { success: boolean; message: string }>>({});
  const [loadingModels, setLoadingModels] = useState<number | null>(null);
  const [models, setModels] = useState<Record<number, ModelInfo[]>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ configId: number; modelId: string } | null>(null);
  const [savingModel, setSavingModel] = useState(false);

    const loadSelectedModel = async () => {
    try {
      const res = await fetch('/api/preferences/chat-model');
      const data = await res.json() as { success: boolean; data?: { configId: number; modelId: string } };
      if (data.success && data.data) {
        setSelectedModel({
          configId: data.data.configId,
          modelId: data.data.modelId,
        });
      }
    } catch (error) {
      console.error('加载模型配置失败:', error);
    }
  };

    useState(() => {
    loadSelectedModel();
  });

  const handleTest = async (id: number) => {
    setTestingId(id);
    setTestResult((prev) => ({ ...prev, [id]: { success: false, message: '测试中...' } }));

    try {
      const res = await fetch(`/api/config/${id}/test`, { method: 'POST' });
      const data = await res.json() as { success: boolean; message?: string; error?: string; latency?: number };
      setTestResult((prev) => ({
        ...prev,
        [id]: {
          success: data.success,
          message: data.success ? `✅ ${data.message}（${data.latency}ms）` : `❌ ${data.error}`,
        },
      }));
    } catch {
      setTestResult((prev) => ({
        ...prev,
        [id]: { success: false, message: '❌ 网络错误' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleFetchModels = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setLoadingModels(id);
    setExpandedId(id);

    try {
      const res = await fetch(`/api/config/${id}/models`);
      const data = await res.json() as { success: boolean; data?: ModelInfo[]; error?: string };
      if (data.success) {
        setModels((prev) => ({ ...prev, [id]: data.data || [] }));
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('拉取模型失败:', error);
    } finally {
      setLoadingModels(null);
    }
  };

    const handleSelectModel = async (configId: number, modelId: string) => {
    setSavingModel(true);
    try {
      const res = await fetch('/api/preferences/chat-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId, modelId }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (data.success) {
        setSelectedModel({ configId, modelId });
        alert(`✅ 已选择模型: ${modelId}`);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSavingModel(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const res = await fetch(`/api/config/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json() as { success: boolean };
      if (data.success) {
        onRefresh();
      }
    } catch (error) {
      console.error('设置失败:', error);
    }
  };

  return (
    <div className="space-y-4">
            {selectedModel && (
        <div className="p-3 bg-green-900/30 border border-green-700 rounded-sm">
          <div className="text-sm text-green-400">当前对话模型</div>
          <div className="font-medium font-mono">{selectedModel.modelId}</div>
        </div>
      )}

      {configs.map((config) => (
                <div
          key={config.id}
          className="poi-card p-0 overflow-hidden"
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-lg font-orbitron text-primary">{config.name}</span>
                  {config.is_default === 1 && (
                    <span className="px-2 py-0.5 bg-green-600/50 border border-green-500 text-green-100 text-xs rounded-sm">默认</span>
                  )}
                </div>
                <div className="text-sm text-gray-400 mt-1 font-mono">{config.base_url}</div>
                <div className="text-sm text-gray-500 mt-1 font-mono">密钥: {config.api_key}</div>
              </div>

              <div className="flex gap-2">
                                <button
                  onClick={() => handleTest(config.id)}
                  disabled={testingId === config.id}
                  className="poi-btn text-xs py-1.5"
                >
                  {testingId === config.id ? '测试中...' : '测试'}
                </button>
                <button
                  onClick={() => handleFetchModels(config.id)}
                  disabled={loadingModels === config.id}
                  className="poi-btn text-xs py-1.5"
                >
                  {loadingModels === config.id ? '加载中...' : expandedId === config.id ? '收起模型' : '查看模型'}
                </button>
              </div>
            </div>
                        {testResult[config.id] && (
              <div
                className={`mt-3 p-2 rounded-sm text-sm border ${
                  testResult[config.id].success 
                    ? 'bg-green-900/30 text-green-300 border-green-500/30' 
                    : 'bg-red-900/30 text-red-300 border-red-500/30'
                }`}
              >
                {testResult[config.id].message}
              </div>
            )}

                        <div className="flex gap-4 mt-4 pt-3 border-t border-gray-700/50">
              {config.is_default !== 1 && (
                <button
                  onClick={() => handleSetDefault(config.id)}
                  className="text-sm text-secondary hover:text-secondary/80 transition-colors"
                >
                  设为默认
                </button>
              )}
              <button
                onClick={() => onEdit(config)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                编辑
              </button>
              <button
                onClick={() => onDelete(config.id)}
                className="text-sm text-destructive hover:text-red-400 transition-colors"
              >
                删除
              </button>
            </div>
          </div>

          {expandedId === config.id && models[config.id] && (
            <div className="border-t border-gray-700/50 bg-black/40 p-4">
              <div className="text-sm font-medium mb-3 text-primary">
                可用模型（{models[config.id].length}个）- 点击选择
              </div>
              <div className="grid gap-2 max-h-64 overflow-y-auto pr-2">
                {models[config.id].map((model) => {
                  const isSelected = selectedModel?.configId === config.id && selectedModel?.modelId === model.id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleSelectModel(config.id, model.id)}
                      disabled={savingModel}
                      className={`flex items-center justify-between p-3 rounded-sm text-left transition-all border ${
                        isSelected
                          ? 'bg-secondary/20 border-secondary text-secondary'
                          : 'bg-black/20 border-gray-700 hover:border-gray-500 text-gray-300'
                      }`}
                    >
                      <span className="text-sm font-mono">{model.id}</span>
                      <div className="flex gap-1">
                        {isSelected && (
                          <span className="px-1.5 py-0.5 bg-secondary/20 text-xs rounded-sm border border-secondary/50">当前</span>
                        )}
                        {model.capabilities.vision && (
                          <span className="px-1.5 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded-sm border border-purple-500/30">👁 视觉</span>
                        )}
                        {model.capabilities.streaming && (
                          <span className="px-1.5 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded-sm border border-blue-500/30">⚡ 流式</span>
                        )}
                        {model.capabilities.functionCalling && (
                          <span className="px-1.5 py-0.5 bg-orange-900/50 text-orange-300 text-xs rounded-sm border border-orange-500/30">🔧 函数</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
