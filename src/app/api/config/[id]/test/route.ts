import { NextRequest } from 'next/server';
import { queryD1 } from '@/lib/d1';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface DbApiConfig {
  id: number;
  name: string;
  base_url: string;
  api_key: string;
  is_default: number;
  created_at: number;
}

interface ModelsResponse {
  data?: unknown[];
}

export async function POST(request: NextRequest, context: RouteContext) {
  void request;
  
  try {
    const { id } = await context.params;
    const configId = parseInt(id, 10);

    if (isNaN(configId)) {
      return Response.json(
        { success: false, error: 'Invalid config ID' },
        { status: 400 }
      );
    }

    const configs = await queryD1(
      'SELECT * FROM api_configs WHERE id = ?',
      [configId]
    ) as DbApiConfig[];

    if (configs.length === 0) {
      return Response.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      );
    }

    const config = configs[0];
    const startTime = Date.now();

    const response = await fetch(`${config.base_url}/models`, {
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
      },
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      return Response.json({
        success: false,
        error: `API 测试失败: ${response.status}`,
        latency,
      });
    }

    const data = await response.json() as ModelsResponse;
    const modelCount = data.data?.length || 0;

    return Response.json({
      success: true,
      message: `连接成功！发现 ${modelCount} 个模型`,
      latency,
      modelCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({
      success: false,
      error: `连接失败: ${message}`,
    });
  }
}

