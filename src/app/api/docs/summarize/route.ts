import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

/**
 * POST /api/docs/summarize
 * 对选中的消息进行 AI 总结
 * 
 * 请求体：
 * - messages: Array<{ role: string; content: string }> - 选中的消息列表
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages } = body;

    // 参数校验
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '缺少有效的 messages' }, { status: 400 });
    }

    // 获取总结 prompt 配置
    const promptConfig = await getSummarizePrompt();

    // 获取模型配置
    const modelConfig = await getDefaultModelConfig();

    // 组装对话内容
    const conversationText = messages
      .map((m: { role: string; content: string }) => {
        const roleLabel = m.role === 'user' ? '用户' : 'AI助手';
        return `【${roleLabel}】\n${m.content}`;
      })
      .join('\n\n---\n\n');

    // 构建 AI 请求
    const aiMessages = [
      {
        role: 'system',
        content: '你是一个专业的内容总结助手。请根据用户提供的对话内容，按照指定格式生成结构化总结。输出纯 Markdown 格式，不要使用代码块包裹。',
      },
      {
        role: 'user',
        content: `请对以下对话内容进行总结，使用如下格式输出：

${promptConfig}

---
以下是对话内容：

${conversationText}`,
      },
    ];

    // 调用 AI
    const res = await fetch(`${modelConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages: aiMessages,
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[summarize] 模型调用失败:', res.status, errorText);
      throw new Error(`模型调用失败: ${res.status}`);
    }

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content || '';

    if (!summary.trim()) {
      throw new Error('AI 未返回有效的总结内容');
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
      },
    });
  } catch (err: any) {
    console.error('[summarize] 总结失败:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * 获取总结 prompt 配置
 */
async function getSummarizePrompt(): Promise<string> {
  const defaultPrompt = `# 标题

## ✅ 核心结论
- …

## 🧠 关键概念
- …

## 📌 适用场景
- …

## ⚠️ 常见误区
- …

## ✅ 示例（可选）`;

  try {
    const rows = await queryD1(
      "SELECT value FROM user_preferences WHERE key = 'archive_summary_prompt'"
    ) as Array<{ value: string }>;

    if (rows.length > 0 && rows[0].value) {
      return rows[0].value;
    }
  } catch (e) {
    console.warn('[summarize] 获取 prompt 配置失败，使用默认值', e);
  }

  return defaultPrompt;
}

/**
 * 获取默认模型配置（复用 suggest 的逻辑）
 */
async function getDefaultModelConfig() {
  // 优先从 user_preferences 获取用户选择的模型配置
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
      console.warn('[summarize] 解析 chat_model 配置失败，尝试使用默认配置', e);
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

  // 推断模型
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