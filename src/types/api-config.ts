// API 配置
export interface ApiConfig {
  id: number;
  name: string;                    // 配置名称，如 "主力 API"、"备用 API"
  baseUrl: string;                 // API 地址，如 "https://xxx.com/v1"
  apiKey: string;                  // API 密钥
  isDefault: boolean;              // 是否默认
  retryCount?: number;             // AI 请求失败时自动重试的次数 (0-5次)
  createdAt: number;
}

// 创建 API 配置的输入
export interface CreateApiConfigInput {
  name: string;
  baseUrl: string;
  apiKey: string;
  isDefault?: boolean;
  retryCount?: number;
}

// 模型信息（从 API 拉取）
export interface ModelInfo {
  id: string;                      // 模型 ID，如 "gpt-4o"
  name: string;                    // 显示名称
  capabilities: ModelCapabilities; // 能力标签
}

// 模型能力
export interface ModelCapabilities {
  vision: boolean;                 // 支持图片
  streaming: boolean;              // 支持流式
  functionCalling: boolean;        // 支持函数调用
  maxContextLength?: number;       // 最大上下文长度
}

// 用途绑定
export interface ModelBinding {
  purpose: 'chat' | 'vision' | 'summary' | 'code';
  apiConfigId: number;
  modelId: string;
}
