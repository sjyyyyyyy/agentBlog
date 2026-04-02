import { NextRequest } from 'next/server';
import { Message, ChatConfig } from '@/types/chat';
import { queryD1 } from '@/lib/d1';
import { adaptMessages, adaptRequest } from '@/lib/model-adapter';
import { getErrorMessage, getNetworkErrorMessage } from '@/lib/error-mapper';
import { logRequest, logResponse, logError } from '@/lib/logger';

// 获取 API 配置
async function getApiConfig(): Promise<{ configId: number; baseUrl: string; apiKey: string; model: string; retryCount: number } | null> {
  try {
    const prefs = await queryD1(
      "SELECT value FROM user_preferences WHERE key = 'chat_model'"
    ) as Array<{ value: string }>;

    if (prefs.length === 0) return null;

    const { configId, modelId } = JSON.parse(prefs[0].value); // configId is already extracted

        const configs = await queryD1(
            'SELECT id, base_url, api_key, retry_count FROM api_configs WHERE id = ?', // Select id as well
      [configId]
    ) as Array<{ id: number; base_url: string; api_key: string; retry_count: number }>; // Modified type

    if (configs.length === 0) return null;

        return {
      configId: configs[0].id, // Return configId
            baseUrl: configs[0].base_url,
      apiKey: configs[0].api_key,
      model: modelId,
      retryCount: configs[0].retry_count ?? 2, // 默认重试 2 次
    };
  } catch (error) {
    console.error('获取配置失败:', error);
    return null;
  }
}

// // 获取备用 API 配置
// async function _getFallbackConfig(excludeId: number): Promise<{ baseUrl: string; apiKey: string; model: string } | null> {
//   try {
//     const configs = await queryD1(
//       'SELECT * FROM api_configs WHERE id != ? LIMIT 1',
//       [excludeId]
//     ) as Array<{ id: number; base_url: string; api_key: string }>;

//     if (configs.length === 0) return null;

//     // 使用备用配置的默认模型（这里简化处理，用第一个可用模型）
//     return {
//       baseUrl: configs[0].base_url,
//       apiKey: configs[0].api_key,
//       model: 'gpt-3.5-turbo', // 备用模型
//     };
//   } catch {
//     return null;
//   }
// }

// 发送请求的核心函数
async function sendChatRequest(
  baseUrl: string,
  apiKey: string,
  requestBody: Record<string, unknown>
): Promise<Response> {
  // 确保 baseUrl 格式正确
  if (!baseUrl.endsWith('/v1')) {
    baseUrl = baseUrl.replace(/\/$/, '') + '/v1';
  }

  return fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });
}

// 最大重试次数
// const MAX_RETRIES = 2; // 将由配置决定

export async function POST(request: NextRequest) {
  let logId: number | null = null; // Initialize logId
  const requestStartTime = Date.now(); // Record start time for the entire request

  try {
    const body = await request.json();
    const { messages, config } = body as {
      messages: Message[];
      config: Partial<ChatConfig>;
    };

    if (!messages || messages.length === 0) {
      return Response.json(
        { success: false, error: '消息不能为空' },
        { status: 400 }
      );
    }

    const apiConfig = await getApiConfig();
    const retryCount = apiConfig?.retryCount ?? 2; // 从配置中获取重试次数，默认为 2
    const retryDelay = 500; // 每次重试间隔 500ms

        if (!apiConfig) {
      const errorMessage = '请先在设置中配置 API 并选择模型';
      // Log this error as well, if logId is not set yet, it will be 0 or null
      await logError(logId ?? 0, 400, Date.now() - requestStartTime, errorMessage); 
      return Response.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

        // 为 system prompt 注入当前时间信息
    const messagesWithTime = messages.map((m) => {
      if (m.role === 'system') {
        const now = new Date();
        const timeInfo = `\n\n[当前时间: ${now.toLocaleString('zh-CN', { 
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })}]`;
        return {
          ...m,
          content: m.content + timeInfo
        };
      }
      return m;
    });

    // 适配消息格式
    const adaptedMessages = adaptMessages(
      messagesWithTime.map((m) => ({ role: m.role, content: m.content })),
      apiConfig.model
    );

    // 构建请求体
    let requestBody: Record<string, unknown> = {
      model: apiConfig.model,
      messages: adaptedMessages,
      temperature: config.temperature ?? 0.7,
      top_p: config.topP ?? 1,
      max_tokens: config.maxTokens || undefined,
      stream: config.streaming ?? true,
    };

        // 适配请求参数
    requestBody = adaptRequest(requestBody, apiConfig.model);

    // Create a request summary for logging
    const requestSummary = JSON.stringify({
      model: apiConfig.model,
      messages: adaptedMessages.map(m => m.content ? m.content.substring(0, 200) : '').slice(-3), // Log last 3 messages for brevity, truncated
      temperature: config.temperature,
    });

    // Log the initial request
    logId = await logRequest(apiConfig.configId, apiConfig.model, requestSummary);

    // 重试逻辑
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      const currentAttemptStartTime = Date.now(); // Start time for this specific attempt
      try {
        console.log(`=== 对话请求 (尝试 ${attempt + 1}/${retryCount + 1}) ===`); // Changed retryCount to retryCount + 1 for display
        console.log('Model:', apiConfig.model);

                const response = await sendChatRequest(
          apiConfig.baseUrl,
          apiConfig.apiKey,
          requestBody
        );

        const durationMs = Date.now() - currentAttemptStartTime; // 在这里定义 durationMs，确保它在 try 块的后续代码中可用

        if (!response.ok) {
          let errorDetail = '';
          try {
            const errorJson = await response.json() as any;
            errorDetail = errorJson.error?.message || JSON.stringify(errorJson);
          } catch {
            errorDetail = await response.text();
          }

          console.error(`API Error (${response.status}):`, errorDetail);
          const friendlyMsg = getErrorMessage(response.status, errorDetail);
                    lastError = new Error(friendlyMsg);

          // Log the error for this attempt
          if (logId) {
            await logError(logId, response.status, durationMs, friendlyMsg);
          }

          // 对于 4xx 客户端错误，不重试
          if (response.status >= 400 && response.status < 500) {
            console.warn(`Client error (${response.status}) on attempt ${attempt + 1}. Not retrying.`);
            break; // 不再重试
          }
          continue; // 重试
        }

                // If response is OK
        if (config.streaming !== false) {
          // Streaming response
          // For streaming, we can only log a placeholder for responseSummary on the server side
          // The actual full content is built on the client.
                    if (logId) {
            await logResponse(logId, response.status, durationMs, "Streaming response started");
          }
          return new Response(response.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        } else {
          // Non-streaming response
          const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
          const responseContent = data.choices?.[0]?.message?.content || '';
          
          if (logId) {
            await logResponse(logId, response.status, durationMs, responseContent);
          }
          return Response.json({ success: true, data });
        }

            } catch (error) {
        console.error(`请求失败 (尝试 ${attempt + 1}):`, error);
        const networkMsg = getNetworkErrorMessage(error);
                lastError = new Error(networkMsg);
        
                        // Log the network error for this attempt
        const durationMs = Date.now() - currentAttemptStartTime; // 在 catch 块中也需要计算 durationMs
        if (logId) {
          await logError(logId, null, durationMs, networkMsg);
        }
        
        // 最后一次重试前等待一下
        if (attempt < retryCount) {
          await new Promise((r) => setTimeout(r, retryDelay));
        }
      }
    }

        // All retries failed
    // If logId is available, the final state should already be logged as error.
    return Response.json(
      { success: false, error: lastError?.message || '请求失败，请重试' },
      { status: 500 }
    );

  } catch (error) {
        const durationMs = Date.now() - requestStartTime;
    console.error('Chat API Fatal Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // If logId was never set (e.g., getApiConfig failed), we still try to log
    if (logId) {
      await logError(logId, 500, durationMs, message);
    } else {
      // If logId is null, it means logRequest failed or getApiConfig failed.
      // We can't link this error to a specific request log entry, but we can log it generically.
      // For this case, we might need a separate generic error logging mechanism or accept it's not tied to a logId.
      // For now, I'll log to console.error and return the response.
    }
    
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
