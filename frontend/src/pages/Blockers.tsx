import { useEffect, useState } from 'react';
import { blockersApi } from '../api/api';
import { Blocker } from '../types';
import BlockerCard from '../components/BlockerCard';

function Blockers() {
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlockers();
  }, []);

  const loadBlockers = async () => {
    try {
      setLoading(true);
      const res = await blockersApi.getAll({ status: 'open' });
      setBlockers(res.data.blockers);
    } catch (error) {
      console.error('Failed to load blockers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await blockersApi.resolve(id);
      loadBlockers(); // Refresh
    } catch (error) {
      console.error('Failed to resolve blocker:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Open Blockers</h1>
        <span className="text-sm text-gray-600">{blockers.length} items needing attention</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rlt-blue"></div>
        </div>
      ) : blockers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No open blockers! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blockers.map((blocker) => (
            <BlockerCard
              key={blocker.id}
              blocker={blocker}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Blockers;
