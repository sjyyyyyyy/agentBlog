import { NextRequest } from 'next/server';
import { queryD1 } from '@/lib/d1';
import { ApiConfig, CreateApiConfigInput } from '@/types/api-config';

// GET /api/config - 获取所有 API 配置
export async function GET() {
  try {
    let results;
    try {
      results = await queryD1(
        'SELECT id, name, base_url, api_key, is_default, retry_count, created_at FROM api_configs ORDER BY is_default DESC, created_at DESC'
      );
    } catch (e: any) {
      // 如果报错内容包含 "no such column: retry_count"，尝试自动添加该列
      if (e.message?.includes('no such column: retry_count')) {
        await queryD1('ALTER TABLE api_configs ADD COLUMN retry_count INTEGER DEFAULT 2');
        // 修复后重新查询
        results = await queryD1(
          'SELECT id, name, base_url, api_key, is_default, retry_count, created_at FROM api_configs ORDER BY is_default DESC, created_at DESC'
        );
      } else {
        throw e;
      }
    }

        const configs = results as Array<{
      id: number;
      name: string;
      base_url: string;
      api_key: string;
      is_default: number;
      retry_count: number;
      created_at: number;
    }>;

    // 隐藏完整 API Key，只显示前 8 位
    const safeResults = configs.map((config) => ({
      ...config,
      api_key: config.api_key ? config.api_key.slice(0, 8) + '****' : '****',
    }));

    return Response.json({
      success: true,
      data: safeResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}


// POST /api/config - 创建新 API 配置
export async function POST(request: NextRequest) {
  try {
    const body: CreateApiConfigInput & { retryCount?: number } = await request.json();

    // 验证必填字段
    if (!body.name?.trim()) {
      return Response.json(
        { success: false, error: '请输入配置名称' },
        { status: 400 }
      );
    }
    if (!body.baseUrl?.trim()) {
      return Response.json(
        { success: false, error: '请输入 API 地址' },
        { status: 400 }
      );
    }
    if (!body.apiKey?.trim()) {
      return Response.json(
        { success: false, error: '请输入 API 密钥' },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // 如果设为默认，先取消其他默认
    if (body.isDefault) {
      await queryD1('UPDATE api_configs SET is_default = 0');
    }

        // 插入新配置
    await queryD1(
      `INSERT INTO api_configs (name, base_url, api_key, is_default, retry_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.name.trim(),
        body.baseUrl.trim().replace(/\/$/, ''), // 去掉末尾斜杠
        body.apiKey.trim(),
                body.isDefault ? 1 : 0,
        body.retryCount ?? 2, // 使用默认值 2
        now,
      ]
    );

    // 获取插入的记录
    const inserted = await queryD1(
            'SELECT id, name, base_url, api_key, is_default, retry_count, created_at FROM api_configs WHERE created_at = ? ORDER BY id DESC LIMIT 1',
      [now]
    ) as ApiConfig[];

    return Response.json({
      success: true,
      message: 'API 配置创建成功',
      data: inserted[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
