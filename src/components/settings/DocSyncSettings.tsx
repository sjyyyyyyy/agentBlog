'use client';

import React, { useEffect, useState } from 'react';
import { DEFAULT_DOC_SYNC_SETTINGS, DOC_SYNC_REPO_PLACEHOLDER } from '@/lib/doc-sync-defaults';

/**
 * 文档同步设置组件
 */
const DocSyncSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [config, setConfig] = useState({
    repo: DEFAULT_DOC_SYNC_SETTINGS.repo,
    branch: DEFAULT_DOC_SYNC_SETTINGS.branch,
    path: DEFAULT_DOC_SYNC_SETTINGS.path,
    token: '',
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/settings/doc-sync');
        if (res.ok) {
          const data = await res.json();
          setConfig(prev => ({
            ...prev,
            repo: data.repo || prev.repo,
            branch: data.branch || prev.branch,
            path: data.path || prev.path,
          }));
        }
      } catch (error) {
        console.error('获取文档同步设置失败:', error);
      } finally {
        setFetching(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/doc-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error('保存失败');
      
      alert('设置已保存');
      setConfig(prev => ({ ...prev, token: '' }));
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存过程中出现错误');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-4 text-gray-500 font-mono">正在加载配置...</div>;
  }

  return (
    <div className="space-y-6 p-6 poi-card">
      <div>
        <h2 className="text-xl font-semibold mb-1 font-orbitron text-primary">文档同步设置 (Docusaurus)</h2>
        <p className="text-sm text-gray-400">配置对话自动归档到 GitHub 仓库的相关参数</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">GitHub 仓库 (owner/repo)</label>
          <input
            type="text"
            className="poi-input w-full"
            value={config.repo}
            onChange={e => setConfig({ ...config, repo: e.target.value })}
            placeholder={DOC_SYNC_REPO_PLACEHOLDER}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">分支 (Branch)</label>
          <input
            type="text"
            className="poi-input w-full"
            value={config.branch}
            onChange={e => setConfig({ ...config, branch: e.target.value })}
            placeholder={DEFAULT_DOC_SYNC_SETTINGS.branch}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">文档根路径</label>
          <input
            type="text"
            className="poi-input w-full"
            value={config.path}
            onChange={e => setConfig({ ...config, path: e.target.value })}
            placeholder="docs/"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">GitHub Token (PAT)</label>
          <input
            type="password"
            className="poi-input w-full"
            value={config.token}
            onChange={e => setConfig({ ...config, token: e.target.value })}
            placeholder="保持为空则不更新"
          />
          <p className="text-[10px] text-gray-500">Token 仅用于后端写入，前端不会回显已保存的值。</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`poi-btn ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? '正在保存...' : '保存配置'}
        </button>
      </div>
    </div>
  );
};

export default DocSyncSettings;
