'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface RequestLog {
  id: number;
  timestamp: number;
  type: 'request' | 'response' | 'error';
  api_config_id: number | null;
  model_name: string | null;
  status_code: number | null;
  duration_ms: number | null;
  request_summary: string | null;
  response_summary: string | null;
  error_message: string | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiConfig {
  id: number;
  name: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // 筛选条件
  const [filters, setFilters] = useState({
    type: '',
    apiConfigId: '',
    modelName: '',
    page: 1,
  });

  // 获取 API 配置列表用于筛选
  const fetchApiConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setApiConfigs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch API configs:', error);
    }
  }, []);

  // 获取日志数据
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: filters.page.toString(),
        limit: '20',
        ...(filters.type && { type: filters.type }),
        ...(filters.apiConfigId && { apiConfigId: filters.apiConfigId }),
        ...(filters.modelName && { modelName: filters.modelName }),
      });

      const res = await fetch(`/api/logs?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchApiConfigs();
  }, [fetchApiConfigs]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleClearLogs = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchLogs();
        setShowClearConfirm(false);
      } else {
        alert('Failed to clear logs: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
      alert('System error occurred while clearing logs');
    } finally {
      setClearing(false);
    }
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const renderTypeBadge = (type: string) => {
    const styles = {
      request: 'bg-blue-900/50 text-blue-400 border-blue-800',
      response: 'bg-green-900/50 text-green-400 border-green-800',
      error: 'bg-red-900/50 text-red-400 border-red-800',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs border ${styles[type as keyof typeof styles]}`}>
        {type.toUpperCase()}
      </span>
    );
  };

  const renderJson = (content: string | null) => {
    if (!content) return null;
    try {
      const obj = JSON.parse(content);
      return <pre className="bg-gray-950 p-3 rounded text-xs overflow-auto max-h-96 text-gray-300 font-mono">{JSON.stringify(obj, null, 2)}</pre>;
    } catch {
      return <div className="bg-gray-950 p-3 rounded text-xs whitespace-pre-wrap text-gray-300 font-mono">{content}</div>;
    }
  };

  return (
    <div className="h-full w-full bg-background text-foreground font-mono flex flex-col overflow-hidden">
      {/* 顶部导航 - 吸顶 */}
      <div className="flex-shrink-0 border-b border-primary/30 px-4 py-3 bg-black/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold font-orbitron tracking-widest text-primary">SYSTEM.LOGS</h1>
          <Link href="/" className="poi-btn text-xs">
            &lt;&lt; RETURN_CONSOLE
          </Link>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-2 md:p-6">
        {/* 筛选区域 */}
        <div className="mb-6 bg-black/40 p-4 rounded-sm border border-primary/20">
          <div className="flex items-center justify-between md:hidden mb-4">
            <span className="text-sm text-primary/70 font-mono">LOG FILTERS</span>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="poi-btn text-xs py-1 px-2"
            >
              {showFilters ? 'COLLAPSE' : 'EXPAND'}
            </button>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${showFilters ? 'block' : 'hidden'} md:grid`}>
          <div>
            <label className="block text-xs font-mono text-primary/70 mb-1">LOG_TYPE</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="poi-input w-full"
            >
              <option value="">ALL_TYPES</option>
              <option value="request">REQUEST</option>
              <option value="response">RESPONSE</option>
              <option value="error">ERROR</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-primary/70 mb-1">API_CONFIG</label>
            <select
              value={filters.apiConfigId}
              onChange={(e) => handleFilterChange('apiConfigId', e.target.value)}
              className="poi-input w-full"
            >
              <option value="">ALL_CONFIGS</option>
              {apiConfigs.map(config => (
                <option key={config.id} value={config.id}>{config.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-primary/70 mb-1">MODEL_ID</label>
            <input
              type="text"
              placeholder="输入模型名称搜索..."
              value={filters.modelName}
              onChange={(e) => handleFilterChange('modelName', e.target.value)}
              className="poi-input w-full"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => setFilters({ type: '', apiConfigId: '', modelName: '', page: 1 })}
              className="poi-btn flex-1 text-xs opacity-70 hover:opacity-100"
            >
              RESET
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="poi-btn flex-1 text-xs border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive hover:shadow-[0_0_10px_rgba(255,51,51,0.3)]"
            >
              PURGE
            </button>
          </div>
          </div>
        </div>

        {/* 日志列表 */}
        <div className="bg-black/40 rounded-sm border border-primary/20 overflow-hidden relative">
           {/* Scanline decoration */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20"></div>
          
          {/* Mobile Card View */}
          <div className="md:hidden">
            {loading ? (
              <div className="p-8 text-center text-primary/50 font-mono">正在扫描日志数据...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-primary/50 font-mono">暂无日志记录</div>
            ) : (
              <div className="divide-y divide-primary/10">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="p-4 hover:bg-primary/5 active:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex flex-col">
                         <span className="text-xs text-primary/70 font-mono">{formatTimestamp(log.timestamp)}</span>
                         <span className="text-xs font-bold text-primary mt-1">{log.model_name || '-'}</span>
                       </div>
                       {renderTypeBadge(log.type)}
                    </div>
                    <div className="text-xs text-primary/60 line-clamp-2 font-mono mb-2">
                        {log.error_message || log.response_summary || log.request_summary || '-'}
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className={log.status_code && log.status_code >= 400 ? 'text-destructive' : 'text-primary/70'}>
                          STATUS: {log.status_code || '-'}
                      </span>
                      <span className="text-primary/50">{log.duration_ms ? `${log.duration_ms}ms` : '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary/10 border-b border-primary/30">
                  <th className="px-4 py-3 text-xs font-bold text-primary font-orbitron tracking-wider">TIMESTAMP</th>
                  <th className="px-4 py-3 text-xs font-bold text-primary font-orbitron tracking-wider">TYPE</th>
                  <th className="px-4 py-3 text-xs font-bold text-primary font-orbitron tracking-wider">MODEL</th>
                  <th className="px-4 py-3 text-xs font-bold text-primary font-orbitron tracking-wider">STATUS</th>
                  <th className="px-4 py-3 text-xs font-bold text-primary font-orbitron tracking-wider">LATENCY</th>
                  <th className="px-4 py-3 text-xs font-bold text-primary font-orbitron tracking-wider">SUMMARY</th>
                  <th className="px-4 py-3 text-xs font-bold text-primary font-orbitron tracking-wider">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-primary/50 font-mono">正在扫描日志数据...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-primary/50 font-mono">暂无日志记录</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-4 py-3 text-xs text-primary/70 whitespace-nowrap font-mono">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        {renderTypeBadge(log.type)}
                      </td>
                      <td className="px-4 py-3 text-xs text-primary/70 font-mono">
                        {log.model_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        <span className={log.status_code && log.status_code >= 400 ? 'text-destructive' : 'text-primary/70'}>
                          {log.status_code || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-primary/70 font-mono">
                        {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-primary/60 max-w-xs truncate font-mono">
                        {log.error_message || log.response_summary || log.request_summary || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-primary hover:text-white text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider"
                        >
                          [INSPECT]
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-4 py-4 border-t border-primary/20 flex items-center justify-between bg-primary/5">
              <div className="text-xs text-primary/50 font-mono">
                TOTAL_RECORDS: {pagination.total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={filters.page === 1}
                  onClick={() => handleFilterChange('page', filters.page - 1)}
                  className="p-2 rounded-sm border border-primary/30 hover:bg-primary/20 disabled:opacity-30 disabled:hover:bg-transparent text-primary"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-xs px-4 text-primary font-mono">
                   {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  disabled={filters.page === pagination.totalPages}
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                  className="p-2 rounded-sm border border-primary/30 hover:bg-primary/20 disabled:opacity-30 disabled:hover:bg-transparent text-primary"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      <ConfirmModal
        isOpen={showClearConfirm}
        title="SYSTEM PURGE"
        message="警告：此操作将永久删除所有系统日志，且不可恢复。\n\n确定要继续吗？"
        onConfirm={handleClearLogs}
        onCancel={() => setShowClearConfirm(false)}
        confirmText="EXECUTE PURGE"
        cancelText="ABORT"
        type="danger"
        loading={clearing}
      />

      {/* 详情模态框 */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-black/95 border border-primary rounded-sm w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] flex flex-col shadow-[0_0_30px_rgba(255,215,0,0.15)] relative overflow-hidden">
             {/* HUD Corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>

            <div className="flex items-center justify-between p-6 border-b border-primary/30 bg-primary/5">
              <h2 className="text-xl font-bold flex items-center gap-3 font-orbitron tracking-widest text-primary">
                LOG_DETAILS
                {renderTypeBadge(selectedLog.type)}
              </h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:text-white transition-colors text-primary/50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 font-mono">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-primary/50 uppercase mb-1 tracking-wider">TIMESTAMP</div>
                  <div className="text-sm text-primary/80">{new Date(selectedLog.timestamp).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-primary/50 uppercase mb-1 tracking-wider">MODEL</div>
                  <div className="text-sm text-primary/80">{selectedLog.model_name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-primary/50 uppercase mb-1 tracking-wider">STATUS_CODE</div>
                  <div className={`text-sm ${selectedLog.status_code && selectedLog.status_code >= 400 ? 'text-destructive' : 'text-primary/80'}`}>
                    {selectedLog.status_code || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-primary/50 uppercase mb-1 tracking-wider">LATENCY</div>
                  <div className="text-sm text-primary/80">{selectedLog.duration_ms ? `${selectedLog.duration_ms}ms` : '-'}</div>
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <div className="text-xs text-destructive/70 uppercase mb-2 tracking-wider">ERROR_MESSAGE</div>
                  <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-sm text-destructive text-sm font-mono">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              {selectedLog.request_summary && (
                <div>
                  <div className="text-xs text-primary/50 uppercase mb-2 tracking-wider">REQUEST_PAYLOAD</div>
                  {renderJson(selectedLog.request_summary)}
                </div>
              )}

              {selectedLog.response_summary && (
                <div>
                  <div className="text-xs text-primary/50 uppercase mb-2 tracking-wider">RESPONSE_PAYLOAD</div>
                  {renderJson(selectedLog.response_summary)}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-primary/30 flex justify-end bg-primary/5">
              <button
                onClick={() => setSelectedLog(null)}
                className="poi-btn"
              >
                CLOSE_PANEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}