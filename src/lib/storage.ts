import { Message, ChatConfig, DEFAULT_CHAT_CONFIG } from '@/types/chat';
export { DEFAULT_CHAT_CONFIG };

// 存储 key
const CURRENT_CHAT_KEY = 'ai_assistant_current_chat';
const CHAT_LIST_KEY = 'ai_assistant_chat_list';
const GENERAL_SETTINGS_KEY = 'ai_assistant_general_settings';

// ============ 通用设置 ============

// 通用设置类型
export interface GeneralSettings {
  defaultSystemPrompt: string;   // 新对话默认系统提示词
  userName: string;              // 用户显示名称
  aiName: string;                // AI 显示名称
}

// 默认通用设置
export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  defaultSystemPrompt: 'You are a helpful assistant.',
  userName: 'USER',
  aiName: 'AI',
};

// 获取通用设置（从 localStorage 同步读取）
export function getGeneralSettings(): GeneralSettings {
  try {
    const data = localStorage.getItem(GENERAL_SETTINGS_KEY);
    if (!data) return { ...DEFAULT_GENERAL_SETTINGS };
    return { ...DEFAULT_GENERAL_SETTINGS, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_GENERAL_SETTINGS };
  }
}

// 保存通用设置到 localStorage
export function saveGeneralSettings(settings: GeneralSettings): void {
  try {
    localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('保存通用设置失败:', error);
  }
}

// 对话数据结构
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  // 树状结构存储
  messageMap?: Record<string, Message>;
  rootIds?: string[];
  config: ChatConfig;
  createdAt: number;
  updatedAt: number;
}

// 对话列表项（轻量版，不含消息）
export interface ChatListItem {
  id: string;
  title: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

// 生成唯一 ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 创建新对话（使用用户保存的默认提示词）
export function createNewChat(): ChatSession {
  const generalSettings = getGeneralSettings();
  return {
    id: generateId(),
    title: '新对话',
    messages: [],
    messageMap: {},
    rootIds: [],
    config: {
      ...DEFAULT_CHAT_CONFIG,
      systemPrompt: generalSettings.defaultSystemPrompt || DEFAULT_CHAT_CONFIG.systemPrompt,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// 自动生成标题
export function generateTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) return '新对话';
  
  const content = firstUserMessage.content.trim();
  if (content.length <= 20) return content;
  return content.slice(0, 20) + '...';
}

// ============ 当前对话 ============

// 保存当前对话
export function saveCurrentChat(chat: ChatSession): void {
  try {
    localStorage.setItem(CURRENT_CHAT_KEY, JSON.stringify(chat));
    // 同时保存到独立存储（这样切换时能找到）
    localStorage.setItem(`ai_assistant_chat_${chat.id}`, JSON.stringify(chat));
    // 更新对话列表
    updateChatInList(chat);
  } catch (error) {
    console.error('保存对话失败:', error);
  }
}


// 读取当前对话
export function loadCurrentChat(): ChatSession | null {
  try {
    const data = localStorage.getItem(CURRENT_CHAT_KEY);
        if (!data) return null;
    const chat: ChatSession = JSON.parse(data);
    // 确保所有消息的 isStreaming 状态在加载时都被重置为 false
    if (chat.messageMap) {
      Object.values(chat.messageMap).forEach(msg => {
        if (msg.isStreaming) {
          msg.isStreaming = false;
        }
      });
    }
    // 重新 derive messages 以确保 UI 列表是最新的
    chat.messages = deriveMessages(chat);
    return chat;
  } catch (error) {
    console.error('读取对话失败:', error);
    return null;
  }
}

// 清除当前对话
export function clearCurrentChat(): void {
  try {
    localStorage.removeItem(CURRENT_CHAT_KEY);
  } catch (error) {
    console.error('清除对话失败:', error);
  }
}

// ============ 对话列表 ============

// 获取对话列表
export function getChatList(): ChatListItem[] {
  try {
    const data = localStorage.getItem(CHAT_LIST_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('读取对话列表失败:', error);
    return [];
  }
}

// 保存对话列表
function saveChatList(list: ChatListItem[]): void {
  try {
    localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('保存对话列表失败:', error);
  }
}

// 更新对话列表中的项（没有则添加）
function updateChatInList(chat: ChatSession): void {
  const list = getChatList();
  const index = list.findIndex((item) => item.id === chat.id);
  
  const listItem: ChatListItem = {
    id: chat.id,
    title: chat.title,
    messageCount: chat.messages.length,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };

  if (index >= 0) {
    list[index] = listItem;
  } else {
    list.unshift(listItem); // 新对话放最前面
  }

  // 按更新时间排序
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  
  saveChatList(list);
}

// 从列表中删除对话
export function deleteChatFromList(chatId: string): void {
  const list = getChatList();
  const newList = list.filter((item) => item.id !== chatId);
  saveChatList(newList);
  
  // 同时删除对话内容
  try {
    localStorage.removeItem(`ai_assistant_chat_${chatId}`);
  } catch (error) {
    console.error('删除对话内容失败:', error);
  }
}

// ============ 对话内容存取 ============

// 保存单个对话（切换时保存）
export function saveChatById(chat: ChatSession): void {
  try {
    localStorage.setItem(`ai_assistant_chat_${chat.id}`, JSON.stringify(chat));
    updateChatInList(chat);
  } catch (error) {
    console.error('保存对话失败:', error);
  }
}

// 读取单个对话
export function loadChatById(chatId: string): ChatSession | null {
  try {
    // 先尝试从独立存储读取
    const data = localStorage.getItem(`ai_assistant_chat_${chatId}`);
        if (data) {
      const chat: ChatSession = JSON.parse(data);
      // 确保所有消息的 isStreaming 状态在加载时都被重置为 false
      if (chat.messageMap) {
        Object.values(chat.messageMap).forEach(msg => {
          if (msg.isStreaming) {
            msg.isStreaming = false;
          }
        });
      }
      // 重新 derive messages 以确保 UI 列表是最新的
      // 注意：这里需要确保 deriveMessages 不会因为 messageMap 存在而跳过，它只是根据 map 生成列表
      chat.messages = deriveMessages(chat);
      return chat;
    }
    
    // 如果找不到，检查是否是当前对话
    const currentData = localStorage.getItem(CURRENT_CHAT_KEY);
        if (currentData) {
      const currentChat: ChatSession = JSON.parse(currentData);
      if (currentChat.id === chatId) {
        // 确保所有消息的 isStreaming 状态在加载时都被重置为 false
        if (currentChat.messageMap) {
          Object.values(currentChat.messageMap).forEach(msg => {
            if (msg.isStreaming) {
              msg.isStreaming = false;
            }
          });
        }
        // 重新 derive messages 以确保 UI 列表是最新的
        currentChat.messages = deriveMessages(currentChat);
        return currentChat;
      }
    }
    
    return null;
  } catch (error) {
    console.error('读取对话失败:', error);
    return null;
  }
}

// ============ 树状结构与版本控制 ============

// 辅助：从列表转换
export function ensureTreeStructure(session: ChatSession): ChatSession {
  if (session.messageMap && session.rootIds) return session;
  
  const map: Record<string, Message> = {};
  const rootIds: string[] = [];
  
  session.messages.forEach((msg, index) => {
    // 1. 确定 parentId
    let parentId: string | null = null;
    if (index > 0) {
      parentId = session.messages[index - 1].id;
    }
    
    // 2. 处理当前消息及其兄弟版本 (保留旧数据)
    const siblings = msg.versions || [msg];
    
    siblings.forEach(sibling => {
      if (!sibling.id) sibling.id = generateId();
      
      // 清理字段
      const { versions, ...cleanSibling } = sibling;
      
      // 强制重置 isStreaming (防止历史消息显示 loading)
      if (cleanSibling.isStreaming) cleanSibling.isStreaming = false;
      
      // 设置树状结构字段
      cleanSibling.parentId = parentId;
      // 如果是当前显示的 msg，它的 children/selected 会在后续逻辑或下一次迭代中设置
      // 如果是隐藏的兄弟节点，它们默认没有 children (除非我们能从哪里找回历史)
      // 在旧结构中，我们丢失了隐藏版本的子节点信息，所以这里只能设为空
      cleanSibling.childrenIds = [];
      cleanSibling.selectedChildId = null;
      
      map[cleanSibling.id] = cleanSibling as Message;
    });
    
    // 3. 维护树结构连接
    if (parentId) {
      const parent = map[parentId];
      if (parent) {
        // 将所有兄弟加入父节点的 children
        const siblingIds = siblings.map(s => s.id).filter(Boolean) as string[];
        // 去重合并
        const existingChildren = new Set(parent.childrenIds || []);
        siblingIds.forEach(id => existingChildren.add(id));
        parent.childrenIds = Array.from(existingChildren);
        
        // 确保当前显示的 msg 被选中
        parent.selectedChildId = msg.id;
      }
    } else {
      // 根节点
      siblings.forEach(s => {
        if (s.id && !rootIds.includes(s.id)) rootIds.push(s.id);
      });
    }
    
    // 4. 维护当前路径的子节点连接
    // 当前 msg 的 selectedChildId 应该指向 nextMsg
    if (index < session.messages.length - 1) {
      const nextMsg = session.messages[index + 1];
      const currentInMap = map[msg.id];
      if (currentInMap) {
        currentInMap.selectedChildId = nextMsg.id;
        // nextMsg 的 ID 也会在下一次迭代中加入 currentInMap.childrenIds
        if (!currentInMap.childrenIds) currentInMap.childrenIds = [];
        if (!currentInMap.childrenIds.includes(nextMsg.id)) {
          currentInMap.childrenIds.push(nextMsg.id);
        }
      }
    }
  });
  
  return {
    ...session,
    messageMap: map,
    rootIds: rootIds
  };
}

// 辅助：生成显示列表
export function deriveMessages(session: ChatSession): Message[] {
  if (!session.messageMap || !session.rootIds) return session.messages;
  
  const messages: Message[] = [];
  let currentIds = [...session.rootIds];
  
  // 这里的逻辑简化：我们只处理线性路径。如果有多个 root，假设它们是串行的（虽然这不太可能）
  // 通常 rootIds 只有一个（System Prompt）。
  // 我们只追踪第一个 root 的路径。
  if (currentIds.length === 0) return [];
  
  // 迭代追踪
  let currentId: string | null = currentIds[0];
  
  while (currentId) {
    const msg = session.messageMap[currentId];
    if (!msg) break;
    
    // 计算版本信息
    let siblings: Message[] = [];
    let versionIndex = 0;
    
    if (msg.parentId && session.messageMap[msg.parentId]) {
      const parent = session.messageMap[msg.parentId];
      if (parent.childrenIds) {
        siblings = parent.childrenIds.map(cid => session.messageMap![cid]).filter(Boolean);
        versionIndex = parent.childrenIds.indexOf(msg.id);
      }
    } else {
      // 根节点
      siblings = [msg];
      versionIndex = 0;
    }
    
    // 注入 UI 所需字段
    messages.push({
      ...msg,
      versions: siblings,
      versionIndex,
      totalVersions: siblings.length,
      siblingId: msg.parentId || 'root' // 使用 parentId 作为 siblingId 的标识
    });
    
    currentId = msg.selectedChildId || null;
  }
  
  return messages;
}

// 添加新消息到树
export function addMessageToTree(session: ChatSession, newMessage: Message, parentId?: string): ChatSession {
  const treeSession = ensureTreeStructure(session);
  const map = { ...treeSession.messageMap };
  let rootIds = [...(treeSession.rootIds || [])];
  
  // 确保新消息 ID
  const msgId = newMessage.id || generateId();
  const msgWithId = { ...newMessage, id: msgId };
  
  // 设置 Parent
  if (parentId) {
    msgWithId.parentId = parentId;
    const parent = map[parentId];
    if (parent) {
      // 更新父节点
      map[parentId] = {
        ...parent,
        childrenIds: [...(parent.childrenIds || []), msgId],
        selectedChildId: msgId // 自动选中新消息
      };
    }
  } else {
    // 根节点
    msgWithId.parentId = null;
    if (!rootIds.includes(msgId)) {
      rootIds.push(msgId);
    }
  }
  
  // 初始化新消息
  map[msgId] = {
    ...msgWithId,
    childrenIds: msgWithId.childrenIds || [],
    selectedChildId: msgWithId.selectedChildId || null
  };
  
  // 返回全新的 session 对象，确保不可变性
  const updatedSession: ChatSession = {
    ...treeSession,
    messageMap: map,
    rootIds: rootIds,
    updatedAt: Date.now()
  };
  
  updatedSession.messages = deriveMessages(updatedSession);
  return updatedSession;
}

// 切换分支
export function switchBranch(session: ChatSession, messageId: string, targetIndex: number): ChatSession {
  // 确保树结构存在
  const newSession = ensureTreeStructure(session);
  
  // 深拷贝 messageMap，避免直接修改原对象
  const map: Record<string, Message> = {};
  for (const key in newSession.messageMap) {
    map[key] = { ...newSession.messageMap[key] };
  }
  
  const msg = map[messageId];
  
  // 如果消息不存在或没有 parentId，无法切换
  if (!msg || !msg.parentId) {
    console.warn('[switchBranch] 无法切换：消息不存在或无 parentId', { messageId, msg });
    return session;
  }
  
  const parent = map[msg.parentId];
  if (!parent || !parent.childrenIds) {
    console.warn('[switchBranch] 无法切换：父节点不存在或无 childrenIds', { parentId: msg.parentId, parent });
    return session;
  }
  
  if (targetIndex >= 0 && targetIndex < parent.childrenIds.length) {
    const targetId = parent.childrenIds[targetIndex];
    
    // 更新父节点的选中项
    map[parent.id] = {
      ...parent,
      selectedChildId: targetId
    };
    
    // 更新 session
    const updatedSession: ChatSession = {
      ...newSession,
      messageMap: map,
      rootIds: [...(newSession.rootIds || [])]
    };
    
    // 重新生成消息列表
    updatedSession.messages = deriveMessages(updatedSession);
    
    return updatedSession;
  }
  
  console.warn('[switchBranch] targetIndex 超出范围', { targetIndex, childrenLength: parent.childrenIds.length });
  return session;
}

// 更新消息内容（同时更新 Map）
export function updateMessageInTree(session: ChatSession, messageId: string, updates: Partial<Message>): ChatSession {
  const treeSession = ensureTreeStructure(session);
  const map = { ...treeSession.messageMap };
  
  if (map[messageId]) {
    // 更新具体消息对象
    map[messageId] = { ...map[messageId], ...updates };
    
    // 返回全新的 session 对象
    const updatedSession: ChatSession = {
      ...treeSession,
      messageMap: map,
      updatedAt: Date.now()
    };
    
    updatedSession.messages = deriveMessages(updatedSession);
    return updatedSession;
  }
  
  return session;
}

// 辅助函数：递归删除消息及其所有子孙消息
function _removeMessageAndDescendants(map: Record<string, Message>, messageId: string) {
  const message = map[messageId];
  if (!message) return;

  // 递归删除子节点
  if (message.childrenIds) {
    for (const childId of message.childrenIds) {
      _removeMessageAndDescendants(map, childId);
    }
  }
  // 删除消息本身
  delete map[messageId];
}

// 删除消息
export function deleteMessageFromTree(session: ChatSession, messageIdToDelete: string): ChatSession {
  const treeSession = ensureTreeStructure(session);
  const map = { ...treeSession.messageMap };
  let rootIds = [...(treeSession.rootIds || [])];

  const messageToDelete = map[messageIdToDelete];
  if (!messageToDelete) return session; // 消息不存在

  // 情况 1: 消息是根消息
  if (!messageToDelete.parentId) {
    rootIds = rootIds.filter(id => id !== messageIdToDelete);
    _removeMessageAndDescendants(map, messageIdToDelete);
  } else {
    // 情况 2: 消息有父节点
    const parentId = messageToDelete.parentId;
    const parent = map[parentId];

    if (parent && parent.childrenIds) {
      const childrenIdsOnThisFloor = parent.childrenIds;
      const remainingChildrenIds = childrenIdsOnThisFloor.filter(id => id !== messageIdToDelete);

      // 更新父节点的 childrenIds
      parent.childrenIds = remainingChildrenIds;

      // 如果被删除的消息是父节点的选中子节点，则需要重新选择
      if (parent.selectedChildId === messageIdToDelete) {
        if (remainingChildrenIds.length > 0) {
          // 如果还有其他兄弟节点，选择第一个
          parent.selectedChildId = remainingChildrenIds[0];
        } else {
          // 该层没有其他子节点了，父节点不再有选中的子节点
          parent.selectedChildId = null;
        }
      }
      // 如果 parent.selectedChildId 不是被删除的消息，则保持不变。

      // 更新 map 中的父节点
      map[parentId] = parent;

      // 递归删除该消息及其子孙消息
      _removeMessageAndDescendants(map, messageIdToDelete);
    }
  }

  const updatedSession: ChatSession = {
    ...treeSession,
    messageMap: map,
    rootIds: rootIds,
    updatedAt: Date.now(),
  };

  updatedSession.messages = deriveMessages(updatedSession);
  return updatedSession;
}

// ============ 导入导出 ============

// 导出所有数据
export function exportAllData(): string {
  const currentChat = loadCurrentChat();
  const chatList = getChatList();
  
  // 获取所有对话内容
  const allChats: ChatSession[] = [];
  for (const item of chatList) {
    const chat = loadChatById(item.id);
    if (chat) {
      allChats.push(chat);
    }
  }

  return JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    currentChatId: currentChat?.id || null,
    chats: allChats,
  }, null, 2);
}

// 导入数据
export function importData(jsonString: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.chats || !Array.isArray(data.chats)) {
      return { success: false, message: '无效的数据格式' };
    }

    // 导入所有对话
    for (const chat of data.chats) {
      saveChatById(chat);
    }

    // 设置当前对话
    if (data.currentChatId) {
      const currentChat = loadChatById(data.currentChatId);
      if (currentChat) {
        saveCurrentChat(currentChat);
      }
    }

    return { success: true, message: `成功导入 ${data.chats.length} 个对话` };
  } catch {
    return { success: false, message: '解析数据失败' };
  }
}
