import { NextRequest } from 'next/server';
import { queryD1 } from '@/lib/d1';

interface RequestLog {
  id: number;
  timestamp: number;
  type: 'request' | 'response' | 'error';
  api_config_id: number | null;
  model_name: string | null;
  status_code: number | null;
  duration_ms: number | null;
  request_summary: string | null;
  response_summary: string | null;
  error_message: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const apiConfigId = searchParams.get('apiConfigId');
    const type = searchParams.get('type');
    const modelName = searchParams.get('modelName');

    const offset = (page - 1) * limit;

    let whereClauses: string[] = [];
    let params: (string | number)[] = [];

    if (apiConfigId) {
      whereClauses.push('api_config_id = ?');
      params.push(parseInt(apiConfigId, 10));
    }
    if (type) {
      whereClauses.push('type = ?');
      params.push(type);
    }
    if (modelName) {
      whereClauses.push('model_name LIKE ?');
      params.push(`%${modelName}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const logs = await queryD1(
      `SELECT * FROM request_logs ${whereSql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ) as RequestLog[];

    // 获取总数以便分页
    const totalResult = await queryD1(
      `SELECT COUNT(*) as count FROM request_logs ${whereSql}`,
      params
    ) as Array<{ count: number }>;
    const total = totalResult[0]?.count || 0;

    return Response.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch request logs:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 清空所有日志
    // 也可以根据需要添加条件删除，目前需求是“一键清除”
    await queryD1('DELETE FROM request_logs');
    
    // 某些数据库可能需要手动重置自增 ID，但在日志场景下通常不需要
    // await queryD1('DELETE FROM sqlite_sequence WHERE name="request_logs"');

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to clear logs:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
