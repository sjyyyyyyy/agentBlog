import { NextRequest } from 'next/server';
import { queryD1 } from '@/lib/d1';
import { ModelInfo, ModelCapabilities } from '@/types/api-config';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// 数据库返回的类型（下划线命名）
interface DbApiConfig {
    id: number;
    name: string;
    base_url: string;
    api_key: string;
    is_default: number;
    created_at: number;
}

// 已知模型的能力
const KNOWN_MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
    'gpt-4o': { vision: true, streaming: true, functionCalling: true, maxContextLength: 128000 },
    'gpt-4o-mini': { vision: true, streaming: true, functionCalling: true, maxContextLength: 128000 },
    'gpt-4-turbo': { vision: true, streaming: true, functionCalling: true, maxContextLength: 128000 },
    'gpt-4': { vision: false, streaming: true, functionCalling: true, maxContextLength: 8192 },
    'gpt-3.5-turbo': { vision: false, streaming: true, functionCalling: true, maxContextLength: 16385 },
    'claude-3-opus': { vision: true, streaming: true, functionCalling: true, maxContextLength: 200000 },
    'claude-3-sonnet': { vision: true, streaming: true, functionCalling: true, maxContextLength: 200000 },
    'claude-3-haiku': { vision: true, streaming: true, functionCalling: true, maxContextLength: 200000 },
    'claude-3-5-sonnet': { vision: true, streaming: true, functionCalling: true, maxContextLength: 200000 },
    'gemini-1.5-pro': { vision: true, streaming: true, functionCalling: true, maxContextLength: 1000000 },
    'gemini-1.5-flash': { vision: true, streaming: true, functionCalling: true, maxContextLength: 1000000 },
};

const DEFAULT_CAPABILITIES: ModelCapabilities = {
    vision: false,
    streaming: true,
    functionCalling: false,
};

function getModelCapabilities(modelId: string): ModelCapabilities {
    const lowerModelId = modelId.toLowerCase();

    for (const [key, caps] of Object.entries(KNOWN_MODEL_CAPABILITIES)) {
        if (lowerModelId.includes(key.toLowerCase())) {
            return caps;
        }
    }

    const caps: ModelCapabilities = { ...DEFAULT_CAPABILITIES };

    if (lowerModelId.includes('vision') || lowerModelId.includes('4o') || lowerModelId.includes('gemini')) {
        caps.vision = true;
    }
    if (lowerModelId.includes('claude') || lowerModelId.includes('gpt')) {
        caps.functionCalling = true;
    }

    return caps;
}

export async function GET(request: NextRequest, context: RouteContext) {
    void request; // 避免未使用警告

    try {
        const { id } = await context.params;
        const configId = parseInt(id, 10);

        if (isNaN(configId)) {
            return Response.json(
                { success: false, error: 'Invalid config ID' },
                { status: 400 }
            );
        }

        const configs = await queryD1(
            'SELECT * FROM api_configs WHERE id = ?',
            [configId]
        ) as DbApiConfig[];

        if (configs.length === 0) {
            return Response.json(
                { success: false, error: 'Config not found' },
                { status: 404 }
            );
        }

        const config = configs[0];

        const response = await fetch(`${config.base_url}/models`, {
            headers: {
                'Authorization': `Bearer ${config.api_key}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return Response.json(
                { success: false, error: `拉取模型失败: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json() as { data?: Array<{ id: string }> };

        const models: ModelInfo[] = (data.data || []).map((model) => ({
            id: model.id,
            name: model.id,
            capabilities: getModelCapabilities(model.id),
        }));


        models.sort((a, b) => a.id.localeCompare(b.id));

        return Response.json({
            success: true,
            data: models,
            count: models.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return Response.json({ success: false, error: message }, { status: 500 });
    }
}
