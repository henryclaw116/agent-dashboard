import { useState, useRef, useEffect } from 'react';
import { Play, Pause, StopCircle, RotateCw, Activity, Clock, Cpu, AlertTriangle } from 'lucide-react';

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

interface AgentOrgChartProps {
  agents: Agent[];
  onAgentClick: (agent: Agent) => void;
  onPositionUpdate: (agentId: number, position: { x: number; y: number }, parentId?: number) => void;
  onControlAction: (agentId: number, action: 'start' | 'stop' | 'pause' | 'restart') => void;
}

function AgentOrgChart({ agents, onAgentClick, onPositionUpdate, onControlAction }: AgentOrgChartProps) {
  const [draggingAgent, setDraggingAgent] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Auto-layout agents if not positioned
  useEffect(() => {
    const unpositionedAgents = agents.filter(a => a.position_x === 0 && a.position_y === 0);
    if (unpositionedAgents.length > 0) {
      autoLayoutAgents();
    }
  }, [agents]);

  const autoLayoutAgents = () => {
    // Simple hierarchical layout
    const levelSpacing = 200;
    const nodeSpacing = 250;

    // Group by hierarchy level
    const levels: { [key: number]: Agent[] } = {};
    agents.forEach(agent => {
      const level = agent.hierarchy_level || 0;
      if (!levels[level]) levels[level] = [];
      levels[level].push(agent);
    });

    // Position agents
    Object.entries(levels).forEach(([levelStr, levelAgents]) => {
      const level = parseInt(levelStr);
      const y = level * levelSpacing + 100;
      const totalWidth = levelAgents.length * nodeSpacing;
      const startX = (800 - totalWidth) / 2; // Center on 800px canvas

      levelAgents.forEach((agent, index) => {
        const x = startX + index * nodeSpacing + 100;
        if (agent.position_x === 0 && agent.position_y === 0) {
          onPositionUpdate(agent.id, { x, y });
        }
      });
    });
  };

  const handleMouseDown = (e: React.MouseEvent, agent: Agent) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggingAgent(agent.id);
    setDragOffset({
      x: (e.clientX - rect.left) / zoom - agent.position_x,
      y: (e.clientY - rect.top) / zoom - agent.position_y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingAgent === null) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom - dragOffset.x;
    const y = (e.clientY - rect.top) / zoom - dragOffset.y;

    // Update position locally for smooth drag
    const agent = agents.find(a => a.id === draggingAgent);
    if (agent) {
      agent.position_x = x;
      agent.position_y = y;
    }
  };

  const handleMouseUp = () => {
    if (draggingAgent !== null) {
      const agent = agents.find(a => a.id === draggingAgent);
      if (agent) {
        onPositionUpdate(agent.id, { x: agent.position_x, y: agent.position_y });
      }
      setDraggingAgent(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      active: 'border-green-500 bg-green-50',
      idle: 'border-blue-500 bg-blue-50',
      offline: 'border-gray-400 bg-gray-50',
      paused: 'border-yellow-500 bg-yellow-50',
      error: 'border-red-500 bg-red-50'
    };
    return colors[status] || 'border-gray-400 bg-gray-50';
  };

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: any } = {
      active: Activity,
      idle: Clock,
      offline: StopCircle,
      paused: Pause,
      error: AlertTriangle
    };
    const Icon = icons[status] || Clock;
    return <Icon size={16} className={status === 'active' ? 'text-green-600' : 'text-gray-600'} />;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 MB';
    return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  };

  const timeSince = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Draw connection lines between parent and child agents
  const renderConnections = () => {
    return agents
      .filter(agent => agent.parent_agent_id)
      .map(agent => {
        const parent = agents.find(a => a.id === agent.parent_agent_id);
        if (!parent) return null;

        const x1 = parent.position_x + 120; // Center of parent card
        const y1 = parent.position_y + 80; // Bottom of parent card
        const x2 = agent.position_x + 120; // Center of child card
        const y2 = agent.position_y; // Top of child card

        return (
          <line
            key={`line-${agent.id}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#cbd5e0"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        );
      });
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Agent Hierarchy</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            −
          </button>
          <span className="text-sm text-gray-600 px-2">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            +
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={autoLayoutAgents}
            className="px-3 py-1 text-sm bg-rlt-blue text-white rounded hover:bg-blue-700"
          >
            Auto-Layout
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative bg-gray-50 overflow-hidden"
        style={{ height: '600px', cursor: draggingAgent ? 'grabbing' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {renderConnections()}
        </svg>

        <div
          className="absolute"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%'
          }}
        >
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`absolute bg-white rounded-lg shadow-lg border-2 transition-all ${getStatusColor(agent.status)} ${
                draggingAgent === agent.id ? 'cursor-grabbing shadow-2xl scale-105' : 'cursor-grab hover:shadow-xl'
              }`}
              style={{
                left: agent.position_x,
                top: agent.position_y,
                width: '240px',
                zIndex: draggingAgent === agent.id ? 1000 : 1
              }}
              onMouseDown={(e) => handleMouseDown(e, agent)}
            >
              {/* Agent Card */}
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(agent.status)}
                      <h3 className="font-semibold text-gray-900 text-sm">{agent.name}</h3>
                    </div>
                    {agent.description && (
                      <p className="text-xs text-gray-600 line-clamp-1">{agent.description}</p>
                    )}
                  </div>
                  {agent.unread_alerts_count > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {agent.unread_alerts_count}
                    </span>
                  )}
                </div>

                {/* Current Task */}
                {agent.current_task_name && (
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="font-medium text-blue-900 line-clamp-1">{agent.current_task_name}</div>
                    <div className="text-blue-600">{agent.current_task_status}</div>
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                  {agent.cpu_usage !== undefined && agent.cpu_usage !== null && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Cpu size={12} />
                      <span>{agent.cpu_usage.toFixed(1)}%</span>
                    </div>
                  )}
                  {agent.memory_usage_mb !== undefined && agent.memory_usage_mb !== null && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Activity size={12} />
                      <span>{formatBytes(agent.memory_usage_mb * 1024 * 1024)}</span>
                    </div>
                  )}
                  {agent.pending_tasks_count > 0 && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock size={12} />
                      <span>{agent.pending_tasks_count} tasks</span>
                    </div>
                  )}
                  {agent.last_heartbeat_at && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Activity size={12} />
                      <span>{timeSince(agent.last_heartbeat_at)}</span>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 pt-2 border-t border-gray-200">
                  {agent.status === 'active' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onControlAction(agent.id, 'pause'); }}
                      className="flex-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 flex items-center justify-center gap-1"
                      title="Pause"
                    >
                      <Pause size={12} />
                      Pause
                    </button>
                  ) : agent.status === 'paused' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onControlAction(agent.id, 'start'); }}
                      className="flex-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center justify-center gap-1"
                      title="Resume"
                    >
                      <Play size={12} />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onControlAction(agent.id, 'start'); }}
                      className="flex-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center justify-center gap-1"
                      title="Start"
                    >
                      <Play size={12} />
                      Start
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onControlAction(agent.id, 'restart'); }}
                    className="flex-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center justify-center gap-1"
                    title="Restart"
                  >
                    <RotateCw size={12} />
                    Restart
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAgentClick(agent); }}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    title="Details"
                  >
                    ⓘ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {agents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No agents found</p>
              <p className="text-sm mt-1">Add agents to see them in the org chart</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        <strong>Tip:</strong> Drag agents to reposition them. Click info (ⓘ) for details. Lines show reporting relationships.
      </div>
    </div>
  );
}

export default AgentOrgChart;
