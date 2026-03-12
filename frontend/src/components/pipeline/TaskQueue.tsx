import { useState } from 'react';
import { Clock, CheckCircle, XCircle, Play, Trash2, User } from 'lucide-react';
import { api } from '../../api/api';

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

interface Agent {
  id: number;
  name: string;
  status: string;
}

interface TaskQueueProps {
  tasks: Task[];
  agents: Agent[];
  onRefresh: () => void;
}

function TaskQueue({ tasks, agents, onRefresh }: TaskQueueProps) {
  const [filter, setFilter] = useState<string>('all');
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    task_name: '',
    task_payload: {},
    priority: 5,
    assigned_to_agent_id: ''
  });

  const getStatusBadge = (status: string) => {
    const config: { [key: string]: { icon: any; label: string; color: string } } = {
      pending: { icon: Clock, label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      claimed: { icon: User, label: 'Claimed', color: 'bg-blue-100 text-blue-800' },
      in_progress: { icon: Play, label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
      completed: { icon: CheckCircle, label: 'Completed', color: 'bg-green-100 text-green-800' },
      failed: { icon: XCircle, label: 'Failed', color: 'bg-red-100 text-red-800' },
      cancelled: { icon: XCircle, label: 'Cancelled', color: 'bg-gray-100 text-gray-800' }
    };

    const { icon: Icon, label, color } = config[status] || config.pending;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${color}`}>
        <Icon size={12} />
        {label}
      </span>
    );
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'text-red-600 font-bold';
    if (priority <= 5) return 'text-yellow-600 font-medium';
    return 'text-gray-600';
  };

  const handleCreateTask = async () => {
    try {
      await api.post('/orchestration/tasks', {
        ...newTask,
        task_type: 'manual',
        assigned_to_agent_id: newTask.assigned_to_agent_id ? parseInt(newTask.assigned_to_agent_id) : undefined
      });

      setNewTask({ task_name: '', task_payload: {}, priority: 5, assigned_to_agent_id: '' });
      setCreatingTask(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  };

  const handleCancelTask = async (taskId: number) => {
    if (!confirm('Cancel this task?')) return;

    try {
      await api.post(`/orchestration/tasks/${taskId}/fail`, {
        error_message: 'Cancelled by user',
        retry: false
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to cancel task:', error);
      alert('Failed to cancel task');
    }
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const timeSince = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="claimed">Claimed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <span className="text-sm text-gray-600">
            ({filteredTasks.length} tasks)
          </span>
        </div>

        <button
          onClick={() => setCreatingTask(true)}
          className="px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Create Task
        </button>
      </div>

      {/* Create Task Form */}
      {creatingTask && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Task</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Name *
              </label>
              <input
                type="text"
                value={newTask.task_name}
                onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })}
                placeholder="e.g., Generate YouTube video summary"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Agent
                </label>
                <select
                  value={newTask.assigned_to_agent_id}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to_agent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Auto-assign (queue)</option>
                  {agents.filter(a => a.status === 'active').map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="1">1 - Critical</option>
                  <option value="2">2 - High</option>
                  <option value="5">5 - Medium</option>
                  <option value="7">7 - Low</option>
                  <option value="10">10 - Lowest</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateTask}
                disabled={!newTask.task_name}
                className="px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Task
              </button>
              <button
                onClick={() => setCreatingTask(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm mt-1">
              {filter === 'all' ? 'Create your first task to get started' : `No ${filter} tasks`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredTasks.map(task => (
              <li key={task.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{task.task_name}</h4>
                      {getStatusBadge(task.status)}
                      <span className={`text-sm ${getPriorityColor(task.priority)}`}>
                        P{task.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Created {timeSince(task.created_at)}</span>
                      {task.assigned_agent_name && (
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {task.assigned_agent_name}
                        </span>
                      )}
                      {task.delegated_by_agent_name && (
                        <span className="text-xs">
                          (delegated by {task.delegated_by_agent_name})
                        </span>
                      )}
                      {task.started_at && (
                        <span>Started {timeSince(task.started_at)}</span>
                      )}
                    </div>

                    {task.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-900">
                        <strong>Error:</strong> {task.error_message}
                      </div>
                    )}
                  </div>

                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleCancelTask(task.id)}
                      className="ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Cancel task"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default TaskQueue;
