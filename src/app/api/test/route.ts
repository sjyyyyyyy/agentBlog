import { queryD1 } from "@/lib/d1";

export async function GET() {
  try {
    // 尝试查询 todos 表
    const results = await queryD1("SELECT * FROM todos LIMIT 5");
    
    return Response.json({ 
      success: true, 
      message: "D1 连接成功！",
      data: results 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ 
      success: false, 
      error: message 
    }, { status: 500 });
  }
}
