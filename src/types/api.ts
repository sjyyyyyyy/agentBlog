// API 通用响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 聊天模型偏好设置
export interface ChatModelPreference {
  configId: number;
  modelId: string;
}

// 测试结果
export interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  latency?: number;
  modelCount?: number;
}

// 模型信息
export interface ModelInfo {
  id: string;
  name: string;
  capabilities: {
    vision: boolean;
    streaming: boolean;
    functionCalling: boolean;
  };
}

// 更新配置请求
export interface UpdateConfigBody {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  isDefault?: boolean;
}

// 更新对话请求
export interface UpdateConversationBody {
  title?: string;
  tags?: string;
}

// OpenAI 聊天响应
export interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
    delta?: {
      content?: string;
    };
  }>;
}