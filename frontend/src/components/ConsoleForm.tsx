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
    capabilities: consoleData?.capabilities?.join(', ') || '',
    vnc_enabled: consoleData?.vnc_enabled || false,
    vnc_host: consoleData?.vnc_host || '',
    vnc_port: consoleData?.vnc_port || 5900,
    vnc_password_encrypted: consoleData?.vnc_password_encrypted || ''
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

      {/* VNC Remote Desktop Configuration */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-semibold text-gray-900 mb-3">Remote Desktop (VNC)</h4>
        
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="vnc_enabled"
            checked={formData.vnc_enabled}
            onChange={(e) => setFormData({ ...formData, vnc_enabled: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="vnc_enabled" className="text-sm font-medium text-gray-700">
            Enable remote desktop access via VNC
          </label>
        </div>

        {formData.vnc_enabled && (
          <div className="space-y-3 ml-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VNC Host (IP or hostname) *
              </label>
              <input
                type="text"
                required={formData.vnc_enabled}
                value={formData.vnc_host}
                onChange={(e) => setFormData({ ...formData, vnc_host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
                placeholder="192.168.1.100 or vnc.example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VNC Port
              </label>
              <input
                type="number"
                value={formData.vnc_port}
                onChange={(e) => setFormData({ ...formData, vnc_port: parseInt(e.target.value) || 5900 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
                placeholder="5900 (default)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VNC Password (optional)
              </label>
              <input
                type="password"
                value={formData.vnc_password_encrypted}
                onChange={(e) => setFormData({ ...formData, vnc_password_encrypted: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rlt-blue"
                placeholder="Leave blank if no password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Password will be encrypted before storage
              </p>
            </div>
          </div>
        )}
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
