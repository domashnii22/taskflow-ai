export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  status: number;
  message: string;
  data?: T;
}
