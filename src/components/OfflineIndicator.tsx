import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-18 lg:bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-950/90 border border-amber-500/50 px-3.5 py-2 text-xs font-mono text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.3)] backdrop-blur-md animate-in slide-in-from-bottom-2 duration-300">
      <WifiOff className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
      <span>Offline Mode — Live feed paused; local cache active.</span>
    </div>
  );
};
