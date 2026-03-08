export interface Project {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'complete' | 'cancelled';
  percent_complete: number;
  start_date: string;
  target_date: string;
  completed_date?: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Phase {
  id: number;
  project_id: number;
  name: string;
  description: string;
  phase_number: number;
  status: 'pending' | 'active' | 'complete';
  percent_complete: number;
  start_date?: string;
  target_date?: string;
  completed_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  phase_id?: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'complete' | 'blocked';
  priority: number;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  project_name?: string;
}

export interface Blocker {
  id: number;
  project_id: number;
  task_id?: number;
  title: string;
  description: string;
  blocker_type: 'waiting_on_tony' | 'external_api' | 'decision_needed' | 'dependency';
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at?: string;
  project_name?: string;
  task_title?: string;
}

export interface Activity {
  id: number;
  project_id: number;
  task_id?: number;
  agent_name?: string;
  activity_type: string;
  description: string;
  metadata?: any;
  created_at: string;
  project_name?: string;
}

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  priority: number;
  read: boolean;
  project_id?: number;
  created_at: string;
  read_at?: string;
}

export interface DashboardStats {
  active_projects: number;
  tasks_completed_today: number;
  tasks_in_progress: number;
  open_blockers: number;
  unread_notifications: number;
}
