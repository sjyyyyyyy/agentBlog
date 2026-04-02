import { NextRequest } from 'next/server';
import { queryD1 } from '@/lib/d1';
import { ApiConfig } from '@/types/api-config';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateConfigBody {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  isDefault?: boolean;
  retryCount?: number; // 添加重试次数
}
// GET /api/config/[id] - 获取单个配置（包含完整 API Key,仅内部使用)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const configId = parseInt(id, 10);

    if (isNaN(configId)) {
      return Response.json(
        { success: false, error: 'Invalid config ID' },
        { status: 400 }
      );
    }

        let results: ApiConfig[];
    try {
      results = await queryD1(
        'SELECT id, name, base_url, api_key, is_default, retry_count, created_at FROM api_configs WHERE id = ?',
        [configId]
      ) as ApiConfig[];
    } catch (e: any) {
      if (e.message?.includes('no such column: retry_count')) {
        console.warn('`retry_count` column not found in api_configs table for single config GET. Fetching without it and applying default.');
        // 如果 'retry_count' 列丢失，则在没有它的情况下获取并添加默认值
        const fallbackResults = await queryD1(
          'SELECT id, name, base_url, api_key, is_default, created_at FROM api_configs WHERE id = ?',
          [configId]
        ) as Omit<ApiConfig, 'retryCount'>[]; // Omit retryCount for the fallback query
        results = fallbackResults.map(r => ({ ...r, retry_count: 2 })) as any[]; // Add default retry_count
      } else {
        throw e; // Re-throw other errors
      }
    }

    if (results.length === 0) {
      return Response.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: results[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/config/[id] - 更新配置
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const configId = parseInt(id, 10);
    const body = await request.json() as UpdateConfigBody;

    if (isNaN(configId)) {
      return Response.json(
        { success: false, error: 'Invalid config ID' },
        { status: 400 }
      );
    }

        // 检查是否存在
    const existing = await queryD1(
      'SELECT id, name, base_url, api_key, is_default, retry_count, created_at FROM api_configs WHERE id = ?',
      [configId]
    ) as ApiConfig[];

    if (existing.length === 0) {
      return Response.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      );
    }

    // 动态构建更新语句
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      params.push(body.name.trim());
    }
    if (body.baseUrl !== undefined) {
      updates.push('base_url = ?');
      params.push(body.baseUrl.trim().replace(/\/$/, ''));
    }
    if (body.apiKey !== undefined) {
      updates.push('api_key = ?');
      params.push(body.apiKey.trim());
    }
    if (body.isDefault !== undefined) {
      // 如果设为默认,先取消其他默认
      if (body.isDefault) {
        await queryD1('UPDATE api_configs SET is_default = 0');
      }
            updates.push('is_default = ?');
      params.push(body.isDefault ? 1 : 0);
    }
    if (body.retryCount !== undefined) {
      updates.push('retry_count = ?');
      params.push(body.retryCount); // 确保这里将 retryCount 添加到更新参数中
    }

    if (updates.length === 0) {
      return Response.json(
        { success: false, error: '没有需要更新的字段' },
        { status: 400 }
      );
    }

    params.push(configId);
    await queryD1(
      `UPDATE api_configs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

        // 返回更新后的记录
        const updated = await queryD1(
      'SELECT id, name, base_url, api_key, is_default, retry_count, created_at FROM api_configs WHERE id = ?',
      [configId]
    ) as any[];

    return Response.json({
      success: true,
      message: '配置更新成功',
      data: updated[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/config/[id] - 删除配置
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const configId = parseInt(id, 10);

    if (isNaN(configId)) {
      return Response.json(
        { success: false, error: 'Invalid config ID' },
        { status: 400 }
      );
    }

    const existing = await queryD1(
      'SELECT * FROM api_configs WHERE id = ?',
      [configId]
    ) as ApiConfig[];

    if (existing.length === 0) {
      return Response.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      );
    }

    await queryD1('DELETE FROM api_configs WHERE id = ?', [configId]);

    return Response.json({
      success: true,
      message: '配置删除成功',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

