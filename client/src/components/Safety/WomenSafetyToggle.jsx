import React, { useEffect, useState, useRef } from 'react';
import { Shield, ShieldAlert } from 'lucide-react';

export default function WomenSafetyToggle({ onChange }) {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('womenSafetyMode');
    return saved === 'true';
  });

  const isFirstMount = useRef(true);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    localStorage.setItem('womenSafetyMode', enabled);
    
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (onChangeRef.current) {
      onChangeRef.current(enabled);
    }
  }, [enabled]);

  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${
        enabled
          ? 'bg-safeGreen border-safeGreen text-white shadow-[0_0_12px_rgba(29,158,117,0.2)]'
          : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'
      }`}
      style={{ minHeight: '44px' }} // 44px tap target size minimum for mobile usability
      type="button"
      id="women-safety-toggle"
    >
      {enabled ? <Shield size={16} className="animate-pulse" /> : <ShieldAlert size={16} />}
      <span className="text-xs font-bold tracking-wide">
        {enabled ? 'Women Safety Mode: ON' : 'Women Safety Mode: OFF'}
      </span>
      <span 
        className={`w-2.5 h-2.5 rounded-full ${
          enabled ? 'bg-safeGreen animate-ping' : 'bg-gray-600'
        }`}
      />
    </button>
  );
}
