export type TodoStatus = 'pending' | 'completed';
export type TodoPriority = 0 | 1 | 2; // 0: Low, 1: Medium, 2: High

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  tags: string | null; // Comma separated tags
  status: TodoStatus;
  priority: TodoPriority;
  created_at: number;
  completed_at: number | null;
  due_date: number | null;
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
  tags?: string;
  priority?: TodoPriority;
  due_date?: number;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  tags?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  due_date?: number | null;
}