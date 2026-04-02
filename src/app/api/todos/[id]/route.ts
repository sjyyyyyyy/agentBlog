import { queryD1 } from "@/lib/d1";
import { UpdateTodoRequest } from "@/types/todo";
import { NextResponse } from "next/server";

// Next.js 15 动态路由参数类型
type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  // Next.js 15 中 params 是 Promise，需要 await
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const todos = await queryD1("SELECT * FROM todos WHERE id = ?", [id]);
    if (Array.isArray(todos) && todos.length > 0) {
      return NextResponse.json(todos[0]);
    }
    return NextResponse.json({ error: "Todo not found" }, { status: 404 });
  } catch (error) {
    console.error("Get todo error:", error);
    return NextResponse.json({ error: "Failed to fetch todo" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  // Next.js 15 中 params 是 Promise，需要 await
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body: UpdateTodoRequest = await request.json();
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.title !== undefined) {
      updates.push("title = ?");
      values.push(body.title);
    }
    if (body.description !== undefined) {
      updates.push("description = ?");
      values.push(body.description);
    }
    if (body.tags !== undefined) {
      updates.push("tags = ?");
      values.push(body.tags);
    }
    if (body.status !== undefined) {
      updates.push("status = ?");
      values.push(body.status);
      if (body.status === 'completed') {
        updates.push("completed_at = ?");
        values.push(Date.now());
      } else if (body.status === 'pending') {
        updates.push("completed_at = ?");
        values.push(null);
      }
    }
    if (body.priority !== undefined) {
      updates.push("priority = ?");
      values.push(body.priority);
    }
    if (body.due_date !== undefined) {
      updates.push("due_date = ?");
      values.push(body.due_date);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    const sql = `UPDATE todos SET ${updates.join(", ")} WHERE id = ? RETURNING *`;
    
    const result = await queryD1(sql, values);
    
    if (Array.isArray(result) && result.length > 0) {
        return NextResponse.json(result[0]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update todo error:", error);
    return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  // Next.js 15 中 params 是 Promise，需要 await
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await queryD1("DELETE FROM todos WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete todo error:", error);
    return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
  }
}