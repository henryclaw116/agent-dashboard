// Force rebuild: 2026-03-14 14:14:13 - Default to ready-to-send
import { useState, useEffect } from 'react';
import { Users, TrendingUp, Search, MessageSquare, CheckCircle, Clock, Zap, AlertCircle, Link as LinkIcon } from 'lucide-react';
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
  sent_at?: string;
  reply_url?: string;
  reply_screenshot_url?: string;
}

const STAGES = [
  { id: 'scanner', name: 'Scanner', icon: Search, color: 'blue' },
  { id: 'scorer', name: 'Scorer', icon: TrendingUp, color: 'purple' },
  { id: 'router', name: 'Router', icon: Zap, color: 'yellow' },
  { id: 'writer', name: 'Writer', icon: MessageSquare, color: 'green' },
  { id: 'dedup', name: 'Dedup', icon: AlertCircle, color: 'orange' },
  { id: 'tracker', name: 'Tracker', icon: LinkIcon, color: 'pink' },
  { id: 'ready', name: 'Ready to Send', icon: CheckCircle, color: 'emerald' },
  { id: 'sent', name: 'Sent', icon: CheckCircle, color: 'green' }
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
  const [selectedStage, setSelectedStage] = useState<string>('ready-to-send');
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [editedReply, setEditedReply] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLandingPage, setSelectedLandingPage] = useState<string>('');
  const [trainingFeedback, setTrainingFeedback] = useState<string>('');
  const [leadQualityFeedback, setLeadQualityFeedback] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'all'>('all');
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState(false);

  useEffect(() => {
    loadLeads();
    setSelectedLeadIds([]); // Clear selections when stage changes
    const interval = setInterval(loadLeads, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [selectedStage, timeRange]);

  useEffect(() => {
    setSelectedLeadIds([]); // Clear selections when switching between Active/Archive
  }, [showArchive]);

  // Load auto-send setting on mount
  useEffect(() => {
    const loadAutoSendSetting = async () => {
      try {
        const response = await api.get('/settings/auto_send_enabled');
        setAutoSendEnabled(response.data.value === 'true');
      } catch (error) {
        console.error('Failed to load auto-send setting:', error);
      }
    };
    loadAutoSendSetting();
  }, []);

  const loadLeads = async () => {
    try {
      console.log('Loading leads for stage:', selectedStage, 'timeRange:', timeRange);
      const response = await api.get(`/social-leads?stage=${selectedStage}&timeRange=${timeRange}`);
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
        tracker: 0,
        sent: 0,
        ready: 0
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
      // Copy reply to clipboard
      await navigator.clipboard.writeText(finalReply);
      
      // Open the original post in a new tab
      if (selectedLead.post_url) {
        window.open(selectedLead.post_url, '_blank');
      }
      
      // Mark as approved but not sent
      await api.post(`/social-leads/${selectedLead.id}/approve`, {
        approved_response: finalReply,
        reviewed_by: 'Tony'
      });
      
      // Prompt to mark as sent after posting
      const markAsSent = confirm('✅ Reply copied and tab opened!\n\nAfter you paste and post your reply, click OK to mark it as sent.');
      
      if (markAsSent) {
        const replyUrl = prompt('Enter the URL of your posted reply (optional):');
        await api.patch(`/social-leads/${selectedLead.id}`, {
          status: 'SENT',
          sent_at: new Date().toISOString(),
          reply_url: replyUrl || selectedLead.post_url
        });
      }
      
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
      
      // Update reply text if edited
      if (editedReply) {
        await api.patch(`/social-leads/${selectedLead.id}`, {
          stage4_reply_text: finalReply
        });
      }
      
      // Mark as READY_TO_SEND and trigger posting
      await api.patch(`/social-leads/${selectedLead.id}`, {
        status: 'READY_TO_SEND'
      });
      
      // Trigger auto-post via backend (which calls MSI webhook)
      await api.post(`/leads/${lead.id}/send`);
      
      alert('? Reply posted! Check MSI for browser automation.');
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
      
      // Immediately remove from current list
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== selectedLead.id));
      
      alert('Lead archived successfully.');
      setSelectedLead(null);
    } catch (error) {
      console.error('Failed to reject lead:', error);
      alert('Failed to reject lead');
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedLead) return;
    
    if (!confirm('Reopen this lead? It will be moved back to active pipeline.')) return;
    
    try {
      setSaving(true);
      
      // Change status from REJECTED back to PENDING
      await api.patch(`/social-leads/${selectedLead.id}`, {
        status: 'PENDING',
        sent_at: null,
        reply_url: null
      });
      
      // Remove from archive list
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== selectedLead.id));
      
      alert('✅ Lead reopened! You can now find it in the Active pipeline.');
      setSelectedLead(null);
      
      // Switch to Active view to show the reopened lead
      setShowArchive(false);
    } catch (error) {
      console.error('Failed to reopen lead:', error);
      alert('Failed to reopen lead');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReply = async () => {
    if (!selectedLead) return;
    
    try {
      setSaving(true);
      await api.patch(`/social-leads/${selectedLead.id}`, {
        stage4_reply_text: editedReply
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
          stage3_landing_url: newUrl
        });
      } catch (error) {
        console.error('Failed to update landing page:', error);
      }
    }
  };

  const handleSubmitLeadQualityFeedback = async () => {
    if (!selectedLead || !leadQualityFeedback.trim()) {
      alert('Please provide lead quality feedback first');
      return;
    }

    try {
      setSubmittingFeedback(true);

      // Submit feedback to train the scoring/routing agents
      await api.post(`/social-leads/${selectedLead.id}/lead-quality-feedback`, {
        feedback: leadQualityFeedback,
        lead_score: selectedLead.stage2_score,
        pain_category: selectedLead.stage2_pain_category,
        selected_landing_page: selectedLandingPage || selectedLead.stage3_landing_url,
        post_text: selectedLead.post_text,
        platform: selectedLead.platform,
        final_status: selectedLead.status
      });

      alert('✅ Lead quality feedback submitted! The scoring and routing agents will learn from this.');
      setLeadQualityFeedback('');
    } catch (error) {
      console.error('Failed to submit lead quality feedback:', error);
      alert('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  
  const handleAutoSendToggle = async (enabled: boolean) => {
    try {
      setLoadingToggle(true);
      await api.put('/settings/auto_send_enabled', {
        value: enabled.toString(),
        updated_by: 'Tony'
      });
      setAutoSendEnabled(enabled);
      
      if (enabled) {
        alert('✅ Auto-send ENABLED!\n\nApproved leads in Tracker stage will automatically be posted without your manual approval.');
      } else {
        alert('🛑 Auto-send DISABLED.\n\nYou must manually click "Auto-Send" to post replies.');
      }
    } catch (error) {
      console.error('Failed to update auto-send setting:', error);
      alert('Failed to update setting');
    } finally {
      setLoadingToggle(false);
    }
  };

  const promoteToScorer = async () => {
    if (!selectedLead) return;
    
    if (!confirm('Approve this lead for scoring?\\n\\nThis will mark it as KEEP and send to the Scorer agent.')) {
      return;
    }
    
    try {
      setSaving(true);
      await api.patch(`/social-leads/${selectedLead.id}`, {
        stage1_status: 'KEEP'
      });
      
      alert('✅ Lead approved! Sent to Scorer agent.');
      setSelectedLead(null);
      loadLeads();
    } catch (error) {
      console.error('Failed to promote lead:', error);
      alert('Failed to promote lead');
    } finally {
      setSaving(false);
    }
  };

  const promoteToRouter = async () => {
    if (!selectedLead) return;
    
    const score = prompt('Enter lead score (0-100):', '75');
    if (!score) return;
    
    const category = prompt('Enter pain category (complexity/time/confidence/cost):', 'complexity');
    if (!category) return;
    
    try {
      setSaving(true);
      await api.patch(`/social-leads/${selectedLead.id}`, {
        stage2_score: parseInt(score),
        stage2_pain_category: category,
        stage2_pain_summary: 'Manually scored by Tony'
      });
      
      alert('✅ Lead scored! Sent to Router agent.');
      setSelectedLead(null);
      loadLeads();
    } catch (error) {
      console.error('Failed to promote lead:', error);
      alert('Failed to promote lead');
    } finally {
      setSaving(false);
    }
  };

  const promoteToWriter = async () => {
    if (!selectedLead) return;
    
    if (!selectedLandingPage) {
      alert('Please select a landing page first');
      return;
    }
    
    if (!confirm(`Send to Writer agent?

Landing page: ${selectedLandingPage}`)) {
      return;
    }
    
    try {
      setSaving(true);
      await api.patch(`/social-leads/${selectedLead.id}`, {
        stage3_landing_url: selectedLandingPage,
        stage3_reasoning: 'Landing page selected by Tony'
      });
      
      alert('✅ Landing page assigned! Sent to Writer agent.');
      setSelectedLead(null);
      loadLeads();
    } catch (error) {
      console.error('Failed to promote lead:', error);
      alert('Failed to promote lead');
    } finally {
      setSaving(false);
    }
  };

  const openLeadDetails = (lead: PipelineLead) => {
    setSelectedLead(lead);
    setEditedReply(lead.stage4_reply_text || '');
    setSelectedLandingPage(lead.stage3_landing_url || '');
    setTrainingFeedback('');
    setLeadQualityFeedback('');
    setIsEditing(false);
  };

  // Bulk selection functions
  const toggleLeadSelection = (leadId: number) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const selectAllLeads = () => {
    const visibleLeads = leads.filter(lead => 
      showArchive ? lead.status === 'REJECTED' : lead.status !== 'REJECTED'
    );
    setSelectedLeadIds(visibleLeads.map(lead => lead.id));
  };

  const deselectAllLeads = () => {
    setSelectedLeadIds([]);
  };

  // Bulk reject
  const bulkReject = async () => {
    if (selectedLeadIds.length === 0) return;
    
    if (!confirm(`Reject ${selectedLeadIds.length} selected leads? This will archive them.`)) return;
    
    try {
      setBulkProcessing(true);
      
      // Reject all selected leads
      await Promise.all(
        selectedLeadIds.map(id => 
          api.post(`/social-leads/${id}/archive`, { reason: 'Bulk rejected by Tony' })
        )
      );
      
      // Remove from current list
      setLeads(prevLeads => prevLeads.filter(lead => !selectedLeadIds.includes(lead.id)));
      setSelectedLeadIds([]);
      
      alert(`${selectedLeadIds.length} leads archived successfully.`);
    } catch (error) {
      console.error('Failed to bulk reject:', error);
      alert('Failed to reject some leads');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk auto-send
  const bulkAutoSend = async () => {
    if (selectedLeadIds.length === 0) return;
    
    if (!confirm(`Auto-send ${selectedLeadIds.length} selected leads?`)) return;
    
    try {
      setBulkProcessing(true);
      
      // Auto-send all selected leads
      const results = await Promise.allSettled(
        selectedLeadIds.map(async id => {
          const lead = leads.find(l => l.id === id);
          if (!lead) return;
          
          const finalReply = (lead.stage4_reply_text || '')
            .replace('[LINK]', lead.stage3_landing_url || '');
          
          await api.post(`/social-leads/${id}/approve`, {
            approved_response: finalReply,
            reviewed_by: 'Tony',
            auto_send: true
          });
          
          await api.patch(`/social-leads/${id}`, {
            status: 'SENT',
            sent_at: new Date().toISOString(),
            reply_url: lead.post_url
          });
        })
      );
      
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Remove from current list
      setLeads(prevLeads => prevLeads.filter(lead => !selectedLeadIds.includes(lead.id)));
      setSelectedLeadIds([]);
      
      if (failed > 0) {
        alert(`${succeeded} leads sent, ${failed} failed.`);
      } else {
        alert(`${succeeded} leads approved and sent!`);
      }
      
      loadLeads();
    } catch (error) {
      console.error('Failed to bulk auto-send:', error);
      alert('Failed to send some leads');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk reopen
  const bulkReopen = async () => {
    if (selectedLeadIds.length === 0) return;
    
    if (!confirm(`Reopen ${selectedLeadIds.length} selected leads? They will be moved back to active pipeline.`)) return;
    
    try {
      setBulkProcessing(true);
      
      // Reopen all selected leads
      await Promise.all(
        selectedLeadIds.map(id => 
          api.patch(`/social-leads/${id}`, {
            status: 'PENDING',
            sent_at: null,
            reply_url: null
          })
        )
      );
      
      // Remove from archive list
      setLeads(prevLeads => prevLeads.filter(lead => !selectedLeadIds.includes(lead.id)));
      setSelectedLeadIds([]);
      
      alert(`✅ ${selectedLeadIds.length} leads reopened! Switching to Active view...`);
      
      // Switch to Active view
      setShowArchive(false);
    } catch (error) {
      console.error('Failed to bulk reopen:', error);
      alert('Failed to reopen some leads');
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Range Toggle */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Time Range:</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('daily')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'daily'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Daily (24h)
          </button>
          <button
            onClick={() => setTimeRange('weekly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'weekly'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Weekly (7d)
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

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
          {/* Active/Archive Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowArchive(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !showArchive 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setShowArchive(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showArchive 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Archive
            </button>
          </div>

          {/* Auto-Send Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSendEnabled}
                  onChange={(e) => handleAutoSendToggle(e.target.checked)}
                  disabled={loadingToggle}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
              <span className="ml-3 text-sm font-medium text-gray-900 flex items-center gap-2">
                <span>🤖 Auto-Send</span>
                {autoSendEnabled ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">ON</span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">OFF</span>
                )}
              </span>
            </div>
            {autoSendEnabled && (
              <span className="text-xs text-green-700 ml-2">
                Agent posting automatically
              </span>
            )}
          </div>

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

        <div className="flex items-center gap-4">
          {/* Selection controls */}
          {selectedLeadIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedLeadIds.length} selected
              </span>
              <button
                onClick={deselectAllLeads}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
              {showArchive ? (
                // Archive view - show Bulk Reopen
                <button
                  onClick={bulkReopen}
                  disabled={bulkProcessing}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {bulkProcessing ? '⏳ Processing...' : '🔄 Bulk Reopen'}
                </button>
              ) : (
                // Active view - show Bulk Reject and Bulk Auto-Send
                <>
                  <button
                    onClick={bulkReject}
                    disabled={bulkProcessing}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    {bulkProcessing ? 'Processing...' : 'Bulk Reject'}
                  </button>
                  <button
                    onClick={bulkAutoSend}
                    disabled={bulkProcessing}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {bulkProcessing ? 'Processing...' : 'Bulk Auto-Send'}
                  </button>
                </>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={14} />
            <span>Auto-refresh: 10s</span>
          </div>
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        {/* Select All Header */}
        {!loading && leads.filter(lead => showArchive ? lead.status === 'REJECTED' : lead.status !== 'REJECTED').length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                selectedLeadIds.length > 0 &&
                selectedLeadIds.length === leads.filter(lead => showArchive ? lead.status === 'REJECTED' : lead.status !== 'REJECTED').length
              }
              onChange={(e) => {
                if (e.target.checked) {
                  selectAllLeads();
                } else {
                  deselectAllLeads();
                }
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All ({leads.filter(lead => showArchive ? lead.status === 'REJECTED' : lead.status !== 'REJECTED').length})
            </span>
          </div>
        )}
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rlt-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pipeline...</p>
          </div>
        ) : leads.filter(lead => showArchive ? lead.status === 'REJECTED' : lead.status !== 'REJECTED').length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showArchive ? 'No Archived Leads' : 'No Active Leads in Pipeline'}
            </h3>
            <p className="text-sm">
              {showArchive 
                ? 'No leads have been archived yet.' 
                : selectedStage === 'all'
                ? 'The lead pipeline is empty. Agents will populate this as they process Brand24 alerts.'
                : `No leads currently at ${STAGES.find(s => s.id === selectedStage)?.name} stage.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {leads
              .filter(lead => {
                // Show archived leads only when showArchive is true
                if (showArchive) {
                  return lead.status === 'REJECTED';
                } else {
                  // Show active leads (not rejected/archived)
                  return lead.status !== 'REJECTED';
                }
              })
              .map(lead => (
              <li key={lead.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.includes(lead.id)}
                    onChange={() => toggleLeadSelection(lead.id)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  
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
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                        <strong className="text-green-900">Our Reply (AI-generated):</strong>
                        <p className="text-green-800 mt-1 whitespace-pre-wrap">{lead.stage6_final_reply || lead.stage4_reply_text}</p>
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
                    <div className="bg-green-50 border border-green-200 rounded p-4">
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

                  {/* Final Message Preview with actual link */}
                  {(selectedLead.stage4_reply_text || editedReply) && (selectedLandingPage || selectedLead.stage3_landing_url) && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        👁️ Final Message Preview (what will actually be sent)
                      </h4>
                      <div className="bg-green-50 border border-green-300 rounded p-4">
                        <p className="text-green-900 whitespace-pre-wrap text-sm">
                          {(editedReply || selectedLead.stage4_reply_text || '')
                            .replace('[LINK]', selectedLandingPage || selectedLead.stage3_landing_url || '')}
                        </p>
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-xs text-green-700">
                            <strong>Link used:</strong>{' '}
                            <a
                              href={selectedLandingPage || selectedLead.stage3_landing_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-all"
                            >
                              {selectedLandingPage || selectedLead.stage3_landing_url}
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reply Training - Train Writer Agent */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  ✍️ Train Reply Writing (Writer Agent)
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Tell the AI what it got right or wrong <strong>about the reply message</strong>. Be specific about tone, length, or content issues. The AI will regenerate the reply based on your feedback.
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

              {/* Lead Quality Training - Train Scoring/Routing Agents */}
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  🎯 Train Lead Selection (Scanner/Scorer/Router Agents)
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Tell the agents why this lead was <strong>good or bad</strong>. This helps them learn what you're looking for.
                  Be specific: score accuracy, pain point relevance, landing page selection, quality indicators.
                </p>
                <textarea
                  value={leadQualityFeedback}
                  onChange={(e) => setLeadQualityFeedback(e.target.value)}
                  placeholder={`Examples:
✅ GOOD LEAD: "Perfect score (${selectedLead.stage2_score}/100). Pain point clearly stated. Landing page matches their frustration. User seems motivated."
❌ BAD LEAD: "Score too high (${selectedLead.stage2_score}/100 should be 40). Pain is vague - just complaining, no real interest. This is spam/low effort."`}
                  className="w-full px-3 py-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  rows={4}
                />
                <button
                  onClick={handleSubmitLeadQualityFeedback}
                  disabled={submittingFeedback || !leadQualityFeedback.trim()}
                  className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {submittingFeedback ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Submitting Feedback...
                    </>
                  ) : (
                    <>
                      📚 Submit Lead Quality Training
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

              {/* Sent Status (if sent) */}
              {selectedLead.sent_at && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                    ✅ Message Sent Successfully
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-green-800">
                      <strong>Sent:</strong> {new Date(selectedLead.sent_at).toLocaleString()}
                    </p>
                    
                    {selectedLead.reply_url && (
                      <div>
                        <strong className="text-sm text-green-900">View Your Reply:</strong>
                        <a
                          href={selectedLead.reply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 text-blue-600 hover:underline text-sm break-all"
                        >
                          {selectedLead.reply_url}
                        </a>
                      </div>
                    )}
                    
                    {selectedLead.reply_screenshot_url && (
                      <div>
                        <strong className="text-sm text-green-900 block mb-2">Screenshot:</strong>
                        <img
                          src={selectedLead.reply_screenshot_url}
                          alt="Reply screenshot"
                          className="max-w-full border border-green-300 rounded shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Status</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded font-medium ${
                    selectedLead.status === 'SENT' ? 'bg-green-100 text-green-700' :
                    selectedLead.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                    selectedLead.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedLead.status || 'PENDING'}
                  </span>
                  {selectedLead.sent_at && (
                    <span className="text-xs text-green-600">
                      • Sent {new Date(selectedLead.sent_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
              {selectedLead.status === 'REJECTED' ? (
                // Archived Lead Footer - Show Reopen button
                <>
                  <button
                    onClick={handleReopen}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? '⏳ Reopening...' : '🔄 Reopen Lead'}
                  </button>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Close
                  </button>
                </>
              ) : (
                // Active Lead Footer - Show normal actions
                <>
                  
              {/* Stage Promotion Buttons */}
              {!showArchive && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">? Manual Stage Promotion</h3>
                  <p className="text-xs text-blue-700 mb-3">Manually push this lead forward through the pipeline</p>
                  
                  <div className="flex gap-2 flex-wrap">
                    {/* Scanner → Scorer */}
                    {!selectedLead.stage2_score && (
                      <button
                        onClick={promoteToScorer}
                        disabled={saving}
                        className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm flex items-center gap-2"
                        title="Mark as KEEP and send to Scorer agent"
                      >
                        ? Approve for Scoring
                      </button>
                    )}
                    
                    {/* Scorer → Router */}
                    {selectedLead.stage2_score && !selectedLead.stage3_landing_url && (
                      <button
                        onClick={promoteToRouter}
                        disabled={saving}
                        className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center gap-2"
                        title="Manually score this lead and send to Router"
                      >
                        ? Score & Send to Router
                      </button>
                    )}
                    
                    {/* Router → Writer */}
                    {selectedLead.stage3_landing_url && !selectedLead.stage4_reply_text && (
                      <button
                        onClick={promoteToWriter}
                        disabled={saving || !selectedLandingPage}
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2"
                        title="Confirm landing page and send to Writer"
                      >
                        ? Send to Writer
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button onClick={handleReject}
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadPipelineSection;










