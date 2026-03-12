import { useState, useEffect } from 'react';
import { Users, TrendingUp, CheckCircle, Clock, Zap, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { api } from '../../api/api';

interface PipelineLead {
  id: number;
  username: string;
  platform: string;
  post_text: string;
  post_url: string;
  stage1_status?: string;
  stage2_score?: number;
  stage2_pain_category?: string;
  stage2_pain_summary?: string;
  stage3_landing_url?: string;
  stage3_reasoning?: string;
  stage4_reply_text?: string;
  stage5_status?: string;
  stage6_short_link?: string;
  stage6_final_reply?: string;
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

const LANDING_PAGES = [
  { url: 'https://trade.reallifetrading.com/consistencycourse', label: 'Consistency Course (Losing Money)' },
  { url: 'https://trade.reallifetrading.com/200challenge', label: '$200 Strategy Challenge (Small Account)' },
  { url: 'https://trade.reallifetrading.com/optionsbasics', label: 'Options Basics (Beginner)' },
  { url: 'https://trade.reallifetrading.com/creditspreads', label: 'Credit Spreads Guide (Strategy)' },
  { url: 'https://trade.reallifetrading.com/trial', label: 'Free Trial (General Interest)' },
  { url: 'https://trade.reallifetrading.com/income', label: 'Supplemental Income (Career Focus)' },
];

function LeadPipelineSection() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [editedReply, setEditedReply] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLandingPage, setSelectedLandingPage] = useState<string>('');
  const [trainingFeedback, setTrainingFeedback] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState(false);

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

  const getStageColor = (stage: string | undefined) => {
    if (!stage) return 'gray';
    const stageObj = STAGES.find(s => s.id === stage);
    return stageObj?.color || 'gray';
  };

  const formatTime = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const handleCopyToClipboard = async () => {
    if (!selectedLead) return;
    
    const finalReply = (editedReply || selectedLead.stage4_reply_text || '')
      .replace('[LINK]', selectedLandingPage || selectedLead.stage3_landing_url || '');
    
    try {
      await navigator.clipboard.writeText(finalReply);
      
      // Mark as approved but not sent
      await api.post(`/social-leads/${selectedLead.id}/approve`, {
        approved_response: finalReply,
        reviewed_by: 'Tony'
      });
      
      alert('✅ Reply copied to clipboard! Paste it manually on the platform.');
      setSelectedLead(null);
      loadLeads();
    } catch (error) {
      console.error('Failed to copy reply:', error);
      alert('Failed to copy reply');
    }
  };

  const handleAutoSend = async () => {
    if (!selectedLead) return;
    
    if (!confirm(`Auto-send this reply to ${selectedLead.platform}?\n\nThis will post the reply automatically using the agent.`)) {
      return;
    }
    
    try {
      setSaving(true);
      
      const finalReply = (editedReply || selectedLead.stage4_reply_text || '')
        .replace('[LINK]', selectedLandingPage || selectedLead.stage3_landing_url || '');
      
      // Approve and mark for auto-send
      await api.post(`/social-leads/${selectedLead.id}/approve`, {
        approved_response: finalReply,
        reviewed_by: 'Tony',
        auto_send: true
      });
      
      // TODO: Trigger actual posting to platform
      // This would call the social-pipeline agent to post the reply
      
      alert('✅ Reply approved for auto-send! The agent will post it shortly.');
      setSelectedLead(null);
      loadLeads();
    } catch (error) {
      console.error('Failed to auto-send:', error);
      alert('Failed to auto-send reply');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedLead) return;
    
    if (!confirm('Reject this lead? This will archive it.')) return;
    
    try {
      setSaving(true);
      await api.post(`/social-leads/${selectedLead.id}/archive`, {
        reason: 'Rejected by Tony'
      });
      alert('Lead rejected and archived.');
      setSelectedLead(null);
      loadLeads();
    } catch (error) {
      console.error('Failed to reject lead:', error);
      alert('Failed to reject lead');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReply = async () => {
    if (!selectedLead) return;
    
    try {
      setSaving(true);
      await api.patch(`/social-leads/${selectedLead.id}`, {
        draft_response: editedReply
      });
      setSelectedLead({ ...selectedLead, stage4_reply_text: editedReply });
      setIsEditing(false);
      alert('Reply updated!');
    } catch (error) {
      console.error('Failed to save reply:', error);
      alert('Failed to save reply');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateReply = async () => {
    if (!selectedLead || !trainingFeedback.trim()) {
      alert('Please provide training feedback first');
      return;
    }

    try {
      setIsRegenerating(true);

      const response = await api.post(`/social-leads/${selectedLead.id}/regenerate-reply`, {
        feedback: trainingFeedback,
        landing_page: selectedLandingPage || selectedLead.stage3_landing_url,
        original_reply: selectedLead.stage4_reply_text,
        post_text: selectedLead.post_text,
        pain_category: selectedLead.stage2_pain_category
      });

      const newReply = response.data.reply;
      setEditedReply(newReply);
      setSelectedLead({ ...selectedLead, stage4_reply_text: newReply });
      setIsEditing(true); // Enable edit mode to show new draft
      alert('Reply regenerated! Review and approve or edit as needed.');
      setTrainingFeedback(''); // Clear feedback after use

    } catch (error) {
      console.error('Failed to regenerate reply:', error);
      alert('Failed to regenerate reply');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleLandingPageChange = async (newUrl: string) => {
    setSelectedLandingPage(newUrl);
    
    if (selectedLead) {
      try {
        await api.patch(`/social-leads/${selectedLead.id}`, {
          landing_url: newUrl
        });
      } catch (error) {
        console.error('Failed to update landing page:', error);
      }
    }
  };

  const openLeadDetails = (lead: PipelineLead) => {
    setSelectedLead(lead);
    setEditedReply(lead.stage4_reply_text || '');
    setSelectedLandingPage(lead.stage3_landing_url || '');
    setTrainingFeedback('');
    setIsEditing(false);
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
                      <span className="font-semibold text-gray-900">{lead.username}</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {lead.platform}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium bg-${getStageColor(lead.stage1_status)}-100 text-${getStageColor(lead.stage1_status)}-700`}>
                        {STAGES.find(s => s.id === lead.stage1_status)?.name || lead.stage1_status}
                      </span>
                      <span className="text-xs text-gray-500">{formatTime(lead.created_at)}</span>
                    </div>

                    {/* Original Content */}
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">{lead.post_text}</p>

                    {/* Stage-specific data */}
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      {lead.stage2_score && (
                        <span className="flex items-center gap-1">
                          <TrendingUp size={12} />
                          Score: {lead.stage2_score}
                        </span>
                      )}
                      {lead.stage2_pain_category && (
                        <span>Pain: {lead.stage2_pain_category}</span>
                      )}
                      {lead.stage3_landing_url && (
                        <span>Landing: {lead.stage3_landing_url}</span>
                      )}
                      {lead.stage6_short_link && (
                        <a
                          href={lead.stage6_short_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <LinkIcon size={12} />
                          {lead.stage6_short_link}
                        </a>
                      )}
                    </div>

                    {/* Reply Draft (if exists) */}
                    {lead.stage4_reply_text && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                        <strong className="text-blue-900">Draft Reply:</strong>
                        <p className="text-blue-800 mt-1">{lead.stage4_reply_text}</p>
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
                    <button 
                      onClick={() => openLeadDetails(lead)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
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

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Lead Details</h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Platform & User */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Source</h3>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                    {selectedLead.platform}
                  </span>
                  <span className="font-medium text-gray-900">{selectedLead.username}</span>
                  <span className="text-sm text-gray-500">{formatTime(selectedLead.created_at)}</span>
                </div>
              </div>

              {/* Original Content */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Original Post</h3>
                <p className="text-gray-800 bg-gray-50 p-4 rounded border border-gray-200">
                  {selectedLead.post_text}
                </p>
              </div>

              {/* Stage Data */}
              {selectedLead.stage2_score && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Score</h3>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-purple-600" />
                    <span className="text-2xl font-bold text-gray-900">{selectedLead.stage2_score}</span>
                    <span className="text-sm text-gray-600">/ 100</span>
                  </div>
                </div>
              )}

              {selectedLead.stage2_pain_category && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Pain Category</h3>
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded font-medium">
                    {selectedLead.stage2_pain_category}
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Landing Page</h3>
                <select
                  value={selectedLandingPage}
                  onChange={(e) => handleLandingPageChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {LANDING_PAGES.map((page) => (
                    <option key={page.url} value={page.url}>
                      {page.label}
                    </option>
                  ))}
                </select>
                {selectedLandingPage && (
                  <a
                    href={selectedLandingPage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                  >
                    Open: {selectedLandingPage}
                  </a>
                )}
              </div>

              {selectedLead.stage4_reply_text && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Draft Reply</h3>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveReply}
                          disabled={saving}
                          className="text-sm text-green-600 hover:underline disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setIsEditing(false); setEditedReply(selectedLead.stage4_reply_text || ''); }}
                          className="text-sm text-gray-600 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  {!isEditing ? (
                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                      <p className="text-blue-900 whitespace-pre-wrap">{selectedLead.stage4_reply_text}</p>
                    </div>
                  ) : (
                    <textarea
                      value={editedReply}
                      onChange={(e) => setEditedReply(e.target.value)}
                      className="w-full px-4 py-3 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={6}
                    />
                  )}
                </div>
              )}

              {/* Training Feedback & Regenerate */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  🎓 Train the AI
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Tell the AI what it got right or wrong. Be specific about tone, length, or content issues. The AI will regenerate the reply based on your feedback.
                </p>
                <textarea
                  value={trainingFeedback}
                  onChange={(e) => setTrainingFeedback(e.target.value)}
                  placeholder="Example: 'Too formal. Make it more casual and friendly. Don't mention free trial in first message - just focus on the problem. Shorten to 3 sentences.'"
                  className="w-full px-3 py-2 border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                  rows={3}
                />
                <button
                  onClick={handleRegenerateReply}
                  disabled={isRegenerating || !trainingFeedback.trim()}
                  className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {isRegenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Regenerating Reply...
                    </>
                  ) : (
                    <>
                      ✨ Regenerate Reply with Feedback
                    </>
                  )}
                </button>
              </div>

              {selectedLead.stage6_short_link && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Tracking Link</h3>
                  <a
                    href={selectedLead.stage6_short_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <LinkIcon size={16} />
                    {selectedLead.stage6_short_link}
                  </a>
                </div>
              )}

              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Stage</h3>
                <span className={`px-3 py-1 rounded font-medium bg-${getStageColor(selectedLead.stage1_status)}-100 text-${getStageColor(selectedLead.stage1_status)}-700`}>
                  {STAGES.find(s => s.id === selectedLead.stage1_status)?.name || selectedLead.stage1_status}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
              <button
                onClick={handleReject}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Rejecting...' : 'Reject'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  📋 Copy to Clipboard
                </button>
                <button
                  onClick={handleAutoSend}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? '⏳ Sending...' : '🚀 Auto-Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadPipelineSection;
