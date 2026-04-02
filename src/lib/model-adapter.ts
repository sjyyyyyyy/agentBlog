// 模型能力定义
export interface ModelCapabilities {
  supportsSystemRole: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  maxContextLength: number;
}

// 已知模型能力表
const MODEL_CAPABILITIES: Record<string, Partial<ModelCapabilities>> = {
  // OpenAI
  'gpt-4o': { supportsSystemRole: true, supportsVision: true, supportsFunctionCalling: true, maxContextLength: 128000 },
  'gpt-4o-mini': { supportsSystemRole: true, supportsVision: true, supportsFunctionCalling: true, maxContextLength: 128000 },
  'gpt-4-turbo': { supportsSystemRole: true, supportsVision: true, supportsFunctionCalling: true, maxContextLength: 128000 },
  'gpt-4': { supportsSystemRole: true, supportsVision: false, supportsFunctionCalling: true, maxContextLength: 8192 },
  'gpt-3.5-turbo': { supportsSystemRole: true, supportsVision: false, supportsFunctionCalling: true, maxContextLength: 16385 },
  
  // Claude
  'claude': { supportsSystemRole: true, supportsVision: true, supportsFunctionCalling: true, maxContextLength: 200000 },
  
  // Gemini - 新版本都支持 system role
  'gemini-2': { supportsSystemRole: true, supportsVision: true, supportsFunctionCalling: true, maxContextLength: 1000000 },
  'gemini-1.5': { supportsSystemRole: true, supportsVision: true, supportsFunctionCalling: true, maxContextLength: 1000000 },
  'gemini-1.0': { supportsSystemRole: false, supportsVision: true, supportsFunctionCalling: false, maxContextLength: 32000 },
  'gemini-pro': { supportsSystemRole: true, supportsVision: false, supportsFunctionCalling: true, maxContextLength: 32000 },
  
  // DeepSeek
  'deepseek': { supportsSystemRole: true, supportsVision: false, supportsFunctionCalling: true, maxContextLength: 64000 },
  
  // Qwen
  'qwen': { supportsSystemRole: true, supportsVision: true, supportsFunctionCalling: true, maxContextLength: 32000 },
};

// 默认能力（假设支持 system role）
const DEFAULT_CAPABILITIES: ModelCapabilities = {
  supportsSystemRole: true,
  supportsStreaming: true,
  supportsVision: false,
  supportsFunctionCalling: false,
  maxContextLength: 4096,
};

// 获取模型能力
export function getModelCapabilities(model: string): ModelCapabilities {
  const lowerModel = model.toLowerCase();
  
  // 按优先级匹配（更具体的优先）
  const sortedKeys = Object.keys(MODEL_CAPABILITIES).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    if (lowerModel.includes(key.toLowerCase())) {
      return { ...DEFAULT_CAPABILITIES, ...MODEL_CAPABILITIES[key] };
    }
  }
  
  return DEFAULT_CAPABILITIES;
}

// 消息格式
interface ChatMessage {
  role: string;
  content: string;
}

// 适配消息格式
export function adaptMessages(messages: ChatMessage[], model: string): ChatMessage[] {
  const caps = getModelCapabilities(model);
  
  // 如果支持 system role，直接返回原始消息
  if (caps.supportsSystemRole) {
    return messages;
  }
  
  // 不支持 system role 的老模型，才做转换
  return messages.map((m) => {
    if (m.role === 'system') {
      return {
        role: 'user',
        content: `请按照以下指示进行对话：\n\n${m.content}`,
      };
    }
    return m;
  });
}

// 适配请求参数
export function adaptRequest(
  requestBody: Record<string, unknown>,
  model: string
): Record<string, unknown> {
  // 使用一下 model 避免 ESLint 报错（后续会扩展）
  void model;
  return requestBody;
}
