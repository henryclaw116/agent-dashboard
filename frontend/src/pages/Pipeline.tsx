import React, { useState, useEffect } from 'react';
import { 
  Activity, Clock, AlertTriangle, CheckCircle2, XCircle, 
  Pause, Play, Calendar, BarChart3, Users, Zap, TrendingUp 
} from 'lucide-react';

interface Task {
  id: number;
  task_name: string;
  agent_id: number | null;
  agent_name: string;
  status: 'queued' | 'in_progress' | 'blocked' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  started_at: string | null;
  completed_at: string | null;
  expected_completion: string | null;
  progress_percent: number;
  time_spent_seconds: number;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  blocked_reason: string | null;
  agent_status: string | null;
  is_overdue: boolean;
  time_in_progress_seconds: number;
}

interface AgentHealth {
  agent_id: number;
  agent_name: string;
  role: string;
  status: string;
  last_activity: string;
  last_heartbeat: string;
  consecutive_errors: number;
  health_score: number;
  uptime_percent: number | null;
  current_task: string | null;
  current_task_progress: number | null;
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'stale';
}

interface PipelineSummary {
  completed_today: number;
  failed_today: number;
  in_progress: number;
  queued: number;
  blocked: number;
  avg_completion_time: number;
  active_agents: number;
}

export default function Pipeline() {
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [agentHealth, setAgentHealth] = useState<AgentHealth[]>([]);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'timeline'>('kanban');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

  useEffect(() => {
    fetchPipelineData();
    const interval = setInterval(fetchPipelineData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPipelineData = async () => {
    try {
      setLoading(true);
      
      const [tasksRes, healthRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/pipeline/active-tasks`),
        fetch(`${API_URL}/pipeline/agent-health`),
        fetch(`${API_URL}/pipeline/summary`)
      ]);

      if (tasksRes.ok) setActiveTasks(await tasksRes.json());
      if (healthRes.ok) setAgentHealth(await healthRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <Play className="w-4 h-4 text-blue-500" />;
      case 'queued': return <Clock className="w-4 h-4 text-gray-500" />;
      case 'blocked': return <Pause className="w-4 h-4 text-red-500" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy': return 'bg-red-100 text-red-800';
      case 'stale': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <div className={`bg-white border-l-4 ${getPriorityColor(task.priority)} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow mb-3`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon(task.status)}
          <h4 className="font-semibold text-gray-900">{task.task_name}</h4>
        </div>
        {task.is_overdue && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
            Overdue
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <Users className="w-3 h-3" />
        <span>{task.agent_name || 'Unassigned'}</span>
        {task.is_recurring && (
          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
            Recurring
          </span>
        )}
      </div>

      {/* Progress bar */}
      {task.status === 'in_progress' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{task.progress_percent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${task.progress_percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Time info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {task.status === 'in_progress' && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(task.time_in_progress_seconds)}
          </span>
        )}
        {task.blocked_reason && (
          <span className="text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {task.blocked_reason}
          </span>
        )}
      </div>
    </div>
  );

  const AgentHealthCard = ({ agent }: { agent: AgentHealth }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{agent.agent_name}</h4>
          <p className="text-xs text-gray-500">{agent.role}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${getHealthColor(agent.health_status)}`}>
          {agent.health_status}
        </span>
      </div>

      {/* Health score */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Health Score</span>
          <span>{agent.health_score}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              agent.health_score >= 80 ? 'bg-green-500' :
              agent.health_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${agent.health_score}%` }}
          />
        </div>
      </div>

      {/* Current task */}
      {agent.current_task && (
        <div className="text-xs text-gray-600">
          <p className="mb-1">Current Task:</p>
          <p className="font-medium text-gray-900">{agent.current_task}</p>
          {agent.current_task_progress !== null && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${agent.current_task_progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Last activity */}
      <div className="mt-3 text-xs text-gray-500">
        Last activity: {new Date(agent.last_activity).toLocaleTimeString()}
      </div>
    </div>
  );

  if (loading && activeTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const queuedTasks = activeTasks.filter(t => t.status === 'queued');
  const inProgressTasks = activeTasks.filter(t => t.status === 'in_progress');
  const blockedTasks = activeTasks.filter(t => t.status === 'blocked');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500">Real-time task and agent monitoring</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('kanban')}
            className={`px-4 py-2 rounded ${view === 'kanban' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Kanban
          </button>
          <button
            onClick={() => setView('timeline')}
            className={`px-4 py-2 rounded ${view === 'timeline' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Completed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.completed_today}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Play className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.in_progress}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">Queued</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.queued}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Pause className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500">Blocked</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{summary.blocked}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500">Failed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.failed_today}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-500">Avg Time</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {summary.avg_completion_time ? formatDuration(summary.avg_completion_time) : 'N/A'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">Active Agents</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.active_agents}</p>
          </div>
        </div>
      )}

      {view === 'kanban' && (
        <>
          {/* Agent Health Cards */}
          {agentHealth.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Agent Health</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {agentHealth.map(agent => (
                  <AgentHealthCard key={agent.agent_id} agent={agent} />
                ))}
              </div>
            </div>
          )}

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Queued Column */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Queued ({queuedTasks.length})
                </h3>
              </div>
              <div className="space-y-3">
                {queuedTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No queued tasks</p>
                ) : (
                  queuedTasks.map(task => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Play className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  In Progress ({inProgressTasks.length})
                </h3>
              </div>
              <div className="space-y-3">
                {inProgressTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No tasks in progress</p>
                ) : (
                  inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>

            {/* Blocked Column */}
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Blocked ({blockedTasks.length})
                </h3>
              </div>
              <div className="space-y-3">
                {blockedTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No blocked tasks</p>
                ) : (
                  blockedTasks.map(task => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'timeline' && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <p className="text-gray-500 text-center py-12">
            Timeline view coming soon...
          </p>
        </div>
      )}
    </div>
  );
}
