import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Terminal,
  Apple,
  Share2,
  FileCode,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectInstall?: () => Promise<boolean>;
  isInstallable: boolean;
  isInstalled: boolean;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
  onDirectInstall,
  isInstallable,
  isInstalled,
}) => {
  const { isIOS, isSamsung, isSamsungBrowser, isInAppBrowser } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'IOS_PROFILE' | 'DIRECT_PWA' | 'APK_GENERATION' | 'CLI_BUBBLEWRAP'>('DIRECT_PWA');

  // Auto-switch to iOS tab when opened on an Apple device
  useEffect(() => {
    if (isIOS) {
      setActiveTab('IOS_PROFILE');
    }
  }, [isIOS]);

  if (!isOpen) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-vukfnptjjqdoqpnhegsft2-932561199131.asia-southeast1.run.app';
  const pwaBuilderUrl = `https://www.pwabuilder.com?url=${encodeURIComponent(appUrl)}`;
  const iosDownloadUrl = '/api/download/ios-profile';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 font-mono">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-2xl bg-[#080d1a] border border-cyan-500/35 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.18)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-[#0c1428] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/90 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              {activeTab === 'IOS_PROFILE' ? (
                <Apple className="w-5 h-5 text-cyan-300" />
              ) : (
                <Smartphone className="w-5 h-5 text-cyan-400" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-sans flex items-center gap-2">
                Download &amp; Install J.A.R.V.I.S.
              </h2>
              <span className="text-[11px] text-cyan-300">
                iOS Profile (.mobileconfig) • Android WebAPK • APK / AAB
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('IOS_PROFILE')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'IOS_PROFILE'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>iOS Download (.mobileconfig)</span>
          </button>
          <button
            onClick={() => setActiveTab('DIRECT_PWA')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DIRECT_PWA'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android (1-Tap WebAPK)</span>
          </button>
          <button
            onClick={() => setActiveTab('APK_GENERATION')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'APK_GENERATION'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Android .APK (PWABuilder)</span>
          </button>
          <button
            onClick={() => setActiveTab('CLI_BUBBLEWRAP')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CLI_BUBBLEWRAP'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Developer / Xcode</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {/* TAB: iOS PROFILE DOWNLOAD */}
          {activeTab === 'IOS_PROFILE' && (
            <div className="space-y-4">
              {/* Option A: Direct Apple Profile Download */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/35 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold font-mono text-[11px]">
                    <Apple className="w-4 h-4 text-cyan-400" />
                    <span>DOWNLOADABLE APPLE CONFIGURATION PROFILE (.MOBILECONFIG)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold">
                    NATIVE iOS APP
                  </span>
                </div>

                <p className="text-slate-200 text-xs leading-relaxed">
                  Apple provides official <strong>Configuration Profiles (`.mobileconfig`)</strong> that allow downloading and installing web applications directly onto your iPhone or iPad with a dedicated standalone home screen launcher, high-resolution icon, and fullscreen hardware-accelerated viewport.
                </p>

                {/* Direct Download Button */}
                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  <a
                    href={iosDownloadUrl}
                    download="JARVIS-Quant.mobileconfig"
                    className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition cursor-pointer active:scale-95 text-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download iOS Profile (.mobileconfig)</span>
                  </a>
                  <button
                    onClick={handleCopyUrl}
                    className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="Copy App URL to open in iOS Safari"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>

                {/* 3-Step Installation Guide */}
                <div className="p-3.5 rounded-lg bg-black/60 border border-slate-800/90 text-slate-300 font-mono text-[11px] space-y-2">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>How to Install on iPhone / iPad (3 Steps):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                    <li>
                      Tap <strong>"Download iOS Profile"</strong> in Safari &rarr; Tap <strong>"Allow"</strong> when prompted.
                    </li>
                    <li>
                      Open your iPhone <strong>Settings</strong> app &rarr; Tap <strong>"Profile Downloaded"</strong> (right near the top).
                    </li>
                    <li>
                      Tap <strong>"Install"</strong> in the top-right corner & enter your device passcode.
                    </li>
                  </ol>
                  <div className="text-[10px] text-emerald-400 pt-1">
                    &bull; J.A.R.V.I.S. will appear on your Home Screen as an official standalone app!
                  </div>
                </div>
              </div>

              {/* Option B: Standard iOS Safari Share Sheet */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-bold font-mono text-[11px]">
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>ALTERNATIVE: SAFARI 1-TAP "ADD TO HOME SCREEN"</span>
                </div>
                <p className="text-slate-300 text-xs">
                  If opening in Safari on your iPhone: tap the <strong>Share button</strong> (square with arrow up) &rarr; scroll down &rarr; tap <strong>"Add to Home Screen"</strong> &rarr; tap <strong>Add</strong>.
                </p>
              </div>

              {/* Option C: Xcode & TestFlight Packaging */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200 font-bold font-mono text-[11px]">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span>PACKAGE AS XCODE PROJECT (.ZIP) FOR TESTFLIGHT / APP STORE</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">SWIFT / WKWEBVIEW</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Need a full native Xcode project to compile into an <strong>.ipa file</strong> for Apple TestFlight or the App Store? You can package this PWA into a complete Swift Xcode project with 1 click:
                </p>
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-bold transition cursor-pointer"
                >
                  <span>Open PWABuilder &rarr; Package for iOS (Xcode Project)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 1: DIRECT PWA INSTALL (ANDROID) */}
          {activeTab === 'DIRECT_PWA' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold font-mono text-[11px]">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>RECOMMENDED: ZERO SIDELOADING • REAL NATIVE WEBAPK</span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">
                  On Android, modern PWAs automatically generate a <strong>native WebAPK</strong> signed by Google Play Services. It installs directly to your home screen, app drawer, and system settings, with hardware-accelerated 60fps rendering, offline caching, and no browser UI.
                </p>

                {isInAppBrowser && (
                  <div className="p-3 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs space-y-1.5 font-sans">
                    <div className="font-bold text-amber-300 font-mono flex items-center gap-1.5">
                      <span>⚠️ IN-APP BROWSER DETECTED (WHATSAPP / INSTAGRAM / LINKEDIN)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-100/90">
                      Embedded social app webviews strictly block WebAPK and PWA installation on Android. To install J.A.R.V.I.S.:
                    </p>
                    <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                      <span className="text-amber-300">1. Tap ⋮ or ⋯ in top-right</span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className="text-amber-300">Select "Open in Samsung Internet / Chrome"</span>
                    </div>
                  </div>
                )}

                {isInstalled ? (
                  <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>App is already running in Standalone App Mode!</span>
                  </div>
                ) : isInstallable && onDirectInstall ? (
                  <button
                    onClick={async () => {
                      const ok = await onDirectInstall();
                      if (ok) onClose();
                    }}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install on This Device (1-Tap WebAPK)</span>
                  </button>
                ) : (
                  <div className="space-y-3 pt-1">
                    {/* Samsung Galaxy One UI Instructions */}
                    <div className="p-3.5 rounded-lg bg-gradient-to-r from-blue-950/40 to-slate-950 border border-blue-500/35 text-slate-300 space-y-2 font-mono text-[11px]">
                      <div className="font-bold text-cyan-300 flex items-center justify-between">
                        <span>SAMSUNG GALAXY &amp; SAMSUNG INTERNET (ONE UI):</span>
                        <span className="text-[10px] text-blue-400 font-normal">SAMSUNG ONE UI</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                        <li>
                          In Samsung Internet, look for the <strong>Install Icon (⤓ or +)</strong> inside or beside the URL bar.
                        </li>
                        <li>
                          Alternatively: tap the <strong>Menu (☰)</strong> at bottom-right &rarr; tap <strong>"Add page to"</strong> &rarr; select <strong>"App screen"</strong>.
                        </li>
                        <li>
                          Samsung Knox and WebAPK will generate a standalone home screen launcher with high-res icon and zero browser frame!
                        </li>
                      </ol>
                    </div>

                    {/* Chrome & Standard Android (Realme, Motorola, Pixel, OnePlus, Xiaomi) */}
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 space-y-2 font-mono text-[11px]">
                      <div className="font-bold text-cyan-300 flex items-center justify-between">
                        <span>REALME, MOTO, ONEPLUS &amp; CHROME (ANDROID):</span>
                        <span className="text-[10px] text-amber-400 font-normal">REALME UI / OXYGENOS / HELLO UI</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                        <li>Open this URL in <strong>Google Chrome</strong> (or your Realme default browser).</li>
                        <li>Tap the <strong>three dots menu (⋮)</strong> in the top-right corner.</li>
                        <li>Select <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>) &rarr; tap <strong>Add</strong>.</li>
                      </ol>
                      <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-300/90 leading-tight">
                        <strong>Realme UI Pro Tip:</strong> If your phone displays <em>"Home screen layout is locked"</em>, go to <strong>Settings &rarr; Home screen &amp; Lock screen</strong> and turn off <strong>"Lock Home screen layout"</strong> so new apps can be pinned to your launcher.
                      </div>
                    </div>

                    {/* Copy URL helper */}
                    <div className="flex items-center gap-2 pt-1 font-mono">
                      <input
                        type="text"
                        readOnly
                        value={appUrl}
                        className="flex-1 bg-black/60 border border-slate-800 rounded px-2.5 py-1.5 text-cyan-300 text-xs outline-none select-all"
                      />
                      <button
                        onClick={handleCopyUrl}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Copy URL to paste into Samsung Internet or Chrome"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STANDALONE APK VIA PWABUILDER */}
          {activeTab === 'APK_GENERATION' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-cyan-300 text-[11px] font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>CONVERT TO STANDALONE .APK / .AAB VIA PWABUILDER</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold">
                    FREE &bull; 30 SECONDS
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  PWABuilder (maintained by Microsoft &amp; the Web community) takes your verified PWA manifest and compiles a signed <strong>Android Package (.apk)</strong> or <strong>Google Play Bundle (.aab)</strong> in 30 seconds using Google's official Trusted Web Activity (TWA) container.
                </p>

                {/* Step 1: Copy App URL */}
                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5 font-mono">
                  <span className="text-[10px] text-slate-400 block">STEP 1: YOUR PWA DEPLOYMENT URL</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={appUrl}
                      className="flex-1 bg-black/60 border border-slate-800 rounded px-2.5 py-1 text-cyan-300 text-xs outline-none select-all"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Step 2: Open PWABuilder */}
                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 font-mono">
                  <span className="text-[10px] text-slate-400 block">STEP 2: GENERATE ANDROID PACKAGE</span>
                  <p className="text-slate-300 text-xs font-sans">
                    Click below to open PWABuilder with your manifest pre-loaded. Click <strong>"Package for Stores"</strong> &rarr; <strong>"Android"</strong> &rarr; download your <strong>.apk file</strong>.
                  </p>
                  <a
                    href={pwaBuilderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  >
                    <span>Open PWABuilder &amp; Download APK</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLI / BUBBLEWRAP */}
          {activeTab === 'CLI_BUBBLEWRAP' && (
            <div className="space-y-3 font-mono">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-[11px]">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>DEVELOPER CLI (ANDROID TWA &amp; XCODE)</span>
                </div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Compile natively using Google Bubblewrap for Android or Capacitor for iOS:
                </p>

                <div className="p-3 rounded-lg bg-black/80 border border-slate-800 text-[11px] text-slate-300 space-y-2">
                  <div className="text-slate-500"># Android APK Build via Bubblewrap</div>
                  <div className="text-cyan-300">npm install -g @bubblewrap/cli</div>
                  <div className="text-cyan-300">bubblewrap init --manifest={appUrl}/manifest.json</div>
                  <div className="text-emerald-400">bubblewrap build</div>

                  <div className="text-slate-500 pt-2"># iOS Native Project Build via Capacitor</div>
                  <div className="text-cyan-300">npm install @capacitor/core @capacitor/ios</div>
                  <div className="text-cyan-300">npx cap init "JARVIS" "com.jarvis.quant"</div>
                  <div className="text-emerald-400">npx cap add ios &amp;&amp; npx cap open ios</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Apple iOS &amp; Android PWA Certified</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
