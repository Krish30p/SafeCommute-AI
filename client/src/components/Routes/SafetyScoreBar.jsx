import React from 'react';
import { getScoreColorHex } from '../../utils/safetyScore';

export default function SafetyScoreBar({ score }) {
  const color = getScoreColorHex(score);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-gray-400">Safety Score</span>
        <span className="text-sm font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="w-full bg-darkBorder h-2 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ 
            width: `${score}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}80` 
          }}
        />
      </div>
    </div>
  );
}
