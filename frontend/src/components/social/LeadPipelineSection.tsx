import { useState, useEffect } from 'react';
import { Users, TrendingUp, CheckCircle, Clock, Zap, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { api } from '../../api/api';

interface PipelineLead {
  id: number;
  user: string;
  platform: string;
  content: string;
  score?: number;
  pain_type?: string;
  landing_page?: string;
  reply_draft?: string;
  bitly_link?: string;
  current_stage: string;
  status: string;
  created_at: string;
}

const STAGES = [
  { id: 'scanner', name: 'Scanner', icon: Users, color: 'blue' },
  { id: 'scorer', name: 'Scorer', icon: TrendingUp, color: 'purple' },
  { id: 'router', name: 'Router', icon: Zap, color: 'yellow' },
  { id: 'writer', name: 'Writer', icon: CheckCircle, color: 'green' },
  { id: 'dedup', name: 'Dedup', icon: AlertCircle, color: 'orange' },
  { id: 'tracker', name: 'Tracker', icon: LinkIcon, color: 'pink' }
];

function LeadPipelineSection() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string>('all');

  useEffect(() => {
    loadLeads();
    const interval = setInterval(loadLeads, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [selectedStage]);

  const loadLeads = async () => {
    try {
      console.log('Loading leads for stage:', selectedStage);
      const response = await api.get(`/social-leads?stage=${selectedStage}`);
      console.log('Response:', response.data);
      setLeads(response.data.leads || []);
      setStats(response.data.stats || null);
      console.log('Stats loaded:', response.data.stats);
    } catch (error) {
      console.error('Failed to load leads:', error);
      // Set empty stats on error so at least we show zeros
      setStats({
        scanner: 0,
        scorer: 0,
        router: 0,
        writer: 0,
        dedup: 0,
        tracker: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: string) => {
    const stageObj = STAGES.find(s => s.id === stage);
    return stageObj?.color || 'gray';
  };

  const formatTime = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {STAGES.map(stage => {
          const Icon = stage.icon;
          const count = stats?.[stage.id] || 0;

          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedStage === stage.id
                  ? `border-${stage.color}-500 bg-${stage.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={20} className={`text-${stage.color}-600`} />
                <span className="text-2xl font-bold text-gray-900">{count}</span>
              </div>
              <div className="text-sm font-medium text-gray-700">{stage.name}</div>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center gap-4">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Stages</option>
            {STAGES.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            ))}
          </select>

          <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="all">All Platforms</option>
            <option value="reddit">Reddit</option>
            <option value="twitter">Twitter</option>
            <option value="youtube">YouTube Comments</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock size={14} />
          <span>Auto-refresh: 10s</span>
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rlt-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pipeline...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Leads in Pipeline</h3>
            <p className="text-sm">
              {selectedStage === 'all'
                ? 'The lead pipeline is empty. Agents will populate this as they process Brand24 alerts.'
                : `No leads currently at ${STAGES.find(s => s.id === selectedStage)?.name} stage.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {leads.map(lead => (
              <li key={lead.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* User & Platform */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{lead.user}</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {lead.platform}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium bg-${getStageColor(lead.current_stage)}-100 text-${getStageColor(lead.current_stage)}-700`}>
                        {STAGES.find(s => s.id === lead.current_stage)?.name || lead.current_stage}
                      </span>
                      <span className="text-xs text-gray-500">{formatTime(lead.created_at)}</span>
                    </div>

                    {/* Original Content */}
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">{lead.content}</p>

                    {/* Stage-specific data */}
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      {lead.score && (
                        <span className="flex items-center gap-1">
                          <TrendingUp size={12} />
                          Score: {lead.score}
                        </span>
                      )}
                      {lead.pain_type && (
                        <span>Pain: {lead.pain_type}</span>
                      )}
                      {lead.landing_page && (
                        <span>Landing: {lead.landing_page}</span>
                      )}
                      {lead.bitly_link && (
                        <a
                          href={lead.bitly_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <LinkIcon size={12} />
                          {lead.bitly_link}
                        </a>
                      )}
                    </div>

                    {/* Reply Draft (if exists) */}
                    {lead.reply_draft && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                        <strong className="text-blue-900">Draft Reply:</strong>
                        <p className="text-blue-800 mt-1">{lead.reply_draft}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {lead.status === 'ready' && (
                      <button className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200">
                        Approve
                      </button>
                    )}
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
                      Details
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pipeline Flow Visualization */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Flow</h3>
        <div className="flex items-center justify-between">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const count = stats?.[stage.id] || 0;

            return (
              <div key={stage.id} className="flex items-center">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full bg-${stage.color}-100 border-2 border-${stage.color}-500 flex items-center justify-center mb-2`}>
                    <Icon className={`text-${stage.color}-600`} size={24} />
                  </div>
                  <div className="text-xs font-medium text-gray-700">{stage.name}</div>
                  <div className="text-xl font-bold text-gray-900">{count}</div>
                </div>

                {index < STAGES.length - 1 && (
                  <div className="flex-1 mx-2">
                    <div className="h-1 bg-gray-200 relative">
                      <div className="absolute inset-0 bg-green-500" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default LeadPipelineSection;
