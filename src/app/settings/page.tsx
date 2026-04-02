// src/app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import ApiConfigList from '@/components/settings/ApiConfigList';
import ApiConfigForm from '@/components/settings/ApiConfigForm';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getGeneralSettings, saveGeneralSettings, GeneralSettings, DEFAULT_GENERAL_SETTINGS } from '@/lib/storage';
import { DEFAULT_DOC_SYNC_SETTINGS, DOC_SYNC_REPO_PLACEHOLDER } from '@/lib/doc-sync-defaults';

// ───────────────────────────────────────────────
//          内联的「文档同步设置」表单逻辑
// ───────────────────────────────────────────────
// 默认归档总结 Prompt
const DEFAULT_ARCHIVE_PROMPT = `请将以下对话内容整理成结构化的 Markdown 文档：

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
`;

function DocSyncSettingsInner() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [config, setConfig] = useState({
    repo: DEFAULT_DOC_SYNC_SETTINGS.repo,
    branch: DEFAULT_DOC_SYNC_SETTINGS.branch,
    path: DEFAULT_DOC_SYNC_SETTINGS.path,
    token: '',
    archivePrompt: DEFAULT_ARCHIVE_PROMPT,
  });

  // 加载已有配置（不含 token）
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/settings/doc-sync');
        if (res.ok) {
          const data = await res.json();
          setConfig((prev) => ({
            ...prev,
            repo: data.repo || prev.repo,
            branch: data.branch || prev.branch,
            path: data.path || prev.path,
            archivePrompt: data.archivePrompt || prev.archivePrompt,
          }));
        }
      } catch (err) {
        console.error('获取文档同步配置失败', err);
      } finally {
        setFetching(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const body = {
        repo: config.repo.trim() || undefined,
        branch: config.branch.trim() || undefined,
        path: config.path.trim() || undefined,
        token: config.token.trim() || undefined,
        archivePrompt: config.archivePrompt.trim() || undefined,
      };

      const res = await fetch('/api/settings/doc-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '保存失败');
      }

      alert('文档同步设置已保存');
      setConfig((prev) => ({ ...prev, token: '' })); // 清空 token 输入框
    } catch (err: any) {
      alert(err.message || '保存过程中出现错误');
    } finally {
      setLoading(false);
    }
  };

    if (fetching) return <div className="py-4 text-primary/50 font-mono">LOADING_CONFIG...</div>;

  return (
    <div className="border border-primary/20 rounded-sm p-6 bg-black/40 relative overflow-hidden">
      {/* Scanline decoration */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20"></div>
            <h2 className="text-lg font-bold font-orbitron tracking-widest text-primary mb-4 relative z-10">DOC_SYNC.CONFIG // Docusaurus</h2>
      <p className="text-xs text-primary/50 mb-6 font-mono relative z-10">
        AUTO_ARCHIVE_TARGET: GITHUB_REPO/DOCS
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-primary/70">GITHUB_REPO</label>
          <input
            type="text"
            value={config.repo}
            onChange={(e) => setConfig({ ...config, repo: e.target.value })}
            placeholder={DOC_SYNC_REPO_PLACEHOLDER}
            className="poi-input w-full relative z-10"
          />
        </div>

        <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-primary/70">BRANCH</label>
          <input
            type="text"
            value={config.branch}
            onChange={(e) => setConfig({ ...config, branch: e.target.value })}
            placeholder={DEFAULT_DOC_SYNC_SETTINGS.branch}
            className="poi-input w-full relative z-10"
          />
        </div>

        <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-primary/70">DOC_ROOT_PATH</label>
          <input
            type="text"
            value={config.path}
            onChange={(e) => setConfig({ ...config, path: e.target.value })}
            placeholder="docs/"
            className="poi-input w-full relative z-10"
          />
        </div>

        <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-primary/70">GITHUB_TOKEN (PAT)</label>
          <input
            type="password"
            value={config.token}
            onChange={(e) => setConfig({ ...config, token: e.target.value })}
            placeholder="ghp_xxx... (SECURE_STORAGE)"
            className="poi-input w-full relative z-10"
          />
          <p className="text-[10px] text-primary/40 mt-1 font-mono">TOKEN_HIDDEN_AFTER_SAVE</p>
        </div>
      </div>

      {/* 归档总结 Prompt 配置 */}
      <div className="mt-6 space-y-1.5">
                <label className="block text-xs font-mono text-primary/70">ARCHIVE_SUMMARY_PROMPT</label>
        <textarea
          value={config.archivePrompt}
          onChange={(e) => setConfig({ ...config, archivePrompt: e.target.value })}
          placeholder="TEMPLATE_INPUT..."
          rows={8}
          className="poi-input w-full relative z-10"
        />
        <p className="text-[10px] text-primary/40 mt-1 font-mono">AI_SUMMARY_TEMPLATE_CONFIG</p>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
                    className={`poi-btn relative z-10 ${
            loading ? 'opacity-60 cursor-not-allowed' : ''
          }`} // Using poi-btn
        >
          {loading ? '保存中…' : '保存设置'}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
//          通用设置（默认提示词 / 用户名 / AI名称）
// ───────────────────────────────────────────────
function GeneralSettingsPanel() {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  // 客户端加载 localStorage 中的通用设置
  useEffect(() => {
    setSettings(getGeneralSettings());
    setLoaded(true);
  }, []);

  const handleSave = () => {
    saveGeneralSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_GENERAL_SETTINGS });
  };

  if (!loaded) return <div className="py-4 text-primary/50 font-mono">LOADING_CONFIG...</div>;

  return (
    <div className="border border-primary/20 rounded-sm p-6 bg-black/40 relative overflow-hidden">
      {/* 扫描线装饰 */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20"></div>
      <h2 className="text-lg font-bold font-orbitron tracking-widest text-primary mb-4 relative z-10">GENERAL.CONFIG</h2>
      <p className="text-xs text-primary/50 mb-6 font-mono relative z-10">
        DEFAULT_PROMPT &amp; DISPLAY_NAMES
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 用户显示名称 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono text-primary/70">USER_DISPLAY_NAME</label>
          <input
            type="text"
            value={settings.userName}
            onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
            placeholder="USER"
            className="poi-input w-full relative z-10"
          />
          <p className="text-[10px] text-primary/40 mt-1 font-mono">聊天界面中您的显示名称</p>
        </div>

        {/* AI 显示名称 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono text-primary/70">AI_DISPLAY_NAME</label>
          <input
            type="text"
            value={settings.aiName}
            onChange={(e) => setSettings({ ...settings, aiName: e.target.value })}
            placeholder="AI"
            className="poi-input w-full relative z-10"
          />
          <p className="text-[10px] text-primary/40 mt-1 font-mono">聊天界面中 AI 的显示名称</p>
        </div>
      </div>

      {/* 默认系统提示词 */}
      <div className="mt-5 space-y-1.5">
        <label className="block text-xs font-mono text-primary/70">DEFAULT_SYSTEM_PROMPT</label>
        <textarea
          value={settings.defaultSystemPrompt}
          onChange={(e) => setSettings({ ...settings, defaultSystemPrompt: e.target.value })}
          placeholder="You are a helpful assistant."
          rows={6}
          className="poi-input w-full relative z-10"
        />
        <p className="text-[10px] text-primary/40 mt-1 font-mono">每次新建对话时的默认系统提示词，已有对话不受影响</p>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={handleReset}
          className="poi-btn border-primary/30 text-primary/50 text-xs relative z-10"
        >
          恢复默认
        </button>
        <button
          onClick={handleSave}
          className={`poi-btn relative z-10 ${
            saved ? 'border-green-400 text-green-400' : ''
          }`}
        >
          {saved ? '✓ 已保存' : '保存设置'}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
//                  类型定义
// ───────────────────────────────────────────────
interface ApiConfig {
  id: number;
  name: string;
  base_url: string;
  api_key: string;
  is_default: number;
  retry_count: number;
  created_at: number;
}

// ───────────────────────────────────────────────
//                  主页面
// ───────────────────────────────────────────────

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 加载配置列表
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setConfigs(data.data || []);
      } else {
        console.error('加载配置失败:', data.error);
      }
    } catch (error) {
      console.error('加载配置出错:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  // 保存成功后刷新列表
  const handleSuccess = () => {
    setShowForm(false);
    setEditingConfig(null);
    loadConfigs();
  };

  // 编辑配置
  const handleEdit = (config: ApiConfig) => {
    setEditingConfig(config);
    setShowForm(true);
  };

    // 确认删除配置
  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/config/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadConfigs();
        setDeleteId(null);
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (error) {
      console.error('删除出错:', error);
      alert('删除出错');
    } finally {
      setIsDeleting(false);
    }
  };

    return (
    <div className="h-full w-full bg-background text-foreground font-mono flex flex-col overflow-hidden">
            {/* 顶部导航 - 吸顶 */}
      <div className="flex-shrink-0 sticky top-0 z-10 border-b border-primary/30 px-4 py-3 bg-black/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold font-orbitron tracking-widest text-primary">SYSTEM.SETTINGS</h1>
          <Link href="/" className="poi-btn text-xs">
            &lt;&lt; RETURN_CONSOLE
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4">
        {/* 原有 API 配置区域 */}
        <div className="mb-10">
                    <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-orbitron tracking-widest text-primary">API.CONFIG</h2>
            <button
              onClick={() => {
                setEditingConfig(null);
                setShowForm(true);
              }}
              className="poi-btn"
            >
              + 添加配置
            </button>
          </div>

          {showForm && (
            <ApiConfigForm
              config={editingConfig}
              onSuccess={handleSuccess}
              onCancel={() => {
                setShowForm(false);
                setEditingConfig(null);
              }}
            />
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🔑</div>
              <div>还没有 API 配置</div>
              <div className="text-sm mt-1">点击上方按钮添加你的第一个配置</div>
            </div>
          ) : (
                        <ApiConfigList
              configs={configs}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteId(id)}
              onRefresh={loadConfigs}
            />
          )}
        </div>

                        {/* 通用设置（默认提示词 / 名称） */}
        <div className="mb-10">
          <GeneralSettingsPanel />
        </div>

                {/* 文档同步设置 */}
        <DocSyncSettingsInner />
      </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="DELETE CONFIG"
        message="警告：确定要删除此 API 配置吗？此操作不可撤销。"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        confirmText="DELETE"
        cancelText="CANCEL"
        type="danger"
        loading={isDeleting}
      />
    </div>
  );
}
