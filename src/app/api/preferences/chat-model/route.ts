import { NextRequest } from 'next/server';
import { queryD1 } from '@/lib/d1';

interface ChatModelPreference {
  configId: number;
  modelId: string;
}

// GET - 获取当前选择的对话模型
export async function GET() {
  try {
    const results = await queryD1(
      "SELECT value FROM user_preferences WHERE key = 'chat_model'"
    ) as Array<{ value: string }>;

    if (results.length === 0) {
      return Response.json({
        success: true,
        data: null,
      });
    }

        const data = JSON.parse(results[0].value);
    return Response.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Failed to fetch chat model preference:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// POST - 设置对话模型
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatModelPreference;
    const { configId, modelId } = body;

    if (!configId || !modelId) {
      return Response.json(
        { success: false, error: '请选择 API 配置和模型' },
        { status: 400 }
      );
    }

    const value = JSON.stringify({ configId, modelId });

    // 使用 UPSERT（存在则更新，不存在则插入）
    await queryD1(
      `INSERT INTO user_preferences (key, value) 
       VALUES ('chat_model', ?)
       ON CONFLICT(key) DO UPDATE SET value = ?`,
      [value, value]
    );

        return Response.json({
      success: true,
      message: '模型设置已保存',
    });
  } catch (error) {
    console.error('Failed to save chat model preference:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

