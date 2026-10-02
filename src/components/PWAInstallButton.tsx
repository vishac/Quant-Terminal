import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AndroidInstallModal } from './AndroidInstallModal';
import { Smartphone, CheckCircle2, Apple } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  if (isInstalled && variant !== 'banner') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold cursor-pointer transition hover:bg-emerald-900/60 ${className}`}
          title="App installed in Standalone Mode. Click for iOS/Android package details."
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">INSTALLED (STANDALONE)</span>
        </button>

        <AndroidInstallModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDirectInstall={install}
          isInstallable={isInstallable}
          isInstalled={isInstalled}
        />
      </>
    );
  }

  if (variant === 'sidebar') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/50 to-slate-900 border border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400 text-xs font-mono font-bold transition shadow-sm cursor-pointer group ${className}`}
        >
          <div className="flex items-center gap-2">
            {isIOS ? (
              <Apple className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            ) : (
              <Smartphone className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            )}
            <span>{isIOS ? 'DOWNLOAD iOS APP' : 'INSTALL APP / APK'}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200">
            {isIOS ? 'iOS' : isInstallable ? '1-TAP' : 'PWA/APK'}
          </span>
        </button>

        <AndroidInstallModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDirectInstall={install}
          isInstallable={isInstallable}
          isInstalled={isInstalled}
        />
      </>
    );
  }

  // Header default variant
  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 hover:text-white text-xs font-mono font-bold transition shadow-[0_0_15px_rgba(0,240,255,0.15)] cursor-pointer active:scale-95 ${className}`}
        title="Download for iOS (.mobileconfig) or Android (WebAPK / .APK)"
      >
        {isIOS ? (
          <Apple className="w-3.5 h-3.5 text-cyan-400" />
        ) : (
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
        )}
        <span className="hidden sm:inline">
          {isIOS ? 'DOWNLOAD iOS APP' : 'GET APP (iOS / ANDROID)'}
        </span>
        <span className="sm:hidden">{isIOS ? 'iOS' : 'APP'}</span>
      </button>

      <AndroidInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDirectInstall={install}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />
    </>
  );
};
