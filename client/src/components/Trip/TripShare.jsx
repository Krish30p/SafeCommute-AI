import React from 'react';
import { Copy, Check } from 'lucide-react';

export default function TripShare({ shareUrl, handleCopy, copied }) {
  return (
    <div className="bg-darkCard p-4 rounded-xl border border-darkBorder space-y-3 animate-fade-in">
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-gray-200">Share Live Location Link</h4>
        <p className="text-[11px] text-gray-500 font-medium">
          Send a Google Maps link of your current coordinates to trusted contacts for immediate tracking.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={shareUrl}
          className="flex-1 bg-darkBg text-xs text-gray-400 p-2.5 rounded-lg border border-darkBorder font-mono focus:outline-none"
        />
        <button
          onClick={handleCopy}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
            copied 
              ? 'bg-safeGreen/20 text-safeGreen border border-safeGreen/30' 
              : 'bg-darkBorder hover:bg-gray-700 text-white border border-gray-700'
          }`}
          style={{ minHeight: '44px' }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
