import { useEffect, useState } from 'react';
import { agentsApi, consolesApi } from '../api/api';
import { Users, Bot, Server, Plus, Activity, Calendar } from 'lucide-react';
import Modal from '../components/Modal';
import AgentForm from '../components/AgentForm';
import ConsoleForm from '../components/ConsoleForm';

interface Agent {
  id: number;
  name: string;
  role: string;
  status: string;
  console_name?: string;
  console_status?: string;
  goal_count: number;
  task_count: number;
  avatar_url?: string;
  personality?: string;
  model?: string;
  daily_cost?: number;
  monthly_cost?: number;
}

interface Console {
  id: number;
  name: string;
  type: string;
  status: string;
  agent_count: number;
}

function Team() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [consoles, setConsoles] = useState<Console[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showAgentFormModal, setShowAgentFormModal] = useState(false);
  const [showConsoleModal, setShowConsoleModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentsRes, consolesRes] = await Promise.all([
        agentsApi.getAll(),
        consolesApi.getAll()
      ]);
      
      // Set agents with placeholder costs (will load costs on demand)
      const agentsWithCosts = agentsRes.data.agents.map((agent: Agent) => ({
        ...agent,
        daily_cost: 0,
        monthly_cost: 0
      }));
      
      setAgents(agentsWithCosts);
      setConsoles(consolesRes.data.consoles);
      
      // Load costs in background (don't block UI)
      loadAgentCosts(agentsRes.data.agents);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentCosts = async (agentsList: Agent[]) => {
    // Load costs for each agent in background
    for (const agent of agentsList) {
      try {
        const costsRes = await agentsApi.getCosts(agent.id);
        setAgents(prev => prev.map(a => 
          a.id === agent.id 
            ? { ...a, daily_cost: costsRes.data.daily_cost || 0, monthly_cost: costsRes.data.monthly_cost || 0 }
            : a
        ));
      } catch (err) {
        // Silently fail - costs will stay at 0
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'idle': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rlt-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">Manage your AI agents and execution environments</p>
        </div>
        <button
          onClick={() => setShowAgentFormModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900">
                {agents.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Server className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Consoles</p>
              <p className="text-2xl font-bold text-gray-900">{consoles.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents List */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">AI Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedAgent(agent)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-600">{agent.role}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </span>
              </div>

              {agent.personality && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{agent.personality}</p>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{agent.goal_count} goals</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    <span>{agent.task_count} tasks</span>
                  </div>
                </div>
                
                {(agent.daily_cost !== undefined || agent.monthly_cost !== undefined) && (
                  <div className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded">
                    <span className="text-gray-600">
                      Today: <span className="font-semibold text-gray-900">${(agent.daily_cost || 0).toFixed(4)}</span>
                    </span>
                    <span className="text-gray-600">
                      Month: <span className="font-semibold text-gray-900">${(agent.monthly_cost || 0).toFixed(2)}</span>
                    </span>
                  </div>
                )}
              </div>

              {agent.console_name && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm">
                    <Server className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{agent.console_name}</span>
                    {agent.console_status && (
                      <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${getStatusColor(agent.console_status)}`}>
                        {agent.console_status}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Consoles Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Execution Consoles</h2>
          <button 
            onClick={() => setShowConsoleModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-rlt-blue border border-rlt-blue rounded-md hover:bg-blue-50"
          >
            <Plus className="w-4 h-4" />
            New Console
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {consoles.map((console) => (
            <div key={console.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Server className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{console.name}</h3>
                    <p className="text-sm text-gray-600">{console.type}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(console.status)}`}>
                  {console.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{console.agent_count}</span> agents assigned
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <Modal
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
          title={selectedAgent.name}
          size="lg"
        >
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Role</h4>
              <p className="text-gray-600">{selectedAgent.role}</p>
            </div>

            {selectedAgent.personality && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Personality</h4>
                <p className="text-gray-600">{selectedAgent.personality}</p>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Status</h4>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedAgent.status)}`}>
                {selectedAgent.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Active Goals</h4>
                <p className="text-2xl font-bold text-rlt-blue">{selectedAgent.goal_count}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Assigned Tasks</h4>
                <p className="text-2xl font-bold text-rlt-blue">{selectedAgent.task_count}</p>
              </div>
            </div>

            {selectedAgent.model && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">AI Model</h4>
                <p className="text-gray-600 font-mono text-sm">{selectedAgent.model}</p>
              </div>
            )}

            {(selectedAgent.daily_cost !== undefined || selectedAgent.monthly_cost !== undefined) && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Usage Costs</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 px-4 py-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Today</p>
                    <p className="text-2xl font-bold text-blue-600">${(selectedAgent.daily_cost || 0).toFixed(4)}</p>
                  </div>
                  <div className="bg-purple-50 px-4 py-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">This Month</p>
                    <p className="text-2xl font-bold text-purple-600">${(selectedAgent.monthly_cost || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedAgent.console_name && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Console</h4>
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{selectedAgent.console_name}</span>
                  {selectedAgent.console_status && (
                    <span className={`ml-auto px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedAgent.console_status)}`}>
                      {selectedAgent.console_status}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button className="flex-1 px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700">
                Edit Agent
              </button>
              <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                View Activity
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Agent Form Modal */}
      <Modal
        isOpen={showAgentFormModal}
        onClose={() => setShowAgentFormModal(false)}
        title="Create New Agent"
        size="lg"
      >
        <AgentForm
          onSuccess={() => {
            setShowAgentFormModal(false);
            loadData();
          }}
          onCancel={() => setShowAgentFormModal(false)}
        />
      </Modal>

      {/* New Console Form Modal */}
      <Modal
        isOpen={showConsoleModal}
        onClose={() => setShowConsoleModal(false)}
        title="Create New Console"
      >
        <ConsoleForm
          onSuccess={() => {
            setShowConsoleModal(false);
            loadData();
          }}
          onCancel={() => setShowConsoleModal(false)}
        />
      </Modal>
    </div>
  );
}

export default Team;
