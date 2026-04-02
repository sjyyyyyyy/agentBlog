import { NextResponse } from "next/server";
import { queryD1 } from "@/lib/d1";

/**
 * 格式化日期为 YYYY-MM-DD
 */
function getTodayString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range");
    const today = getTodayString();

    // 查询今日统计（使用正确的列名 total_sessions）
    const todayResults = await queryD1(
      "SELECT id, date, total_sessions, total_minutes FROM pomodoro_stats WHERE date = ?",
      [today]
    );
    
    // 映射字段名以保持前端兼容性
    const rawStats = todayResults[0] as { 
      date?: string; 
      total_sessions?: number; 
      total_minutes?: number 
    } | undefined;
    
    const todayStats = rawStats 
      ? { 
          date: rawStats.date, 
          completed_count: rawStats.total_sessions ?? 0, 
          total_minutes: rawStats.total_minutes ?? 0 
        }
      : { date: today, completed_count: 0, total_minutes: 0 };

    let history: unknown[] = [];

    // 根据 range 查询历史数据
    if (range === "week") {
      const weekResults = await queryD1(
        "SELECT id, date, total_sessions, total_minutes FROM pomodoro_stats WHERE date >= date('now', '-7 days') ORDER BY date DESC"
      );
      history = (weekResults as { date: string; total_sessions: number; total_minutes: number }[]).map(row => ({
        date: row.date,
        completed_count: row.total_sessions,
        total_minutes: row.total_minutes
      }));
    } else if (range === "month") {
      const monthResults = await queryD1(
        "SELECT id, date, total_sessions, total_minutes FROM pomodoro_stats WHERE date >= date('now', '-30 days') ORDER BY date DESC"
      );
      history = (monthResults as { date: string; total_sessions: number; total_minutes: number }[]).map(row => ({
        date: row.date,
        completed_count: row.total_sessions,
        total_minutes: row.total_minutes
      }));
    }

    return NextResponse.json({
      today: todayStats,
      history,
    });
  } catch (error) {
    console.error("Failed to fetch pomodoro stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { minutes?: number };
    const { minutes } = body;

    if (typeof minutes !== "number" || minutes <= 0) {
      return NextResponse.json(
        { error: "Invalid minutes" },
        { status: 400 }
      );
    }

    const today = getTodayString();
    const now = Math.floor(Date.now() / 1000); // Unix 时间戳（秒）

    // 检查今日是否已有记录（使用正确的列名）
    const existing = await queryD1(
      "SELECT id, date, total_sessions, total_minutes FROM pomodoro_stats WHERE date = ?",
      [today]
    );

    if (existing.length > 0) {
      // 更新现有记录（使用正确的列名 total_sessions）
      await queryD1(
        "UPDATE pomodoro_stats SET total_sessions = total_sessions + 1, total_minutes = total_minutes + ? WHERE date = ?",
        [minutes, today]
      );
    } else {
      // 插入新记录（使用正确的列名 total_sessions 和 created_at）
      await queryD1(
        "INSERT INTO pomodoro_stats (date, total_sessions, total_minutes, created_at) VALUES (?, 1, ?, ?)",
        [today, minutes, now]
      );
    }

    // 获取更新后的数据
    const updatedResults = await queryD1(
      "SELECT id, date, total_sessions, total_minutes FROM pomodoro_stats WHERE date = ?",
      [today]
    );

    // 映射字段名以保持前端兼容性
    const rawResult = updatedResults[0] as { 
      date: string; 
      total_sessions: number; 
      total_minutes: number 
    };
    
    return NextResponse.json({
      date: rawResult.date,
      completed_count: rawResult.total_sessions,
      total_minutes: rawResult.total_minutes
    });
  } catch (error) {
    console.error("Failed to update pomodoro stats:", error);
    return NextResponse.json(
      { error: "Failed to update stats", details: String(error) },
      { status: 500 }
    );
  }
}