// 单条消息
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;                // AI 消息使用的模型名称
    // 分支与版本控制字段
    siblingId?: string;            // 同一位置的消息共享此 ID
  versionIndex?: number;         // 当前是第几个版本，从 0 开始
  totalVersions?: number;        // 该位置共有几个版本
  versions?: Message[];          // 该位置所有版本的数组
  
    // 树状结构字段
  parentId?: string | null;      // 父节点 ID
  childrenIds?: string[];        // 所有子节点 ID
  selectedChildId?: string | null; // 当前选中的子节点 ID
  tokenCount?: number;           // token 统计
  isStreaming?: boolean;         // 是否正在流式输出
  isError?: boolean;             // 是否是错误消息
}

// 对话配置
export interface ChatConfig {
  name: string;                  // 对话名称
  systemPrompt: string;          // System Prompt
  temperature: number;           // 温度 0-2
  topP: number;                  // Top P 0-1
  maxTokens: number | null;      // 最大输出 token，null=不限制
  streaming: boolean;            // 流式输出
  contextLength: number | null;  // 上下文消息数量，null=不限制
  enableMemory: boolean;         // 是否记忆（用于后续保存）
}

// 对话会话
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  config: ChatConfig;
  createdAt: number;
  updatedAt: number;
}

// API 响应格式（OpenAI 兼容）
export interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 默认配置
export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  name: '新对话',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,
  topP: 1,
  maxTokens: null,
  streaming: true,
  contextLength: null,
  enableMemory: true,
};
