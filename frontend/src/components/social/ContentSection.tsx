import { useState, useEffect } from 'react';
import { Image, CheckCircle, XCircle, Clock, ExternalLink, Download } from 'lucide-react';
import { api } from '../../api/api';

interface SocialContent {
  id: number;
  content_type: string;
  title: string;
  description?: string;
  platform: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  created_by?: string;
  created_at: string;
  canva_design_url?: string;
  file_size?: number;
  review_notes?: string;
}

function ContentSection() {
  const [content, setContent] = useState<SocialContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const res = await api.get('/social-media/content');
      setContent(res.data.content);
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/social-media/content/${id}/review`, {
        status,
        feedback: reviewFeedback
      });
      setReviewingId(null);
      setReviewFeedback('');
      loadContent(); // Refresh
    } catch (error) {
      console.error('Review failed:', error);
      alert('Review failed. Please try again.');
    }
  };

  const handleDownload = async (contentItem: SocialContent) => {
    try {
      const response = await api.get(`/social-media/content/${contentItem.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', contentItem.title);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft', icon: Clock },
      pending_review: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Review', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected', icon: XCircle }
    };
    
    const { bg, text, label, icon: Icon } = config[status as keyof typeof config] || config.draft;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${bg} ${text}`}>
        <Icon size={12} />
        {label}
      </span>
    );
  };

  const getPlatformBadge = (platform: string) => {
    const colors: { [key: string]: string } = {
      instagram: 'bg-pink-100 text-pink-800',
      youtube: 'bg-red-100 text-red-800',
      twitter: 'bg-blue-100 text-blue-800',
      facebook: 'bg-blue-100 text-blue-800',
      linkedin: 'bg-blue-100 text-blue-800',
      tiktok: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[platform.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
        {platform}
      </span>
    );
  };

  const pendingReview = content.filter(c => c.status === 'pending_review');
  const approved = content.filter(c => c.status === 'approved');
  const rejected = content.filter(c => c.status === 'rejected');
  const drafts = content.filter(c => c.status === 'draft');

  return (
    <div className="space-y-6">
      {/* Pending Review Section */}
      {pendingReview.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden border-2 border-yellow-200">
          <div className="px-6 py-4 border-b border-yellow-200 bg-yellow-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="text-yellow-600" size={20} />
              Pending Your Review ({pendingReview.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {pendingReview.map((item) => (
              <li key={item.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    <Image size={32} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {getPlatformBadge(item.platform)}
                      <span className="text-xs text-gray-500">{item.content_type}</span>
                      {item.created_by && (
                        <span className="text-xs text-gray-500">by {item.created_by}</span>
                      )}
                    </div>

                    {item.canva_design_url && (
                      <a
                        href={item.canva_design_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
                      >
                        <ExternalLink size={14} />
                        View in Canva
                      </a>
                    )}

                    {reviewingId === item.id ? (
                      <div className="mt-4 space-y-3">
                        <textarea
                          value={reviewFeedback}
                          onChange={(e) => setReviewFeedback(e.target.value)}
                          placeholder="Add feedback (optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          rows={2}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReview(item.id, 'approved')}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
                          >
                            <CheckCircle size={16} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(item.id, 'rejected')}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors flex items-center gap-2"
                          >
                            <XCircle size={16} />
                            Reject
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
                        onClick={() => setReviewingId(item.id)}
                        className="mt-3 px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
                      >
                        Review Now
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Approved Content */}
      {approved.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              Approved & Ready to Post ({approved.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {approved.map((item) => (
              <li key={item.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    <Image size={24} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getPlatformBadge(item.platform)}
                          <span className="text-xs text-gray-500">{item.content_type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(item.status)}
                        <button
                          onClick={() => handleDownload(item)}
                          className="px-3 py-1 text-sm text-rlt-blue bg-blue-50 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      </div>
                    </div>
                    {item.canva_design_url && (
                      <a
                        href={item.canva_design_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                      >
                        <ExternalLink size={12} />
                        Canva
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rejected Content */}
      {rejected.length > 0 && (
        <details className="bg-white rounded-lg shadow overflow-hidden">
          <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <XCircle className="text-red-600" size={20} />
              Rejected ({rejected.length})
            </h2>
          </summary>
          <ul className="divide-y divide-gray-200 border-t border-gray-200">
            {rejected.map((item) => (
              <li key={item.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    <Image size={24} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getPlatformBadge(item.platform)}
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    </div>
                    {item.review_notes && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-900">
                          <strong>Feedback:</strong> {item.review_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rlt-blue"></div>
        </div>
      )}

      {!loading && content.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Image className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500">No social content yet.</p>
          <p className="text-sm text-gray-400 mt-1">Agents will create content here using Canva for your review.</p>
        </div>
      )}
    </div>
  );
}

export default ContentSection;
