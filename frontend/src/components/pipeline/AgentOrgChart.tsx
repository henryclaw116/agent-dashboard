import { useState, useRef, useEffect } from 'react';
import { Play, Pause, StopCircle, RotateCw, Activity, Clock, Cpu, AlertTriangle, Link, X } from 'lucide-react';
import { api } from '../../api/api';
import RelationshipModal from './RelationshipModal';

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
  model?: string;
  console_id?: number;
  role?: string;
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
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<Agent | null>(null);
  const [connectingTo, setConnectingTo] = useState<Agent | null>(null);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingRelationship, setEditingRelationship] = useState<any | null>(null);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load relationships
  useEffect(() => {
    loadRelationships();
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack]);

  const loadRelationships = async () => {
    try {
      const res = await api.get('/relationships');
      setRelationships(res.data.relationships || []);
    } catch (error) {
      console.error('Failed to load relationships:', error);
    }
  };

  const handleRelationshipClick = (relationship: any) => {
    const fromAgent = agents.find(a => a.id === relationship.from_agent_id);
    const toAgent = agents.find(a => a.id === relationship.to_agent_id);
    
    if (!fromAgent || !toAgent) return;

    // Set up editing mode
    setConnectingFrom(fromAgent);
    setConnectingTo(toAgent);
    setEditingRelationship(relationship);
    setShowRelationshipModal(true);
  };

  const deleteRelationship = async (relationshipId: number) => {
    try {
      // Save state for undo
      const deletedRel = relationships.find(r => r.id === relationshipId);
      if (deletedRel) {
        saveStateForUndo({
          type: 'delete_relationship',
          relationship: deletedRel
        });
      }

      await api.delete(`/relationships/${relationshipId}`);
      await loadRelationships();
      console.log('✓ Relationship deleted');
    } catch (error: any) {
      console.error('Failed to delete relationship:', error);
      alert('Failed to delete relationship: ' + (error.response?.data?.error || error.message));
    }
  };

  // Undo/Redo system
  const saveStateForUndo = (action: any) => {
    setUndoStack(prev => [...prev, action]);
    setRedoStack([]); // Clear redo stack when new action is made
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) {
      alert('Nothing to undo');
      return;
    }

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastAction]);

    try {
      switch (lastAction.type) {
        case 'move_agent':
          // Restore previous position
          await onPositionUpdate(lastAction.agentId, lastAction.oldPosition);
          break;

        case 'delete_relationship':
          // Recreate the relationship
          await api.post('/relationships', {
            from_agent_id: lastAction.relationship.from_agent_id,
            to_agent_id: lastAction.relationship.to_agent_id,
            relationship_type: lastAction.relationship.relationship_type,
            workflow_config: lastAction.relationship.workflow_config,
            line_color: lastAction.relationship.line_color,
            line_style: lastAction.relationship.line_style,
            label: lastAction.relationship.label
          });
          await loadRelationships();
          break;

        case 'create_relationship':
          // Delete the relationship
          await api.delete(`/relationships/${lastAction.relationshipId}`);
          await loadRelationships();
          break;
      }
      console.log('✓ Undo successful');
    } catch (error) {
      console.error('Undo failed:', error);
      alert('Failed to undo action');
    }
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) {
      alert('Nothing to redo');
      return;
    }

    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);

    try {
      switch (action.type) {
        case 'move_agent':
          // Restore newer position
          await onPositionUpdate(action.agentId, action.newPosition);
          break;

        case 'delete_relationship':
          // Delete again
          const rel = await api.get('/relationships');
          const toDelete = rel.data.relationships.find(
            (r: any) => r.from_agent_id === action.relationship.from_agent_id &&
                       r.to_agent_id === action.relationship.to_agent_id &&
                       r.relationship_type === action.relationship.relationship_type
          );
          if (toDelete) {
            await api.delete(`/relationships/${toDelete.id}`);
            await loadRelationships();
          }
          break;

        case 'create_relationship':
          // Recreate
          const response = await api.post('/relationships', action.relationship);
          await loadRelationships();
          break;
      }
      console.log('✓ Redo successful');
    } catch (error) {
      console.error('Redo failed:', error);
      alert('Failed to redo action');
    }
  };

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

    // Connection mode: select agents to connect
    if (connectionMode) {
      if (!connectingFrom) {
        setConnectingFrom(agent);
      } else if (connectingFrom.id !== agent.id) {
        setConnectingTo(agent);
        setShowRelationshipModal(true);
      }
      return;
    }

    // Normal mode: drag agent
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggingAgent(agent.id);
    setDragOffset({
      x: (e.clientX - rect.left) / zoom - agent.position_x - pan.x / zoom,
      y: (e.clientY - rect.top) / zoom - agent.position_y - pan.y / zoom
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on canvas background (not on an agent)
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.agent-card') === null) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle agent dragging
    if (draggingAgent !== null) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / zoom - dragOffset.x - pan.x / zoom;
      const y = (e.clientY - rect.top) / zoom - dragOffset.y - pan.y / zoom;

      // Update position state for smooth visual drag
      setDragPosition({ x, y });
    }
    
    // Handle canvas panning
    if (isPanning) {
      const newPan = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      };
      setPan(newPan);
    }
  };

  const handleMouseUp = () => {
    if (draggingAgent !== null && dragPosition) {
      const agent = agents.find(a => a.id === draggingAgent);
      
      // Save state for undo
      if (agent) {
        saveStateForUndo({
          type: 'move_agent',
          agentId: agent.id,
          oldPosition: { x: agent.position_x, y: agent.position_y },
          newPosition: dragPosition
        });
      }

      // Save the final position
      onPositionUpdate(draggingAgent, dragPosition);
      setDraggingAgent(null);
      setDragPosition(null);
    }
    
    if (isPanning) {
      setIsPanning(false);
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

  // Draw relationship lines between connected agents
  const renderRelationshipLines = () => {
    return relationships.map(rel => {
      const fromAgent = agents.find(a => a.id === rel.from_agent_id);
      const toAgent = agents.find(a => a.id === rel.to_agent_id);
      
      if (!fromAgent || !toAgent) return null;

      // Get actual positions (including any drag updates)
      const fromPos = draggingAgent === fromAgent.id && dragPosition
        ? dragPosition
        : { x: fromAgent.position_x, y: fromAgent.position_y };
      
      const toPos = draggingAgent === toAgent.id && dragPosition
        ? dragPosition
        : { x: toAgent.position_x, y: toAgent.position_y };

      // Card dimensions (width: 240px, height: ~160px)
      const cardWidth = 240;
      const cardHeight = 160;

      // Determine which agent is higher (smaller Y = higher on screen)
      const fromIsHigher = fromPos.y < toPos.y;

      let x1, y1, x2, y2;

      if (fromIsHigher) {
        // fromAgent is higher, toAgent is lower
        // Line goes FROM bottom of fromAgent TO top of toAgent
        x1 = fromPos.x + cardWidth / 2;  // Center-X of fromAgent
        y1 = fromPos.y + cardHeight;     // Bottom of fromAgent
        x2 = toPos.x + cardWidth / 2;    // Center-X of toAgent
        y2 = toPos.y;                    // Top of toAgent
      } else {
        // toAgent is higher, fromAgent is lower
        // Line goes FROM top of fromAgent TO bottom of toAgent
        x1 = fromPos.x + cardWidth / 2;  // Center-X of fromAgent
        y1 = fromPos.y;                  // Top of fromAgent
        x2 = toPos.x + cardWidth / 2;    // Center-X of toAgent
        y2 = toPos.y + cardHeight;       // Bottom of toAgent
      }

      // Arrow marker style
      const markerId = `arrow-${rel.id}`;
      const strokeDasharray = rel.line_style === 'dashed' ? '8,4' : 
                              rel.line_style === 'dotted' ? '2,4' : '0';

      return (
        <g key={rel.id}>
          {/* Arrow marker definition */}
          <defs>
            <marker
              id={markerId}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill={rel.line_color || '#3B82F6'}
              />
            </marker>
          </defs>

          {/* Connection line - clickable */}
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={rel.line_color || '#3B82F6'}
            strokeWidth="3"
            strokeDasharray={strokeDasharray}
            markerEnd={`url(#${markerId})`}
            opacity="0.7"
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
            onClick={(e) => {
              e.stopPropagation();
              handleRelationshipClick(rel);
            }}
          />
          {/* Invisible wider line for easier clicking */}
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="transparent"
            strokeWidth="20"
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
            onClick={(e) => {
              e.stopPropagation();
              handleRelationshipClick(rel);
            }}
          />

          {/* Label */}
          {rel.label && (
            <text
              x={(x1 + x2) / 2}
              y={(y1 + y2) / 2 - 10}
              fill="#374151"
              fontSize="12"
              fontWeight="500"
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              {rel.label}
            </text>
          )}
        </g>
      );
    });
  };

  // Draw parent-child hierarchy lines (faded background)
  const renderHierarchyLines = () => {
    return agents
      .filter(agent => agent.parent_agent_id)
      .map(agent => {
        const parent = agents.find(a => a.id === agent.parent_agent_id);
        if (!parent) return null;

        const x1 = parent.position_x + 120;
        const y1 = parent.position_y + 80;
        const x2 = agent.position_x + 120;
        const y2 = agent.position_y;

        return (
          <line
            key={`hierarchy-${agent.id}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#cbd5e0"
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.3"
            style={{ pointerEvents: 'none' }}
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
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Auto-Layout
          </button>
          <div className="flex items-center gap-1 border-l border-gray-300 pl-2">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              ↷ Redo
            </button>
          </div>
          <button
            onClick={() => {
              setConnectionMode(!connectionMode);
              setConnectingFrom(null);
            }}
            className={`px-3 py-1 text-sm rounded hover:opacity-90 flex items-center gap-1 ${
              connectionMode
                ? 'bg-red-500 text-white'
                : 'bg-rlt-blue text-white'
            }`}
          >
            {connectionMode ? (
              <>
                <X size={14} />
                Cancel
              </>
            ) : (
              <>
                <Link size={14} />
                Connect
              </>
            )}
          </button>
        </div>
      </div>

      {/* Connection Mode Banner */}
      {connectionMode && (
        <div className="px-6 py-2 bg-blue-50 border-b border-blue-200 text-sm">
          {connectingFrom ? (
            <span className="text-blue-900 font-medium">
              ✓ Selected: <strong>{connectingFrom.name}</strong> → Click another agent to connect
            </span>
          ) : (
            <span className="text-blue-900">
              Click an agent to start connecting
            </span>
          )}
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative bg-gray-50 overflow-hidden"
        style={{ 
          height: '600px', 
          cursor: draggingAgent ? 'grabbing' : isPanning ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          className="absolute inset-0"
          style={{ 
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, 
            transformOrigin: '0 0',
            overflow: 'visible'
          }}
          width="100%"
          height="100%"
        >
          {renderHierarchyLines()}
          {renderRelationshipLines()}
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
          {agents.map(agent => {
            const isDragging = draggingAgent === agent.id;
            const position = isDragging && dragPosition
              ? dragPosition
              : { x: agent.position_x, y: agent.position_y };

            const isConnectingFromThis = connectionMode && connectingFrom?.id === agent.id;
            const isSelectable = connectionMode && !connectingFrom;
            const canConnectTo = connectionMode && connectingFrom && connectingFrom.id !== agent.id;

            return (
            <div
              key={agent.id}
              className={`agent-card absolute bg-white rounded-lg shadow-lg border-2 ${getStatusColor(agent.status)} ${
                isDragging ? 'cursor-grabbing shadow-2xl scale-105 transition-none' : 
                isConnectingFromThis ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-300 cursor-pointer' :
                canConnectTo ? 'cursor-pointer hover:border-green-500 hover:bg-green-50' :
                isSelectable ? 'cursor-pointer hover:border-blue-400' :
                'cursor-grab hover:shadow-xl transition-all'
              }`}
              style={{
                left: position.x,
                top: position.y,
                width: '240px',
                zIndex: isDragging ? 1000 : 1,
                userSelect: 'none', // Prevent text selection
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
              onMouseDown={(e) => handleMouseDown(e, agent)}
              onDragStart={(e) => e.preventDefault()} // Prevent default drag
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
                    {agent.model && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {agent.model.split('/')[1] || agent.model}
                        </span>
                      </div>
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
                  {agent.cpu_usage !== undefined && agent.cpu_usage !== null && typeof agent.cpu_usage === 'number' && !isNaN(agent.cpu_usage) && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Cpu size={12} />
                      <span>{agent.cpu_usage.toFixed(1)}%</span>
                    </div>
                  )}
                  {agent.memory_usage_mb !== undefined && agent.memory_usage_mb !== null && typeof agent.memory_usage_mb === 'number' && !isNaN(agent.memory_usage_mb) && (
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
            );
          })}
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
        <strong>Tip:</strong> Drag agents to reposition them. Click "Connect" to draw relationships between agents. Lines show workflow connections.
      </div>

      {/* Relationship Modal */}
      {showRelationshipModal && connectingFrom && connectingTo && (
        <RelationshipModal
          fromAgent={connectingFrom}
          toAgent={connectingTo}
          existingRelationship={editingRelationship}
          onClose={() => {
            setShowRelationshipModal(false);
            setConnectionMode(false);
            setConnectingFrom(null);
            setConnectingTo(null);
            setEditingRelationship(null);
          }}
          onCreated={(relationshipId?: number, relationshipData?: any) => {
            // Save for undo
            if (relationshipId && relationshipData && !editingRelationship) {
              saveStateForUndo({
                type: 'create_relationship',
                relationshipId,
                relationship: relationshipData
              });
            }
            loadRelationships();
          }}
          onDeleted={() => {
            loadRelationships();
          }}
        />
      )}
    </div>
  );
}

export default AgentOrgChart;
