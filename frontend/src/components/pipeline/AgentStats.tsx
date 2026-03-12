import { X, Play, Pause, RotateCw, StopCircle, Activity, Clock, Cpu, AlertTriangle } from 'lucide-react';

interface Agent {
  id: number;
  name: string;
  description?: string;
  status: string;
  last_heartbeat_at?: string;
  heartbeat_healthy?: boolean;
  current_task_name?: string;
  cpu_usage?: number;
  memory_usage_mb?: number;
  pending_tasks_count: number;
  unread_alerts_count: number;
}

interface AgentStatsProps {
  agent: Agent;
  onClose: () => void;
  onControlAction: (agentId: number, action: 'start' | 'stop' | 'pause' | 'restart') => void;
  onRefresh: () => void;
}

function AgentStats({ agent, onClose, onControlAction, onRefresh }: AgentStatsProps) {
  const timeSince = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{agent.name}</h2>
            {agent.description && (
              <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status & Controls */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Control</h3>
            <div className="flex items-center gap-2">
              {agent.status === 'active' ? (
                <button
                  onClick={() => { onControlAction(agent.id, 'pause'); onRefresh(); }}
                  className="flex-1 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 flex items-center justify-center gap-2 font-medium"
                >
                  <Pause size={16} />
                  Pause Agent
                </button>
              ) : agent.status === 'paused' ? (
                <button
                  onClick={() => { onControlAction(agent.id, 'start'); onRefresh(); }}
                  className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center justify-center gap-2 font-medium"
                >
                  <Play size={16} />
                  Resume Agent
                </button>
              ) : (
                <button
                  onClick={() => { onControlAction(agent.id, 'start'); onRefresh(); }}
                  className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center justify-center gap-2 font-medium"
                >
                  <Play size={16} />
                  Start Agent
                </button>
              )}
              <button
                onClick={() => { onControlAction(agent.id, 'restart'); onRefresh(); }}
                className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center justify-center gap-2 font-medium"
              >
                <RotateCw size={16} />
                Restart
              </button>
              <button
                onClick={() => { onControlAction(agent.id, 'stop'); onRefresh(); }}
                className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center justify-center gap-2 font-medium"
              >
                <StopCircle size={16} />
                Stop
              </button>
            </div>
          </div>

          {/* Current Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Activity size={14} />
                  <span>Status</span>
                </div>
                <div className="text-lg font-semibold text-gray-900 capitalize">
                  {agent.status}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Clock size={14} />
                  <span>Last Heartbeat</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {timeSince(agent.last_heartbeat_at)}
                </div>
              </div>

              {agent.cpu_usage !== undefined && agent.cpu_usage !== null && typeof agent.cpu_usage === 'number' && !isNaN(agent.cpu_usage) && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Cpu size={14} />
                    <span>CPU Usage</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {agent.cpu_usage.toFixed(1)}%
                  </div>
                </div>
              )}

              {agent.memory_usage_mb !== undefined && agent.memory_usage_mb !== null && typeof agent.memory_usage_mb === 'number' && !isNaN(agent.memory_usage_mb) && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Activity size={14} />
                    <span>Memory</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {(agent.memory_usage_mb / 1024).toFixed(1)} GB
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Clock size={14} />
                  <span>Pending Tasks</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {agent.pending_tasks_count}
                </div>
              </div>

              {agent.unread_alerts_count > 0 && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
                    <AlertTriangle size={14} />
                    <span>Alerts</span>
                  </div>
                  <div className="text-lg font-semibold text-red-900">
                    {agent.unread_alerts_count}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Task */}
          {agent.current_task_name && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Task</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-medium text-blue-900 mb-1">{agent.current_task_name}</div>
                <div className="text-sm text-blue-600">Status: Working on it...</div>
              </div>
            </div>
          )}

          {/* Health Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Health</h3>
            <div className={`rounded-lg p-4 ${agent.heartbeat_healthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className={`flex items-center gap-2 ${agent.heartbeat_healthy ? 'text-green-900' : 'text-red-900'}`}>
                {agent.heartbeat_healthy ? (
                  <>
                    <Activity size={16} className="text-green-600" />
                    <span className="font-medium">Healthy</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} className="text-red-600" />
                    <span className="font-medium">Unhealthy</span>
                  </>
                )}
              </div>
              <div className={`text-sm mt-1 ${agent.heartbeat_healthy ? 'text-green-700' : 'text-red-700'}`}>
                {agent.heartbeat_healthy 
                  ? 'Agent is responding normally and operating within expected parameters.'
                  : 'Agent may be experiencing issues. Check logs for details.'
                }
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-left text-sm">
                View Full Logs
              </button>
              <button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-left text-sm">
                View Task History
              </button>
              <button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-left text-sm">
                Configure Schedules
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgentStats;
