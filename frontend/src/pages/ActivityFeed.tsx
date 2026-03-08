import { useEffect, useState } from 'react';
import { activityApi } from '../api/api';
import { Activity } from '../types';
import { format } from 'date-fns';

function ActivityFeed() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      setLoading(true);
      const res = await activityApi.getAll({ limit: 100 });
      setActivity(res.data.activity);
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_created':
      case 'project_updated':
        return '📁';
      case 'task_created':
      case 'task_updated':
        return '✅';
      case 'task_completed':
        return '🎉';
      case 'blocker_added':
        return '🚧';
      case 'blocker_resolved':
        return '✓';
      case 'file_changed':
        return '📝';
      default:
        return '•';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rlt-blue"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {activity.map((act) => (
              <li key={act.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getActivityIcon(act.activity_type)}</span>
                  <div className="flex-1">
                    <p className="text-gray-900">{act.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{format(new Date(act.created_at), 'MMM d, yyyy h:mm a')}</span>
                      {act.project_name && <span>• {act.project_name}</span>}
                      {act.agent_name && <span>• {act.agent_name}</span>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
