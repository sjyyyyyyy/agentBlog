import { NextRequest } from 'next/server';
import { queryD1 } from '@/lib/d1';
import { ApiConfig } from '@/types/api-config';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateConfigBody {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  isDefault?: boolean;
  retryCount?: number;
}

interface StoredApiConfig {
  id: number;
  name: string;
  base_url: string;
  api_key: string;
  is_default: number;
  retry_count: number;
  created_at: number;
}

interface ChatModelPreference {
  configId?: number;
  modelId?: string;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const configId = parseInt(id, 10);

    if (Number.isNaN(configId)) {
      return Response.json(
        { success: false, error: 'Invalid config ID' },
        { status: 400 }
      );
    }

    let results: StoredApiConfig[];
    try {
      results = await queryD1(
        'SELECT id, name, base_url, api_key, is_default, retry_count, created_at FROM api_configs WHERE id = ?',
        [configId]
      ) as StoredApiConfig[];
    } catch (error: any) {
      if (error.message?.includes('no such column: retry_count')) {
        const fallbackResults = await queryD1(
          'SELECT id, name, base_url, api_key, is_default, created_at FROM api_configs WHERE id = ?',
          [configId]
        ) as Array<Omit<StoredApiConfig, 'retry_count'>>;
        results = fallbackResults.map((record) => ({ ...record, retry_count: 2 }));
      } else {
        throw error;
      }
    }

    if (results.length === 0) {
      return Response.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: results[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const configId = parseInt(id, 10);
    const body = await request.json() as UpdateConfigBody;

    if (Number.isNaN(configId)) {
      return Response.json(
        { success: false, error: 'Invalid config ID' },
        { status: 400 }
      );
    }

    const existing = await queryD1(
      'SELECT id, name, base_url, api_key, is_default, retry_count, created_at FROM api_configs WHERE id = ?',
      [configId]
    ) as ApiConfig[];

    if (existing.length === 0) {
      return Response.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      params.push(body.name.trim());
    }
    if (body.baseUrl !== undefined) {
      updates.push('base_url = ?');
      params.push(body.baseUrl.trim().replace(/\/$/, ''));
    }
    if (body.apiKey !== undefined) {
      updates.push('api_key = ?');
      params.push(body.apiKey.trim());
    }
    if (body.isDefault !== undefined) {
      if (body.isDefault) {
        await queryD1('UPDATE api_configs SET is_default = 0');
      }
      updates.push('is_default = ?');
      params.push(body.isDefault ? 1 : 0);
    }
    if (body.retryCount !== undefined) {
      updates.push('retry_count = ?');
      params.push(body.retryCount);
    }

    if (updates.length === 0) {
      return Response.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    params.push(configId);
    await queryD1(
      `UPDATE api_configs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await queryD1(
      'SELECT id, name, base_url, api_key, is_default, retry_count, created_at FROM api_configs WHERE id = ?',
      [configId]
    ) as StoredApiConfig[];

    return Response.json({
      success: true,
      message: 'Config updated successfully',
      data: updated[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const configId = parseInt(id, 10);

    if (Number.isNaN(configId)) {
      return Response.json(
        { success: false, error: 'Invalid config ID' },
        { status: 400 }
      );
    }

    const existing = await queryD1(
      'SELECT id, is_default, created_at FROM api_configs WHERE id = ?',
      [configId]
    ) as Array<{ id: number; is_default: number; created_at: number }>;

    if (existing.length === 0) {
      return Response.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      );
    }

    await queryD1(
      'UPDATE request_logs SET api_config_id = NULL WHERE api_config_id = ?',
      [configId]
    );

    let clearedChatModel = false;
    const chatModelPref = await queryD1(
      "SELECT value FROM user_preferences WHERE key = 'chat_model'"
    ) as Array<{ value: string }>;

    if (chatModelPref.length > 0) {
      try {
        const preference = JSON.parse(chatModelPref[0].value) as ChatModelPreference;
        if (preference.configId === configId) {
          await queryD1("DELETE FROM user_preferences WHERE key = 'chat_model'");
          clearedChatModel = true;
        }
      } catch (error) {
        console.warn('Failed to parse chat_model preference during API config deletion:', error);
      }
    }

    await queryD1('DELETE FROM api_configs WHERE id = ?', [configId]);

    let reassignedDefaultTo: number | null = null;
    if (existing[0].is_default === 1) {
      const fallbackConfig = await queryD1(
        'SELECT id FROM api_configs ORDER BY created_at DESC, id DESC LIMIT 1'
      ) as Array<{ id: number }>;

      if (fallbackConfig.length > 0) {
        reassignedDefaultTo = fallbackConfig[0].id;
        await queryD1(
          'UPDATE api_configs SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END',
          [reassignedDefaultTo]
        );
      }
    }

    return Response.json({
      success: true,
      message: 'Config deleted successfully',
      data: {
        clearedChatModel,
        reassignedDefaultTo,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

