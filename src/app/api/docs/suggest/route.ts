import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getDocSyncConfig } from '../../../../lib/doc-sync-config';
import { queryD1 } from '../../../../lib/d1';
import { DEFAULT_DOC_SYNC_SETTINGS } from '../../../../lib/doc-sync-defaults';

// 简单提示词模板（后续可优化为更结构化的 few-shot）
const SUGGEST_PROMPT = `
你是一个文档整理专家。现在有一个新的对话需要归档到 Docusaurus 的 docs 目录。
请根据已有目录结构和对话内容，推荐最合适的一个或多个存放位置。

已有目录结构（路径以 docs/ 为根）：
{{tree}}

对话标题：{{title}}
对话内容摘要：
{{summary}}

要求：
1. 优先选择语义最匹配的已有目录
2. 如果没有合适目录，建议新建一个有意义的分区名（允许中英文、空格）
3. 返回 1~3 个推荐，按置信度降序
4. 每个推荐包含：路径、类型（existing_directory / new）、置信度(0~1)、简短理由
5. 只返回 JSON，不要其他文字

输出格式示例：
[
  {"path": "docs/日常/心情日记", "type": "existing_directory", "confidence": 0.93, "reason": "已有大量心情相关记录"},
  {"path": "docs/杂谈/天气观察", "type": "new", "confidence": 0.87, "reason": "主题独立且常见"}
]
`.trim();

async function getDefaultModelConfig() {
  // 优先从 user_preferences 获取用户选择的模型配置（与聊天功能一致）
  const prefs = await queryD1(
    "SELECT value FROM user_preferences WHERE key = 'chat_model'"
  ) as Array<{ value: string }>;

  if (prefs.length > 0) {
    try {
      const { configId, modelId } = JSON.parse(prefs[0].value);
      
      const configs = await queryD1(
        'SELECT base_url, api_key FROM api_configs WHERE id = ?',
        [configId]
      ) as Array<{ base_url: string; api_key: string }>;

      if (configs.length > 0) {
        return {
          baseUrl: configs[0].base_url as string,
          apiKey: configs[0].api_key as string,
          model: modelId as string,
        };
      }
    } catch (e) {
      console.warn('[suggest] 解析 chat_model 配置失败，尝试使用默认配置', e);
    }
  }

  // 回退：使用默认的 API 配置
  const rows = await queryD1(
    'SELECT base_url, api_key, name FROM api_configs WHERE is_default = 1 LIMIT 1'
  );
  
  if (!rows.length) {
    throw new Error('未找到模型配置，请先在设置中配置 API 并选择模型');
  }
  
  const row = rows[0] as any;
  
  // 如果没有用户选择的模型，尝试从配置名称推断
  let model = 'gpt-3.5-turbo';
  const name = (row.name as string || '').toLowerCase();
  
  if (name.includes('gpt-4') || name.includes('gpt4')) {
    model = 'gpt-4';
  } else if (name.includes('claude')) {
    model = 'claude-3-sonnet-20240229';
  } else if (name.includes('deepseek')) {
    model = 'deepseek-chat';
  } else if (name.includes('qwen') || name.includes('通义')) {
    model = 'qwen-turbo';
  }
  
  return {
    baseUrl: row.base_url as string,
    apiKey: row.api_key as string,
    model,
  };
}

function buildTreeText(tree: any[], prefix = ''): string {
  let text = '';
  for (const node of tree) {
    text += prefix + (node.type === 'directory' ? '📁 ' : '📄 ') + node.name + '\n';
    if (node.type === 'directory' && node.children) {
      text += buildTreeText(node.children, prefix + '  ');
    }
  }
  return text;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, content } = body;

    if (!conversationId) {
      return NextResponse.json({ error: '缺少 conversationId' }, { status: 400 });
    }

    // 从数据库读取对话信息和消息
    const convRows = await queryD1(
      'SELECT title FROM saved_conversations WHERE id = ?',
      [conversationId]
    );
    
    if (!convRows.length) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    }

    const title = (convRows[0] as any).title || '未命名对话';

    // 如果前端传入了总结后的内容，直接使用；否则从数据库读取原始消息
    let summary: string;
    
    if (content && typeof content === 'string' && content.trim()) {
      // 使用前端传入的总结内容（Step 1 生成的 Markdown）
      summary = content.slice(0, 1200);
    } else {
      // 从数据库读取原始消息
      const messageRows = await queryD1(
        `SELECT role, content FROM saved_messages 
         WHERE conversation_id = ? 
         ORDER BY floor ASC`,
        [conversationId]
      );

      if (!messageRows.length) {
        return NextResponse.json({ error: '对话无消息内容' }, { status: 400 });
      }
      
      // 对话摘要（取前 1200 字左右）
      summary = messageRows
        .map((m: any) => m.content || '')
        .join('\n')
        .slice(0, 1200);
    }

    // 获取目录结构
    const config = await getDocSyncConfig();
    if (!config.repo || !config.token) {
      return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 400 });
    }

    const [owner, repoName] = config.repo.split('/');
    const branch = config.branch || DEFAULT_DOC_SYNC_SETTINGS.branch;
    const rootPath = (config.path || DEFAULT_DOC_SYNC_SETTINGS.path).replace(/\/$/, '');

    const octokit = new Octokit({ auth: config.token });
    const tree = await buildTree(octokit, owner, repoName, branch, rootPath);

    const treeText = buildTreeText(tree);

    const prompt = SUGGEST_PROMPT
      .replace('{{tree}}', treeText || '(空仓库)')
      .replace('{{title}}', title)
      .replace('{{summary}}', summary);

    // 调用默认模型
    const { baseUrl, apiKey, model } = await getDefaultModelConfig();

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的文档分类助手，只返回 JSON。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[suggest] 模型调用失败:', res.status, errorText);
      throw new Error(`模型调用失败: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    let recommendations;
    try {
      recommendations = JSON.parse(aiResponse);
    } catch {
      recommendations = [];
    }

    return NextResponse.json({
      success: true,
      data: {
        recommendations: Array.isArray(recommendations) ? recommendations.map((r: any) => r.path) : []
      }
    });
  } catch (err: any) {
    console.error('[suggest]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 复用 buildTree 函数（从 structure 接口复制过来）
async function buildTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
  currentPath: string
): Promise<any[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: currentPath,
      ref,
    });

    if (!Array.isArray(data)) return [];

    const nodes = [];

    for (const item of data) {
      if (item.type === 'dir') {
        nodes.push({
          name: item.name,
          path: item.path,
          type: 'directory',
          children: await buildTree(octokit, owner, repo, ref, item.path),
        });
      } else if (item.type === 'file' && /\.(md|mdx)$/.test(item.name)) {
        nodes.push({
          name: item.name,
          path: item.path,
          type: 'file',
        });
      }
    }

    return nodes;
  } catch {
    return [];
  }
}
