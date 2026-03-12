import { useState } from 'react';
import { X, Zap, CheckCircle, Users, ArrowUp, TrendingUp, Shield, Link } from 'lucide-react';
import { api } from '../../api/api';

interface Agent {
  id: number;
  name: string;
  position_y: number;
}

interface RelationshipModalProps {
  fromAgent: Agent;
  toAgent: Agent;
  onClose: () => void;
  onCreated: (relationshipId?: number, relationshipData?: any) => void;
  existingRelationship?: any; // If provided, we're editing instead of creating
  onDeleted?: () => void;
}

const RELATIONSHIP_TYPES = [
  {
    value: 'reports_to',
    label: 'Reports To',
    icon: ArrowUp,
    description: (from: string, to: string) => `${from} reports to ${to} (manager)`,
    color: '#8B5CF6'
  },
  {
    value: 'delegates_to',
    label: 'Delegates To',
    icon: Zap,
    description: (from: string, to: string) => `${from} can assign tasks to ${to}`,
    color: '#3B82F6'
  },
  {
    value: 'feeds_to',
    label: 'Feeds To',
    icon: TrendingUp,
    description: (from: string, to: string) => `${from}'s output becomes ${to}'s input`,
    color: '#10B981'
  },
  {
    value: 'approves_for',
    label: 'Approves For',
    icon: CheckCircle,
    description: (from: string, to: string) => `${to} approves ${from}'s work`,
    color: '#F59E0B'
  },
  {
    value: 'collaborates_with',
    label: 'Collaborates With',
    icon: Users,
    description: (from: string, to: string) => `${from} and ${to} are equal peers`,
    color: '#6366F1'
  },
  {
    value: 'escalates_to',
    label: 'Escalates To',
    icon: ArrowUp,
    description: (from: string, to: string) => `${from} escalates issues to ${to}`,
    color: '#EF4444'
  },
  {
    value: 'backs_up',
    label: 'Backs Up',
    icon: Shield,
    description: (from: string, to: string) => `${to} is backup for ${from}`,
    color: '#64748B'
  }
];

const LINE_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' }
];

function RelationshipModal({ fromAgent, toAgent, onClose, onCreated, existingRelationship, onDeleted }: RelationshipModalProps) {
  const isEditing = !!existingRelationship;
  
  const [relationshipType, setRelationshipType] = useState(existingRelationship?.relationship_type || 'feeds_to');
  const [autoRoute, setAutoRoute] = useState(existingRelationship?.workflow_config?.auto_route_tasks ?? true);
  const [requireApproval, setRequireApproval] = useState(existingRelationship?.workflow_config?.requires_approval ?? false);
  const [priorityFilter, setPriorityFilter] = useState(!!existingRelationship?.workflow_config?.priority_threshold);
  const [tags, setTags] = useState((existingRelationship?.workflow_config?.task_filter?.tags || []).join(', '));
  const [lineStyle, setLineStyle] = useState(existingRelationship?.line_style || 'solid');
  const [label, setLabel] = useState(existingRelationship?.label || '');
  const [notes, setNotes] = useState(existingRelationship?.notes || '');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedType = RELATIONSHIP_TYPES.find(t => t.value === relationshipType);
  const lineColor = selectedType?.color || '#3B82F6';

  // Determine flow direction
  const isUpward = toAgent.position_y < fromAgent.position_y;
  const isDownward = toAgent.position_y > fromAgent.position_y;
  const isLateral = Math.abs(toAgent.position_y - fromAgent.position_y) < 50;

  const handleSave = async () => {
    try {
      setCreating(true);

      const workflowConfig: any = {};
      if (autoRoute) workflowConfig.auto_route_tasks = true;
      if (requireApproval) workflowConfig.requires_approval = true;
      if (priorityFilter) workflowConfig.priority_threshold = { priority: 3 };
      if (tags) workflowConfig.task_filter = { tags: tags.split(',').map((t: string) => t.trim()) };

      const relationshipData = {
        from_agent_id: fromAgent.id,
        to_agent_id: toAgent.id,
        relationship_type: relationshipType,
        workflow_config: workflowConfig,
        line_color: lineColor,
        line_style: lineStyle,
        label: label || selectedType?.label,
        notes
      };

      if (isEditing) {
        // Update existing relationship
        const response = await api.put(`/relationships/${existingRelationship.id}`, relationshipData);
        onCreated(existingRelationship.id, relationshipData);
      } else {
        // Create new relationship
        const response = await api.post('/relationships', relationshipData);
        onCreated(response.data.relationship?.id, relationshipData);
      }
      
      onClose();
    } catch (error: any) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} relationship:`, error);
      const errorMsg = error.response?.data?.error || error.message;
      
      if (errorMsg.includes('duplicate') || errorMsg.includes('unique')) {
        alert(`A relationship of this type already exists between these agents.\n\nTo modify it:\n1. Click Cancel\n2. Click the existing line to edit it`);
      } else {
        alert(`Failed to ${isEditing ? 'update' : 'create'} relationship: ` + errorMsg);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !existingRelationship) return;
    
    if (!confirm(`Delete this connection?\n\n${fromAgent.name} → ${toAgent.name}\nType: ${relationshipType}\n\nThis will remove the connection and stop auto-routing.`)) {
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/relationships/${existingRelationship.id}`);
      
      if (onDeleted) {
        onDeleted();
      }
      onClose();
    } catch (error: any) {
      console.error('Failed to delete relationship:', error);
      alert('Failed to delete relationship: ' + (error.response?.data?.error || error.message));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Connection' : 'Connect Agents'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {fromAgent.name} → {toAgent.name}
            </p>
            {isEditing && selectedType && (
              <p className="text-xs text-gray-500 mt-1">
                Current: {selectedType.label}
              </p>
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
          {/* Flow Direction Info */}
          <div className={`p-3 rounded-lg border ${
            isUpward ? 'bg-blue-50 border-blue-200' :
            isDownward ? 'bg-green-50 border-green-200' :
            'bg-purple-50 border-purple-200'
          }`}>
            <p className="text-sm font-medium">
              {isUpward && '⬆️ Upward flow (to higher authority)'}
              {isDownward && '⬇️ Downward flow (to subordinate)'}
              {isLateral && '↔️ Lateral flow (between peers)'}
            </p>
          </div>

          {/* Relationship Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Relationship Type
            </label>
            <div className="space-y-2">
              {RELATIONSHIP_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = relationshipType === type.value;

                return (
                  <button
                    key={type.value}
                    onClick={() => setRelationshipType(type.value)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-rlt-blue bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon
                        size={20}
                        style={{ color: type.color }}
                        className="mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-600 mt-0.5">
                          {type.description(fromAgent.name, toAgent.name)}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle size={20} className="text-rlt-blue flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workflow Options */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Workflow Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRoute}
                  onChange={(e) => setAutoRoute(e.target.checked)}
                  className="w-4 h-4 text-rlt-blue rounded border-gray-300 focus:ring-rlt-blue"
                />
                <span className="text-sm text-gray-700">
                  Auto-route completed tasks to {toAgent.name}
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="w-4 h-4 text-rlt-blue rounded border-gray-300 focus:ring-rlt-blue"
                />
                <span className="text-sm text-gray-700">
                  Require approval before routing
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.checked)}
                  className="w-4 h-4 text-rlt-blue rounded border-gray-300 focus:ring-rlt-blue"
                />
                <span className="text-sm text-gray-700">
                  Only route high-priority tasks (priority ≤3)
                </span>
              </label>
            </div>
          </div>

          {/* Task Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Task Filter (optional)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="content, video, social"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated tags. Only tasks with these tags will be routed.
            </p>
          </div>

          {/* Visual Style */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Line Style
              </label>
              <select
                value={lineStyle}
                onChange={(e) => setLineStyle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {LINE_STYLES.map(style => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Line Color
              </label>
              <div
                className="w-full px-3 py-2 border border-gray-300 rounded-md flex items-center gap-2"
                style={{ backgroundColor: lineColor + '20' }}
              >
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: lineColor }}
                />
                <span className="text-sm text-gray-700">{selectedType?.label}</span>
              </div>
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Connection Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={selectedType?.label}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context about this relationship..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          <div>
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={creating || deleting}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Delete Connection
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={creating || deleting}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={creating || deleting}
              className="px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Link size={16} />
                  {isEditing ? 'Update Connection' : 'Create Connection'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RelationshipModal;
