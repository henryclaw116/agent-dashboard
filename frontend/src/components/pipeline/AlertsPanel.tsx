import { AlertTriangle, CheckCircle, XCircle, Info, Clock } from 'lucide-react';
import { api } from '../../api/api';

interface Alert {
  id: number;
  agent_id?: number;
  agent_name?: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: string;
  created_at: string;
  notified: boolean;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onRefresh: () => void;
}

function AlertsPanel({ alerts, onRefresh }: AlertsPanelProps) {
  const getSeverityConfig = (severity: string) => {
    const config: { [key: string]: { icon: any; color: string; label: string } } = {
      critical: { icon: AlertTriangle, color: 'text-red-600 bg-red-50 border-red-200', label: 'Critical' },
      high: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'High' },
      medium: { icon: Info, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Medium' },
      low: { icon: Info, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Low' }
    };

    return config[severity] || config.low;
  };

  const handleAcknowledge = async (alertId: number) => {
    try {
      await api.put(`/orchestration/alerts/${alertId}/acknowledge`);
      onRefresh();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      alert('Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alertId: number) => {
    const notes = prompt('Resolution notes (optional):');
    if (notes === null) return; // Cancelled

    try {
      await api.put(`/orchestration/alerts/${alertId}/resolve`, {
        resolution_notes: notes || 'Resolved by user'
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      alert('Failed to resolve alert');
    }
  };

  const timeSince = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Group alerts by severity
  const groupedAlerts = alerts.reduce((acc, alert) => {
    if (!acc[alert.severity]) acc[alert.severity] = [];
    acc[alert.severity].push(alert);
    return acc;
  }, {} as { [key: string]: Alert[] });

  const severityOrder = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
            <p className="text-sm text-gray-600 mt-1">
              {alerts.length} unresolved {alerts.length === 1 ? 'alert' : 'alerts'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {severityOrder.map(severity => {
              const count = groupedAlerts[severity]?.length || 0;
              const { color } = getSeverityConfig(severity);

              return count > 0 ? (
                <div key={severity} className={`px-3 py-1 rounded ${color} font-medium`}>
                  {count} {severity}
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
          <p className="text-gray-600">No active alerts. Your agents are running smoothly.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {severityOrder.map(severity => {
            const severityAlerts = groupedAlerts[severity] || [];
            if (severityAlerts.length === 0) return null;

            const { icon: SeverityIcon, color } = getSeverityConfig(severity);

            return (
              <div key={severity} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <div className={`px-4 py-2 border-b ${color} font-semibold text-sm flex items-center gap-2`}>
                  <SeverityIcon size={16} />
                  {severity.toUpperCase()} ({severityAlerts.length})
                </div>

                <ul className="divide-y divide-gray-200">
                  {severityAlerts.map(alert => (
                    <li key={alert.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                            {alert.agent_name && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                {alert.agent_name}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={12} />
                              {timeSince(alert.created_at)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-700 mb-2">{alert.message}</p>

                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              {alert.alert_type.replace(/_/g, ' ')}
                            </span>
                            {alert.notified && (
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle size={12} />
                                Notified
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {alert.status === 'new' && (
                            <button
                              onClick={() => handleAcknowledge(alert.id)}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                            >
                              Acknowledge
                            </button>
                          )}
                          <button
                            onClick={() => handleResolve(alert.id)}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AlertsPanel;
