import { queryD1 } from './d1';

/**
 * 截断字符串到指定长度
 */
function truncate(str: string, length: number = 500): string {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
}

/**
 * 记录请求开始
 * @returns logId
 */
export async function logRequest(
  apiConfigId: number,
  modelName: string,
  requestSummary: string
): Promise<number | null> {
  try {
    const timestamp = Date.now();
    const summary = truncate(requestSummary);
    
    const results = await queryD1(
      `INSERT INTO request_logs (timestamp, type, api_config_id, model_name, request_summary) 
       VALUES (?, 'request', ?, ?, ?) RETURNING id`,
      [timestamp, apiConfigId, modelName, summary]
    ) as Array<{ id: number }>;

    return results[0]?.id || null;
  } catch (error) {
    console.error('Failed to log request:', error);
    return null;
  }
}

/**
 * 记录请求成功响应
 */
export async function logResponse(
  logId: number,
  statusCode: number,
  durationMs: number,
  responseSummary: string
): Promise<void> {
  try {
    const summary = truncate(responseSummary);
    await queryD1(
      `UPDATE request_logs 
       SET type = 'response', status_code = ?, duration_ms = ?, response_summary = ?
       WHERE id = ?`,
      [statusCode, durationMs, summary, logId]
    );
  } catch (error) {
    console.error('Failed to log response:', error);
  }
}

/**
 * 记录请求错误
 */
export async function logError(
  logId: number,
  statusCode: number | null,
  durationMs: number,
  errorMessage: string
): Promise<void> {
  try {
    await queryD1(
      `UPDATE request_logs 
       SET type = 'error', status_code = ?, duration_ms = ?, error_message = ?
       WHERE id = ?`,
      [statusCode, durationMs, errorMessage, logId]
    );
  } catch (error) {
    console.error('Failed to log error:', error);
  }
}