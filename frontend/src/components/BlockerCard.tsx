import { Blocker } from '../types';
import { AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BlockerCardProps {
  blocker: Blocker;
  onResolve?: (id: number) => void;
}

function BlockerCard({ blocker, onResolve }: BlockerCardProps) {
  const typeColors = {
    'waiting_on_tony': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'external_api': 'bg-blue-100 text-blue-800 border-blue-200',
    'decision_needed': 'bg-purple-100 text-purple-800 border-purple-200',
    'dependency': 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const typeLabels = {
    'waiting_on_tony': 'Waiting on Tony',
    'external_api': 'External API',
    'decision_needed': 'Decision Needed',
    'dependency': 'Dependency',
  };

  return (
    <div className={`rounded-lg p-4 border-l-4 ${typeColors[blocker.blocker_type]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <AlertCircle className="text-gray-500 mt-0.5" size={18} />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{blocker.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{blocker.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs font-medium px-2 py-1 rounded bg-white border border-gray-200">
                {typeLabels[blocker.blocker_type]}
              </span>
              {blocker.project_name && (
                <span className="text-xs text-gray-500">{blocker.project_name}</span>
              )}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock size={12} />
                <span>{formatDistanceToNow(new Date(blocker.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>
        {onResolve && (
          <button
            onClick={() => onResolve(blocker.id)}
            className="px-3 py-1 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}

export default BlockerCard;
