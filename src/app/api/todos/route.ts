import { queryD1 } from "@/lib/d1";
import { CreateTodoRequest } from "@/types/todo";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const tag = searchParams.get("tag");
  const dueFilter = searchParams.get("dueFilter"); // today/week/overdue

  let sql = "SELECT * FROM todos WHERE 1=1";
  const params: (string | number)[] = [];

  if (status === "pending" || status === "completed") {
    sql += " AND status = ?";
    params.push(status);
  }

  if (tag) {
    sql += " AND tags LIKE ?";
    params.push(`%${tag}%`);
  }

  // 日期筛选逻辑
  if (dueFilter) {
    const now = new Date();
    
    if (dueFilter === "today") {
      // 今天：due_date 在今天 0:00 到 23:59:59 之间
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      sql += " AND due_date IS NOT NULL AND due_date >= ? AND due_date <= ?";
      params.push(startOfToday, endOfToday);
    } else if (dueFilter === "week") {
      // 本周：从今天开始往后7天
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999).getTime();
      sql += " AND due_date IS NOT NULL AND due_date >= ? AND due_date <= ?";
      params.push(startOfToday, endOfWeek);
    } else if (dueFilter === "overdue") {
      // 已过期：due_date 小于今天开始时间，且状态为 pending
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      sql += " AND due_date IS NOT NULL AND due_date < ? AND status = 'pending'";
      params.push(startOfToday);
    }
  }

  // 排序：状态(pending优先) -> 优先级(高优先) -> 创建时间(新优先)
  // pending > completed (alphabetically p > c)
  sql += " ORDER BY status DESC, priority DESC, created_at DESC";

  try {
    const todos = await queryD1(sql, params);
    return NextResponse.json(todos);
  } catch (error) {
    console.error("Fetch todos error:", error);
    return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateTodoRequest = await request.json();
    
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const now = Date.now();
    // 默认优先级为 1 (Medium)
    const priority = body.priority !== undefined ? body.priority : 1;

    const sql = `
      INSERT INTO todos (title, description, tags, status, priority, created_at, due_date)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
      RETURNING *
    `;
    
    const params = [
      body.title,
      body.description || null,
      body.tags || null,
      priority,
      now,
      body.due_date || null
    ];

    const result = await queryD1(sql, params);

    if (Array.isArray(result) && result.length > 0) {
        return NextResponse.json(result[0]);
    }
    
    return NextResponse.json({ success: true }, { status: 201 });

  } catch (error) {
    console.error("Create todo error:", error);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}