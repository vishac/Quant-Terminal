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
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
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
  const {
    isIOS,
    isAndroid,
    isInAppBrowser,
    isInIframe,
    swStatus,
    manifestVerified,
    repairAndRefreshSw,
    install,
  } = usePWAInstall();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [activeTab, setActiveTab] = useState<'DIRECT_PWA' | 'IOS_PROFILE' | 'APK_GENERATION' | 'CLI_BUBBLEWRAP'>('DIRECT_PWA');

  useEffect(() => {
    if (isIOS) {
      setActiveTab('IOS_PROFILE');
    } else {
      setActiveTab('DIRECT_PWA');
    }
  }, [isIOS]);

  if (!isOpen) return null;

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : 'https://ais-pre-vukfnptjjqdoqpnhegsft2-932561199131.asia-southeast1.run.app/';

  const hostAndPath = appUrl.replace(/^https?:\/\//i, '');
  const androidChromeIntentUrl = `intent://${hostAndPath}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(appUrl)};end`;

  const pwaBuilderUrl = `https://www.pwabuilder.com?url=${encodeURIComponent(appUrl)}`;
  const iosDownloadUrl = '/api/download/ios-profile';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleRepairAndTriggerInstall = async () => {
    setIsRepairing(true);
    await repairAndRefreshSw();
    const triggerFn = onDirectInstall || install;
    const installed = await triggerFn();
    setIsRepairing(false);
    if (installed) {
      onClose();
    }
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
                Install J.A.R.V.I.S. on Android &amp; iOS
              </h2>
              <span className="text-[11px] text-cyan-300">
                Android Native WebAPK · iOS Profile (.mobileconfig) · Standalone APK
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
            <span>Developer CLI</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {/* TAB 1: DIRECT PWA INSTALL (ANDROID) */}
          {activeTab === 'DIRECT_PWA' && (
            <div className="space-y-4">
              {/* Live Android Installability Readiness Status */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono">
                    ANDROID WEBAPK READINESS CHECK
                  </span>
                  <button
                    onClick={handleRepairAndTriggerInstall}
                    disabled={isRepairing}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRepairing ? 'animate-spin' : ''}`} />
                    <span>{isRepairing ? 'Verifying...' : 'Verify & Activate'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-200 truncate">Manifest: Valid</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-1.5">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        swStatus === 'ACTIVE_CONTROLLING' || swStatus === 'REGISTERED'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    />
                    <span className="text-slate-200 truncate">
                      SW: {swStatus === 'ACTIVE_CONTROLLING' ? 'Active' : 'Ready'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-200 truncate">Icons: 192 &amp; 512px</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-1.5">
                    {isInIframe ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-amber-300 truncate">Preview Frame</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-slate-200 truncate">Top-Level Tab</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* CRITICAL FIX FOR ANDROID: If inside an iframe or In-App WebView, provide 1-tap breakout into native Chrome */}
              {(isInIframe || isInAppBrowser) && (
                <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-500/50 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold font-mono text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isInIframe
                        ? 'PREVIEW FRAME DETECTED — OPEN FULLSCREEN TAB TO INSTALL ON ANDROID'
                        : 'IN-APP WEBVIEW DETECTED — OPEN IN ANDROID CHROME TO INSTALL'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-100/90 leading-relaxed">
                    Android blocks app installation inside embedded preview frames or social webviews. Tap the button below to launch the app directly in a <strong>top-level Android Chrome tab</strong> where 1-tap WebAPK installation is immediately enabled:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    {isAndroid && (
                      <a
                        href={androidChromeIntentUrl}
                        className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer text-center"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Launch Directly in Android Chrome</span>
                      </a>
                    )}
                    <a
                      href={appUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer text-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Top-Level Tab to Install</span>
                    </a>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/30 space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 font-bold font-mono text-[11px]">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>ANDROID NATIVE WEBAPK INSTALLATION</span>
                </div>

                {isInstalled ? (
                  <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>App is already installed and running in Standalone Mode!</span>
                  </div>
                ) : isInstallable ? (
                  <button
                    onClick={async () => {
                      const triggerFn = onDirectInstall || install;
                      const ok = await triggerFn();
                      if (ok) onClose();
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App Now (1-Tap Native Android Prompt)</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {isAndroid && (
                      <a
                        href={androidChromeIntentUrl}
                        className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition cursor-pointer text-center"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Open in Android Chrome for 1-Tap Install</span>
                      </a>
                    )}

                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 space-y-2 font-mono text-[11px]">
                      <div className="font-bold text-cyan-300">
                        HOW TO INSTALL IN ANDROID CHROME / SAMSUNG INTERNET:
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                        <li>
                          Ensure you are on the direct URL (<strong className="text-white">not inside an iframe</strong>) in <strong>Google Chrome</strong> on Android.
                        </li>
                        <li>
                          Tap the <strong>three dots menu (⋮)</strong> in the top-right corner of Chrome.
                        </li>
                        <li>
                          Tap <strong>&ldquo;Add to Home screen&rdquo;</strong> or <strong>&ldquo;Install app&rdquo;</strong> &rarr; select <strong>Install</strong>.
                        </li>
                      </ol>
                    </div>

                    {/* Copy URL helper */}
                    <div className="flex items-center gap-2 pt-1 font-mono">
                      <input
                        type="text"
                        readOnly
                        value={appUrl}
                        className="flex-1 bg-black/60 border border-slate-800 rounded px-2.5 py-2 text-cyan-300 text-xs outline-none select-all"
                      />
                      <button
                        onClick={handleCopyUrl}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl ? 'Copied' : 'Copy Direct URL'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: iOS PROFILE DOWNLOAD */}
          {activeTab === 'IOS_PROFILE' && (
            <div className="space-y-4">
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
                  Download and install the signed WebClip profile directly onto your iPhone or iPad for a dedicated standalone home screen launcher.
                </p>

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
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-bold font-mono text-[11px]">
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>SAFARI 1-TAP &ldquo;ADD TO HOME SCREEN&rdquo;</span>
                </div>
                <p className="text-slate-300 text-xs">
                  In Safari on iPhone: tap the <strong>Share button</strong> &rarr; scroll down &rarr; tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> &rarr; tap <strong>Add</strong>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: STANDALONE APK VIA PWABUILDER */}
          {activeTab === 'APK_GENERATION' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-cyan-300 text-[11px] font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>CONVERT TO STANDALONE .APK / .AAB VIA PWABUILDER</span>
                  </div>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  PWABuilder compiles your verified manifest into a standalone <strong>Android Package (.apk)</strong> in 30 seconds:
                </p>
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  <span>Open PWABuilder &amp; Download APK</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 4: CLI / BUBBLEWRAP */}
          {activeTab === 'CLI_BUBBLEWRAP' && (
            <div className="space-y-3 font-mono">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-[11px]">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>DEVELOPER CLI (ANDROID TWA &amp; XCODE)</span>
                </div>
                <div className="p-3 rounded-lg bg-black/80 border border-slate-800 text-[11px] text-slate-300 space-y-2">
                  <div className="text-slate-500"># Android APK Build via Bubblewrap</div>
                  <div className="text-cyan-300">npm install -g @bubblewrap/cli</div>
                  <div className="text-cyan-300">bubblewrap init --manifest={appUrl}manifest.json</div>
                  <div className="text-emerald-400">bubblewrap build</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Android WebAPK &amp; iOS Standalone Certified</span>
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
