import { queryD1 } from "@/lib/d1";

export async function GET() {
  try {
    // 创建用户偏好表
    await queryD1(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `);

    // 创建番茄钟统计表
    await queryD1(`
      CREATE TABLE IF NOT EXISTS pomodoro_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        total_minutes INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      );
    `);

    return Response.json({
      success: true,
      message: "数据库表初始化成功",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
