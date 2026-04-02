import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getDocSyncConfig } from '@/lib/doc-sync-config';
import { queryD1 } from '@/lib/d1';
import { DEFAULT_DOC_SYNC_SETTINGS } from '@/lib/doc-sync-defaults';

/**
 * POST /api/docs/sync
 * 将对话归档到 GitHub 仓库
 * 
 * 请求体：
 * - conversationId: number - 对话 ID
 * - path: string - 目标路径（如 "docs/Learning/AI"）
 * - mode: 'append' | 'new' - 写入模式（追加到现有文件 / 创建新文件）
 * - content?: string - 可选，自定义 Markdown 内容（来自 Step 1 生成的总结）
 *                      如果提供此参数，将直接使用该内容而不是从数据库生成
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, path, mode = 'new', content: customContent } = body;

    // 参数校验
    if (!conversationId) {
      return NextResponse.json({ error: '缺少 conversationId' }, { status: 400 });
    }
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: '缺少有效的 path' }, { status: 400 });
    }
    if (mode !== 'append' && mode !== 'new') {
      return NextResponse.json({ error: 'mode 必须是 append 或 new' }, { status: 400 });
    }

    // 获取 GitHub 配置
    const config = await getDocSyncConfig();
    if (!config.repo || !config.token) {
      return NextResponse.json({ error: 'GitHub 配置缺失，请在设置中配置' }, { status: 400 });
    }

    const [owner, repoName] = config.repo.split('/');
    const branch = config.branch || DEFAULT_DOC_SYNC_SETTINGS.branch;

    // 从数据库读取对话信息
    const convRows = await queryD1(
      'SELECT title, tags, created_at FROM saved_conversations WHERE id = ?',
      [conversationId]
    );

    if (!convRows.length) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    }

    const conversation = convRows[0] as any;
    const title = conversation.title || '未命名对话';
    const tags = conversation.tags || '';
    const createdAt = new Date((conversation.created_at || Date.now()) * 1000);

    let markdown: string;

    // 如果前端传入了自定义内容（来自 Step 1 的总结），直接使用
    if (customContent && typeof customContent === 'string' && customContent.trim()) {
      markdown = customContent;
    } else {
      // 否则从数据库读取消息并生成 Markdown
      const messageRows = await queryD1(
        `SELECT floor, role, content, timestamp FROM saved_messages 
         WHERE conversation_id = ? 
         ORDER BY floor ASC`,
        [conversationId]
      );

      if (!messageRows.length) {
        return NextResponse.json({ error: '对话无消息内容' }, { status: 400 });
      }

      // 生成 Markdown 内容
      markdown = generateMarkdown(title, tags, createdAt, messageRows as any[]);
    }

    // 初始化 Octokit
    const octokit = new Octokit({ auth: config.token });

    // 处理路径：确保以 docs/ 开头，移除多余斜杠
    let targetPath = path.trim().replace(/^\/+|\/+$/g, '');
    if (!targetPath.startsWith('docs/')) {
      targetPath = 'docs/' + targetPath;
    }

    // 根据模式处理文件路径
    let filePath: string;
    let commitMessage: string;

    if (mode === 'new') {
      // 新建文件模式：生成带时间戳的文件名
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const safeName = title
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50);
      const fileName = `${timestamp}_${safeName}.md`;
      filePath = `${targetPath}/${fileName}`;
      commitMessage = `docs: 新增对话归档 - ${title}`;
    } else {
      // 追加模式：找到目录下的 README.md 或 index.md
      filePath = `${targetPath}/README.md`;
      commitMessage = `docs: 追加对话内容 - ${title}`;
    }

    try {
      if (mode === 'append') {
        // 追加模式：先读取现有文件
        let existingContent = '';
        let sha = '';

        try {
          const { data } = await octokit.repos.getContent({
            owner,
            repo: repoName,
            path: filePath,
            ref: branch,
          });

          if ('content' in data && data.content) {
            existingContent = Buffer.from(data.content, 'base64').toString('utf-8');
            sha = data.sha;
          }
        } catch (err: any) {
          // 文件不存在，创建新文件
          if (err.status === 404) {
            existingContent = `# ${targetPath.split('/').pop()}\n\n`;
          } else {
            throw err;
          }
        }

        // 追加内容
        const newContent = existingContent + '\n\n---\n\n' + markdown;

        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo: repoName,
          path: filePath,
          message: commitMessage,
          content: Buffer.from(newContent).toString('base64'),
          branch,
          sha: sha || undefined,
        });
      } else {
        // 新建模式：直接创建新文件
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo: repoName,
          path: filePath,
          message: commitMessage,
          content: Buffer.from(markdown).toString('base64'),
          branch,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          path: filePath,
          mode,
          url: `https://github.com/${owner}/${repoName}/blob/${branch}/${filePath}`,
        },
      });
    } catch (err: any) {
      console.error('[sync] GitHub API 错误:', err);
      return NextResponse.json(
        { error: `写入 GitHub 失败: ${err.message}` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('[sync] 归档失败:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * 生成 Markdown 格式的对话内容
 */
function generateMarkdown(
  title: string,
  tags: string,
  createdAt: Date,
  messages: Array<{ floor: number; role: string; content: string; timestamp: number }>
): string {
  const lines: string[] = [];

  // 文档头部
  lines.push(`# ${title}\n`);
  lines.push(`**创建时间**: ${createdAt.toLocaleString('zh-CN')}\n`);
  
  if (tags) {
    lines.push(`**标签**: ${tags}\n`);
  }

  lines.push(`**消息数**: ${messages.length}\n`);
  lines.push('---\n');

  // 消息内容
  for (const msg of messages) {
    const roleLabel = msg.role === 'user' ? '👤 用户' : '🤖 AI 助手';
    const timestamp = new Date(msg.timestamp * 1000).toLocaleString('zh-CN');
    
    lines.push(`## ${msg.floor}F - ${roleLabel}\n`);
    lines.push(`> ${timestamp}\n`);
    lines.push(msg.content);
    lines.push('\n');
  }

  return lines.join('\n');
}
