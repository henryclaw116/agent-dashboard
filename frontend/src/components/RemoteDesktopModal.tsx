import React, { useEffect, useRef, useState } from 'react';
import RFB from '@novnc/novnc/core/rfb';

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
  const vncContainer = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFB | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!vncContainer.current) return;

    try {
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const apiUrl = import.meta.env.VITE_API_URL || '';
      
      // Extract host from API URL or use current host
      let wsHost = window.location.host;
      if (apiUrl) {
        const url = new URL(apiUrl);
        wsHost = url.host;
      }

      const wsUrl = `${protocol}//${wsHost}/api/vnc/${consoleId}`;
      
      console.log('Connecting to VNC:', wsUrl);
      setStatus('connecting');

      // Create RFB instance
      const rfb = new RFB(vncContainer.current, wsUrl, {
        credentials: { password: '' }, // Password can be added later if needed
        shared: true,
        repeaterID: '',
        wsProtocols: ['binary']
      });

      // Event handlers
      rfb.addEventListener('connect', () => {
        console.log('VNC connected');
        setStatus('connected');
        setErrorMessage('');
      });

      rfb.addEventListener('disconnect', (e: any) => {
        console.log('VNC disconnected:', e.detail);
        setStatus('disconnected');
        if (e.detail.clean) {
          setErrorMessage('Connection closed');
        } else {
          setErrorMessage('Connection lost');
        }
      });

      rfb.addEventListener('securityfailure', (e: any) => {
        console.error('VNC security failure:', e.detail);
        setStatus('error');
        setErrorMessage('Authentication failed');
      });

      rfb.addEventListener('credentialsrequired', () => {
        console.log('VNC credentials required');
        // Could prompt for password here if needed
      });

      // Store reference
      rfbRef.current = rfb;

      // Cleanup on unmount
      return () => {
        if (rfbRef.current) {
          rfbRef.current.disconnect();
          rfbRef.current = null;
        }
      };
    } catch (error) {
      console.error('VNC connection error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [consoleId]);

  const handleFullscreen = () => {
    if (vncContainer.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        vncContainer.current.requestFullscreen();
      }
    }
  };

  const handleCtrlAltDel = () => {
    if (rfbRef.current) {
      rfbRef.current.sendCtrlAltDel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Remote Desktop: {consoleName}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              status === 'connected' ? 'bg-green-100 text-green-700' :
              status === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
              status === 'error' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCtrlAltDel}
              disabled={status !== 'connected'}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send Ctrl+Alt+Del"
            >
              Ctrl+Alt+Del
            </button>
            <button
              onClick={handleFullscreen}
              disabled={status !== 'connected'}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>

        {/* VNC Container */}
        <div className="flex-1 relative bg-gray-900 overflow-hidden">
          {status === 'connecting' && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Connecting to remote desktop...</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center max-w-md">
                <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-xl font-semibold mb-2">Connection Failed</h4>
                <p className="text-gray-300">{errorMessage}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {status === 'disconnected' && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <p className="text-lg">{errorMessage}</p>
              </div>
            </div>
          )}

          <div 
            ref={vncContainer} 
            className="w-full h-full"
            style={{ cursor: status === 'connected' ? 'default' : 'wait' }}
          />
        </div>
      </div>
    </div>
  );
};

export default RemoteDesktopModal;
