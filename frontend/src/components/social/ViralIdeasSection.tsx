import { useState, useEffect } from 'react';
import { TrendingUp, ExternalLink, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { api } from '../../api/api';

interface ViralIdea {
  id: number;
  platform: string;
  source_url?: string;
  title: string;
  description?: string;
  why_viral?: string;
  engagement_metrics?: any;
  rlt_angle: string;
  suggested_format?: string;
  estimated_effort?: string;
  status: 'researched' | 'approved' | 'rejected' | 'in_production';
  priority: number;
  researched_by?: string;
  researched_at: string;
  review_notes?: string;
}

function ViralIdeasSection() {
  const [ideas, setIdeas] = useState<ViralIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/viral-content/ideas');
      setIdeas(res.data.ideas);
    } catch (error) {
      console.error('Failed to load ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/viral-content/ideas/${id}/review`, {
        status,
        review_notes: reviewFeedback
      });
      setReviewingId(null);
      setReviewFeedback('');
      loadIdeas();
    } catch (error) {
      console.error('Review failed:', error);
      alert('Review failed. Please try again.');
    }
  };

  const getPlatformBadge = (platform: string) => {
    const colors: { [key: string]: string } = {
      tiktok: 'bg-black text-white',
      instagram: 'bg-pink-100 text-pink-800',
      youtube: 'bg-red-100 text-red-800',
      twitter: 'bg-blue-100 text-blue-800',
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[platform.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
        {platform}
      </span>
    );
  };

  const getPriorityBadge = (priority: number) => {
    const config = {
      1: { bg: 'bg-red-100', text: 'text-red-800', label: 'High' },
      2: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' },
      3: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Low' }
    };
    
    const { bg, text, label } = config[priority as keyof typeof config] || config[2];
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${bg} ${text}`}>
        {label}
      </span>
    );
  };

  const getEffortBadge = (effort?: string) => {
    if (!effort) return null;
    
    const config = {
      quick: { bg: 'bg-green-100', text: 'text-green-800', icon: '⚡' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🔨' },
      complex: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🏗️' }
    };
    
    const { bg, text, icon } = config[effort as keyof typeof config] || config.medium;
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${bg} ${text}`}>
        {icon} {effort}
      </span>
    );
  };

  const pendingReview = ideas.filter(i => i.status === 'researched');
  const approved = ideas.filter(i => i.status === 'approved' || i.status === 'in_production');
  const rejected = ideas.filter(i => i.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-4">
        <div className="flex items-center gap-2 text-purple-900">
          <TrendingUp size={20} />
          <p className="text-sm font-medium">
            Your social media agent researches viral content daily and adapts ideas for RLT
          </p>
        </div>
      </div>

      {/* Pending Review */}
      {pendingReview.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden border-2 border-purple-200">
          <div className="px-6 py-4 border-b border-purple-200 bg-purple-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="text-purple-600" size={20} />
              Viral Ideas Pending Review ({pendingReview.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {pendingReview.map((idea) => (
              <li key={idea.id} className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{idea.title}</h3>
                        {getPlatformBadge(idea.platform)}
                        {getPriorityBadge(idea.priority)}
                        {getEffortBadge(idea.estimated_effort)}
                      </div>
                      
                      {idea.description && (
                        <p className="text-sm text-gray-600 mb-2">{idea.description}</p>
                      )}
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                        <p className="text-sm font-medium text-blue-900 mb-1">🎯 RLT Angle:</p>
                        <p className="text-sm text-blue-800">{idea.rlt_angle}</p>
                      </div>
                      
                      {idea.why_viral && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
                          <p className="text-sm font-medium text-purple-900 mb-1">🔥 Why It's Viral:</p>
                          <p className="text-sm text-purple-800">{idea.why_viral}</p>
                        </div>
                      )}
                      
                      {idea.engagement_metrics && (
                        <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                          {idea.engagement_metrics.views && (
                            <span>👁️ {idea.engagement_metrics.views.toLocaleString()} views</span>
                          )}
                          {idea.engagement_metrics.likes && (
                            <span>❤️ {idea.engagement_metrics.likes.toLocaleString()} likes</span>
                          )}
                          {idea.engagement_metrics.comments && (
                            <span>💬 {idea.engagement_metrics.comments.toLocaleString()} comments</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {idea.suggested_format && <span>Format: {idea.suggested_format}</span>}
                        {idea.researched_by && <span>by {idea.researched_by}</span>}
                        <span>{new Date(idea.researched_at).toLocaleDateString()}</span>
                        {idea.source_url && (
                          <a
                            href={idea.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <ExternalLink size={12} />
                            View Original
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {reviewingId === idea.id ? (
                    <div className="space-y-3 mt-4">
                      <textarea
                        value={reviewFeedback}
                        onChange={(e) => setReviewFeedback(e.target.value)}
                        placeholder="Add feedback (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReview(idea.id, 'approved')}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Approve - Create This
                        </button>
                        <button
                          onClick={() => handleReview(idea.id, 'rejected')}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors flex items-center gap-2"
                        >
                          <XCircle size={16} />
                          Pass
                        </button>
                        <button
                          onClick={() => {
                            setReviewingId(null);
                            setReviewFeedback('');
                          }}
                          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReviewingId(idea.id)}
                      className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium transition-colors"
                    >
                      Review Idea
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Approved Ideas */}
      {approved.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              Approved Ideas ({approved.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {approved.map((idea) => (
              <li key={idea.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{idea.title}</h4>
                      {getPlatformBadge(idea.platform)}
                      {idea.status === 'in_production' && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          In Production
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{idea.rlt_angle}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      )}

      {!loading && ideas.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <TrendingUp className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500">No viral ideas yet.</p>
          <p className="text-sm text-gray-400 mt-1">Your social agent will research and submit ideas here daily.</p>
        </div>
      )}
    </div>
  );
}

export default ViralIdeasSection;
