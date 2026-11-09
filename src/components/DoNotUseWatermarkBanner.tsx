import React, { useState } from 'react';
import { AlertTriangle, Wrench, X, Eye, EyeOff } from 'lucide-react';

export const DoNotUseWatermarkBanner: React.FC = () => {
  const [minimized, setMinimized] = useState(false);

  return (
    <>
      {/* --------------------------------------------------------------------- */}
      {/* 1. FIXED TOP PERSISTENT WARNING TICKER (STAYS AS USER SCROLLS)        */}
      {/* --------------------------------------------------------------------- */}
      <div
        className="fixed top-0 left-0 right-0 h-8 z-[9999] pointer-events-auto select-none shadow-[0_4px_24px_rgba(220,38,38,0.65)] font-mono"
        role="alert"
        aria-label="Application Under Maintenance - Do Not Use Warning"
      >
        <div className="relative h-8 flex items-center bg-gradient-to-r from-red-950 via-red-900 to-red-950 border-b-2 border-red-500 text-white overflow-hidden px-3">
          {/* Animated Caution Stripes Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #000, #000 12px, #ef4444 12px, #ef4444 24px)',
            }}
          />

          <div className="relative flex items-center justify-between gap-3 max-w-7xl mx-auto">
            {/* Left Tag */}
            <div className="flex items-center gap-2 shrink-0 bg-red-600/90 text-white px-2.5 py-0.5 rounded font-black tracking-wider text-[11px] sm:text-xs shadow">
              <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
              <span>DO NOT USE</span>
            </div>

            {/* Dynamic Continuous Marquee Scrolling Message */}
            <div className="flex-1 overflow-hidden whitespace-nowrap mask-marquee">
              <div className="inline-flex items-center gap-8 animate-marquee text-[11px] sm:text-xs font-bold text-red-100 uppercase tracking-wide">
                <span className="flex items-center gap-2">
                  <span className="text-amber-300 font-extrabold">⚠️ CRITICAL ADVISORY:</span>
                  <span className="font-black text-white bg-red-800/80 px-1.5 py-0.2 rounded">DO NOT USE</span>
                  <span>— THIS APPLICATION HAS ISSUES WHICH ARE CURRENTLY BEING INVESTIGATED & FIXED.</span>
                </span>
                <span className="text-red-300">•</span>
                <span className="flex items-center gap-2">
                  <Wrench className="w-3 h-3 text-amber-300 inline" />
                  <span>DO NOT PLACE REAL TRADES OR RELY ON SIGNALS / ORDER BOOK OUTPUTS.</span>
                </span>
                <span className="text-red-300">•</span>
                <span className="flex items-center gap-2">
                  <span className="text-amber-300 font-extrabold">STATUS:</span>
                  <span>ENGINEERING HOTFIXES IN PROGRESS ACROSS ALL 4 CORES.</span>
                </span>
                <span className="text-red-300">•</span>
                {/* Duplicate segment to ensure seamless infinite scrolling loop */}
                <span className="flex items-center gap-2">
                  <span className="text-amber-300 font-extrabold">⚠️ CRITICAL ADVISORY:</span>
                  <span className="font-black text-white bg-red-800/80 px-1.5 py-0.2 rounded">DO NOT USE</span>
                  <span>— THIS APPLICATION HAS ISSUES WHICH ARE CURRENTLY BEING INVESTIGATED & FIXED.</span>
                </span>
                <span className="text-red-300">•</span>
                <span className="flex items-center gap-2">
                  <Wrench className="w-3 h-3 text-amber-300 inline" />
                  <span>DO NOT PLACE REAL TRADES OR RELY ON SIGNALS / ORDER BOOK OUTPUTS.</span>
                </span>
                <span className="text-red-300">•</span>
                <span className="flex items-center gap-2">
                  <span className="text-amber-300 font-extrabold">STATUS:</span>
                  <span>ENGINEERING HOTFIXES IN PROGRESS ACROSS ALL 4 CORES.</span>
                </span>
              </div>
            </div>

            {/* Right Toggle for Diagnostic View */}
            <button
              onClick={() => setMinimized((prev) => !prev)}
              title={minimized ? 'Expand Screen Watermark' : 'Minimize Screen Watermark'}
              className="shrink-0 flex items-center gap-1 text-[10px] bg-black/40 hover:bg-black/60 border border-red-400/50 text-red-200 px-2 py-0.5 rounded transition cursor-pointer"
            >
              {minimized ? (
                <>
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">Show Stamp</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Dim Stamp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. FIXED PROMINENT DIAGONAL "DO NOT USE" WATERMARK (LIKE SCREENSHOT) */}
      {/* Follows user viewport persistently as they scroll down any page       */}
      {/* --------------------------------------------------------------------- */}
      <div
        className={`fixed inset-0 z-[9000] pointer-events-none flex items-center justify-center overflow-hidden transition-opacity duration-300 select-none ${
          minimized ? 'opacity-20' : 'opacity-85 sm:opacity-90'
        }`}
        aria-hidden="true"
      >
        {/* Giant Red Stamp Matching Screenshot Angle and Style */}
        <div className="relative flex flex-col items-center justify-center transform -rotate-[28deg] scale-95 sm:scale-110 md:scale-125 lg:scale-140">
          {/* Main Giant Stencil Text */}
          <div className="px-6 py-2 border-4 sm:border-8 border-red-600/90 rounded-2xl bg-red-950/30 backdrop-blur-[1px] shadow-[0_0_80px_rgba(220,38,38,0.5)]">
            <h1
              className="font-black text-red-600 tracking-tighter text-6xl sm:text-8xl md:text-9xl uppercase font-sans drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
              style={{
                textShadow:
                  '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(185, 28, 28, 0.6), 4px 4px 0px rgba(0, 0, 0, 0.9)',
                letterSpacing: '0.04em',
              }}
            >
              DO NOT USE
            </h1>
            <p className="text-center text-red-200 font-mono font-black text-xs sm:text-base md:text-lg tracking-widest uppercase mt-1 bg-red-900/80 py-0.5 rounded shadow">
              ISSUES BEING FIXED • DO NOT TRADE
            </p>
          </div>
        </div>

        {/* Subtle repeating grid of secondary warning watermarks across larger screens */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-15 pointer-events-none">
          <div className="flex items-center justify-center transform -rotate-[28deg] text-3xl font-black text-red-500 font-mono">
            DO NOT USE
          </div>
          <div className="flex items-center justify-center transform -rotate-[28deg] text-3xl font-black text-red-500 font-mono">
            DO NOT USE
          </div>
          <div className="flex items-center justify-center transform -rotate-[28deg] text-3xl font-black text-red-500 font-mono">
            DO NOT USE
          </div>
          <div className="flex items-center justify-center transform -rotate-[28deg] text-3xl font-black text-red-500 font-mono">
            DO NOT USE
          </div>
        </div>
      </div>
    </>
  );
};
