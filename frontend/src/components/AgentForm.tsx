import { useState, useEffect, FormEvent } from 'react';
import { Agent, Console } from '../types';
import { agentsApi, consolesApi, orchestrationApi } from '../api/api';

interface AgentFormProps {
  agent?: Agent;
  onSuccess: () => void;
  onCancel: () => void;
}

function AgentForm({ agent, onSuccess, onCancel }: AgentFormProps) {
  const [formData, setFormData] = useState({
    name: agent?.name || '',
    role: agent?.role || '',
    personality: agent?.personality || '',
    skills: agent?.skills?.join(', ') || '',
    prompt: agent?.prompt || '',
    status: agent?.status || 'idle',
    console_id: agent?.console_id || '',
    model: agent?.model || 'anthropic/claude-sonnet-4-5',
    preferred_runtime: agent?.preferred_runtime || 'msi'
  });
  const [consoles, setConsoles] = useState<Console[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConsoles();
  }, []);

  const loadConsoles = async () => {
    try {
      const res = await consolesApi.getAll();
      setConsoles(res.data.consoles);
    } catch (err) {
      console.error('Failed to load consoles:', err);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
        console_id: formData.console_id || null
      };

      if (agent) {
        await agentsApi.update(agent.id, payload);
      } else {
        await agentsApi.create(payload);
      }
      onSuccess();
    } catch (err) {
      setError('Failed to save agent');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Agent Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
          placeholder="e.g., Marketing Agent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role *
        </label>
        <input
          type="text"
          required
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
          placeholder="e.g., Marketing & Growth"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Personality
        </label>
        <textarea
          rows={2}
          value={formData.personality}
          onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
          placeholder="Brief personality description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Skills (comma-separated)
        </label>
        <input
          type="text"
          value={formData.skills}
          onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
          placeholder="e.g., social media, analytics, automation"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Main Prompt / Instructions
        </label>
        <textarea
          rows={6}
          value={formData.prompt}
          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue font-mono text-sm"
          placeholder="Enter the agent's main instructions, goals, and workflow..."
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
          >
            <option value="idle">Idle</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Runtime 🖥️
          </label>
          <select
            value={formData.preferred_runtime}
            onChange={(e) => setFormData({ ...formData, preferred_runtime: e.target.value as 'msi' | 'beelink' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
          >
            <option value="msi">MSI (Primary Gateway)</option>
            <option value="beelink">Beelink (Compute Node)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Where this agent runs tasks by default
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assign to Console
          </label>
          <select
            value={formData.console_id}
            onChange={(e) => setFormData({ ...formData, console_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
          >
            <option value="">No console</option>
            {consoles.map((console) => (
              <option key={console.id} value={console.id}>
                {console.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          AI Model
        </label>
        <select
          value={formData.model}
          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
        >
          <option value="anthropic/claude-sonnet-4-5">Claude Sonnet 4.5 (Best quality)</option>
          <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
          <option value="anthropic/claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
          <option value="anthropic/claude-3-5-haiku-20241022">Claude 3.5 Haiku (Faster, cheaper)</option>
          <option value="openai/gpt-4o">GPT-4o</option>
          <option value="openai/gpt-4o-mini">GPT-4o Mini (Cheaper)</option>
          <option value="google/gemini-flash-1.5">Gemini Flash 1.5 (Cheapest)</option>
          <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Affects cost and performance. Cheaper models work well for simple tasks.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : agent ? 'Update Agent' : 'Create Agent'}
        </button>
      </div>
    </form>
  );
}

export default AgentForm;
