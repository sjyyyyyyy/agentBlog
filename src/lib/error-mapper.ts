/**
 * HTTP 状态码与用户友好提示的映射表
 */
const ERROR_MESSAGES: Record<number, string> = {
  400: "请求参数错误，请检查配置",
  401: "API 密钥无效或已过期，请检查配置",
  403: "API 密钥权限不足",
  404: "请求的模型不存在，请检查模型配置",
  429: "请求频率过高，已被限流，请稍后再试",
  500: "服务器内部错误，请稍后重试",
  502: "网关错误，服务暂时不可用",
  503: "服务不可用，请稍后重试",
  504: "请求超时，请检查网络连接",
};

/**
 * 根据状态码获取用户友好的错误提示
 * @param statusCode HTTP 状态码
 * @param originalMessage API 返回的原始错误消息
 * @returns 友好提示字符串
 */
export function getErrorMessage(statusCode: number, originalMessage?: string): string {
  const friendlyMessage = ERROR_MESSAGES[statusCode] || `请求失败，错误码: ${statusCode}`;
  
  // 如果有原始错误消息，可以追加显示（可选，或者仅在开发模式下显示）
  if (originalMessage && originalMessage.length < 100) {
    return `${friendlyMessage} (${originalMessage})`;
  }
  
  return friendlyMessage;
}

/**
 * 处理网络连接错误（如 fetch 失败、CORS 错误等）
 */
export function getNetworkErrorMessage(error: any): string {
  console.error("Network Error Details:", error);
  return "网络连接失败，请检查网络或 API 地址";
}