export interface ITodo {
  id: number;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITodoFilterVariables {
  title?: string;
  status?: ITodo["status"];
  priority?: ITodo["priority"];
}