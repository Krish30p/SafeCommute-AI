import React from 'react';
import { Sparkles, Info } from 'lucide-react';
import { getScoreTextColorClass } from '../../utils/safetyScore';

export default function RiskNote({ advisory, score }) {
  if (!advisory) return null;

  const scoreColorClass = getScoreTextColorClass(score);

  return (
    <div className="bg-[#151b26] border border-blue-900/40 p-4 rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.05)] relative overflow-hidden">
      {/* Dynamic top gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="text-blue-400 shrink-0 animate-pulse" size={15} />
          <span className="text-[10px] font-black tracking-wider text-blue-400 uppercase">
            AI Safety Advisor
          </span>
        </div>
        <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
          <Info size={11} />
          <span>Real-time Risk Prediction</span>
        </div>
      </div>

      <p className="text-xs text-gray-300 leading-relaxed font-semibold">
        {advisory}
      </p>
    </div>
  );
}
