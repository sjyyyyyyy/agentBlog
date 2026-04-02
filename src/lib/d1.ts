import { getCloudflareD1Config } from "./server-config";

interface D1Response {
  success: boolean;
  errors?: { message: string }[];
  result: { results: unknown[] }[];
}

/**
 * 执行 D1 数据库查询
 * @param sql - SQL 语句
 * @param params - 查询参数
 * @returns 查询结果数组
 */
export async function queryD1(sql: string, params: (string | number | boolean | null)[] = []) {
  const { accountId, databaseId, apiToken } = getCloudflareD1Config();

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sql: sql,
          params: params,
        }),
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data: D1Response = await res.json();
      
      if (!data.success) {
        throw new Error(data.errors?.[0]?.message || "D1 query failed");
      }
      
      // 对于 INSERT/UPDATE/DELETE 操作，result 可能为空数组
      // 安全地返回结果
      return data.result?.[0]?.results ?? [];

    } catch (error) {
      lastError = error;
      console.warn(`D1 query attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError;
}

