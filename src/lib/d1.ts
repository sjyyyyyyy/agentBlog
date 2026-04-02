import { getCloudflareD1Config } from "./server-config";

interface D1Response {
  success: boolean;
  errors?: { message: string }[];
  result: { results: unknown[] }[];
}

/**
 * 鎵ц D1 鏁版嵁搴撴煡璇?
 * @param sql - SQL 璇彞
 * @param params - 鏌ヨ鍙傛暟
 * @returns 鏌ヨ缁撴灉鏁扮粍
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
        const errorText = (await res.text()).trim();
        const detail = errorText ? ` - ${errorText}` : "";
        throw new Error(`D1 HTTP ${res.status}${detail}`);
      }

      const data: D1Response = await res.json();
      
      if (!data.success) {
        throw new Error(data.errors?.[0]?.message || "D1 query failed");
      }
      
      // 瀵逛簬 INSERT/UPDATE/DELETE 鎿嶄綔锛宺esult 鍙兘涓虹┖鏁扮粍
      // 瀹夊叏鍦拌繑鍥炵粨鏋?
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

