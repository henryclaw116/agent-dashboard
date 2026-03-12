import { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  StopCircle, 
  RotateCw, 
  Cpu, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Users,
  TrendingUp,
  Settings
} from 'lucide-react';
import { api } from '../api/api';
import AgentOrgChart from '../components/pipeline/AgentOrgChart';
import TaskQueue from '../components/pipeline/TaskQueue';
import AgentStats from '../components/pipeline/AgentStats';
import AlertsPanel from '../components/pipeline/AlertsPanel';

interface Agent {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'idle' | 'offline' | 'paused' | 'error';
  parent_agent_id?: number;
  position_x: number;
  position_y: number;
  hierarchy_level: number;
  last_heartbeat_at?: string;
  heartbeat_healthy?: boolean;
  current_task_name?: string;
  current_task_status?: string;
  cpu_usage?: number;
  memory_usage_mb?: number;
  pending_tasks_count: number;
  unread_alerts_count: number;
}

interface Task {
  id: number;
  task_name: string;
  task_type: string;
  status: string;
  priority: number;
  assigned_agent_name?: string;
  delegated_by_agent_name?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  deadline?: string;
  error_message?: string;
}

interface Alert {
  id: number;
  agent_id?: number;
  agent_name?: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: string;
  created_at: string;
  notified: boolean;
}

interface Stats {
  agents: {
    total: number;
    active: number;
    offline: number;
    paused: number;
  };
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
  };
  alerts: {
    total: number;
    new: number;
    critical: number;
  };
  heartbeats: {
    agents_reporting: number;
    avg_cpu: number;
    avg_memory: number;
  };
}

function Pipeline() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'alerts' | 'logs'>('overview');

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [agentsRes, tasksRes, alertsRes, statsRes] = await Promise.all([
        api.get('/orchestration/agents'),
        api.get('/orchestration/tasks?status=pending&status=in_progress'),
        api.get('/orchestration/alerts?status=new'),
        api.get('/orchestration/stats')
      ]);

      setAgents(agentsRes.data.agents || []);
      setTasks(tasksRes.data.tasks || []);
      setAlerts(alertsRes.data.alerts || []);
      setStats(statsRes.data.stats || null);
    } catch (error: any) {
      console.error('Failed to load pipeline data:', error);
      // Set empty defaults on error
      setAgents([]);
      setTasks([]);
      setAlerts([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Refresh every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Agent control actions
  const handleAgentControl = async (agentId: number, action: 'start' | 'stop' | 'pause' | 'restart') => {
    try {
      await api.post(`/orchestration/agents/${agentId}/control`, { action });
      await loadData();
    } catch (error) {
      console.error(`Failed to ${action} agent:`, error);
      alert(`Failed to ${action} agent`);
    }
  };

  const handleAgentPositionUpdate = async (agentId: number, position: { x: number; y: number }, parentId?: number) => {
    try {
      await api.put(`/orchestration/agents/${agentId}/position`, {
        position_x: position.x,
        position_y: position.y,
        parent_agent_id: parentId
      });
    } catch (error) {
      console.error('Failed to update agent position:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      active: 'bg-green-500',
      idle: 'bg-blue-500',
      offline: 'bg-gray-500',
      paused: 'bg-yellow-500',
      error: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusBadge = (status: string) => {
    const config: { [key: string]: { icon: any; label: string; color: string } } = {
      active: { icon: Activity, label: 'Active', color: 'text-green-600 bg-green-100' },
      idle: { icon: Clock, label: 'Idle', color: 'text-blue-600 bg-blue-100' },
      offline: { icon: StopCircle, label: 'Offline', color: 'text-gray-600 bg-gray-100' },
      paused: { icon: Pause, label: 'Paused', color: 'text-yellow-600 bg-yellow-100' },
      error: { icon: AlertTriangle, label: 'Error', color: 'text-red-600 bg-red-100' }
    };

    const { icon: Icon, label, color } = config[status] || config.offline;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${color}`}>
        <Icon size={12} />
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rlt-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Agent Orchestration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-rlt-blue" size={28} />
            Agent Mission Control
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Visual orchestration dashboard for your AI agent team
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <RotateCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Agents */}
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Agents</h3>
              <Users className="text-gray-400" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.agents.total}</div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-green-600">{stats.agents.active} active</span>
              <span className="text-gray-600">{stats.agents.offline} offline</span>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Tasks (24h)</h3>
              <Zap className="text-gray-400" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.tasks.total}</div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-yellow-600">{stats.tasks.pending} pending</span>
              <span className="text-blue-600">{stats.tasks.in_progress} active</span>
              <span className="text-green-600">{stats.tasks.completed} done</span>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Alerts</h3>
              <AlertTriangle className="text-gray-400" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.alerts.new}</div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-red-600">{stats.alerts.critical} critical</span>
              <span className="text-gray-600">{stats.alerts.total} total</span>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">System Health</h3>
              <Activity className="text-gray-400" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.heartbeats.agents_reporting}</div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-gray-600">reporting</span>
              {stats.heartbeats.avg_cpu !== null && stats.heartbeats.avg_cpu !== undefined && (
                <span className="text-blue-600">
                  {stats.heartbeats.avg_cpu.toFixed(1)}% CPU
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Org Chart', icon: Users },
            { id: 'tasks', label: 'Task Queue', icon: Zap },
            { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
            { id: 'logs', label: 'Activity Logs', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-rlt-blue text-rlt-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <AgentOrgChart
          agents={agents}
          onAgentClick={setSelectedAgent}
          onPositionUpdate={handleAgentPositionUpdate}
          onControlAction={handleAgentControl}
        />
      )}

      {activeTab === 'tasks' && (
        <TaskQueue
          tasks={tasks}
          agents={agents}
          onRefresh={loadData}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsPanel
          alerts={alerts}
          onRefresh={loadData}
        />
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Logs</h2>
          <p className="text-gray-600">Coming soon: Real-time activity log viewer</p>
        </div>
      )}

      {/* Agent Details Modal */}
      {selectedAgent && (
        <AgentStats
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onControlAction={handleAgentControl}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}

export default Pipeline;
