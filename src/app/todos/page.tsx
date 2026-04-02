"use client";

import { useState, useEffect } from "react";
import { Todo, TodoPriority } from "@/types/todo";
import ConfirmModal from "@/components/ui/ConfirmModal";
import TodoDescriptionField from "@/components/todo/TodoDescriptionField";

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // 筛选条件
  const [filterTag, setFilterTag] = useState("");
  const [filterDue, setFilterDue] = useState("");
  
  // 新建表单状态
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newPriority, setNewPriority] = useState<TodoPriority>(1);
  const [newDueDate, setNewDueDate] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // 获取所有唯一标签（用于筛选下拉）
  const allTags = Array.from(
    new Set(
      todos
        .filter(t => t.tags)
        .flatMap(t => t.tags!.split(',').map(tag => tag.trim()))
        .filter(tag => tag.length > 0)
    )
  );

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }
      if (filterTag) {
        params.set('tag', filterTag);
      }
      if (filterDue) {
        params.set('dueFilter', filterDue);
      }
      
      const res = await fetch(`/api/todos?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTodos(data);
      }
    } catch (error) {
      console.error("Failed to fetch todos", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [filter, filterTag, filterDue]);

  // 重置表单
  const resetForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewTags("");
    setNewPriority(1);
    setNewDueDate("");
  };

  // 取消按钮处理
  const handleCancel = () => {
    resetForm();
    setIsFormOpen(false);
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const dueDateTimestamp = newDueDate ? new Date(newDueDate).getTime() : undefined;
      
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc || undefined,
          tags: newTags || undefined,
          priority: newPriority,
          due_date: dueDateTimestamp
        }),
      });

      if (res.ok) {
        resetForm();
        setIsFormOpen(false);
        fetchTodos();
      }
    } catch (error) {
      console.error("Failed to create todo", error);
    }
  };

  const handleToggleStatus = async (todo: Todo) => {
    const newStatus = todo.status === "pending" ? "completed" : "pending";
    // 乐观更新
    setTodos(todos.map(t => t.id === todo.id ? { ...t, status: newStatus } : t));

    try {
      await fetch(`/api/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTodos(); // 刷新以获取正确的排序和 completed_at
    } catch (error) {
      console.error("Failed to update status", error);
      fetchTodos(); // 出错时回退
    }
  };

  // 更新待办描述
  const handleUpdateDescription = async (todoId: number, newDescription: string) => {
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newDescription }),
      });
      
      if (res.ok) {
        // 乐观更新本地状态
        setTodos(todos.map(t => 
          t.id === todoId ? { ...t, description: newDescription } : t
        ));
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      console.error("Failed to update description", error);
      throw error; // 让组件处理错误
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/todos/${deleteId}`, {
        method: "DELETE",
      });
      setTodos(todos.filter(t => t.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Failed to delete todo", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityColor = (p: number) => {
    switch (p) {
      case 2: return "text-destructive border-destructive bg-destructive/10";
      case 1: return "text-primary border-primary bg-primary/10";
      case 0: return "text-secondary border-secondary bg-secondary/10";
      default: return "text-muted border-muted";
    }
  };

  const getPriorityLabel = (p: number) => {
    switch (p) {
      case 2: return "THREAT";
      case 1: return "WARNING";
      case 0: return "INFO";
      default: return "-";
    }
  };

  const formatDate = (ts: number | null) => {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString('zh-CN');
  };

  // 检查是否过期
  const isOverdue = (dueDate: number | null, status: string) => {
    if (!dueDate || status === 'completed') return false;
    return dueDate < Date.now();
  };

  return (
    <div className="h-full w-full bg-background text-foreground font-mono flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6 p-2 md:p-6">
        {/* 顶部导航栏 - 吸顶 */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm flex justify-between items-center border-b border-primary/30 pb-4 mb-6">
          <div className="flex items-center gap-4">
            {/* 返回首页按钮 */}
            <a
              href="/"
              className="poi-btn flex items-center justify-center"
              title="返回首页"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <div>
              <h1 className="text-lg md:text-2xl font-bold font-orbitron tracking-widest text-primary">
                MISSION.LOG
              </h1>
              <p className="text-primary/50 text-xs mt-0.5 font-mono tracking-wider">OBJECTIVE_TRACKING_SYSTEM</p>
            </div>
          </div>
          
          {/* 状态筛选 */}
          <div className="flex gap-1 text-sm">
            {(['pending', 'completed', 'all'] as const).map((s) => (
              <button 
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-sm transition-all font-mono uppercase tracking-wider text-xs border ${
                  filter === s 
                    ? 'bg-primary text-black border-primary font-bold' 
                    : 'bg-transparent text-primary/50 border-primary/30 hover:text-primary hover:border-primary'
                }`}
              >
                {s === 'pending' ? '待办' : s === 'completed' ? '已完成' : '全部'}
              </button>
            ))}
          </div>
        </header>

        {/* 高级筛选 */}
        <div className="bg-black/40 border border-primary/30 rounded-sm p-4">
          <div className="flex items-center justify-between md:hidden mb-2">
            <span className="text-sm text-primary/70 font-mono">FILTERS</span>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="poi-btn text-xs py-1 px-2"
            >
              {showFilters ? 'COLLAPSE' : 'EXPAND'}
            </button>
          </div>
          
          <div className={`flex flex-wrap gap-3 items-center ${showFilters ? 'block' : 'hidden'} md:flex`}>
          {/* 标签筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-primary/50 text-xs font-mono">TAG:</span>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="poi-input text-xs h-8 py-1"
            >
              <option value="">全部</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          
          {/* 截止日期筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-primary/50 text-xs font-mono">DUE:</span>
            <select
              value={filterDue}
              onChange={(e) => setFilterDue(e.target.value)}
              className="poi-input text-xs h-8 py-1"
            >
              <option value="">全部日期</option>
              <option value="today">今天到期</option>
              <option value="week">本周到期</option>
              <option value="overdue">已过期</option>
            </select>
          </div>
          </div>
        </div>

        {/* 快速添加 / 展开表单 */}
        <div className="bg-black/40 border border-primary/30 rounded-sm p-4 transition-all duration-300">
          {!isFormOpen ? (
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 flex items-center justify-center text-primary font-mono font-bold text-lg">
                +
              </div>
              <input
                type="text"
                placeholder="输入新任务..."
                className="flex-1 bg-transparent border-none outline-none text-primary placeholder-primary/30 font-mono"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTitle.trim()) {
                    handleCreate();
                  }
                }}
              />
              <button
                onClick={() => setIsFormOpen(true)}
                className="poi-btn text-xs"
              >
                DETAILS
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="任务标题 *"
                className="w-full bg-transparent text-lg font-bold border-none outline-none text-primary placeholder-primary/30 font-orbitron tracking-wider"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
              <textarea
                placeholder="描述 (可选)"
                className="w-full bg-black/50 rounded-sm p-3 text-sm border border-primary/20 text-primary outline-none focus:border-primary/50 transition-colors resize-none font-mono"
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-primary/50 text-xs font-mono">PRIORITY:</span>
                  <select 
                    value={newPriority}
                    onChange={(e) => setNewPriority(Number(e.target.value) as TodoPriority)}
                    className="poi-input text-xs h-8 py-1"
                  >
                    <option value={0}>低</option>
                    <option value={1}>中</option>
                    <option value={2}>高</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary/50 text-xs font-mono">DUE_DATE:</span>
                  <input 
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="poi-input text-xs h-8 py-1"
                  />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-primary/50 text-xs font-mono">TAGS:</span>
                  <input 
                    type="text"
                    placeholder="工作, 学习..."
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="flex-1 poi-input text-xs h-8 py-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={handleCancel}
                  className="poi-btn border-primary/30 text-primary/50"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="poi-btn"
                >
                  创建待办
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 待办列表 */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center text-gray-500 py-12">
              <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-primary rounded-full animate-spin"></div>
              <p className="mt-2 font-mono tracking-widest text-xs uppercase">正在扫描数据...</p>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center text-primary/30 py-12 border border-dashed border-primary/20 bg-primary/5">
              <div className="text-4xl mb-2 grayscale opacity-50">🎉</div>
              <p className="font-mono uppercase tracking-widest text-xs">{filter === 'pending' ? "暂无待办任务" : "列表为空"}</p>
            </div>
          ) : (
            todos.map((todo) => (
              <div 
                key={todo.id}
                className={`group flex items-start gap-4 p-4 rounded-sm border-b transition-all duration-200 
                  ${todo.status === 'completed' 
                    ? 'bg-transparent border-primary/5 opacity-40 grayscale' 
                    : 'bg-black/20 border-primary/20 hover:border-primary/50 hover:bg-primary/5'}`} // HUD list style
              >
                {/* 勾选框 */}
                <button
                  onClick={() => handleToggleStatus(todo)}
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-sm border transition-all duration-300 flex items-center justify-center font-mono text-xs font-bold
                    ${todo.status === 'completed' 
                      ? 'bg-primary border-primary text-black' 
                      : 'bg-transparent border-primary text-primary hover:bg-primary/20'}`}
                >
                  {todo.status === 'completed' ? 'X' : ''}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-medium transition-all duration-300 ${
                      todo.status === 'completed' 
                        ? 'line-through text-gray-500' 
                        : 'text-gray-100'
                    }`}>
                      {todo.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* 优先级标签 */}
                      {todo.status !== 'completed' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-mono tracking-wider ${getPriorityColor(todo.priority)}`}>
                          {getPriorityLabel(todo.priority)}
                        </span>
                      )}
                      {/* 截止日期 */}
                      {todo.due_date && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-mono tracking-wider ${
                          isOverdue(todo.due_date, todo.status)
                            ? 'bg-destructive/10 text-destructive border-destructive'
                            : todo.status === 'completed' 
                              ? 'text-muted border-transparent' 
                              : 'text-primary/70 border-primary/30 bg-primary/5'
                        }`}>
                          {isOverdue(todo.due_date, todo.status) && '⚠ '}
                          {formatDate(todo.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 描述 - 支持 Markdown 和折叠展开 */}
                  <TodoDescriptionField
                    description={todo.description}
                    todoId={todo.id}
                    isCompleted={todo.status === 'completed'}
                    onUpdate={(newDesc) => handleUpdateDescription(todo.id, newDesc)}
                    maxCollapsedHeight={120}
                  />

                  {/* 标签 */}
                  {todo.tags && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {todo.tags.split(',').map((tag, i) => (
                        <span 
                          key={i} 
                          onClick={() => setFilterTag(tag.trim())}
                          className={`text-[10px] px-2 py-0.5 rounded-sm cursor-pointer transition-colors border font-mono uppercase tracking-wider
                            ${todo.status === 'completed' 
                              ? 'bg-gray-800 border-gray-700 text-gray-600' 
                              : 'bg-primary/5 border-primary/30 text-primary/70 hover:bg-primary/20 hover:text-primary hover:border-primary'}`}
                        >
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => setDeleteId(todo.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-destructive hover:bg-destructive/10 rounded-sm transition-all"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="DELETE MISSION"
        message="警告：确定要删除此待办任务吗？此操作不可撤销。"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        confirmText="DELETE"
        cancelText="CANCEL"
        type="danger"
        loading={isDeleting}
      />
    </div>
  );
}