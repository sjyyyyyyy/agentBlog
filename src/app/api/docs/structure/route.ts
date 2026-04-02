import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getDocSyncConfig } from '@/lib/doc-sync-config';
import { DEFAULT_DOC_SYNC_SETTINGS } from '@/lib/doc-sync-defaults';

interface RepoItem {
  name: string;
  path: string;
  type: string;
  sha: string;
}

interface DocNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DocNode[];
}

/**
 * 递归构建目录树
 */
async function buildTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
  currentPath: string
): Promise<DocNode[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: currentPath,
      ref,
    });

    if (!Array.isArray(data)) return [];

    const nodes: DocNode[] = [];

    for (const item of data as RepoItem[]) {
      // 只处理文件夹和 .md / .mdx 文件
      const isDir = item.type === 'dir';
      const isDoc = item.type === 'file' && /\.(md|mdx)$/.test(item.name);

      if (isDir) {
        nodes.push({
          name: item.name,
          path: item.path,
          type: 'directory',
          children: await buildTree(octokit, owner, repo, ref, item.path),
        });
      } else if (isDoc) {
        nodes.push({
          name: item.name,
          path: item.path,
          type: 'file',
        });
      }
    }

    return nodes;
  } catch (error) {
    console.error(`读取路径失败: ${currentPath}`, error);
    return [];
  }
}

export async function GET() {
  try {
    const config = await getDocSyncConfig();

    if (!config.repo || !config.token) {
      return NextResponse.json(
        { error: 'GitHub 仓库或 Token 未配置，请先前往设置页' },
        { status: 400 }
      );
    }

    const [owner, repoName] = config.repo.split('/');
    const branch = config.branch || DEFAULT_DOC_SYNC_SETTINGS.branch;
    const rootPath = (config.path || DEFAULT_DOC_SYNC_SETTINGS.path).replace(/\/$/, ''); // 移除末尾斜杠

    const octokit = new Octokit({ auth: config.token });

    const tree = await buildTree(octokit, owner, repoName, branch, rootPath);

    return NextResponse.json({
      success: true,
      data: {
        repo: config.repo,
        branch,
        root: rootPath,
        tree,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取目录结构失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
