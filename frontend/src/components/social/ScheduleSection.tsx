import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, TrendingUp, Instagram, Youtube, Twitter } from 'lucide-react';
import axios from 'axios';
import { format, addDays, startOfWeek } from 'date-fns';

interface DailyPlan {
  id: number;
  plan_date: string;
  total_posts: number;
  platforms: { [key: string]: number };
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'complete';
  created_by?: string;
  notes?: string;
  created_at: string;
}

interface ScheduledPost {
  id: number;
  content_id: number;
  platform: string;
  scheduled_for: string;
  caption?: string;
  hashtags?: string[];
  status: 'scheduled' | 'approved' | 'posted' | 'failed';
  title?: string;
  content_type?: string;
}

function ScheduleSection() {
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [schedule, setSchedule] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, scheduleRes] = await Promise.all([
        axios.get('/api/viral-content/daily-plan', { params: { status: 'pending_approval' } }),
        axios.get('/api/viral-content/schedule')
      ]);
      setPlans(plansRes.data.plans);
      setSchedule(scheduleRes.data.schedule);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePlan = async (planId: number) => {
    try {
      await axios.put(`/api/viral-content/daily-plan/${planId}/approve`);
      loadData();
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Approval failed. Please try again.');
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: { [key: string]: any } = {
      instagram: Instagram,
      youtube: Youtube,
      twitter: Twitter,
      tiktok: TrendingUp
    };
    
    const Icon = icons[platform.toLowerCase()] || Calendar;
    return <Icon size={16} />;
  };

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      instagram: 'text-pink-600',
      youtube: 'text-red-600',
      twitter: 'text-blue-600',
      tiktok: 'text-gray-900'
    };
    
    return colors[platform.toLowerCase()] || 'text-gray-600';
  };

  // Group schedule by date
  const scheduleByDate = schedule.reduce((acc, post) => {
    const date = format(new Date(post.scheduled_for), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(post);
    return acc;
  }, {} as { [key: string]: ScheduledPost[] });

  // Get next 7 days
  const weekStart = startOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const pendingPlans = plans.filter(p => p.status === 'pending_approval');

  return (
    <div className="space-y-6">
      {/* Pending Daily Plans */}
      {pendingPlans.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden border-2 border-blue-200">
          <div className="px-6 py-4 border-b border-blue-200 bg-blue-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              Daily Plans Awaiting Approval ({pendingPlans.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {pendingPlans.map((plan) => (
              <li key={plan.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {format(new Date(plan.plan_date), 'EEEE, MMMM d, yyyy')}
                      </h3>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {plan.total_posts} posts
                      </span>
                    </div>

                    {/* Platform breakdown */}
                    <div className="flex items-center gap-4 mb-3">
                      {Object.entries(plan.platforms || {}).map(([platform, count]) => (
                        <div key={platform} className="flex items-center gap-1 text-sm">
                          <span className={getPlatformColor(platform)}>
                            {getPlatformIcon(platform)}
                          </span>
                          <span className="text-gray-700 font-medium">{count}</span>
                          <span className="text-gray-500">{platform}</span>
                        </div>
                      ))}
                    </div>

                    {plan.notes && (
                      <p className="text-sm text-gray-600 mb-3">{plan.notes}</p>
                    )}

                    <div className="text-xs text-gray-500">
                      Created by {plan.created_by} on {format(new Date(plan.created_at), 'MMM d, h:mm a')}
                    </div>
                  </div>

                  <button
                    onClick={() => handleApprovePlan(plan.id)}
                    className="ml-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Approve Plan
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weekly Calendar View */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">This Week's Schedule</h2>
        
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayPosts = scheduleByDate[dateStr] || [];
            const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

            return (
              <div
                key={dateStr}
                className={`border rounded-lg p-3 ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="text-center mb-2">
                  <div className="text-xs font-medium text-gray-500 uppercase">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </div>
                </div>

                {dayPosts.length > 0 ? (
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        className="text-xs p-2 bg-white border border-gray-200 rounded"
                      >
                        <div className={`flex items-center gap-1 mb-1 ${getPlatformColor(post.platform)}`}>
                          {getPlatformIcon(post.platform)}
                          <span className="font-medium">{post.platform}</span>
                        </div>
                        <div className="text-gray-600 line-clamp-1">{post.title || 'Post'}</div>
                        <div className="text-gray-500 text-xs mt-1">
                          {format(new Date(post.scheduled_for), 'h:mm a')}
                        </div>
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <div className="text-xs text-center text-gray-500 pt-1">
                        +{dayPosts.length - 3} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-center text-gray-400 py-2">
                    No posts
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Posts List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Posts</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {schedule.slice(0, 10).map((post) => (
            <li key={post.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={getPlatformColor(post.platform)}>
                    {getPlatformIcon(post.platform)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{post.title || 'Untitled Post'}</h4>
                    <p className="text-sm text-gray-600">{post.content_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {format(new Date(post.scheduled_for), 'MMM d')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(post.scheduled_for), 'h:mm a')}
                  </div>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                    post.status === 'approved' ? 'bg-green-100 text-green-800' :
                    post.status === 'posted' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {post.status}
                  </span>
                </div>
              </div>
              {post.caption && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{post.caption}</p>
              )}
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {post.hashtags.slice(0, 5).map((tag, idx) => (
                    <span key={idx} className="text-xs text-blue-600">#{tag}</span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && schedule.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500">No scheduled posts yet.</p>
          <p className="text-sm text-gray-400 mt-1">Your social agent will create a posting schedule here.</p>
        </div>
      )}
    </div>
  );
}

export default ScheduleSection;
