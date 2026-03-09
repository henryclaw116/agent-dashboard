import React, { useState, useEffect } from 'react';
import { WorkflowStep } from '../types/workflow';

interface WorkflowStepFormProps {
  step: WorkflowStep | null;
  onSave: (data: Partial<WorkflowStep>) => void;
  onCancel: () => void;
}

const WorkflowStepForm: React.FC<WorkflowStepFormProps> = ({ step, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    step_name: '',
    prompt: '',
    rules: '',
    conditions: '',
    prerequisites: '',
    expected_output: '',
    tools_needed: '',
    estimated_duration_minutes: ''
  });

  useEffect(() => {
    if (step) {
      setFormData({
        step_name: step.step_name,
        prompt: step.prompt,
        rules: step.rules || '',
        conditions: step.conditions || '',
        prerequisites: step.prerequisites || '',
        expected_output: step.expected_output || '',
        tools_needed: step.tools_needed ? step.tools_needed.join(', ') : '',
        estimated_duration_minutes: step.estimated_duration_minutes?.toString() || ''
      });
    }
  }, [step]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: Partial<WorkflowStep> = {
      step_name: formData.step_name,
      prompt: formData.prompt,
      rules: formData.rules || null,
      conditions: formData.conditions || null,
      prerequisites: formData.prerequisites || null,
      expected_output: formData.expected_output || null,
      tools_needed: formData.tools_needed 
        ? formData.tools_needed.split(',').map(t => t.trim()).filter(t => t)
        : null,
      estimated_duration_minutes: formData.estimated_duration_minutes 
        ? parseInt(formData.estimated_duration_minutes) 
        : null
    };

    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {step ? 'Edit Workflow Step' : 'Add Workflow Step'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Step Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.step_name}
              onChange={(e) => setFormData({ ...formData, step_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Research Trending Topics"
              required
            />
          </div>

          {/* Prompt / Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instructions / Prompt <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={5}
              placeholder="Detailed instructions for this step... What should the agent do?"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific. This is the main prompt the agent will follow.
            </p>
          </div>

          {/* Rules */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rules
            </label>
            <textarea
              value={formData.rules}
              onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Rules that must be followed during this step (optional)"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., "Never make income claims", "Always cite sources", "Max 3 posts per day"
            </p>
          </div>

          {/* Conditions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conditions to Proceed
            </label>
            <textarea
              value={formData.conditions}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="What conditions must be met before moving to next step? (optional)"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., "Must have 5+ topic ideas", "Content must be approved", "No errors in output"
            </p>
          </div>

          {/* Prerequisites */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prerequisites
            </label>
            <textarea
              value={formData.prerequisites}
              onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="What needs to be done before this step can start? (optional)"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., "Previous step must be complete", "Need access to Brand24", "Calendar must be checked"
            </p>
          </div>

          {/* Expected Output */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Output
            </label>
            <textarea
              value={formData.expected_output}
              onChange={(e) => setFormData({ ...formData, expected_output: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="What should this step produce? (optional)"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., "List of 10 trending topics with engagement metrics", "Draft post in Canva", "Report file"
            </p>
          </div>

          {/* Tools Needed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tools Needed
            </label>
            <input
              type="text"
              value={formData.tools_needed}
              onChange={(e) => setFormData({ ...formData, tools_needed: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Brand24, Instagram, Canva, YouTube"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated list of tools/platforms needed
            </p>
          </div>

          {/* Estimated Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.estimated_duration_minutes}
              onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 30"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              How long does this step typically take?
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {step ? 'Save Changes' : 'Add Step'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkflowStepForm;
