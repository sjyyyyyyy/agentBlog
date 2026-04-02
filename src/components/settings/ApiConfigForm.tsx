'use client';

import { useState } from 'react';
import { ApiConfig } from '@/app/settings/page';

interface ApiConfigFormProps {
  /** null 表示新建模式，有值表示编辑模式 */
  config: ApiConfig | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ApiConfigForm({ config, onSuccess, onCancel }: ApiConfigFormProps) {
  const [name, setName] = useState(config?.name || '');
  const [baseUrl, setBaseUrl] = useState(config?.base_url || '');
    const [apiKey, setApiKey] = useState('');
  const [isDefault, setIsDefault] = useState(config?.is_default === 1);
  const [retryCount, setRetryCount] = useState(config?.retry_count ?? 2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = config !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isEditing ? `/api/config/${config.id}` : '/api/config';
      const method = isEditing ? 'PUT' : 'POST';

      const body: Record<string, unknown> = {
        name: name.trim(),
                baseUrl: baseUrl.trim(),
        isDefault,
        retryCount,
      };

            if (apiKey.trim()) {
        body.apiKey = apiKey.trim();
      } else if (!isEditing) {
        setError('请输入 API 密钥');
        setLoading(false);
        return;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json() as { success: boolean; error?: string };

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || '操作失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="poi-card w-full max-w-md bg-gray-900">
                <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold font-orbitron tracking-wide text-primary">
            {isEditing ? '编辑 API 配置' : '添加 API 配置'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
            <label className="block text-sm text-gray-400 mb-1">配置名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：主力 API、备用 API"
              required
              className="poi-input w-full"
            />
          </div>

                    <div>
            <label className="block text-sm text-gray-400 mb-1">API 地址</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              required
              className="poi-input w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              OpenAI 兼容格式，通常以 /v1 结尾
            </div>
          </div>

                    <div>
            <label className="block text-sm text-gray-400 mb-1">
              API 密钥 {isEditing && <span className="text-gray-500">（留空则不修改）</span>}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={isEditing ? '••••••••' : 'sk-xxx'}
              required={!isEditing}
              className="poi-input w-full"
            />
          </div>

                    <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded accent-primary bg-gray-700 border-gray-600"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-300">
              设为默认配置
            </label>
          </div>

                <div>
          <label htmlFor="retryCount" className="block text-sm text-gray-400 mb-1">重试次数 (0-5次)</label>
          <input
            type="number"
            id="retryCount"
            value={retryCount}
            onChange={(e) => setRetryCount(Math.max(0, Math.min(5, parseInt(e.target.value) || 0)))}
            min={0}
            max={5}
            className="poi-input w-full"
            aria-describedby="retryCount-description"
          />
          <div id="retryCount-description" className="text-xs text-gray-500 mt-1">
            AI 请求失败时自动重试的次数 (0-5次)
          </div>
        </div>

                    {error && (
            <div className="p-3 bg-red-900/50 text-red-300 rounded-sm text-sm border border-red-500/30">
              {error}
            </div>
          )}

                    <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 poi-btn border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 poi-btn"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
