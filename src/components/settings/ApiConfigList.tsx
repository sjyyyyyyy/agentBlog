'use client';

import { useEffect, useState } from 'react';
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
      const data = await res.json() as { success: boolean; data?: { configId: number; modelId: string } | null };
      if (data.success && data.data) {
        setSelectedModel({
          configId: data.data.configId,
          modelId: data.data.modelId,
        });
      } else {
        setSelectedModel(null);
      }
    } catch (error) {
      console.error('Failed to load selected model:', error);
    }
  };

  useEffect(() => {
    loadSelectedModel();
  }, [configs]);

  const handleTest = async (id: number) => {
    setTestingId(id);
    setTestResult((prev) => ({ ...prev, [id]: { success: false, message: 'Testing...' } }));

    try {
      const res = await fetch(`/api/config/${id}/test`, { method: 'POST' });
      const data = await res.json() as { success: boolean; message?: string; error?: string; latency?: number };
      setTestResult((prev) => ({
        ...prev,
        [id]: {
          success: data.success,
          message: data.success
            ? `Success: ${data.message ?? 'Connection OK'} (${data.latency ?? 0}ms)`
            : `Failed: ${data.error ?? 'Unknown error'}`,
        },
      }));
    } catch {
      setTestResult((prev) => ({
        ...prev,
        [id]: { success: false, message: 'Failed: network error' },
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
        alert(data.error || 'Failed to load models');
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
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
        alert(`Selected model: ${modelId}`);
      } else {
        alert(data.error || 'Failed to save model');
      }
    } catch (error) {
      console.error('Failed to save model:', error);
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
      console.error('Failed to set default config:', error);
    }
  };

  return (
    <div className="space-y-4">
      {selectedModel && (
        <div className="rounded-sm border border-green-700 bg-green-900/30 p-3">
          <div className="text-sm text-green-400">Current chat model</div>
          <div className="font-medium font-mono">{selectedModel.modelId}</div>
        </div>
      )}

      {configs.map((config) => (
        <div key={config.id} className="poi-card overflow-hidden p-0">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-orbitron text-lg font-medium text-primary">{config.name}</span>
                  {config.is_default === 1 && (
                    <span className="rounded-sm border border-green-500 bg-green-600/50 px-2 py-0.5 text-xs text-green-100">
                      Default
                    </span>
                  )}
                </div>
                <div className="mt-1 font-mono text-sm text-gray-400">{config.base_url}</div>
                <div className="mt-1 font-mono text-sm text-gray-500">Key: {config.api_key}</div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleTest(config.id)}
                  disabled={testingId === config.id}
                  className="poi-btn py-1.5 text-xs"
                >
                  {testingId === config.id ? 'Testing...' : 'Test'}
                </button>
                <button
                  onClick={() => handleFetchModels(config.id)}
                  disabled={loadingModels === config.id}
                  className="poi-btn py-1.5 text-xs"
                >
                  {loadingModels === config.id
                    ? 'Loading...'
                    : expandedId === config.id
                      ? 'Hide Models'
                      : 'View Models'}
                </button>
              </div>
            </div>

            {testResult[config.id] && (
              <div
                className={`mt-3 rounded-sm border p-2 text-sm ${
                  testResult[config.id].success
                    ? 'border-green-500/30 bg-green-900/30 text-green-300'
                    : 'border-red-500/30 bg-red-900/30 text-red-300'
                }`}
              >
                {testResult[config.id].message}
              </div>
            )}

            <div className="mt-4 flex gap-4 border-t border-gray-700/50 pt-3">
              {config.is_default !== 1 && (
                <button
                  onClick={() => handleSetDefault(config.id)}
                  className="text-sm text-secondary transition-colors hover:text-secondary/80"
                >
                  Set Default
                </button>
              )}
              <button
                onClick={() => onEdit(config)}
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(config.id)}
                className="text-sm text-destructive transition-colors hover:text-red-400"
              >
                Delete
              </button>
            </div>
          </div>

          {expandedId === config.id && models[config.id] && (
            <div className="border-t border-gray-700/50 bg-black/40 p-4">
              <div className="mb-3 text-sm font-medium text-primary">
                Available models ({models[config.id].length})
              </div>
              <div className="grid max-h-64 gap-2 overflow-y-auto pr-2">
                {models[config.id].map((model) => {
                  const isSelected =
                    selectedModel?.configId === config.id && selectedModel?.modelId === model.id;

                  return (
                    <button
                      key={model.id}
                      onClick={() => handleSelectModel(config.id, model.id)}
                      disabled={savingModel}
                      className={`flex items-center justify-between rounded-sm border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-secondary bg-secondary/20 text-secondary'
                          : 'border-gray-700 bg-black/20 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <span className="font-mono text-sm">{model.id}</span>
                      <div className="flex gap-1">
                        {isSelected && (
                          <span className="rounded-sm border border-secondary/50 bg-secondary/20 px-1.5 py-0.5 text-xs">
                            Current
                          </span>
                        )}
                        {model.capabilities.vision && (
                          <span className="rounded-sm border border-purple-500/30 bg-purple-900/50 px-1.5 py-0.5 text-xs text-purple-300">
                            Vision
                          </span>
                        )}
                        {model.capabilities.streaming && (
                          <span className="rounded-sm border border-blue-500/30 bg-blue-900/50 px-1.5 py-0.5 text-xs text-blue-300">
                            Streaming
                          </span>
                        )}
                        {model.capabilities.functionCalling && (
                          <span className="rounded-sm border border-orange-500/30 bg-orange-900/50 px-1.5 py-0.5 text-xs text-orange-300">
                            Tools
                          </span>
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
