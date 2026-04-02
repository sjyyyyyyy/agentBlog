'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, ChatConfig } from '@/types/chat';
import { parseCommand, validatePomodoroMinutes } from '@/lib/command-parser';
import { usePomodoroStore } from '@/lib/pomodoro-store';
import { toast } from '@/components/ui/Toast';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
import {
  ChatSession,
  loadCurrentChat,
  saveCurrentChat,
  saveChatById,
  loadChatById,
  createNewChat,
    generateId,
  generateTitle,
  addMessageToTree,
  switchBranch,
  updateMessageInTree,
  deleteMessageFromTree,
  deriveMessages,
  ensureTreeStructure,
  clearCurrentChat,
  getGeneralSettings,
  GeneralSettings,
  DEFAULT_GENERAL_SETTINGS,
} from '@/lib/storage';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ChatConfigPanel from './ChatConfigPanel';
import ChatSidebar from './ChatSidebar';
import SaveConversationModal from './SaveConversationModal';

// 引用类型
interface Quote {
  content: string;
  floor?: number;
  source?: string;
}

// 待办事项类型（轻量版，仅用于上下文注入）
interface TodoItem {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  due_date: number | null;
  tags: string | null;
}

/**
 * 将待办事项列表格式化为系统提示词可读的上下文文本
 * @param todos - 待办事项数组
 * @returns 格式化后的文本
 */
function formatTodosContext(todos: TodoItem[]): string {
  if (!todos || todos.length === 0) return '';

  const priorityLabel = (p: number) => p === 2 ? '🔴高' : p === 1 ? '🟡中' : '🟢低';
  const now = Date.now();

  const pending = todos.filter(t => t.status === 'pending');
  const completed = todos.filter(t => t.status === 'completed');
  const overdue = pending.filter(t => t.due_date && t.due_date < now);

  let text = '\n\n[用户待办事项清单]';
  text += `\n共 ${todos.length} 项（未完成 ${pending.length} 项，已完成 ${completed.length} 项，已过期 ${overdue.length} 项）`;

  if (pending.length > 0) {
    text += '\n\n--- 未完成 ---';
    pending.forEach(t => {
      const dueStr = t.due_date
        ? `截止: ${new Date(t.due_date).toLocaleDateString('zh-CN')}${t.due_date < now ? ' ⚠️已过期' : ''}`
        : '无截止日期';
      text += `\n• [${priorityLabel(t.priority)}] ${t.title}`;
      if (t.description) text += `\n  描述: ${t.description}`;
      text += `\n  ${dueStr}`;
      if (t.tags) text += ` | 标签: ${t.tags}`;
    });
  }

  if (completed.length > 0) {
    text += `\n\n--- 最近已完成 (${completed.length} 项) ---`;
    // 只展示最近 5 条已完成的，避免上下文过长
    completed.slice(0, 5).forEach(t => {
      text += `\n• ✅ ${t.title}`;
    });
    if (completed.length > 5) text += `\n  ...还有 ${completed.length - 5} 项`;
  }

  text += '\n\n请在合适的时候主动提醒用户待办事项的截止时间或进展，但不要每次都重复列出所有待办。';
  return text;
}

export default function ChatContainer() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const sessionRef = useRef<ChatSession | null>(null);

  // 始终保持 Ref 与 State 同步，确保在异步回调和初始化后都能获取最新值
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // 更新状态的辅助函数
  const updateSession = useCallback((updater: (prev: ChatSession | null) => ChatSession | null) => {
    setSession((prev) => {
      const next = updater(prev);
      return next;
    });
  }, []);
    const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const currentModelRef = useRef<string | null>(null);  // 使用 ref 确保获取最新值
    const [showConfig, setShowConfig] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const todosRef = useRef<TodoItem[]>([]);  // 待办事项缓存，使用 ref 避免不必要的重渲染

  // 番茄钟 store
  const pomodoroStart = usePomodoroStore((state) => state.start);
  const pomodoroStatus = usePomodoroStore((state) => state.status);

    // 初始化
  useEffect(() => {
    const pendingCloudChat = sessionStorage.getItem('pending_loaded_chat_session');
    if (pendingCloudChat) {
      try {
        const chatSession: ChatSession = JSON.parse(pendingCloudChat);
        // 从云端加载的对话，确保其 isStreaming 状态为 false，并重新 derive messages
                // 从云端加载的对话是扁平的，立即转换为树状结构以支持后续分支功能
        const treeSession = ensureTreeStructure(chatSession);
        
        // 确保 isStreaming 状态为 false
        if (treeSession.messageMap) {
          Object.values(treeSession.messageMap).forEach(msg => {
            if (msg.isStreaming) msg.isStreaming = false;
          });
        }
        
        // 重新 derive messages 以注入 UI 所需的 versions 等字段
        treeSession.messages = deriveMessages(treeSession);
        
        setSession(treeSession);
        sessionStorage.removeItem('pending_loaded_chat_session'); // 清理 sessionStorage
        return; // 优先处理云端加载的对话
      } catch (e) {
        console.error('解析 pending_loaded_chat_session 失败:', e);
        sessionStorage.removeItem('pending_loaded_chat_session'); // 清理错误数据
      }
    }

        const saved = loadCurrentChat();
    if (saved) {
      // 对本地加载的对话也进行一次结构校验和流状态清理
      const treeSession = ensureTreeStructure(saved);
      if (treeSession.messageMap) {
        Object.values(treeSession.messageMap).forEach(msg => {
          if (msg.isStreaming) msg.isStreaming = false;
        });
      }
      treeSession.messages = deriveMessages(treeSession);
      setSession(treeSession);
    } else {
      setSession(createNewChat());
    }

                // 加载通用设置（用户名称、AI名称等）
    setGeneralSettings(getGeneralSettings());

    // 初始化时加载待办事项列表
    fetchTodos();

    // 检查是否有待处理的引用（从云端对话页跳转过来）
    const pendingQuote = sessionStorage.getItem('pending_quote');
    if (pendingQuote) {
      try {
        const quoteData = JSON.parse(pendingQuote);
        setQuote(quoteData);
        sessionStorage.removeItem('pending_quote');
      } catch {
        // 忽略
      }
    }
  }, []);

        // 自动保存
  useEffect(() => {
    // 只有当对话有消息时才保存，避免创建大量的空对话
    if (session && session.messages.length > 0) {
      saveCurrentChat(session);
    }
  }, [session]); // 监听 session 状态的变化，确保流式输出和状态更新都能实时保存

    /**
   * 获取待办事项列表，缓存到 ref 中
   * 每次发送消息前会调用，确保 AI 拿到最新数据
   */
  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const data = await res.json() as TodoItem[];
        todosRef.current = data;
      }
    } catch (error) {
      console.error('获取待办事项失败:', error);
    }
  }, []);

    // 加载当前模型
  useEffect(() => {
    const loadModel = async () => {
      try {
        const res = await fetch('/api/preferences/chat-model');
                        const data = await res.json() as ApiResponse<{ configId: number; modelId: string }>;
        if (data.success && data.data) {
          setCurrentModel(data.data.modelId);
          currentModelRef.current = data.data.modelId;  // 同步更新 ref
        }
      } catch (error) {
        console.error('加载模型失败:', error);
      }
    };
    loadModel();
  }, []);

    // 新建对话
  const handleNewChat = useCallback((skipSave = false) => {
    // 如果 skipSave 为 true（例如删除当前对话后触发），则不保存当前对话
    // 注意：skipSave 可能是事件对象，所以要明确检查类型
    const shouldSave = typeof skipSave === 'boolean' ? !skipSave : true;
    
        const currentSession = sessionRef.current; // 使用 sessionRef 获取最新 session
    if (shouldSave && currentSession && currentSession.messages.length > 0) {
      saveChatById(currentSession);
    } else if (!shouldSave) {
      // 如果是跳过保存（例如删除当前对话后），则清除当前对话的 localStorage 记录
      clearCurrentChat();
    }
    const newChat = createNewChat();
    setSession(newChat);
  }, []); // 移除对 session 的依赖，使其引用稳定

    // 切换对话
  const handleSelectChat = useCallback((chatId: string) => {
    const currentSession = sessionRef.current;
    if (currentSession && currentSession.messages.length > 0) {
      saveChatById(currentSession);
    }
    
    const chat = loadChatById(chatId);
    if (chat) {
      setSession(chat);
    }
  }, []);

    // 更新配置
  const handleConfigChange = useCallback((newConfig: ChatConfig) => {
    updateSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        config: newConfig,
        title: newConfig.name !== '新对话' ? newConfig.name : prev.title,
        updatedAt: Date.now(),
      };
    });
  }, []);

  // 处理引用
  const handleQuote = useCallback((content: string, floor: number) => {
    setQuote({ content, floor, source: 'current' });
  }, []);

    // 清除引用
  const handleClearQuote = useCallback(() => {
    setQuote(null);
  }, []);

          // 切换版本
  const handleSwitchVersion = useCallback((message: Message, index: number) => {
    updateSession(prev => {
      if (!prev) return null;
      const newSession = switchBranch(prev, message.id, index);
      return { ...newSession, updatedAt: Date.now() };
    });
  }, []); // 移除依赖，使其引用稳定

  // 删除消息
  const handleDeleteMessage = useCallback((messageId: string) => {
    updateSession(prev => {
      if (!prev) return null;
      const nextSession = deleteMessageFromTree(prev, messageId);
      saveCurrentChat(nextSession); // 删除后立即保存
      return nextSession;
    });
  }, []);

  /**
   * 处理番茄钟指令
   * 检测用户消息中是否包含番茄钟启动指令，如果有则启动番茄钟
   * @param content - 用户消息内容
   * @returns 是否成功启动番茄钟
   */
        const handlePomodoroCommand = useCallback((content: string): boolean => {
        // 解析指令
    const command = parseCommand(content);
    
    if (!command || command.type !== 'pomodoro') {
      return false;
    }

    // 检查番茄钟是否已在运行
    if (pomodoroStatus !== 'idle') {
      toast.warning('番茄钟正在运行中，请先完成或放弃当前番茄钟');
      return false;
    }

    // 验证时长
    const validation = validatePomodoroMinutes(command.minutes);
    if (!validation.valid) {
      toast.warning(validation.message || '时长设置无效');
      return false;
    }

        // 启动番茄钟
    pomodoroStart(command.minutes);
    
    // 显示成功提示
    toast.success(`🍅 番茄钟已启动，${command.minutes} 分钟后提醒你！`);
    
    return true;
  }, [pomodoroStart, pomodoroStatus]);

  /**
   * 处理待办指令
   */
  const handleTodoCommand = useCallback(async (content: string): Promise<boolean> => {
    const command = parseCommand(content);
    if (!command || command.type !== 'todo') {
      return false;
    }

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: command.title,
          due_date: command.dueDate
        }),
      });

      if (res.ok) {
        let msg = `📝 已添加待办：${command.title}`;
        if (command.dueDate) {
          const dateStr = new Date(command.dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
          msg += `（截止：${dateStr}）`;
        }
        toast.success(msg);
        return true;
      } else {
        toast.error("添加待办失败");
        return false;
      }
    } catch (error) {
      console.error("Failed to create todo from chat", error);
      toast.error("添加待办出错");
      return false;
    }
  }, []);

                                                        // 重新生成消息
    const handleRegenerate = useCallback(async (message: Message) => {
    const currentSession = sessionRef.current;
    if (!currentSession || isLoading) return;

        // 找到消息索引
    const index = currentSession.messages.findIndex((m) => m.id === message.id);
    if (index === -1) return;

    setIsLoading(true);

    const newMessageId = generateId();
        const newMessage: Message = {
      id: newMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: currentModelRef.current || undefined,  // 使用 ref 获取最新模型
      isStreaming: true,
    };

        // 2. 更新 Session 状态
    updateSession((prev) => {
      if (!prev) return null;
      
      // 确定 parentId
      // 如果 message 已经有 parentId (来自新结构)，直接用
      // 否则，它应该是上一条消息的子节点
      let parentId = message.parentId;
      if (!parentId && index > 0) {
        parentId = prev.messages[index - 1].id;
      }
      
      // 添加新消息到树中 (作为 message 的兄弟，即共享 parentId)
      const newSession = addMessageToTree(prev, newMessage, parentId || undefined);
      return { ...newSession, updatedAt: Date.now() };
    });

        // 3. 发送请求
    try {
            // 上下文是该消息之前的所有消息
      let contextMessages = currentSession.messages.slice(0, index);
      
      // 应用上下文长度限制
      if (currentSession.config.contextLength !== null && currentSession.config.contextLength > 0) {
        contextMessages = contextMessages.slice(-currentSession.config.contextLength);
      }

                  // 构建包含待办上下文的系统提示词
      const systemPromptWithTodos = currentSession.config.systemPrompt + formatTodosContext(todosRef.current);

      const allMessages: Message[] = [
        {
          id: 'system',
          role: 'system',
          content: systemPromptWithTodos,
          timestamp: 0,
        },
        ...contextMessages,
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          config: currentSession.config,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (currentSession.config.streaming) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No response body');

        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content || '';
                fullContent += content;

                                                updateSession((prevSession) => {
                  if (!prevSession) return null;
                  return updateMessageInTree(prevSession, newMessageId, { content: fullContent });
                });
              } catch {
                // ignore
              }
            }
          }
        }
        
                        // 检查空回
        if (!fullContent.trim()) {
          updateSession((prev) => {
            if (!prev) return null;
            const next = updateMessageInTree(prev, newMessageId, {
              content: 'AI 未返回任何内容，请尝试重新生成或更换模型。',
              isStreaming: false,
              isError: true,
            });
            saveCurrentChat(next); // 立即原子化保存，防止刷新丢失
            return next;
          });
        } else {
          updateSession((prevSession) => {
            if (!prevSession) return null;
            const next = updateMessageInTree(prevSession, newMessageId, { content: fullContent, isStreaming: false });
            saveCurrentChat(next); // 立即原子化保存，防止刷新丢失
            return next;
          });
        }

            } else {
        const data = await response.json() as { data?: { choices?: Array<{ message?: { content?: string } }> } };
        const content = data.data?.choices?.[0]?.message?.content || '';
        
        // 检查空回
        if (!content.trim()) {
          updateSession((prev) => {
            if (!prev) return null;
            return updateMessageInTree(prev, newMessageId, {
              content: 'AI 未返回任何内容，请尝试重新生成或更换模型。',
              isStreaming: false,
              isError: true,
            });
          });
        } else {
          updateSession((prev) => {
            if (!prev) return null;
            return updateMessageInTree(prev, newMessageId, { content, isStreaming: false });
          });
        }
      }

        } catch (error) {
      console.error('Regenerate error:', error);
                  updateSession((prev) => {
        if (!prev) return null;
        const errorContent = error instanceof Error ? error.message : '未知错误';
        const next = updateMessageInTree(prev, newMessageId, { 
          content: errorContent, 
          isStreaming: false,
          isError: true
        });
        saveCurrentChat(next); // 错误状态也立即保存
        return next;
      });
                } finally {
      setIsLoading(false);
    }

  }, [isLoading, updateSession, currentModel]);

    // 发送消息
  const handleSend = useCallback(async (content: string, messageQuote?: Quote) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

        // 指令拦截处理
    // 支持 "/" 作为前缀
    const prefixes = ['/'];
    const matchedPrefix = prefixes.find(p => content.startsWith(p));

    if (matchedPrefix) {
      const commandText = content.slice(matchedPrefix.length).trim();
      const command = parseCommand(commandText);

      if (command) {
        if (command.type === 'pomodoro') {
          handlePomodoroCommand(commandText);
        } else if (command.type === 'todo') {
          handleTodoCommand(commandText);
        }
        // 拦截指令，不发送给 AI
        return;
      } else {
        toast.warning("无法识别的指令，请检查格式");
        return;
      }
    }

    // 如果有引用，组合消息
    let finalContent = content;
    if (messageQuote) {
      finalContent = `> 引用 ${messageQuote.floor ? `${messageQuote.floor}F` : ''}:\n> ${messageQuote.content.split('\n').join('\n> ')}\n\n${content}`;
    }

        const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: finalContent,
      timestamp: Date.now(),
    };

                        const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: currentModelRef.current || undefined,  // 使用 ref 获取最新模型
      isStreaming: true,
    };

        updateSession((prev) => {
      if (!prev) return null;
      const lastMsg = prev.messages[prev.messages.length - 1];
      let nextSession = addMessageToTree(prev, userMessage, lastMsg?.id);
      nextSession = addMessageToTree(nextSession, assistantMessage, userMessage.id);
      const newTitle = prev.messages.length === 0 ? generateTitle([userMessage]) : prev.title;
      return { ...nextSession, title: newTitle, updatedAt: Date.now() };
    });

                setIsLoading(true);
    setQuote(null); // 清除引用

    // 发送前刷新待办事项，确保 AI 拿到最新数据
    await fetchTodos();

    try {
      let contextMessages = currentSession.messages;
      if (currentSession.config.contextLength !== null && currentSession.config.contextLength > 0) {
        contextMessages = currentSession.messages.slice(-currentSession.config.contextLength);
      }

            // 构建包含待办上下文的系统提示词
      const systemPromptWithTodos = currentSession.config.systemPrompt + formatTodosContext(todosRef.current);

      const allMessages: Message[] = [
        {
          id: 'system',
          role: 'system',
          content: systemPromptWithTodos,
          timestamp: 0,
        },
        ...contextMessages,
        userMessage,
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          config: currentSession.config,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (currentSession.config.streaming) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content || '';
                fullContent += content;

                                                updateSession((prevSession) => {
                  if (!prevSession) return null;
                  return updateMessageInTree(prevSession, assistantMessage.id, { content: fullContent });
                });
              } catch {
                // 忽略
              }
            }
          }
        }

                        // 检查空回
        if (!fullContent.trim()) {
          updateSession((prev) => {
            if (!prev) return null;
            const next = updateMessageInTree(prev, assistantMessage.id, {
              content: 'AI 未返回任何内容，请尝试重新生成或更换模型。',
              isStreaming: false,
              isError: true,
            });
            saveCurrentChat(next); // 立即原子化保存
            return next;
          });
        } else {
          updateSession((prevSession) => {
            if (!prevSession) return null;
            const next = updateMessageInTree(prevSession, assistantMessage.id, { content: fullContent, isStreaming: false });
            saveCurrentChat(next); // 立即原子化保存
            return next;
          });
        }
            } else {
        const data = await response.json() as { data?: { choices?: Array<{ message?: { content?: string } }> } };
        const content = data.data?.choices?.[0]?.message?.content || '';
        
        // 检查空回
        if (!content.trim()) {
          updateSession((prev) => {
            if (!prev) return null;
            return updateMessageInTree(prev, assistantMessage.id, {
              content: 'AI 未返回任何内容，请尝试重新生成或更换模型。',
              isStreaming: false,
              isError: true,
            });
          });
        } else {
          updateSession((prev) => {
            if (!prev) return null;
            return updateMessageInTree(prev, assistantMessage.id, { content, isStreaming: false });
          });
        }
      }

        } catch (error) {
      console.error('Send error:', error);
                  updateSession((prev) => {
        if (!prev) return null;
        const errorContent = error instanceof Error ? error.message : '未知错误';
        const next = updateMessageInTree(prev, assistantMessage.id, {
          content: errorContent,
          isStreaming: false,
          isError: true
        });
        saveCurrentChat(next); // 错误状态也立即保存
        return next;
      });
                } finally {
      setIsLoading(false);
    }
  }, [handlePomodoroCommand, handleTodoCommand, updateSession, fetchTodos]);

    if (!session) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

      return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="flex-shrink-0 border-b border-primary/30 px-4 py-3 bg-black/60 backdrop-blur-md relative z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* 菜单按钮 */}
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
              title="历史对话"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
                        <div className="flex-1 min-w-0 max-w-[60vw] md:max-w-none">
                            <h1 className="text-base md:text-lg font-medium text-primary truncate font-orbitron tracking-wider">
                {session.config.name !== '新对话' ? session.config.name : session.title}
              </h1>
              <div className="text-xs md:text-sm text-secondary/80 flex items-center gap-2 flex-wrap font-mono">
                                {currentModel ? (
                  <span className="text-primary">🟢 {currentModel}</span>
                ) : (
                  <span className="text-destructive">⚠️ 未选择模型</span>
                )}
                <span>·</span>
                <span>{session.messages.length} 条消息</span>
                <span>·</span>
                <span>T:{session.config.temperature}</span>
                                {!session.config.streaming && (
                  <span className="text-primary/70">非流式</span>
                )}
              </div>
            </div>
          </div>
          
                    <div className="flex items-center gap-1">
            {/* Desktop Toolbar (md+) */}
            <div className="hidden md:flex items-center gap-1">
              {/* 保存按钮 */}
              {session.messages.length > 0 && session.config.enableMemory && (
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                  title="保存到云端"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                </button>
              )}

              {/* 云端对话 */}
              <a
                href="/saved"
                className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title="云端对话"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </a>

              {/* 配置按钮 */}
              <button
                onClick={() => setShowConfig(true)}
                className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title="对话配置"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
              
              {/* 新建对话 */}
              <button
                onClick={() => handleNewChat()}
                className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title="新建对话"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              {/* 待办清单 */}
              <a
                href="/todos"
                className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title="待办清单"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </a>

              {/* 番茄钟 */}
              <a
                href="/pomodoro"
                className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title="番茄钟"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </a>

              {/* 我的宇宙 */}
              <a
                href="/universe"
                className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title="我的宇宙"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </a>
              
              {/* 请求日志 */}
              <a
                href="/logs"
                className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title="请求日志"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </a>

              {/* 设置 */}
              <a
                href="/settings"
                className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title="API 设置"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </a>
            </div>

            {/* Mobile Toolbar (md-) */}
            <div className="flex md:hidden items-center gap-1">
               {/* 新建对话 */}
               <button
                onClick={() => handleNewChat()}
                className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title="新建对话"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {/* 配置按钮 */}
              <button
                onClick={() => setShowConfig(true)}
                className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title="对话配置"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>

              {/* 更多菜单按钮 */}
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title="更多"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {showMoreMenu && (
          <div className="absolute right-2 top-14 z-50 bg-black/95 border border-primary/30 rounded-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] flex flex-col py-2 md:hidden w-40 backdrop-blur-xl">
             {/* 保存按钮 (Mobile) */}
             {session.messages.length > 0 && session.config.enableMemory && (
                <button
                  onClick={() => { setShowSaveModal(true); setShowMoreMenu(false); }}
                  className="px-4 py-3 text-sm text-primary/70 hover:text-primary hover:bg-primary/10 flex items-center gap-3 transition-colors text-left w-full"
                >
                  <span className="w-5 text-center">💾</span> 保存对话
                </button>
              )}
             
             <a href="/saved" className="px-4 py-3 text-sm text-primary/70 hover:text-primary hover:bg-primary/10 flex items-center gap-3 transition-colors">
               <span className="w-5 text-center">☁️</span> 云端对话
             </a>
             <a href="/todos" className="px-4 py-3 text-sm text-primary/70 hover:text-primary hover:bg-primary/10 flex items-center gap-3 transition-colors">
               <span className="w-5 text-center">📝</span> 待办清单
             </a>
             <a href="/pomodoro" className="px-4 py-3 text-sm text-primary/70 hover:text-primary hover:bg-primary/10 flex items-center gap-3 transition-colors">
               <span className="w-5 text-center">🍅</span> 番茄钟
             </a>
             <a href="/universe" className="px-4 py-3 text-sm text-primary/70 hover:text-primary hover:bg-primary/10 flex items-center gap-3 transition-colors">
               <span className="w-5 text-center">🌌</span> 我的宇宙
             </a>
             <a href="/logs" className="px-4 py-3 text-sm text-primary/70 hover:text-primary hover:bg-primary/10 flex items-center gap-3 transition-colors">
               <span className="w-5 text-center">📜</span> 请求日志
             </a>
             <div className="h-px bg-primary/20 my-1"></div>
                          <a href="/settings" className="px-4 py-3 text-sm text-primary/70 hover:text-primary hover:bg-primary/10 flex items-center gap-3 transition-colors">
               <span className="w-5 text-center">⚙️</span> API 设置
             </a>
          </div>
        )
      }
      </div>

                  {/* 消息列表 */}
                        <MessageList 
        messages={session.messages} 
        userName={generalSettings.userName}
        aiName={generalSettings.aiName}
        onQuote={handleQuote} 
        onRegenerate={handleRegenerate}
        onSwitchVersion={handleSwitchVersion}
        onDeleteMessage={handleDeleteMessage}
      />

            {/* 输入框 */}
      <ChatInput 
        onSend={handleSend} 
        disabled={isLoading} 
        quote={quote}
        onClearQuote={handleClearQuote}
      />

      {/* 配置面板 */}
      {showConfig && (
        <ChatConfigPanel
          config={session.config}
          onChange={handleConfigChange}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* 侧边栏 */}
      {showSidebar && (
        <ChatSidebar
          currentChatId={session.id}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onClose={() => setShowSidebar(false)}
        />
      )}

      {/* 保存对话弹窗 */}
      {showSaveModal && (
        <SaveConversationModal
          messages={session.messages}
          defaultTitle={session.title}
          onClose={() => setShowSaveModal(false)}
          onSaved={() => {
            alert('✅ 保存成功！');
          }}
        />
      )}
    </div>
  );
}
