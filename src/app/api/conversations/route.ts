import { NextRequest } from 'next/server';
import { queryD1 } from '@/lib/d1';
import { Message } from '@/types/chat';

interface SaveConversationInput {
  title: string;
  messages: {
    role: string;
    content: string;
    timestamp: number;
    // 允许传入包含分支信息的完整对象，但 API 只提取核心字段
    [key: string]: any;
  }[];
  // 支持新的选择方式：传入选中的楼层数组
  selectedFloors?: number[];
  // 兼容旧的范围方式
  startFloor?: number;
  endFloor?: number;
  config?: {
    systemPrompt?: string;
    temperature?: number;
  };
}

// GET - 获取已保存的对话列表
export async function GET() {
  try {
    const results = await queryD1(
      `SELECT id, title, message_count, start_floor, end_floor, created_at 
       FROM saved_conversations 
       ORDER BY created_at DESC`
    );

    return Response.json({
      success: true,
      data: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// POST - 保存对话
export async function POST(request: NextRequest) {
  try {
    const body: SaveConversationInput = await request.json();

    if (!body.title?.trim()) {
      return Response.json(
        { success: false, error: '请输入对话标题' },
        { status: 400 }
      );
    }

    if (!body.messages || body.messages.length === 0) {
      return Response.json(
        { success: false, error: '没有可保存的消息' },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

        // 计算起止楼层（兼容新旧两种方式）
    let startFloor: number;
    let endFloor: number;
    if (body.selectedFloors && body.selectedFloors.length > 0) {
      // 新方式：从选中的楼层数组中获取起止
      startFloor = Math.min(...body.selectedFloors);
      endFloor = Math.max(...body.selectedFloors);
    } else {
      // 旧方式：直接使用传入的起止楼层
      startFloor = body.startFloor ?? 1;
      endFloor = body.endFloor ?? body.messages.length;
    }

    // 保存对话主记录
    await queryD1(
      `INSERT INTO saved_conversations 
       (title, message_count, start_floor, end_floor, config, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.title.trim(),
        body.messages.length,
        startFloor,
        endFloor,
        JSON.stringify(body.config || {}),
        now,
      ]
    );

    // 获取刚插入的对话 ID
    const inserted = await queryD1(
      `SELECT id FROM saved_conversations WHERE created_at = ? ORDER BY id DESC LIMIT 1`,
      [now]
    ) as Array<{ id: number }>;

        const conversationId = inserted[0].id;

    // 辅助函数：从完整的 Message 对象中提取当前显示的版本
        const extractCurrentVersionMessage = (msg: Message) => {
      // 如果消息有 versions 数组且 versionIndex 有效，则使用当前显示的版本
      if (msg.versions && msg.versions.length > 0 && typeof msg.versionIndex === 'number' && msg.versionIndex >= 0 && msg.versionIndex < msg.versions.length) {
        const currentVersion = msg.versions[msg.versionIndex];
        return {
          role: currentVersion.role,
          content: currentVersion.content,
          timestamp: msg.timestamp, // 使用原始消息的时间戳
          model: currentVersion.model || msg.model,  // 优先使用版本的模型，否则使用原消息的模型
        };
      } else {
        // 如果没有版本信息或版本信息无效，则直接使用消息本身的 role 和 content
        return {
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          model: msg.model,  // 保留模型信息
        };
      }
    };

        // 保存消息
    // 注意：只保存当前显示的消息版本，忽略 siblingId 等分支信息
    // 云端存储目前不支持多版本/分支结构
    for (let i = 0; i < body.messages.length; i++) {
      const rawMsg = body.messages[i] as Message; // 将传入的消息断言为 Message 类型
      const msgToSave = extractCurrentVersionMessage(rawMsg);
      
      // 计算当前消息的楼层号
      const floor = body.selectedFloors && body.selectedFloors.length > 0
        ? body.selectedFloors[i]  // 新方式：使用选中的楼层数组
        : (body.startFloor ?? 1) + i;  // 旧方式：从起始楼层递增

            await queryD1(
        `INSERT INTO saved_messages 
         (conversation_id, floor, role, content, timestamp, model) 
         VALUES (?, ?, ?, ?, ?, ?)`, 
        [
          conversationId,
          floor,
          msgToSave.role,
          msgToSave.content,
          msgToSave.timestamp,
          msgToSave.model || null,  // 保存模型信息
        ]
      );
    }

    return Response.json({
      success: true,
      message: `成功保存 ${body.messages.length} 条消息`,
      data: { id: conversationId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
