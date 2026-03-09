import React, { useState, useEffect } from 'react';
import { Workflow, WorkflowStep } from '../types/workflow';
import { workflowsApi } from '../api/api';
import WorkflowStepCard from './WorkflowStepCard';
import WorkflowStepForm from './WorkflowStepForm';

interface WorkflowBuilderProps {
  agentId: number;
  agentName: string;
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ agentId, agentName }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [showNewStep, setShowNewStep] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state for new workflow
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState('');

  useEffect(() => {
    loadWorkflows();
  }, [agentId]);

  useEffect(() => {
    if (selectedWorkflow) {
      loadWorkflowSteps(selectedWorkflow.id);
    }
  }, [selectedWorkflow]);

  const loadWorkflows = async () => {
    try {
      const response = await workflowsApi.getForAgent(agentId);
      setWorkflows(response.data.workflows || []);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadWorkflowSteps = async (workflowId: number) => {
    try {
      setLoading(true);
      const response = await workflowsApi.getById(workflowId);
      setSteps(response.data.steps || []);
    } catch (error) {
      console.error('Failed to load workflow steps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;

    try {
      const response = await workflowsApi.create({
        agent_id: agentId,
        name: newWorkflowName,
        description: newWorkflowDesc,
        is_active: true
      });

      setWorkflows([...workflows, response.data.workflow]);
      setNewWorkflowName('');
      setNewWorkflowDesc('');
      setShowNewWorkflow(false);
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (workflowId: number) => {
    if (!confirm('Delete this workflow? This will also delete all steps.')) return;

    try {
      await workflowsApi.delete(workflowId);
      setWorkflows(workflows.filter(w => w.id !== workflowId));
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(null);
        setSteps([]);
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleSaveStep = async (stepData: Partial<WorkflowStep>) => {
    if (!selectedWorkflow) return;

    try {
      if (editingStep) {
        // Update existing step
        await workflowsApi.updateStep(editingStep.id, stepData);
      } else {
        // Create new step
        const nextOrder = steps.length > 0 ? Math.max(...steps.map(s => s.step_order)) + 1 : 1;
        await workflowsApi.createStep(selectedWorkflow.id, {
          ...stepData,
          step_order: nextOrder
        });
      }

      loadWorkflowSteps(selectedWorkflow.id);
      setShowNewStep(false);
      setEditingStep(null);
    } catch (error) {
      console.error('Failed to save step:', error);
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    if (!confirm('Delete this step?')) return;

    try {
      await workflowsApi.deleteStep(stepId);
      loadWorkflowSteps(selectedWorkflow!.id);
    } catch (error) {
      console.error('Failed to delete step:', error);
    }
  };

  const handleMoveStep = async (stepId: number, direction: 'up' | 'down') => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;
    if (direction === 'up' && stepIndex === 0) return;
    if (direction === 'down' && stepIndex === steps.length - 1) return;

    const newSteps = [...steps];
    const swapIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    [newSteps[stepIndex], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[stepIndex]];

    // Update step_order for reordered steps
    const stepOrders = newSteps.map((step, index) => ({
      id: step.id,
      step_order: index + 1
    }));

    try {
      await workflowsApi.reorderSteps(selectedWorkflow!.id, stepOrders);
      setSteps(newSteps.map((step, index) => ({
        ...step,
        step_order: index + 1
      })));
    } catch (error) {
      console.error('Failed to reorder steps:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Workflows for {agentName}
        </h3>
        <button
          onClick={() => setShowNewWorkflow(!showNewWorkflow)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + New Workflow
        </button>
      </div>

      {/* New Workflow Form */}
      {showNewWorkflow && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <form onSubmit={handleCreateWorkflow} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Name
              </label>
              <input
                type="text"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Social Media Content Creation"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newWorkflowDesc}
                onChange={(e) => setNewWorkflowDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Brief description of this workflow..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Workflow
              </button>
              <button
                type="button"
                onClick={() => setShowNewWorkflow(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workflow List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map(workflow => (
          <div
            key={workflow.id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedWorkflow?.id === workflow.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => setSelectedWorkflow(workflow)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                {workflow.description && (
                  <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    workflow.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {workflow.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {workflow.step_count || 0} steps
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWorkflow(workflow.id);
                }}
                className="text-red-600 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow Steps */}
      {selectedWorkflow && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              Steps for: {selectedWorkflow.name}
            </h4>
            <button
              onClick={() => setShowNewStep(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              + Add Step
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading steps...</div>
          ) : steps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No steps yet. Click "+ Add Step" to create the first one.
            </div>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <WorkflowStepCard
                  key={step.id}
                  step={step}
                  isFirst={index === 0}
                  isLast={index === steps.length - 1}
                  onEdit={() => setEditingStep(step)}
                  onDelete={() => handleDeleteStep(step.id)}
                  onMoveUp={() => handleMoveStep(step.id, 'up')}
                  onMoveDown={() => handleMoveStep(step.id, 'down')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step Form Modal */}
      {(showNewStep || editingStep) && (
        <WorkflowStepForm
          step={editingStep}
          onSave={handleSaveStep}
          onCancel={() => {
            setShowNewStep(false);
            setEditingStep(null);
          }}
        />
      )}
    </div>
  );
};

export default WorkflowBuilder;
