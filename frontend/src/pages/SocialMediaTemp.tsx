import { Construction } from 'lucide-react';

function SocialMedia() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
      <Construction className="w-16 h-16 text-gray-400" />
      <h2 className="text-2xl font-bold text-gray-900">Social Media Manager</h2>
      <p className="text-gray-600 text-center max-w-md">
        The Social Media Manager feature is currently being rebuilt.
        <br />
        <br />
        This will include:
        <br />
        • Video editing workflow
        <br />
        • Social content creation
        <br />
        • Viral idea tracking
        <br />
        • Content scheduling
      </p>
      <p className="text-sm text-gray-500">Feature paused since Content Agent was paused</p>
    </div>
  );
}

export default SocialMedia;
