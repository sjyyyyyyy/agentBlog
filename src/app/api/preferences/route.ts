import { NextRequest } from 'next/server';
import { queryD1 } from '@/lib/d1';

// GET - 获取指定 key 的偏好设置
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return Response.json({ success: false, error: '缺少 key 参数' }, { status: 400 });
  }

  try {
    const results = await queryD1(
      "SELECT value FROM user_preferences WHERE key = ?",
      [key]
    ) as Array<{ value: string }>;

    return Response.json({
      success: true,
      data: results.length > 0 ? results[0].value : null,
    });
  } catch (error) {
    console.error(`Failed to fetch preference for ${key}:`, error);
    return Response.json({ success: false, error: '获取设置失败' }, { status: 500 });
  }
}

// POST - 设置指定 key 的偏好设置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return Response.json({ success: false, error: '缺少 key' }, { status: 400 });
    }

    await queryD1(
      `INSERT INTO user_preferences (key, value) 
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?`,
      [key, value, value]
    );

    return Response.json({ success: true, message: '设置已保存' });
  } catch (error) {
    console.error(`Failed to save preference:`, error);
    return Response.json({ success: false, error: '保存设置失败' }, { status: 500 });
  }
}