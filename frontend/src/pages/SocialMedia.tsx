import { useState } from 'react';
import { Upload, Video, Image, CheckCircle, XCircle, Clock, TrendingUp, Calendar } from 'lucide-react';
import VideoSection from '../components/social/VideoSection';
import ContentSection from '../components/social/ContentSection';
import ViralIdeasSection from '../components/social/ViralIdeasSection';
import ScheduleSection from '../components/social/ScheduleSection';

function SocialMedia() {
  const [activeTab, setActiveTab] = useState<'videos' | 'content' | 'viral' | 'schedule'>('videos');

  const tabs = [
    { id: 'videos', label: 'Video Editing', icon: Video },
    { id: 'content', label: 'Social Content', icon: Image },
    { id: 'viral', label: 'Viral Ideas', icon: TrendingUp },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Social Media Manager</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'videos' | 'content' | 'viral' | 'schedule')}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-rlt-blue text-rlt-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'videos' && <VideoSection />}
      {activeTab === 'content' && <ContentSection />}
      {activeTab === 'viral' && <ViralIdeasSection />}
      {activeTab === 'schedule' && <ScheduleSection />}
    </div>
  );
}

export default SocialMedia;
