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
  agent_id?: number;
  agent_name?: string;
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

export interface Agent {
  id: number;
  name: string;
  role: string;
  avatar_url?: string;
  status: 'active' | 'idle' | 'paused' | 'error';
  personality?: string;
  skills?: string[];
  prompt?: string;
  model?: string;
  parent_agent_id?: number;
  console_id?: number;
  console_name?: string;
  console_status?: string;
  goal_count?: number;
  task_count?: number;
  daily_cost?: number;
  monthly_cost?: number;
  created_at: string;
  updated_at: string;
}

export interface Console {
  id: number;
  name: string;
  type: string;
  description?: string;
  status: 'online' | 'offline' | 'error';
  connection_info?: any;
  capabilities?: string[];
  last_heartbeat?: string;
  agent_count?: number;
  vnc_enabled?: boolean;
  vnc_host?: string;
  vnc_port?: number;
  vnc_password_encrypted?: string;
  vnc_last_connected?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentGoal {
  id: number;
  agent_id: number;
  goal: string;
  priority: number;
  status: 'active' | 'complete' | 'paused';
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentActivity {
  id: number;
  agent_id: number;
  activity_type: string;
  description: string;
  metadata?: any;
  created_at: string;
}

export interface AgentAgenda {
  id: number;
  agent_id: number;
  title: string;
  description?: string;
  scheduled_for: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  priority: number;
  task_id?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}
