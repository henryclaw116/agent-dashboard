import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, MessageSquare, ThumbsUp, ThumbsDown, Edit2, ExternalLink } from 'lucide-react';

interface BlockerItem {
  id: string;
  title: string;
  description: string;
  project_id?: number;
  priority: number;
  created_at: string;
  item_type: 'blocker';
}

interface SocialLeadItem {
  id: number;
  platform: string;
  username: string;
  post_url: string;
  original_message: string;
  post_excerpt?: string;
  stage2_score: number;
  stage2_tier: string;
  stage2_pain_category: string;
  stage2_pain_summary: string;
  stage3_landing_page_title?: string;
  planned_response: string;
  stage6_final_reply_text?: string;
  stage6_bitly_short_url?: string;
  created_at: string;
  item_type: 'social_lead';
}

type WaitingItem = BlockerItem | SocialLeadItem;

function WaitingOnTony() {
  const [items, setItems] = useState<WaitingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLead, setEditingLead] = useState<number | null>(null);
  const [editedReply, setEditedReply] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/waiting`);
      const data = await response.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (error) {
      console.error('Error fetching waiting items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/waiting/${id}/complete`, {
        method: 'PUT'
      });
      setItems(items.filter(item => 'id' in item && item.id !== id));
    } catch (error) {
      console.error('Error marking complete:', error);
    }
  };

  const handleApproveLead = async (id: number, reply?: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/waiting/social-lead/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_reply: reply })
      });
      setItems(items.filter(item => !('platform' in item) || item.id !== id));
      setEditingLead(null);
    } catch (error) {
      console.error('Error approving lead:', error);
    }
  };

  const handleRejectLead = async (id: number) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/waiting/social-lead/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by Tony' })
      });
      setItems(items.filter(item => !('platform' in item) || item.id !== id));
    } catch (error) {
      console.error('Error rejecting lead:', error);
    }
  };

  const startEditing = (lead: SocialLeadItem) => {
    setEditingLead(lead.id);
    setEditedReply(lead.stage6_final_reply_text || lead.planned_response);
  };

  const cancelEditing = () => {
    setEditingLead(null);
    setEditedReply('');
  };

  const saveAndApprove = async (id: number) => {
    await handleApproveLead(id, editedReply);
  };

  const priorityConfig = {
    1: {
      color: 'bg-red-50 border-red-200',
      badge: 'bg-red-100 text-red-800',
      icon: 'text-red-500',
      label: 'high'
    },
    2: {
      color: 'bg-yellow-50 border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: 'text-yellow-500',
      label: 'medium'
    },
    3: {
      color: 'bg-blue-50 border-blue-200',
      badge: 'bg-blue-100 text-blue-800',
      icon: 'text-blue-500',
      label: 'low'
    }
  };

  const tierColors = {
    'HOT': 'bg-red-100 text-red-800',
    'WARM': 'bg-orange-100 text-orange-800',
    'MODERATE': 'bg-yellow-100 text-yellow-800',
    'LOW': 'bg-blue-100 text-blue-800'
  };

  const platformIcons = {
    youtube: '📺',
    twitter: '🐦',
    reddit: '🔴',
    facebook: '👥',
    tiktok: '🎵'
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-2 border-orange-200 p-6">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

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
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          // Regular blocker item
          if (item.item_type === 'blocker') {
            const config = priorityConfig[item.priority as 1 | 2 | 3];
            return (
              <div
                key={`blocker-${item.id}`}
                className={`rounded-lg p-4 border-l-4 ${config.color}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.badge}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{item.description}</p>
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
          }

          // Social lead item
          const lead = item as SocialLeadItem;
          const isEditing = editingLead === lead.id;

          return (
            <div
              key={`lead-${lead.id}`}
              className="rounded-lg p-4 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-purple-600" size={20} />
                  <span className="text-lg font-bold text-gray-900">
                    {platformIcons[lead.platform as keyof typeof platformIcons] || '📱'} {lead.platform.toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierColors[lead.stage2_tier as keyof typeof tierColors]}`}>
                    {lead.stage2_tier} • {lead.stage2_score}/100
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {lead.stage2_pain_category.replace('_', ' ')}
                  </span>
                </div>
                <a
                  href={lead.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <ExternalLink size={12} />
                  View Post
                </a>
              </div>

              {/* Username */}
              <div className="mb-3">
                <span className="text-sm font-medium text-gray-700">@{lead.username}</span>
              </div>

              {/* Original Message */}
              <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Original Message:</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{lead.original_message}</p>
              </div>

              {/* Pain Summary */}
              {lead.stage2_pain_summary && (
                <div className="mb-4 p-2 bg-yellow-50 rounded border border-yellow-200">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">💡 Pain Analysis:</p>
                  <p className="text-xs text-gray-700">{lead.stage2_pain_summary}</p>
                </div>
              )}

              {/* Planned Response */}
              <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
                <p className="text-xs font-semibold text-green-700 uppercase mb-2">Planned Response:</p>
                {isEditing ? (
                  <textarea
                    value={editedReply}
                    onChange={(e) => setEditedReply(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={6}
                  />
                ) : (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {lead.stage6_final_reply_text || lead.planned_response}
                  </p>
                )}
              </div>

              {/* Landing Page */}
              {lead.stage3_landing_page_title && (
                <div className="mb-4 text-xs text-gray-600">
                  📄 Landing Page: <span className="font-medium">{lead.stage3_landing_page_title}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-purple-200">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => saveAndApprove(lead.id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle size={14} />
                      Save & Approve
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleApproveLead(lead.id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded flex items-center gap-1 transition-colors"
                    >
                      <ThumbsUp size={14} />
                      Approve & Send
                    </button>
                    <button
                      onClick={() => startEditing(lead)}
                      className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded flex items-center gap-1 transition-colors"
                    >
                      <Edit2 size={14} />
                      Edit Reply
                    </button>
                    <button
                      onClick={() => handleRejectLead(lead.id)}
                      className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded flex items-center gap-1 transition-colors"
                    >
                      <ThumbsDown size={14} />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-orange-200">
        <p className="text-xs text-gray-600">
          💡 <strong>Tip:</strong> Social leads show original post + AI-generated reply. 
          Review, edit if needed, then approve to send. High-score leads (70+) are shown first.
        </p>
      </div>
    </div>
  );
}

export default WaitingOnTony;
