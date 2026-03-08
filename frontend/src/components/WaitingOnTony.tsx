import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface WaitingItem {
  id: string;
  title: string;
  project: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  addedDate: string;
  eta?: string;
}

function WaitingOnTony() {
  const [items, setItems] = useState<WaitingItem[]>([
    {
      id: 'tradier-api',
      title: 'Tradier API Key',
      project: 'Credit Spread App',
      description: 'Need API key to enable live market scanning and options data',
      priority: 'high',
      addedDate: '2026-03-07',
      eta: 'Monday, March 10'
    },
    {
      id: 'ubuntu-install',
      title: 'Ubuntu Server Installation',
      project: 'New Agent Nodes',
      description: 'Install Ubuntu on NUC14, MS-S1, SER5 when they arrive',
      priority: 'medium',
      addedDate: '2026-03-07',
      eta: 'Sunday (first machine)'
    }
  ]);

  const priorityConfig = {
    high: {
      color: 'bg-red-50 border-red-200',
      badge: 'bg-red-100 text-red-800',
      icon: 'text-red-500'
    },
    medium: {
      color: 'bg-yellow-50 border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: 'text-yellow-500'
    },
    low: {
      color: 'bg-blue-50 border-blue-200',
      badge: 'bg-blue-100 text-blue-800',
      icon: 'text-blue-500'
    }
  };

  const handleMarkComplete = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    // TODO: Save to backend
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-2 border-orange-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <AlertCircle className="text-orange-500" size={24} />
          Waiting on Tony ({items.length})
        </h2>
        <a 
          href="/blockers" 
          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          View All →
        </a>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const config = priorityConfig[item.priority];
          return (
            <div
              key={item.id}
              className={`rounded-lg p-4 border-l-4 ${config.color}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.badge}`}>
                      {item.priority}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="font-medium">{item.project}</span>
                    {item.eta && (
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>ETA: {item.eta}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleMarkComplete(item.id)}
                  className="ml-4 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors flex items-center gap-1"
                >
                  <CheckCircle size={14} />
                  Done
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-orange-200">
        <p className="text-xs text-gray-600">
          💡 <strong>Tip:</strong> High priority items get daily reminders, medium every 2-3 days.
          Mark as "Done" when complete to remove from dashboard.
        </p>
      </div>
    </div>
  );
}

export default WaitingOnTony;
