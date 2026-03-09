import { useState, FormEvent } from 'react';
import { Console } from '../types';
import { consolesApi } from '../api/api';

interface ConsoleFormProps {
  consoleData?: Console;
  onSuccess: () => void;
  onCancel: () => void;
}

function ConsoleForm({ consoleData, onSuccess, onCancel }: ConsoleFormProps) {
  const [formData, setFormData] = useState({
    name: consoleData?.name || '',
    type: consoleData?.type || 'openclaw',
    description: consoleData?.description || '',
    status: consoleData?.status || 'offline',
    capabilities: consoleData?.capabilities?.join(', ') || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        capabilities: formData.capabilities.split(',').map(s => s.trim()).filter(s => s)
      };

      if (consoleData) {
        await consolesApi.update(consoleData.id, payload);
      } else {
        await consolesApi.create(payload);
      }
      onSuccess();
    } catch (err) {
      setError('Failed to save console');
      // eslint-disable-next-line no-console
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
          Console Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
          placeholder="e.g., Main OpenClaw Instance"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type *
        </label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
        >
          <option value="openclaw">OpenClaw</option>
          <option value="acp">ACP</option>
          <option value="custom">Custom</option>
          <option value="cloud">Cloud Instance</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          rows={2}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
          placeholder="Brief description of this console/environment"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Capabilities (comma-separated)
        </label>
        <input
          type="text"
          value={formData.capabilities}
          onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
          placeholder="e.g., api calls, file access, browser control"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
        >
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="error">Error</option>
        </select>
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
          {loading ? 'Saving...' : consoleData ? 'Update Console' : 'Create Console'}
        </button>
      </div>
    </form>
  );
}

export default ConsoleForm;
