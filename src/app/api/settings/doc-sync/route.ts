import { NextResponse } from 'next/server';
import { getDocSyncConfig, saveDocSyncConfig } from '@/lib/doc-sync-config';

/**
 * 获取当前文档同步设置（不包含 Token）
 */
export async function GET() {
  try {
    const config = await getDocSyncConfig();
    // 移除敏感信息，返回其他配置（包括 summarizePrompt）
    const { token, ...safeConfig } = config;
    return NextResponse.json({
      ...safeConfig,
      // 将内部字段名映射为前端使用的字段名
      archivePrompt: safeConfig.summarizePrompt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 更新文档同步设置
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repo, branch, path, token, archivePrompt } = body;

    await saveDocSyncConfig({
      repo: repo ?? undefined,
      branch: branch ?? undefined,
      path: path ?? undefined,
      token: token ?? undefined,
      summarizePrompt: archivePrompt ?? undefined, // 前端字段名映射到内部字段名
    } as any);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}