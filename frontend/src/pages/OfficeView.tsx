import React, { useState, useEffect } from 'react';
import { api } from '../api/api';

interface Agent {
  id: number;
  name: string;
  status: string;
  current_task?: string;
  last_heartbeat?: string;
  health_score: number;
}

interface Activity {
  id: string;
  agent: string;
  action: string;
  timestamp: string;
  color: string;
}

// Agent positions in the office (x, y coordinates on grid)
const AGENT_POSITIONS: { [key: string]: { x: number; y: number; type: 'desk' | 'table' } } = {
  'Marketing AI': { x: 2, y: 2, type: 'desk' },
  'Operations Manager': { x: 8, y: 2, type: 'desk' },
  'Social Scanner': { x: 2, y: 5, type: 'desk' },
  'Social Scorer': { x: 5, y: 5, type: 'desk' },
  'Social Router': { x: 8, y: 5, type: 'desk' },
  'Social Writer': { x: 11, y: 5, type: 'desk' },
  'Social Dedup': { x: 2, y: 8, type: 'desk' },
  'Social Tracker': { x: 5, y: 8, type: 'desk' },
  'Pipeline Monitor': { x: 8, y: 8, type: 'desk' },
  // Agents at conference table (collaborating)
  'Sales Agent': { x: 5, y: 11, type: 'table' },
  'Support Agent': { x: 7, y: 11, type: 'table' },
  'Analytics Agent': { x: 9, y: 11, type: 'table' },
};

// Pixel art sprites for agents (simple emoji-based for now)
const AGENT_SPRITES: { [key: string]: string } = {
  idle: '🧑‍💼',
  working: '💻',
  talking: '💬',
  thinking: '🤔',
  scanning: '🔍',
  writing: '✍️',
  analyzing: '📊',
  error: '⚠️',
};

const OfficeView: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [gridSize] = useState({ rows: 14, cols: 14 });

  // Fetch agents and their status
  const loadAgents = async () => {
    try {
      const response = await api.get('/agents');
      setAgents(response.data.agents || []);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  // Fetch recent activities
  const loadActivities = async () => {
    try {
      const response = await api.get('/pipeline/active-tasks');
      const tasks = response.data.tasks || [];
      
      const newActivities: Activity[] = tasks.slice(0, 10).map((task: any, i: number) => ({
        id: `${task.id}-${Date.now()}`,
        agent: task.assigned_to || 'System',
        action: task.title || 'Processing',
        timestamp: new Date(task.created_at).toLocaleTimeString(),
        color: getActivityColor(task.status)
      }));
      
      setActivities(prev => {
        const combined = [...newActivities, ...prev];
        return combined.slice(0, 20); // Keep last 20
      });
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  // Get agent sprite based on status
  const getAgentSprite = (agent: Agent) => {
    if (agent.status === 'error') return AGENT_SPRITES.error;
    if (!agent.current_task) return AGENT_SPRITES.idle;
    
    const task = agent.current_task.toLowerCase();
    if (task.includes('scan')) return AGENT_SPRITES.scanning;
    if (task.includes('writ')) return AGENT_SPRITES.writing;
    if (task.includes('analyz')) return AGENT_SPRITES.analyzing;
    if (task.includes('talk') || task.includes('message')) return AGENT_SPRITES.talking;
    
    return AGENT_SPRITES.working;
  };

  // Get 2-word task summary
  const getTaskSummary = (agent: Agent) => {
    if (!agent.current_task) return 'Idle';
    
    const task = agent.current_task.toLowerCase();
    if (task.includes('scan')) return 'Scanning Posts';
    if (task.includes('score')) return 'Scoring Leads';
    if (task.includes('route')) return 'Routing Leads';
    if (task.includes('writ')) return 'Writing Replies';
    if (task.includes('dedup')) return 'Checking Duplicates';
    if (task.includes('track')) return 'Creating Links';
    if (task.includes('monitor')) return 'Monitoring Pipeline';
    if (task.includes('post')) return 'Posting Replies';
    
    return 'Working...';
  };

  // Render office grid
  const renderOffice = () => {
    const grid = [];
    
    for (let row = 0; row < gridSize.rows; row++) {
      const rowCells = [];
      for (let col = 0; col < gridSize.cols; col++) {
        const cell = renderCell(col, row);
        rowCells.push(
          <div
            key={`${col}-${row}`}
            className="relative"
            style={{
              width: '60px',
              height: '60px',
              background: getCellBackground(col, row),
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {cell}
          </div>
        );
      }
      grid.push(
        <div key={row} className="flex">
          {rowCells}
        </div>
      );
    }
    
    return grid;
  };

  // Get cell background (floor, desk, table, etc.)
  const getCellBackground = (x: number, y: number) => {
    // Conference table area
    if (y === 11 && x >= 4 && x <= 10) {
      return '#8B7355'; // Wood table
    }
    // Desk areas
    if (y <= 9 && x % 3 === 2 && y % 3 === 2) {
      return '#555555'; // Desk
    }
    // Floor
    return (x + y) % 2 === 0 ? '#3a3a3a' : '#444444';
  };

  // Render cell content (agent, furniture, etc.)
  const renderCell = (x: number, y: number) => {
    // Find agent at this position
    const agent = agents.find(a => {
      const pos = AGENT_POSITIONS[a.name];
      return pos && pos.x === x && pos.y === y;
    });

    if (agent) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl animate-bounce">{getAgentSprite(agent)}</div>
          <div className="text-xs text-white font-bold mt-1 text-center px-1 bg-black bg-opacity-50 rounded">
            {agent.name.split(' ')[0]}
          </div>
          <div className="text-xs text-yellow-300 text-center px-1 bg-black bg-opacity-50 rounded mt-1">
            {getTaskSummary(agent)}
          </div>
          {agent.status === 'busy' && (
            <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
      );
    }

    // Render furniture
    if (y === 11 && x >= 4 && x <= 10) {
      // Conference table
      if (x === 7 && y === 11) {
        return <div className="text-2xl">📋</div>; // Documents on table
      }
    }

    // Desk decorations
    if (y <= 9 && x % 3 === 2 && y % 3 === 2) {
      return <div className="text-xl">💻</div>;
    }

    // Plants
    if ((x === 0 || x === gridSize.cols - 1) && y % 4 === 0) {
      return <div className="text-2xl">🌿</div>;
    }

    return null;
  };

  useEffect(() => {
    loadAgents();
    loadActivities();

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      loadAgents();
      loadActivities();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🏢 Office View</h1>
          <p className="text-gray-400">Watch your agents at work in real-time</p>
        </div>

        <div className="flex gap-6">
          {/* Office View (Left) */}
          <div className="flex-1 bg-gray-800 rounded-lg p-4 overflow-auto">
            <div className="inline-block">
              {renderOffice()}
            </div>
          </div>

          {/* Activity Feed (Right) */}
          <div className="w-80 bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="animate-pulse">📡</span>
              Live Activity
            </h2>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '800px' }}>
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-gray-700 rounded p-3 border-l-4 border-blue-500 animate-slideIn"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{activity.agent}</div>
                      <div className={`text-xs ${activity.color} mt-1`}>
                        {activity.action}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">{activity.timestamp}</div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agent Status Bar (Bottom) */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">Agent Status</h3>
          <div className="grid grid-cols-6 gap-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-gray-700 rounded p-2 text-center"
              >
                <div className="text-2xl mb-1">{getAgentSprite(agent)}</div>
                <div className="text-xs font-semibold">{agent.name.split(' ')[0]}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {agent.status}
                </div>
                <div className="mt-1">
                  <div className="w-full bg-gray-600 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full ${
                        agent.health_score > 80
                          ? 'bg-green-500'
                          : agent.health_score > 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${agent.health_score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default OfficeView;
