import React from 'react';

interface RemoteDesktopModalProps {
  consoleId: number;
  consoleName: string;
  onClose: () => void;
}

const RemoteDesktopModal: React.FC<RemoteDesktopModalProps> = ({
  consoleId,
  consoleName,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Remote Desktop: {consoleName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            VNC Remote Desktop - Coming Soon
          </h3>
          <p className="text-gray-600 mb-6">
            Remote desktop functionality is temporarily disabled due to a technical issue.
            <br />
            Use SSH or direct access to {consoleName} for now.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-left">
            <h4 className="font-medium text-blue-900 mb-2">SSH Access:</h4>
            <code className="text-sm text-blue-800">
              ssh tony@{consoleId === 4 ? '192.168.0.79' : consoleId === 3 ? '192.168.0.91' : '192.168.0.97'}
            </code>
          </div>
          <button
            onClick={onClose}
            className="mt-6 px-4 py-2 bg-rlt-blue text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoteDesktopModal;
