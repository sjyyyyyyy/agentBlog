import { NextRequest } from 'next/server';
import { queryD1 } from '@/lib/d1';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateConversationBody {
  title?: string;
  tags?: string;
}

// GET - 获取对话详情
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const conversationId = parseInt(id, 10);

    if (isNaN(conversationId)) {
      return Response.json(
        { success: false, error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }

    // 获取对话信息
        const conversations = await queryD1(
      `SELECT * FROM saved_conversations WHERE id = ?`,
      [conversationId]
    ) as Array<Record<string, any>>;

    if (conversations.length === 0) {
      return Response.json(
        { success: false, error: 'Conversaon not found' },
        { status: 404 }
      );
    }

    const conversationData = conversations[0];

    // 解析 config 字段，因为数据库存储的是 JSON 字符串
    if (typeof conversationData.config === 'string') {
      try {
        conversationData.config = JSON.parse(conversationData.config);
      } catch (parseError) {
        console.error('解析对话配置失败:', parseError);
        conversationData.config = {}; // 解析失败则返回空对象
      }
    }

    if (conversations.length === 0) {
      return Response.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

                // 获取消息列表
    // 注意：返回的是扁平化的消息列表，不包含版本分支信息
    const messages = await queryD1(
      `SELECT floor, role, content, timestamp, model 
       FROM saved_messages 
       WHERE conversation_id = ? 
       ORDER BY floor ASC`,
      [conversationId]
    ) as Array<Record<string, any>>;

    return Response.json({
      success: true,
      data: {
        ...conversationData,
        messages,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT - 更新对话信息
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const conversationId = parseInt(id, 10);
    const body = await request.json() as UpdateConversationBody;

    if (isNaN(conversationId)) {
      return Response.json(
        { success: false, error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (body.title !== undefined) {
      updates.push('title = ?');
      params.push(body.title);
    }

    if (body.tags !== undefined) {
      updates.push('tags = ?');
      params.push(body.tags);
    }

    if (updates.length === 0) {
      return Response.json(
        { success: false, error: '没有要更新的内容' },
        { status: 400 }
      );
    }

    params.push(conversationId);

    await queryD1(
      `UPDATE saved_conversations SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return Response.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE - 删除对话
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const conversationId = parseInt(id, 10);

    if (isNaN(conversationId)) {
      return Response.json(
        { success: false, error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }

    // 先删除消息
    await queryD1(
      `DELETE FROM saved_messages WHERE conversation_id = ?`,
      [conversationId]
    );

    // 再删除对话
    await queryD1(
      `DELETE FROM saved_conversations WHERE id = ?`,
      [conversationId]
    );

    return Response.json({
      success: true,
      message: '对话已删除',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

