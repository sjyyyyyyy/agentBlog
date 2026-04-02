import { queryD1 } from './d1';

/**
 * D1 表行结构定义
 */
interface PreferenceRow {
  key: string;
  value: string;
}

export const DOC_SYNC_KEYS = {
  REPO: 'doc_repo',
  BRANCH: 'doc_branch',
  PATH: 'doc_path',
  TOKEN: 'doc_github_token',
  SUMMARIZE_PROMPT: 'doc_summarize_prompt', // 归档总结 prompt
} as const;

// 默认归档总结 prompt
export const DEFAULT_SUMMARIZE_PROMPT = `请根据以下对话内容生成结构化总结，使用 Markdown 格式：

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

---
对话内容：
{{content}}
`.trim();

export interface DocSyncConfig {
  repo: string | null;
  branch: string | null;
  path: string | null;
  token?: string | null; // 后端读取时可能包含，前端读取时不返回
  summarizePrompt?: string | null; // 归档总结 prompt
}

/**
 * 获取全局配置
 */
export async function getDocSyncConfig(): Promise<DocSyncConfig> {
  const keys = Object.values(DOC_SYNC_KEYS);
  
  // 使用安全的方式查询
  const rows = await queryD1(
    `SELECT key, value FROM user_preferences WHERE key IN (?, ?, ?, ?, ?)`,
    keys
  ) as PreferenceRow[];

  const config: DocSyncConfig = {
    repo: null,
    branch: null,
    path: null,
    summarizePrompt: null,
  };

  rows.forEach(row => {
    if (row.key === DOC_SYNC_KEYS.REPO) config.repo = row.value;
    if (row.key === DOC_SYNC_KEYS.BRANCH) config.branch = row.value;
    if (row.key === DOC_SYNC_KEYS.PATH) config.path = row.value;
    // token 通常不返回给前端，但在后端逻辑中可以通过这个函数获取
    if (row.key === DOC_SYNC_KEYS.TOKEN) config.token = row.value;
    if (row.key === DOC_SYNC_KEYS.SUMMARIZE_PROMPT) config.summarizePrompt = row.value;
  });

  return config;
}

/**
 * 保存全局配置
 */
export async function saveDocSyncConfig(updates: Partial<DocSyncConfig & { token: string | null }>): Promise<void> {
  const entries = [
    { key: DOC_SYNC_KEYS.REPO, value: updates.repo },
    { key: DOC_SYNC_KEYS.BRANCH, value: updates.branch },
    { key: DOC_SYNC_KEYS.PATH, value: updates.path },
    { key: DOC_SYNC_KEYS.TOKEN, value: updates.token },
    { key: DOC_SYNC_KEYS.SUMMARIZE_PROMPT, value: (updates as any).summarizePrompt },
  ];

  for (const entry of entries) {
    if (entry.value === undefined) continue;

    if (entry.value === null) {
      await queryD1(`DELETE FROM user_preferences WHERE key = ?`, [entry.key]);
    } else {
      await queryD1(
        `INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)`,
        [entry.key, entry.value]
      );
    }
  }
}