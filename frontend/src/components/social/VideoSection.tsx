import { useState, useEffect } from 'react';
import { Upload, Download, Clock, CheckCircle, Play } from 'lucide-react';
import axios from 'axios';

interface Video {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  status: 'pending' | 'in_progress' | 'complete' | 'downloaded';
  editing_instructions?: string;
  assigned_to?: string;
  uploaded_at: string;
  completed_at?: string;
  edited_file_size?: number;
}

function VideoSection() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadVideos();
  }, [filter]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await axios.get('/api/social-media/videos', { params });
      setVideos(res.data.videos);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('video', file);
    formData.append('upload_type', 'video');

    try {
      setUploading(true);
      await axios.post('/api/social-media/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      loadVideos(); // Refresh list
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (video: Video) => {
    try {
      const response = await axios.get(`/api/social-media/videos/${video.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', video.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      loadVideos(); // Refresh to update downloaded status
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending', icon: Clock },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Editing', icon: Play },
      complete: { bg: 'bg-green-100', text: 'text-green-800', label: 'Ready', icon: CheckCircle },
      downloaded: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Downloaded', icon: Download }
    };
    
    const { bg, text, label, icon: Icon } = config[status as keyof typeof config] || config.pending;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${bg} ${text}`}>
        <Icon size={12} />
        {label}
      </span>
    );
  };

  const pendingVideos = videos.filter(v => v.status === 'pending' || v.status === 'in_progress');
  const completeVideos = videos.filter(v => v.status === 'complete');
  const downloadedVideos = videos.filter(v => v.status === 'downloaded');

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Video for Editing</h2>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-rlt-blue transition-colors">
          <Upload className="mx-auto mb-4 text-gray-400" size={48} />
          <label className="cursor-pointer">
            <span className="text-sm text-gray-600">
              {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
            </span>
            <input
              type="file"
              className="hidden"
              accept="video/*"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <p className="text-xs text-gray-500 mt-2">MP4, MOV, AVI up to 2GB</p>
        </div>
      </div>

      {/* Pending/In Progress Videos */}
      {pendingVideos.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Videos Being Edited ({pendingVideos.length})</h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {pendingVideos.map((video) => (
              <li key={video.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Play size={20} className="text-gray-400" />
                      <h3 className="font-medium text-gray-900">{video.original_filename}</h3>
                      {getStatusBadge(video.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatFileSize(video.file_size)}</span>
                      <span>Uploaded {new Date(video.uploaded_at).toLocaleDateString()}</span>
                      {video.assigned_to && (
                        <span className="text-blue-600">Assigned to: {video.assigned_to}</span>
                      )}
                    </div>
                    {video.editing_instructions && (
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Instructions:</strong> {video.editing_instructions}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Complete Videos (Ready to Download) */}
      {completeVideos.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden border-2 border-green-200">
          <div className="px-6 py-4 border-b border-green-200 bg-green-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              Videos Ready to Download ({completeVideos.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {completeVideos.map((video) => (
              <li key={video.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle size={20} className="text-green-600" />
                      <h3 className="font-medium text-gray-900">{video.original_filename}</h3>
                      {getStatusBadge(video.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Original: {formatFileSize(video.file_size)}</span>
                      {video.edited_file_size && (
                        <span>Edited: {formatFileSize(video.edited_file_size)}</span>
                      )}
                      <span>Completed {new Date(video.completed_at!).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(video)}
                    className="ml-4 px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Downloaded Videos */}
      {downloadedVideos.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Downloaded ({downloadedVideos.length})</h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {downloadedVideos.map((video) => (
              <li key={video.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Download size={20} className="text-gray-400" />
                      <h3 className="font-medium text-gray-900">{video.original_filename}</h3>
                      {getStatusBadge(video.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatFileSize(video.edited_file_size || video.file_size)}</span>
                      <span>Completed {new Date(video.completed_at!).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(video)}
                    className="ml-4 px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Re-download
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rlt-blue"></div>
        </div>
      )}

      {!loading && videos.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No videos yet. Upload your first video to get started!</p>
        </div>
      )}
    </div>
  );
}

export default VideoSection;
