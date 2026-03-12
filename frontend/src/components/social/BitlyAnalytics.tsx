import { useState, useEffect } from 'react';
import { TrendingUp, Link as LinkIcon, MousePointer, BarChart3, RefreshCw } from 'lucide-react';
import { api } from '../../api/api';

interface BitlyStats {
  clicks_today: number;
  clicks_this_week: number;
  total_links: number;
  active_links: number;
}

interface LinkStat {
  link: string;
  clicks_today: number;
  clicks_week: number;
}

interface DailyClick {
  date: string;
  clicks: number;
}

function BitlyAnalytics() {
  const [stats, setStats] = useState<BitlyStats | null>(null);
  const [topLinks, setTopLinks] = useState<LinkStat[]>([]);
  const [trends, setTrends] = useState<DailyClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
    // Refresh every 5 minutes
    const interval = setInterval(loadAnalytics, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      setRefreshing(true);

      // Load summary
      const summaryRes = await api.get('/bitly-analytics/summary');
      if (summaryRes.data.success) {
        setStats(summaryRes.data.stats);
        setTopLinks(summaryRes.data.top_links || []);
      }

      // Load trends
      const trendsRes = await api.get('/bitly-analytics/trends');
      if (trendsRes.data.success) {
        setTrends(trendsRes.data.daily_clicks || []);
      }

    } catch (error) {
      console.error('Failed to load Bitly analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rlt-blue mx-auto mb-4"></div>
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-12 text-center text-gray-500">
        <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Unavailable</h3>
        <p className="text-sm">
          Bitly analytics are not configured. Add BITLY_ACCESS_TOKEN to your environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Bitly Analytics</h2>
        <button
          onClick={loadAnalytics}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-rlt-blue text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <MousePointer className="text-green-600" size={24} />
            <span className="text-xs text-gray-500">Today</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.clicks_today}</div>
          <div className="text-sm text-gray-600 mt-1">Clicks Today</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="text-blue-600" size={24} />
            <span className="text-xs text-gray-500">7 Days</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.clicks_this_week}</div>
          <div className="text-sm text-gray-600 mt-1">Clicks This Week</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <LinkIcon className="text-purple-600" size={24} />
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.total_links}</div>
          <div className="text-sm text-gray-600 mt-1">Total Links</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="text-orange-600" size={24} />
            <span className="text-xs text-gray-500">Active</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.active_links}</div>
          <div className="text-sm text-gray-600 mt-1">Active Links</div>
        </div>
      </div>

      {/* Top Performing Links */}
      {topLinks.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Links</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Today</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">This Week</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topLinks.map((link, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <a
                        href={link.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {link.link}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">
                        <MousePointer size={12} />
                        {link.clicks_today}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                        <TrendingUp size={12} />
                        {link.clicks_week}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={link.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Open →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trends Chart (Simple Bar Chart) */}
      {trends.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Click Trends (Last 30 Days)</h3>
          <div className="space-y-2">
            {trends.slice(-14).map((day, index) => {
              const maxClicks = Math.max(...trends.map(d => d.clicks));
              const barWidth = maxClicks > 0 ? (day.clicks / maxClicks) * 100 : 0;

              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-20 text-xs text-gray-600">{formatDate(day.date)}</div>
                  <div className="flex-1 bg-gray-100 rounded h-8 relative overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded flex items-center justify-end pr-2 transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    >
                      {day.clicks > 0 && (
                        <span className="text-xs text-white font-medium">{day.clicks}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Data State */}
      {topLinks.length === 0 && trends.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 border border-gray-200 text-center">
          <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Click Data Yet</h3>
          <p className="text-sm text-gray-600">
            Bitly links haven't received any clicks yet. Share your links to start seeing analytics!
          </p>
        </div>
      )}
    </div>
  );
}

export default BitlyAnalytics;
